import { browseCatalog, catalogProviders } from './catalog-plugins.js';
import { elements, objectGroups } from './object-catalog.js';

const localId = 'casovara';
const pageSize = 24;
const messages = {
  title: ['Biblioteca de objetos', 'Object library'],
  close: ['Fechar biblioteca', 'Close library'],
  search: ['Pesquisar objetos', 'Search objects'],
  placeholder: ['Nome, tipo ou referência', 'Name, type or item number'],
  source: ['Catálogo', 'Catalogue'],
  category: ['Categoria', 'Category'],
  all: ['Todas', 'All'],
  loading: ['A carregar objetos…', 'Loading objects…'],
  empty: ['Nenhum objeto corresponde à pesquisa.', 'No objects match your search.'],
  error: ['Não foi possível carregar o catálogo.', 'The catalogue could not be loaded.'],
  more: ['Mostrar mais', 'Show more'],
  retry: ['Tentar novamente', 'Try again'],
  result: ['objeto', 'object'],
  results: ['objetos', 'objects'],
  product: ['Ver produto', 'View product'],
  official: ['Ver catálogo oficial', 'View official catalogue'],
  selection: ['Seleção de produtos com desenhos esquemáticos.', 'Selected products with schematic drawings.'],
  full: ['Desenhos esquemáticos para planeamento.', 'Schematic drawings for planning.'],
};

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const searchText = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim();

function externalLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function mountObjectLibrary(panel, { locale, thumb, choose, close, signal }) {
  const lang = locale === 'pt-PT' ? 'pt' : 'en';
  const t = (key) => messages[key][lang === 'pt' ? 0 : 1];
  const dimensions = new Intl.NumberFormat(locale === 'en-INT' ? 'en-GB' : 'pt-PT', { maximumFractionDigits: 3 });
  const providers = [{ id: localId, pt: 'Casovara', en: 'Casovara', categories: objectGroups }, ...catalogProviders];
  const localItems = objectGroups.flatMap((group) => group.types.map((type) => {
    const { width, depth, height, pt, en } = elements[type];
    return { type, category: group.id, name: lang === 'pt' ? pt : en, width, depth, height, search: searchText(`${pt} ${en} ${group.pt} ${group.en}`) };
  }));

  panel.innerHTML = `<header class="cv-library-head"><h2 id="cv-object-library-title">${t('title')}</h2>
    <button type="button" class="cv-tool cv-library-close" aria-label="${t('close')}" title="${t('close')}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
    <div class="cv-library-filters">
      <label class="cv-library-search"><span class="cv-sr-only">${t('search')}</span>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
        <input type="search" maxlength="120" placeholder="${t('placeholder')}" autocomplete="off">
      </label>
      <div class="cv-library-selects"><label>${t('source')}<select data-library="source">${providers.map(({ id, [lang]: name }) => `<option value="${escape(id)}">${escape(name)}</option>`).join('')}</select></label>
        <label>${t('category')}<select data-library="category"></select></label></div>
      <p class="cv-library-status" role="status" aria-live="polite" data-library="status"></p>
      <p class="cv-library-coverage" data-library="coverage"></p>
    </div>
    <div class="cv-library-scroll" data-library="scroll">
      <div data-library="results"></div>
      <button type="button" class="cv-button cv-library-more" hidden></button>
      <footer class="cv-library-source" data-library="footer"><a href="" target="_blank" rel="noopener noreferrer">${t('official')}</a></footer>
    </div>`;

  const source = panel.querySelector('[data-library="source"]');
  const category = panel.querySelector('[data-library="category"]');
  const search = panel.querySelector('input[type="search"]');
  const scroll = panel.querySelector('[data-library="scroll"]');
  const results = panel.querySelector('[data-library="results"]');
  const status = panel.querySelector('[data-library="status"]');
  const footer = panel.querySelector('[data-library="footer"]');
  const coverage = panel.querySelector('[data-library="coverage"]');
  const sourceLink = footer.querySelector('a');
  const more = panel.querySelector('.cv-library-more');
  const closeButton = panel.querySelector('.cv-library-close');
  const listen = { signal };
  let visibleItems = [];
  let page = pageSize;
  let cursor;
  let request;
  let failed = false;
  let timer;
  let selected = '';

  const provider = () => providers.find(({ id }) => id === source.value);
  const selectedKey = (item) => `${item.providerId ?? localId}:${item.productId ?? item.type}`;

  function setCategories() {
    category.innerHTML = `<option value="">${t('all')}</option>${provider().categories.map(({ id, [lang]: name }) => `<option value="${escape(id)}">${escape(name)}</option>`).join('')}`;
    category.disabled = provider().categories.length === 0;
    const url = externalLink(provider().url);
    sourceLink.href = url;
    sourceLink.hidden = !url;
    footer.hidden = !url;
    coverage.textContent = '';
  }

  function card(item, index) {
    const url = externalLink(item.url);
    const model = elements[item.type];
    const measures = model.opening ? [item.width, item.height ?? model.height] : [item.width, item.depth];
    if (!model.opening && item.providerId && Number.isFinite(item.height)) measures.push(item.height);
    const size = `${measures.map((value) => dimensions.format(value)).join(' × ')}\u00a0m`;
    return `<article class="cv-library-card"><button type="button" data-product-index="${index}" aria-pressed="${selectedKey(item) === selected}">
      <span class="cv-library-thumb">${thumb(item)}</span><span class="cv-library-product-name">${escape(item.name)}</span><span class="cv-library-product-size">${size}</span></button>
      ${url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer" aria-label="${t('product')} · ${escape(item.name)}">${t('product')}<span aria-hidden="true"> ↗</span></a>` : ''}</article>`;
  }

  function setStatus(text) {
    status.textContent = text;
  }

  function setMore(available, label = 'more') {
    more.hidden = !available;
    more.textContent = t(label);
  }

  function displayCount(count) {
    setStatus(count > 0 ? `${count} ${t(count === 1 ? 'result' : 'results')}` : t('empty'));
  }

  function drawLocal() {
    const tokens = searchText(search.value).split(' ').filter(Boolean);
    const matches = localItems.filter((item) => (!category.value || item.category === category.value) && tokens.every((token) => item.search.includes(token)));
    visibleItems = matches.slice(0, page);
    const sections = new Map();
    visibleItems.forEach((item, index) => {
      if (!sections.has(item.category)) sections.set(item.category, []);
      sections.get(item.category).push(card(item, index));
    });
    results.innerHTML = [...sections].map(([id, cards]) => `<section class="cv-library-section"><h3>${escape(objectGroups.find((group) => group.id === id)[lang])}</h3><div class="cv-library-grid">${cards.join('')}</div></section>`).join('');
    displayCount(matches.length);
    setMore(visibleItems.length < matches.length);
  }

  function cancelLoad() {
    clearTimeout(timer);
    request?.abort();
    request = null;
  }

  async function drawExternal(append = false) {
    const currentProvider = provider();
    const controller = new AbortController();
    request = controller;
    failed = false;
    setStatus(t('loading'));
    more.disabled = true;
    try {
      const response = await browseCatalog(currentProvider.id, { query: search.value, category: category.value, cursor, locale, signal: controller.signal });
      if (request !== controller) return;
      const items = response.items.filter((item) => Object.hasOwn(elements, item.type) && Number.isFinite(item.width) && Number.isFinite(item.depth) && item.width > 0 && item.depth > 0)
        .map((item) => ({ ...item, providerId: currentProvider.id }));
      const first = visibleItems.length;
      visibleItems.push(...items);
      cursor = response.nextCursor;
      coverage.textContent = t(response.coverage === 'full' ? 'full' : 'selection');
      if (!append) results.innerHTML = '<div class="cv-library-grid"></div>';
      results.firstElementChild.insertAdjacentHTML('beforeend', items.map((item, index) => card(item, first + index)).join(''));
      displayCount(response.total);
      if (document.activeElement === more && items.length) results.querySelector(`[data-product-index="${first}"]`)?.focus();
      setMore(Boolean(cursor));
    } catch {
      if (request !== controller) return;
      failed = true;
      setStatus(t('error'));
      setMore(true, 'retry');
    } finally {
      if (request === controller) {
        request = null;
        more.disabled = false;
      }
    }
  }

  function refresh(debounce = false) {
    cancelLoad();
    scroll.scrollTop = 0;
    page = pageSize;
    visibleItems = [];
    cursor = undefined;
    failed = false;
    more.disabled = false;
    if (source.value === localId) { drawLocal(); return; }
    results.replaceChildren();
    setMore(false);
    setStatus(t('loading'));
    if (debounce) timer = setTimeout(() => { void drawExternal(); }, 230);
    else void drawExternal();
  }

  function selectItem(item) {
    if (!item) return;
    selected = selectedKey(item);
    choose(item);
  }

  setCategories();
  search.addEventListener('input', () => refresh(true), listen);
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && visibleItems.length) { event.preventDefault(); selectItem(visibleItems[0]); }
  }, listen);
  source.addEventListener('change', () => { setCategories(); refresh(); }, listen);
  category.addEventListener('change', () => refresh(), listen);
  closeButton.addEventListener('click', close, listen);
  results.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-product-index]');
    if (button) selectItem(visibleItems[Number(button.dataset.productIndex)]);
  }, listen);
  more.addEventListener('click', () => {
    if (source.value === localId) {
      const first = visibleItems.length;
      page += pageSize;
      drawLocal();
      results.querySelector(`[data-product-index="${first}"]`)?.focus();
    } else if (failed && !visibleItems.length) refresh();
    else void drawExternal(true);
  }, listen);
  signal?.addEventListener('abort', cancelLoad, { once: true });

  return {
    open() {
      panel.hidden = false;
      refresh();
      // Focusing the close button on touch avoids opening the keyboard over the library.
      (matchMedia('(pointer: coarse)').matches ? closeButton : search).focus({ preventScroll: true });
    },
    close() {
      panel.hidden = true;
      cancelLoad();
    },
  };
}
