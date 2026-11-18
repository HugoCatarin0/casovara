import { bilingual as label, constructionPlugin } from './plugin.js';

export default constructionPlugin({
  id: 'masonry', name: label('Alvenaria de tijolo', 'Brick masonry'), accent: '#a95745',
  description: label('Paredes construídas com tijolo e argamassa, com isolamento e acabamentos compatíveis.',
    'Brick and mortar walls with insulation and compatible finishes.'),
  defaults: { wallThickness: 0.27, gridStep: 0.25, roomHeight: 2.70 },
  materials: [
    ['structure', label('Tijolo cerâmico', 'Clay brick'), 'un', 26, 2.15, .08],
    ['structure', label('Argamassa e elementos estruturais', 'Mortar and structural elements'), 'm²', 1, 148, .05],
    ['envelope', label('Isolamento e revestimento exterior', 'External insulation and render'), 'm²', 1.45, 103, .09],
    ['interior', label('Reboco e acabamento interior', 'Plaster and interior finishes'), 'm²', 2.55, 51, .08],
    ['installation', label('Materiais de instalações', 'Building services materials'), 'm²', 1, 110, .05],
  ],
});
