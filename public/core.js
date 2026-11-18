import { translation } from './locales.js';
import edria from './systems/edria.js';
import lsf from './systems/lsf.js';
import clickhouse from './systems/clickhouse.js';
import masonry from './systems/masonry.js';
import concrete from './systems/concrete.js';

export { translation as text };
export const company = {
  name: 'Casovara, Lda.',
  vat: '000 000 000',
  address: 'Rua Exemplo, 10 · 1200-000 Lisboa · Portugal',
  email: 'equipa@casovara.example',
  phone: '+351 000 000 000',
};

export const systems = Object.freeze([edria, lsf, clickhouse, masonry, concrete]);
export const systemById = (id) => systems.find((system) => system.id === id);

export function estimateProject(systemId, area) {
  return (systemById(systemId) ?? systems[0]).estimate(area);
}

export function formatMoney(amount, locale, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(locale === 'en-INT' ? 'en-GB' : 'pt-PT', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: maximumFractionDigits, maximumFractionDigits,
  }).format(amount);
}

export function formatNumber(amount, locale, maximumFractionDigits = 2) {
  return new Intl.NumberFormat(locale === 'en-INT' ? 'en-GB' : 'pt-PT', { maximumFractionDigits }).format(amount);
}

export function formatDate(date, locale) {
  return new Intl.DateTimeFormat(locale === 'pt-PT' ? 'pt-PT' : 'en-GB', {
    dateStyle: 'short', timeZone: locale === 'en-INT' ? 'UTC' : 'Europe/Lisbon',
  }).format(new Date(date));
}

async function request(path, method = 'GET', data) {
  const options = { method };
  if (data !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(data);
  }
  const response = await fetch(path, options);
  if (response.status === 204) return;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'request_failed');
  return result;
}

export const projectApi = {
  list: () => request('/api/projects'),
  create: (data) => request('/api/projects', 'POST', data),
  update: (id, data) => request('/api/projects/' + encodeURIComponent(id), 'PUT', data),
  remove: (id) => request('/api/projects/' + encodeURIComponent(id), 'DELETE'),
  share: (id) => request('/api/projects/' + encodeURIComponent(id) + '/share'),
  createShare: (id) => request('/api/projects/' + encodeURIComponent(id) + '/share', 'POST'),
  revokeShare: (id) => request('/api/projects/' + encodeURIComponent(id) + '/share', 'DELETE'),
  shared: (token) => request('/api/project-shares/' + encodeURIComponent(token)),
};

export const saveLocale = (locale) => request('/api/locale', 'POST', { locale });
