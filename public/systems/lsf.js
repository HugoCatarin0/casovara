import { bilingual as label, constructionPlugin } from './plugin.js';

export default constructionPlugin({
  id: 'lsf', name: label('LSF engenheirado', 'Engineered LSF'), accent: '#4d6e6b',
  description: label('Estrutura leve em perfis de aço enformado a frio, com revestimentos em placas.',
    'Lightweight cold-formed steel framing clad with sheet materials.'),
  defaults: { wallThickness: 0.20, gridStep: 0.20, roomHeight: 2.60 },
  materials: [
    ['structure', label('Perfis de aço leve', 'Light-gauge steel sections'), 'kg', 29, 5.30, .06],
    ['envelope', label('Placas de revestimento', 'Sheathing boards'), 'm²', 2.40, 39, .09],
    ['envelope', label('Isolamento', 'Insulation'), 'm²', 2.25, 29, .08],
    ['interior', label('Placas interiores e acabamento', 'Interior boards and finishes'), 'm²', 2.70, 43.50, .09],
    ['installation', label('Materiais de instalações', 'Building services materials'), 'm²', 1, 102, .04],
  ],
});
