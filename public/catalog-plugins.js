export const catalogProviders = [{
  id: 'ikea-pt',
  pt: 'IKEA Portugal',
  en: 'IKEA Portugal',
  url: 'https://www.ikea.com/pt/pt/cat/moveis-fu001/',
  categories: [
    { id: 'living', pt: 'Sala', en: 'Living room' },
    { id: 'dining', pt: 'Sala de jantar', en: 'Dining' },
    { id: 'bedroom', pt: 'Quarto', en: 'Bedroom' },
    { id: 'storage', pt: 'Arrumação', en: 'Storage' },
    { id: 'office', pt: 'Escritório', en: 'Home office' },
    { id: 'kitchen', pt: 'Cozinha', en: 'Kitchen' },
    { id: 'bath', pt: 'Casa de banho', en: 'Bathroom' },
    { id: 'children', pt: 'Quarto infantil', en: 'Children’s room' },
    { id: 'outdoor', pt: 'Exterior', en: 'Outdoors' },
    { id: 'decor', pt: 'Iluminação e decoração', en: 'Lighting and décor' },
  ],
}];

export async function browseCatalog(providerId, { query, category, cursor, locale, signal } = {}) {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries({ query, category, cursor, locale })) {
    if (value) parameters.set(key, value);
  }
  const response = await fetch(`/api/catalogs/${encodeURIComponent(providerId)}?${parameters}`, { signal });
  if (!response.ok) throw new Error(`Object catalogue unavailable (${response.status})`);
  return response.json();
}
