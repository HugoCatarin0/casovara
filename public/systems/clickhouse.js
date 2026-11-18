import { bilingual as label, constructionPlugin } from './plugin.js';

export default constructionPlugin({
  id: 'clickhouse', name: label('ClickHouse', 'ClickHouse'), accent: '#925833', provisional: true,
  description: label('Perfil demonstrativo inspirado na montagem modular em kit.',
    'Illustrative profile inspired by modular kit assembly.'),
  defaults: { wallThickness: 0.18, gridStep: 0.30, roomHeight: 2.50 },
  materials: [
    ['structure', label('Componentes modulares genéricos', 'Generic modular components'), 'm²', 1.23, 202, .06],
    ['envelope', label('Painéis isolantes e remates', 'Insulated panels and trim'), 'm²', 1.46, 105, .06],
    ['interior', label('Acabamentos interiores', 'Interior finishes'), 'm²', 2.03, 58, .08],
    ['installation', label('Materiais de instalações', 'Building services materials'), 'm²', 1, 95, .04],
  ],
});
