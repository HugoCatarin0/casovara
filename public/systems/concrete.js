import { bilingual as label, constructionPlugin } from './plugin.js';

export default constructionPlugin({
  id: 'concrete', name: label('Betão armado', 'Reinforced concrete'), accent: '#696c63',
  description: label('Estrutura de betão armado com envolvente e acabamento selecionados para cada planta.',
    'Reinforced concrete structure with an envelope and finishes selected for each plan.'),
  defaults: { wallThickness: 0.28, gridStep: 0.25, roomHeight: 2.75 },
  materials: [
    ['structure', label('Betão pronto', 'Ready-mixed concrete'), 'm³', .48, 165, .08],
    ['structure', label('Armadura', 'Reinforcement'), 'kg', 38, 1.65, .07],
    ['structure', label('Cofragem e consumíveis', 'Formwork and consumables'), 'm²', 2.45, 52, .05],
    ['envelope', label('Fachada e isolamento', 'Facade and insulation'), 'm²', 1.47, 120, .09],
    ['interior', label('Revestimento interior', 'Interior finishes'), 'm²', 2.40, 58, .09],
    ['installation', label('Materiais de instalações', 'Building services materials'), 'm²', 1, 108, .05],
  ],
});
