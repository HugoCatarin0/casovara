import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ikeaPortugalSelection } from './catalog-ikea-pt.js';
import { catalogProviders } from './public/catalog-plugins.js';
import { elements } from './public/object-catalog.js';

const sources = {
  'ikea-pt': {
    selection: ikeaPortugalSelection,
    validUrl: (url) => url.hostname === 'www.ikea.com' && /^\/pt\/(?:pt|en)\/p\/[a-z0-9-]+\/?$/.test(url.pathname),
  },
};
const pageSize = 24;
const feedSize = 32 * 1024 * 1024;
const findKey = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function cleanUrl(value, source) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > 500) throw new Error('Invalid product link');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !source.validUrl(url)) {
    throw new Error('Invalid product link');
  }
  return url.origin + url.pathname;
}

function prepareItems(items, provider, source) {
  if (!Array.isArray(items) || !items.length || items.length > 100_000) throw new Error('Invalid catalogue size');
  const categories = new Set(provider.categories.map(({ id }) => id));
  const ids = new Set();
  return items.map((item) => {
    const { productId, name, type, category, width, depth, height } = item;
    if (typeof productId !== 'string' || !/^[a-z0-9._-]{1,64}$/i.test(productId) || ids.has(productId) ||
      typeof type !== 'string' || !Object.hasOwn(elements, type) || elements[type].opening || !categories.has(category) ||
      !Number.isFinite(width) || width < .1 || width > 20 || !Number.isFinite(depth) || depth < .05 || depth > 20 ||
      (height !== undefined && (!Number.isFinite(height) || height < .01 || height > 12)) ||
      ![name?.pt, name?.en].every((label) => typeof label === 'string' && label.trim() && label.length <= 150)) {
      throw new Error('Invalid catalogue item');
    }
    ids.add(productId);
    const url = cleanUrl(item.url, source);
    const labels = { pt: name.pt.trim(), en: name.en.trim() };
    const sku = productId.replace(/[.\s-]/g, '');
    const search = findKey(`${productId} ${sku} ${labels.pt} ${labels.en} ${elements[type].pt} ${elements[type].en}`);
    return { productId, name: labels, type, category, width, depth, height, url, search };
  });
}

export function createCatalogService(catalogDir) {
  const cache = new Map();
  const sourcesById = new Map(catalogProviders.map((provider) => [provider.id, {
    provider, source: sources[provider.id],
    selection: prepareItems(sources[provider.id].selection, provider, sources[provider.id]),
  }]));

  async function dataset(id, entry) {
    const path = resolve(catalogDir, `${id}.json`);
    const info = await stat(path).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    if (!info) return { items: entry.selection, coverage: 'selection' };
    if (!info.isFile() || info.size > feedSize) throw new Error('Invalid catalogue file');
    const version = `${info.ino}:${info.mtimeMs}:${info.size}`;
    const cached = cache.get(id);
    if (cached?.version === version) return cached;
    const contents = await readFile(path);
    if (contents.byteLength > feedSize) throw new Error('Invalid catalogue file');
    const feed = JSON.parse(contents);
    if (feed?.version !== 1 || !['selection', 'full'].includes(feed.coverage)) throw new Error('Invalid catalogue format');
    const loaded = { version, coverage: feed.coverage, items: prepareItems(feed.items, entry.provider, entry.source) };
    cache.set(id, loaded);
    return loaded;
  }

  return async (id, parameters) => {
    const entry = sourcesById.get(id);
    if (!entry) return null;
    const category = parameters.get('category') || '';
    const rawCursor = parameters.get('cursor') || '0';
    const cursor = /^\d{1,6}$/.test(rawCursor) ? Number(rawCursor) : 0;
    const language = (parameters.get('locale') || 'pt-PT').startsWith('pt') ? 'pt' : 'en';
    const rawQuery = (parameters.get('query') || '').slice(0, 150).trim();
    const normalizedSku = /^[\d.\s-]+$/.test(rawQuery) ? rawQuery.replace(/[.\s-]/g, '') : rawQuery;
    const words = findKey(normalizedSku).split(/\s+/).filter(Boolean);
    const { items, coverage } = await dataset(id, entry);
    const matches = items.filter((item) => (!category || category === item.category) && words.every((word) => item.search.includes(word)));
    const next = cursor + pageSize;
    return {
      items: matches.slice(cursor, next).map(({ search, name, ...item }) => ({ ...item, name: name[language] })),
      total: matches.length,
      coverage,
      ...(next < matches.length ? { nextCursor: String(next) } : {}),
    };
  };
}
