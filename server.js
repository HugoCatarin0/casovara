import { randomBytes, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { detectLocale, languagePreferences, locales } from './public/locales.js';
import { systemById } from './public/core.js';
import { normalizeBuildingServices } from './public/building-services.js';
import { createDesignAssistant } from './design-assistant.js';
import { handleMcp } from './mcp-app.js';
import { createCatalogService } from './catalog-service.js';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(root, 'public');
const defaultData = resolve(root, 'data');
const maxBody = 4 * 1024 * 1024;
const assetCache = process.env.NODE_ENV === 'production' ? 'public, max-age=300' : 'no-store';
const pathLocale = { pt: 'pt-PT', 'pt-pt': 'pt-PT', en: 'en-INT', 'en-int': 'en-INT', 'en-pt': 'en-PT' };
const sessionPattern = /^[a-f0-9]{48}$/;
const uuidPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const shareLifetime = 30 * 24 * 60 * 60 * 1000;
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
const pages = new Map([
  ['/', 'landing'], ['/app', 'builder'],
  ['/calculadoras', 'calculators'], ['/calculators', 'calculators'],
  ['/guias', 'guides'], ['/guides', 'guides'],
  ['/biblioteca', 'library'], ['/library', 'library'], ['/houses', 'library'],
  ['/sobre', 'about'], ['/about', 'about'],
  ['/contacto', 'contact'], ['/contact', 'contact'],
  ['/termos', 'terms'], ['/terms', 'terms'],
  ['/privacidade', 'privacy'], ['/privacy', 'privacy'],
]);
const siteTitles = {
  landing: ['Desenhe a sua casa', 'Design your home'],
  builder: ['Editor de plantas', 'Floor plan editor'],
  calculators: ['Calculadoras de construção', 'Construction calculators'],
  guides: ['Guias de construção', 'Construction guides'],
  library: ['Biblioteca de projetos', 'Project library'],
  about: ['Sobre', 'About'],
  contact: ['Contacto', 'Contact'],
  terms: ['Termos', 'Terms'],
  privacy: ['Privacidade', 'Privacy'],
  missing: ['Página indisponível', 'Page unavailable'],
};

class RequestError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
  }
}

function cookies(header = '') {
  return Object.fromEntries(header.split(';').filter((pair) => pair.includes('=')).map((pair) => {
    const index = pair.indexOf('=');
    return [pair.slice(0, index).trim(), pair.slice(index + 1).trim()];
  }));
}

function chooseLanguage(req, cookie, path) {
  const chosen = path ?? (locales.includes(cookie.casovara_locale) ? cookie.casovara_locale : undefined);
  const country = req.headers['cf-ipcountry'] ?? req.headers['x-vercel-ip-country'] ?? req.headers['cloudfront-viewer-country'] ?? '';
  const detectedCountry = /^[a-z]{2}$/i.test(country) ? country : '';
  const locale = chosen ?? detectLocale(languagePreferences(req.headers['accept-language']), detectedCountry);
  return { locale, chosen: Boolean(chosen), country: detectedCountry };
}

function cookieHeader(name, value, req) {
  const secure = req.socket.encrypted || req.headers['x-forwarded-proto']?.split(',')[0].trim() === 'https';
  return `${name}=${value}; Path=/; SameSite=Lax; HttpOnly; Max-Age=31536000${secure ? '; Secure' : ''}`;
}

function workspaceSession(req, res, cookie) {
  if (sessionPattern.test(cookie.casovara_session)) return cookie.casovara_session;
  const session = randomBytes(24).toString('hex');
  res.appendHeader('Set-Cookie', cookieHeader('casovara_session', session, req));
  return session;
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function bodyJson(req) {
  if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new RequestError(415, 'json_required');
  if (Number(req.headers['content-length']) > maxBody) throw new RequestError(413, 'too_large');
  const chunks = [];
  let length = 0;
  for await (const data of req.iterator({ destroyOnReturn: false })) {
    length += data.length;
    if (length > maxBody) {
      req.resume();
      throw new RequestError(413, 'too_large');
    }
    chunks.push(data);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString());
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  throw new RequestError(400, 'invalid_json');
}

function validateProject(project) {
  if (typeof project.name !== 'string' || !project.name.trim() || project.name.trim().length > 120 ||
      !systemById(project.systemId) || !Array.isArray(project.levels) || !project.levels.length || project.levels.length > 30) {
    throw new RequestError(422, 'invalid_project');
  }
  const levelIds = new Set();
  for (const level of project.levels) {
    if (!level || typeof level.id !== 'string' || !level.id || levelIds.has(level.id) ||
        typeof level.name !== 'string' || !Number.isFinite(level.height) || level.height <= 0 ||
        ![level.rooms, level.walls, level.items].every((items) => Array.isArray(items) &&
          items.every((item) => item && typeof item === 'object' && !Array.isArray(item)))) {
      throw new RequestError(422, 'invalid_project');
    }
    levelIds.add(level.id);
  }
  if (!levelIds.has(project.levelId)) throw new RequestError(422, 'invalid_project');
  return { ...project, name: project.name.trim(), levels: project.levels.map((level) => Object.hasOwn(level, 'services')
    ? { ...level, services: normalizeBuildingServices(level.services) } : level) };
}

async function readProject(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') throw new RequestError(404, 'project_not_found');
    throw error;
  }
}

async function writeProject(path, record) {
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(record), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    await rename(temp, path);
  } finally {
    await unlink(temp).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

async function readOptional(path) {
  return readProject(path).catch((error) => {
    if (error.status === 404) return null;
    throw error;
  });
}

async function removeOptional(path) {
  return unlink(path).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

function serverPage(view, info) {
  const isPt = info.locale === 'pt-PT';
  const lang = info.locale === 'en-INT' ? 'en' : info.locale;
  const title = siteTitles[view][isPt ? 0 : 1];
  const desc = isPt
    ? 'Desenhe a planta, explore o modelo em 3D e estime os materiais da sua casa.'
    : 'Draw your floor plan, explore the 3D model and estimate the materials for your home.';
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f7f4ec">
  <meta name="description" content="${desc}">
  <title>${title} — Casovara</title>
  <link rel="icon" href="/brand.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/main.css">
  ${view === 'landing' || view === 'library' ? '<link rel="stylesheet" href="/landing.css">' : ''}
  ${view === 'builder' ? '<link rel="stylesheet" href="/builder.css">' : ''}
  <script type="module" src="/main.js"></script>
</head>
<body data-view="${view}" data-locale="${info.locale}" data-chosen="${info.chosen}" data-country="${info.country}">
  <div id="app"></div>
  <noscript>${isPt ? 'Ative o JavaScript para utilizar o Casovara.' : 'Enable JavaScript to use Casovara.'}</noscript>
</body>
</html>`;
}

function pageRoute(path) {
  const parts = path.toLowerCase().split('/').filter(Boolean);
  const explicitLocale = Object.hasOwn(pathLocale, parts[0]) ? pathLocale[parts.shift()] : undefined;
  const route = '/' + parts.join('/');
  const detail = /^\/(guides|guias|calculators|calculadoras)\/[a-z0-9-]+$/.test(route);
  return { view: pages.get(route) ?? (detail ? pages.get('/' + parts[0]) : 'missing'), explicitLocale };
}

async function staticResponse(req, res, pathname) {
  const type = contentTypes[extname(pathname)];
  const candidate = resolve(publicDir, '.' + pathname);
  if (!type || !candidate.startsWith(publicDir + sep) || pathname.split('/').some((part) => part.startsWith('.'))) return false;
  const details = await stat(candidate).catch((error) => {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null;
    throw error;
  });
  if (!details?.isFile()) return false;
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': details.size, 'Cache-Control': assetCache });
  if (req.method === 'HEAD') res.end();
  else {
    const stream = createReadStream(candidate);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  }
  return true;
}

export function createApp({ storagePath = process.env.CASOVARA_DATA_DIR || defaultData, assistant = createDesignAssistant(),
  catalogDir = process.env.CASOVARA_CATALOG_DIR || resolve(storagePath, 'catalogs') } = {}) {
  const writes = new Map();
  const browseCatalog = createCatalogService(catalogDir);
  const sharesDir = resolve(storagePath, '_shares');
  const sharePath = (token) => resolve(sharesDir, token + '.json');
  function change(path, action) {
    const pending = (writes.get(path) ?? Promise.resolve()).catch(() => {}).then(action);
    writes.set(path, pending);
    return pending.finally(() => {
      if (writes.get(path) === pending) writes.delete(path);
    });
  }

  async function currentShare(path) {
    const reference = await readOptional(path);
    if (!reference || !sessionPattern.test(reference.token) || Date.parse(reference.expiresAt) <= Date.now()) return null;
    return await readOptional(sharePath(reference.token)) ? reference : null;
  }

  async function revokeShare(path) {
    const reference = await readOptional(path);
    if (reference && sessionPattern.test(reference.token)) await removeOptional(sharePath(reference.token));
    await removeOptional(path);
  }

  async function share(req, res, projectPath, indexPath) {
    if (req.method === 'GET') {
      await readProject(projectPath);
      return sendJson(res, 200, await currentShare(indexPath));
    }
    if (req.method === 'POST') {
      const record = await change(projectPath, async () => {
        const { id, createdAt, updatedAt, ...project } = await readProject(projectPath);
        const existing = await currentShare(indexPath);
        if (existing) return existing;
        await revokeShare(indexPath);
        const token = randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + shareLifetime).toISOString();
        await mkdir(sharesDir, { recursive: true, mode: 0o700 });
        await writeProject(sharePath(token), { expiresAt, project });
        try {
          await writeProject(indexPath, { token, expiresAt });
        } catch (error) {
          await removeOptional(sharePath(token));
          throw error;
        }
        return { token, expiresAt };
      });
      return sendJson(res, 200, record);
    }
    if (req.method === 'DELETE') {
      await change(projectPath, async () => {
        await readProject(projectPath);
        await revokeShare(indexPath);
      });
      res.writeHead(204, { 'Cache-Control': 'no-store' }).end();
      return;
    }
    throw new RequestError(405, 'method_not_allowed');
  }

  async function projects(req, res, url, session) {
    const directory = resolve(storagePath, session);
    if (url === '/api/projects' && req.method === 'GET') {
      const names = await readdir(directory).catch((error) => {
        if (error.code === 'ENOENT') return [];
        throw error;
      });
      const records = await Promise.all(names.filter((name) => name.endsWith('.json') && uuidPattern.test(name.slice(0, -5)))
        .map((name) => readProject(resolve(directory, name)).catch((error) => {
          if (error.status === 404) return null;
          throw error;
        })));
      return sendJson(res, 200, records.filter(Boolean).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    }

    if (url === '/api/projects' && req.method === 'POST') {
      const project = validateProject(await bodyJson(req));
      const id = randomUUID();
      const now = new Date().toISOString();
      const record = { ...project, id, createdAt: now, updatedAt: now };
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeProject(resolve(directory, id + '.json'), record);
      return sendJson(res, 201, record);
    }

    const [id, action, ...rest] = url.slice('/api/projects/'.length).split('/');
    if (!uuidPattern.test(id) || rest.length || (action && action !== 'share')) throw new RequestError(404, 'project_not_found');
    const path = resolve(directory, id + '.json');
    const indexPath = resolve(directory, id + '.share');
    if (action === 'share') return await share(req, res, path, indexPath);

    if (req.method === 'GET') return sendJson(res, 200, await readProject(path));
    if (req.method === 'PUT') {
      const project = validateProject(await bodyJson(req));
      const record = await change(path, async () => {
        const { createdAt } = await readProject(path);
        const updated = { ...project, id, createdAt, updatedAt: new Date().toISOString() };
        await writeProject(path, updated);
        return updated;
      });
      return sendJson(res, 200, record);
    }
    if (req.method === 'DELETE') {
      await change(path, async () => {
        await readProject(path);
        await revokeShare(indexPath);
        await unlink(path);
      });
      res.writeHead(204, { 'Cache-Control': 'no-store' }).end();
      return;
    }
    throw new RequestError(405, 'method_not_allowed');
  }

  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    try {
      const requestUrl = new URL(req.url, 'http://localhost');
      const url = decodeURIComponent(requestUrl.pathname);
      const cookie = cookies(req.headers.cookie);
      const isRead = req.method === 'GET' || req.method === 'HEAD';

      if (url === '/mcp') return await handleMcp(req, res);

      if (url.startsWith('/api/')) {
        if (!isRead && ['same-site', 'cross-site'].includes(req.headers['sec-fetch-site'])) throw new RequestError(403, 'cross_site');
        if (url.startsWith('/api/catalogs/')) {
          if (req.method !== 'GET') throw new RequestError(405, 'method_not_allowed');
          let result;
          try { result = await browseCatalog(url.slice('/api/catalogs/'.length), requestUrl.searchParams); }
          catch { throw new RequestError(503, 'catalog_unavailable'); }
          if (!result) throw new RequestError(404, 'catalog_not_found');
          return sendJson(res, 200, result);
        }
        if (url === '/api/assistant') {
          if (req.method === 'GET') return sendJson(res, 200, assistant.status(req));
          if (req.method !== 'POST') throw new RequestError(405, 'method_not_allowed');
          const payload = await bodyJson(req);
          if (payload.preset === undefined && payload.project != null) payload.project = validateProject(payload.project);
          const activity = new AbortController();
          const disconnect = () => activity.abort();
          res.once('close', disconnect);
          try {
            const result = await assistant.run(req, payload, { signal: activity.signal });
            if (!res.destroyed) return sendJson(res, 200, result);
            return;
          } finally {
            res.off('close', disconnect);
          }
        }
        if (url === '/api/locale' && req.method === 'POST') {
          const { locale } = await bodyJson(req);
          if (!locales.includes(locale) && locale !== 'auto') throw new RequestError(422, 'invalid_locale');
          if (locale === 'auto') res.appendHeader('Set-Cookie', 'casovara_locale=; Path=/; SameSite=Lax; HttpOnly; Max-Age=0');
          else res.appendHeader('Set-Cookie', cookieHeader('casovara_locale', locale, req));
          return sendJson(res, 200, { locale });
        }
        if (url === '/api/projects' || url.startsWith('/api/projects/')) {
          return await projects(req, res, url, workspaceSession(req, res, cookie));
        }
        if (req.method === 'GET' && url.startsWith('/api/project-shares/')) {
          const token = url.slice('/api/project-shares/'.length);
          const record = sessionPattern.test(token) ? await readOptional(sharePath(token)) : null;
          if (!record || Date.parse(record.expiresAt) <= Date.now()) throw new RequestError(404, 'share_not_found');
          return sendJson(res, 200, record.project);
        }
        throw new RequestError(404, 'route_not_found');
      }

      if (!isRead) throw new RequestError(405, 'method_not_allowed');
      if (await staticResponse(req, res, url)) return;
      const { view, explicitLocale } = pageRoute(url);
      const language = chooseLanguage(req, cookie, explicitLocale);
      if (view === 'builder') workspaceSession(req, res, cookie);
      if (explicitLocale && req.method === 'GET' && view !== 'missing' && cookie.casovara_locale !== explicitLocale) {
        res.appendHeader('Set-Cookie', cookieHeader('casovara_locale', explicitLocale, req));
      }
      res.writeHead(view === 'missing' ? 404 : 200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(req.method === 'HEAD' ? undefined : serverPage(view, language));
    } catch (error) {
      const status = error.status || (error instanceof URIError ? 400 : 500);
      if (status === 500) console.error(error);
      if (!res.headersSent && !res.destroyed) sendJson(res, status, { error: error.status ? error.message : 'request_failed' });
      else res.end();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST || '127.0.0.1';
  const app = createApp();
  app.listen(port, host, () => console.log(`Casovara · http://${host}:${app.address().port}`));
}
