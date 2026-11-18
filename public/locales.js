export const locales = ['pt-PT', 'en-PT', 'en-INT'];
export const languages = { 'pt-PT': 'Português (Portugal)', 'en-PT': 'English (Portugal)', 'en-INT': 'English (International)' };

export function languagePreferences(header = '') {
  return header.toLowerCase().split(',').map((entry) => {
    const [language, parameter = 'q=1'] = entry.trim().split(/\s*;\s*/);
    return { language, quality: Number(parameter.replace(/^q\s*=\s*/, '')) };
  }).filter(({ quality, language }) => quality > 0 && quality <= 1 && language !== '*')
    .sort((a, b) => b.quality - a.quality).map(({ language }) => language);
}

export function detectLocale(preferences = [], country = '') {
  const language = preferences.map((entry) => entry.toLowerCase()).find((entry) => /^(en|pt)(-|$)/.test(entry));
  if (language === 'pt' || language?.startsWith('pt-')) return 'pt-PT';
  if (language === 'en-pt' || country.toUpperCase() === 'PT') return 'en-PT';
  return 'en-INT';
}

export function translation(values, locale) {
  return values[locale] ?? values['en-INT'] ?? values['pt-PT'];
}
