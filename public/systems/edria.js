import { bilingual as label, constructionPlugin } from './plugin.js';

export default constructionPlugin({
  id: 'edria', name: label('Édria', 'Édria'), accent: '#ac553a', provisional: true,
  description: label('Perfil demonstrativo para explorar plantas e comparar cenários Édria.',
    'Illustrative profile for exploring floor plans and comparing Édria scenarios.'),
  defaults: { wallThickness: 0.24, gridStep: 0.25, roomHeight: 2.65 },
  materials: [
    ['structure', label('Componente estrutural genérico', 'Generic structural component'), 'm²', 1.60, 170, .07],
    ['envelope', label('Isolamento e revestimento', 'Insulation and cladding'), 'm²', 1.37, 120, .08],
    ['interior', label('Revestimentos interiores', 'Interior finishes'), 'm²', 2.18, 64, .09],
    ['installation', label('Materiais de instalações', 'Building services materials'), 'm²', 1, 96, .03],
  ],
});
