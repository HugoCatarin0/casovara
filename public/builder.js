import { openBuilderReport } from './builder-report.js';
import { openBuilderShare } from './builder-share.js';
import { estimateProject, formatMoney, formatNumber, projectApi, systems } from './core.js';
import { makeTemplate, templates } from './templates.js';
import { applyWallAssembly, effectiveWallHeight, getWallSpec, normalizeOpening, normalizeWallSpec, wallAssemblies, wallSpecThickness } from './wall-spec.js';
import { renderOpeningFields, renderWallInspector, syncWallInspector } from './wall-inspector.js';
import { compileScene } from './model-renderer.js';
import { createModelViewer, initialModelCamera, modelImage } from './model-viewer.js';
import { dimensionLine, draftingBounds, draftingInk, interiorPlanDimensions, lowerFloorReference, openingSymbol, openingTags, openingsIndex, overallPlanDimensions, planPatterns, planRoomFill, selectedWallDimension, technicalWall } from './technical-plan.js';
import { simulatorDefaults, renderSimulatorControls, readSimulatorOption, syncSimulatorControls } from './simulator-controls.js';
import { normalizeSimulator } from './simulator.js';
import {
  clamp, clone, elements, escapeHtml as esc, findWall, levelBounds, makeItem, makeLevel, makeProject, makeRoom,
  makeWall, modelFaces, normalizeProject, point, projectArea, roomStyles, snapTo, uid, wallLength,
} from './builder-engine.js';

const icons = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  folder: '<path d="M3 7c0-1 .8-2 2-2h5l2 2h7c1 0 2 .9 2 2v9H3Z"/>',
  save: '<path d="M5 3h12l4 4v13H3V5c0-1 1-2 2-2Z M7 3v6h9V3 M7 20v-7h10v7"/>',
  export: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  undo: '<path d="M8 5 3 10l5 5m-5-5h11a6 6 0 0 1 6 6v2"/>',
  redo: '<path d="m16 5 5 5-5 5m5-5H10a6 6 0 0 0-6 6v2"/>',
  select: '<path d="M5 3 19 13l-7 1-4 7Z"/>',
  pan: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-2a5 5 0 0 1-4-2l-4-5a1.5 1.5 0 0 1 2-2l2 1Z"/>',
  room: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M8 4v3M4 8h3m13 8h-3m-1 4v-3"/>',
  wall: '<path d="M4 19V5h16M7 19V8h13"/>',
  angled: '<path d="M3 19h7l9-13m-16 9h5l8-11"/>',
  door: '<path d="M4 20h16M7 20V5h10v15M7 5l7-2v15l-7 2m4-8h.1"/>',
  window: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h16"/>',
  furnish: '<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3m-15 7v2m16-2v2M3 12a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v6H3Z"/>',
  measure: '<path d="m3 15 12-12 6 6L9 21Zm5-5 2 2m1-5 2 2m1-5 2 2"/>',
  text: '<path d="M5 6V4h14v2m-7-2v16m-4 0h8"/>',
  plan: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v11m0-4h8M4 9h4m-4 7h8"/>',
  cube: '<path d="M12 3 21 8v8l-9 5-9-5V8Zm0 18v-8m-9-5 9 5 9-5"/>',
  split: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M12 5v14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  fit: '<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  north: '<path d="m12 3 7 17-7-4-7 4Z"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="2" fill="currentColor"/><circle cx="16" cy="17" r="2" fill="currentColor"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 14h10l1-14m-8 3v8m4-8v8"/>',
  rotate: '<path d="M20 11a8 8 0 1 1-4-6l4 2m0-5v5h-5"/>',
  duplicate: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V4H4v12h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  edit: '<path d="m5 16-1 4 4-1L20 7l-3-3Zm10-10 3 3"/>',
  arrow: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 15 5-5 5 5 3-3 5 4"/><circle cx="16" cy="8" r="1"/>',
  grid: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9h16M4 15h16M9 4v16m6-16v16"/>',
  roof: '<path d="m3 11 9-7 9 7M5 10v10h14V10m-10 0 3-2 3 2"/>',
  camera: '<path d="M3 7h5l2-3h4l2 3h5v12H3Z"/><circle cx="12" cy="13" r="3"/>',
  stair: '<path d="M3 20v-4h6v-5h6V6h6V3"/>',
  rail: '<path d="M3 5h18M6 5v15m6-15v15m6-15v15"/>',
  file: '<path d="M6 3h8l4 4v14H6Zm8 0v5h4M9 12h6m-6 4h6"/>',
  external: '<path d="M13 4h7v7m0-7-9 9m7 0v7H4V6h7"/>',
};
icons.dock = '<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M14.5 5v14m3-10h.5m-.5 3h.5m-.5 3h.5"/>';
icons.sun = '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2m0 15v2M2.5 12h2m15 0h2M5.3 5.3l1.5 1.5m10.4 10.4 1.5 1.5m0-13.4-1.5 1.5M6.8 17.2l-1.5 1.5"/>';
const icon = (name, size = 19) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.65" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.room}</svg>`;
const labels = {
  commands: ['Pesquisar no projeto', 'Search project'], commandPlaceholder: ['Pesquise uma ferramenta, divisão ou vão', 'Search tools, rooms, or openings'], commandEmpty: ['Nenhum resultado.', 'No matching results.'], guides: ['Guias de construção', 'Construction guides'], calculators: ['Calculadoras', 'Calculators'],
  commandTools: ['Ferramentas', 'Tools'], commandEntities: ['Elementos do projeto', 'Project elements'],
  back: ['Início', 'Home'], builder: ['Estúdio de projeto', 'Design studio'], projects: ['Projetos', 'Projects'], project: ['Projeto', 'Project'], name: ['Nome do projeto', 'Project name'],
  change: ['Mudar nome', 'Rename'], new: ['Novo projeto', 'New project'], templates: ['Modelos de casa', 'House templates'], import: ['Importar projeto', 'Import project'], export: ['Exportar', 'Export'], share: ['Partilhar', 'Share'], sharing: ['Partilhar projeto', 'Share project'], fileShare: ['Envie o ficheiro do projeto para que outra pessoa possa abrir e editar a planta.', 'Send the project file so someone else can open and edit the floor plan.'],
  exportFile: ['Ficheiro do projeto (.json)', 'Project file (.json)'], exportPlan: ['Planta vetorial (.svg)', 'Vector drawing (.svg)'], exportPng: ['Imagem (.png)', 'Image (.png)'], print: ['Imprimir planta', 'Print plan'],
  save: ['Guardar', 'Save'], saving: ['A guardar…', 'Saving…'], saved: ['Guardado', 'Saved'], draft: ['Rascunho', 'Draft'], unsaved: ['Alterações por guardar', 'Unsaved changes'], saveError: ['O projeto não foi guardado. Tente novamente ou descarregue o ficheiro.', 'The project could not be saved. Try again or download the file.'], savedFile: ['Ficheiro descarregado.', 'File downloaded.'],
  select: ['Selecionar', 'Select'], pan: ['Mover vista', 'Pan'], room: ['Compartimento', 'Room'], wall: ['Parede ortogonal', 'Orthogonal wall'], angled: ['Parede livre', 'Angled wall'], door: ['Porta', 'Door'], window: ['Janela', 'Window'],
  furnish: ['Biblioteca de objetos', 'Object library'], measure: ['Cota', 'Dimension'], label: ['Texto', 'Text'],
  undo: ['Desfazer', 'Undo'], redo: ['Refazer', 'Redo'], plan: ['Planta', 'Plan'], view3d: ['3D', '3D'], split: ['Dividida', 'Split'],
  zoomIn: ['Ampliar', 'Zoom in'], zoomOut: ['Reduzir', 'Zoom out'], fit: ['Enquadrar planta', 'Fit plan'], rotateLeft: ['Rodar vista para a esquerda', 'Rotate view left'], rotateRight: ['Rodar vista para a direita', 'Rotate view right'], cutaway: ['Paredes seccionadas', 'Cutaway walls'],
  fitSelection: ['Enquadrar seleção', 'Fit selection'],
  modelScope: ['Edifício visível', 'Visible building'], modelAll: ['Casa inteira', 'Whole house'], modelThrough: ['Até ao piso atual', 'Up to current level'], modelLevel: ['Só o piso atual', 'Current level only'],
  showRoof: ['Mostrar cobertura', 'Show roof'], modelFit: ['Enquadrar modelo', 'Fit model'], modelCanvas: ['Modelo 3D', '3D model'], section: ['Corte', 'Cutaway'],
  perspective: ['Perspetiva', 'Perspective'], orthographic: ['Ortogonal', 'Orthographic'], modelProjection: ['Projeção da vista', 'View projection'],
  orbitHint: ['Arraste para rodar. Clique para selecionar. Use a roda ou dois dedos para aproximar.', 'Drag to orbit. Click to select. Use the wheel or two fingers to zoom.'],
  orbitHelp: ['Setas para rodar, Shift e setas para deslocar, mais e menos para aproximar e afastar.', 'Arrow keys orbit, Shift and arrows pan, plus and minus zoom.'],
  topView: ['Topo', 'Top'], isoView: ['Vista inicial', 'Starting view'], modelOrient: ['Orientar e guardar vistas', 'Orientation and saved views'],
  splitResize: ['Redimensionar planta e modelo', 'Resize plan and model'], modelRotate: ['Rotação e aproximação', 'Orbit and zoom'],
  levels: ['Pisos', 'Levels'], level: ['Piso', 'Level'], addLevel: ['Adicionar piso', 'Add level'], levelName: ['Nome do piso', 'Level name'], levelHeight: ['Pé-direito', 'Ceiling height'], removeLevel: ['Eliminar piso', 'Delete level'], removeLevelPrompt: ['Os elementos e as cotas deste piso serão eliminados.', 'The elements and dimensions on this level will be deleted.'],
  properties: ['Propriedades', 'Properties'], data: ['Medições', 'Quantities'], notes: ['Notas', 'Notes'], costs: ['Estimativa', 'Estimate'],
  siteSystem: ['Sistema construtivo', 'Construction system'], area: ['Área interior', 'Internal area'], roomArea: ['Área', 'Area'], costLabel: ['Custo indicativo', 'Indicative cost'], tax: ['IVA', 'VAT'], baseCost: ['Subtotal', 'Subtotal'], taxIncluded: ['Total c/ IVA', 'Total incl. VAT'],
  costNote: ['Valores de demonstração para planeamento. Peça um orçamento com base no terreno e no projeto final.', 'Demonstration figures for planning. Request a quote based on the plot and final design.'],
  structure: ['Estrutura', 'Structure'], envelope: ['Envolvente', 'Envelope'], interior: ['Interiores', 'Interiors'], installation: ['Instalações', 'Services'], details: ['Ver estimativa e quantidades', 'View estimate and quantities'],
  width: ['Largura', 'Width'], depth: ['Profundidade', 'Depth'], length: ['Comprimento', 'Length'], thickness: ['Espessura', 'Thickness'], angle: ['Rotação', 'Rotation'], type: ['Tipo', 'Type'], labelName: ['Nome', 'Name'],
  delete: ['Eliminar', 'Delete'], duplicate: ['Duplicar', 'Duplicate'], rotate: ['Rodar 90°', 'Rotate 90°'], newTemplate: ['Criar projeto', 'Create project'], cancel: ['Cancelar', 'Cancel'],
  drawingType: ['Tipo de compartimento', 'Room type'], pointFirst: ['Marque o primeiro ponto na planta.', 'Mark the first point on the plan.'], pointSecond: ['Marque o segundo ponto. Prima Esc para cancelar.', 'Mark the second point. Press Esc to cancel.'],
  chainMore: ['Marque o próximo ponto. Prima Enter para terminar.', 'Pick the next point. Press Enter to finish.'],
  finishDrawing: ['Terminar', 'Finish'],
  drawOptions: ['Opções de desenho', 'Drawing options'], snapDistance: ['Passo', 'Step'], temporarySnapOff: ['Alt desativa o ajuste temporariamente', 'Alt temporarily bypasses snapping'],
  placeItem: ['Clique ou toque na planta para colocar o objeto.', 'Click or tap the plan to place the object.'], placeOpening: ['Clique ou toque junto a uma parede para ancorar o vão.', 'Click or tap near a wall to anchor the opening.'], placeLabel: ['Clique ou toque na planta para colocar o texto.', 'Click or tap the plan to place the text.'],
  emptySelect: ['Selecione um elemento na planta para editar as suas propriedades.', 'Select an element in the plan to edit its properties.'],
  emptySelectModel: ['Selecione um elemento no modelo para editar as suas propriedades.', 'Select an element in the model to edit its properties.'],
  noProjects: ['Ainda não tem projetos guardados.', 'You have no saved projects yet.'], findProjects: ['Pesquisar projetos', 'Search projects'], removeProject: ['Eliminar projeto', 'Delete project'], removePrompt: ['O projeto guardado e os seus pisos serão eliminados.', 'The saved project and its levels will be deleted.'], removeError: ['Não foi possível eliminar o projeto.', 'The project could not be deleted.'], loadError: ['Não foi possível abrir a lista de projetos.', 'Your project list could not be opened.'],
  invalidFile: ['Abra um ficheiro de projeto Casovara válido.', 'Open a valid Casovara project file.'],
  tryTools: ['Selecione Compartimento ou Parede para começar.', 'Select Room or Wall to get started.'], emptyPlan: ['Desenhe a primeira divisão', 'Draw your first room'], empty3d: ['O seu modelo aparece aqui à medida que desenha a planta.', 'Your model appears here as you draw the plan.'],
  grid: ['Grelha', 'Grid'], snap: ['Ajustar à grelha', 'Snap to grid'], dimensions: ['Dimensões gerais', 'Overall dimensions'], furniture: ['Mobiliário', 'Furniture'], labels: ['Identificação de divisões', 'Room labels'], settings: ['Opções de visualização', 'Display options'],
  language: ['Idioma', 'Language'], keyboard: ['Atalhos de teclado', 'Keyboard shortcuts'], help: ['Ajuda', 'Help'], fitLabel: ['Enquadrar', 'Fit'],
  toolDeck: ['Mostrar ou recolher ferramentas', 'Show or collapse tools'], inspector: ['Painel de propriedades', 'Properties panel'],
  drawGroup: ['Desenho', 'Drawing'], navigateGroup: ['Navegação', 'Navigation'], componentsGroup: ['Elementos', 'Elements'], referenceGroup: ['Referência', 'Reference'],
  shortPan: ['Mover', 'Pan'], shortWall: ['Parede', 'Wall'], shortAngled: ['Inclinada', 'Angled'], shortRoom: ['Divisão', 'Room'], shortDetect: ['Detetar', 'Detect'], shortDivide: ['Dividir', 'Divide'], shortImage: ['Imagem base', 'Plan image'],
  planSheet: ['Vista de planta', 'Plan view'], terrainView: ['Vista do modelo', 'Model view'], previewLabel: ['Ambiente 3D', '3D environment'],
  drawingStyle: ['Estilo da planta', 'Plan style'], technical: ['Desenho técnico', 'Technical drawing'], furnished: ['Planta ilustrada', 'Illustrated plan'],
  openingTags: ['Identificadores e medidas dos vãos', 'Opening tags and widths'], wallLayers: ['Camadas e hachuras das paredes', 'Wall layers and hatching'], roomDimensions: ['Cotas por compartimento', 'Room dimensions'], lowerLevel: ['Piso inferior em referência', 'Show floor below'],
  roomTotal: ['Compartimentos', 'Rooms'], wallTotal: ['Comprimento de paredes', 'Wall length'], itemTotal: ['Objetos colocados', 'Objects placed'], openings: ['Vãos', 'Openings'], groupBath: ['Equipamento e exterior', 'Fixtures and outdoor'],
  copy: ['Copiar', 'Copy'], csv: ['Descarregar CSV', 'Download CSV'], copied: ['Copiado.', 'Copied.'], copyError: ['Não foi possível copiar.', 'Could not copy.'],
  notesPlaceholder: ['Anote decisões, materiais ou perguntas sobre o projeto.', 'Add decisions, materials, or questions about the project.'], notesLabel: ['Notas do projeto', 'Project notes'],
  outer: ['Laje', 'Slab'], deck: ['Terraço', 'Terrace'], roof: ['Cobertura', 'Roof'], ceiling: ['Teto', 'Ceiling'], floors: ['Pavimentos', 'Floors'], annotate: ['Anotar', 'Annotate'], visualise: ['Visualizar', 'Visualise'],
  stair: ['Escadas', 'Stairs'], rail: ['Guarda', 'Railing'], image: ['Imagem de referência', 'Reference image'], removeImage: ['Remover imagem de referência', 'Remove reference image'], invalidImage: ['Escolha PNG, JPEG ou WebP até 900 KB.', 'Choose a PNG, JPEG, or WebP up to 900 KB.'],
  camera: ['Guardar vista', 'Save view'], cameraList: ['Vistas guardadas', 'Saved views'], noCameras: ['Guarde uma vista do modelo para a recuperar mais tarde.', 'Save a model view to return to it later.'],
  applyFinish: ['Clique ou toque num compartimento para aplicar o acabamento.', 'Click or tap a room to apply the finish.'], shutter: ['Elementos', 'Elements'], info: ['Informações de projeto', 'Project information'], splitUpdate: ['Dividir compartimento', 'Divide room'], detectRoom: ['Detetar compartimento', 'Detect room'],
  summary: ['Resumo', 'Summary'], projectStatus: ['Estado do projeto', 'Project status'], referenceControls: ['Imagem em planta', 'Plan image'], imageOpacity: ['Opacidade da imagem', 'Image opacity'], imageWidth: ['Largura à escala', 'Scaled width'],
  allLevels: ['Todos os pisos', 'All levels'], currentLevel: ['Piso atual', 'Current level'], north: ['Norte', 'North'], autoDimensions: ['Cotas automáticas', 'Automatic dimensions'], wallChain: ['Cotar parede', 'Dimension wall'],
  roofPitch: ['Inclinação', 'Pitch'], flat: ['Plana', 'Flat'], gable: ['Duas águas', 'Gable'], hipped: ['Quatro águas', 'Hip'], none: ['Nenhuma', 'None'], roofs: ['Definições de cobertura', 'Roof settings'],
  flooring: ['Acabamento', 'Finish'], wood: ['Madeira', 'Timber'], ceramic: ['Cerâmica', 'Ceramic'], concrete: ['Betão', 'Concrete'], stone: ['Pedra', 'Stone'], natural: ['Padrão', 'Default'],
  levelConfiguration: ['Configuração do piso', 'Level configuration'], align: ['Ferramentas de desenho', 'Drawing tools'], tabs: ['Modos de visualização', 'View modes'], levelSelect: ['Selecionar piso', 'Select level'],
  mode: ['Modo de desenho', 'Drawing mode'], reset: ['Terminar desenho', 'Finish drawing'], exportError: ['Não foi possível gerar o ficheiro.', 'Could not generate the file.'],
};
const roomTypes = Object.keys(roomStyles);
const elementGroups = [
  ['openings', ['door', 'doubleDoor', 'window', 'slidingWindow']],
  ['furniture', ['sofa', 'table', 'bed', 'singleBed', 'cupboard', 'kitchen']],
  ['groupBath', ['bath', 'shower', 'toilet', 'tree', 'stair', 'rail']],
];
const toolSettings = { select: ['select', 'select'], pan: ['pan', 'pan'], room: ['room', 'room'], wall: ['wall', 'wall'], angled: ['angled', 'angled'], door: ['door', 'door'], window: ['window', 'window'], measure: ['measure', 'measure'], label: ['text', 'label'], divide: ['room', 'splitUpdate'], detect: ['fit', 'detectRoom'], roof: ['roof', 'roof'], ceiling: ['layers', 'ceiling'], flooring: ['grid', 'flooring'], wallChain: ['measure', 'wallChain'], north: ['north', 'north'] };
const categories = [
  { id: 'structure', icon: 'plan', tools: ['select', 'pan', 'wall', 'angled', 'room', 'detect', 'divide', 'door', 'window', 'stair', 'rail', 'image'] },
  { id: 'floors', icon: 'grid', tools: ['detect', 'room', 'divide', 'slab', 'deck', 'flooring'] },
  { id: 'ceiling', icon: 'layers', tools: ['ceiling'] },
  { id: 'roof', icon: 'roof', tools: ['roof'] },
  { id: 'furniture', icon: 'furnish', tools: ['catalog'] },
  { id: 'annotate', icon: 'measure', tools: ['measure', 'wallChain', 'autoDimensions', 'label', 'north', 'export'] },
  { id: 'visualise', icon: 'camera', tools: ['view3d', 'camera', 'cameraList', 'exportPng'] },
];

const shortcuts = { select: 'V', pan: 'H', wall: 'W', angled: 'A', room: 'R', detect: 'D', divide: 'X', door: 'G', window: 'O', measure: 'M', label: 'T', fit: 'F' };
const structureGroups = [
  ['navigateGroup', ['select', 'pan']],
  ['drawGroup', ['wall', 'angled', 'room', 'detect', 'divide']],
  ['componentsGroup', ['door', 'window', 'stair', 'rail']],
  ['referenceGroup', ['image']],
];
const fieldForMode = { plan: 'plan', '3d': 'view3d', split: 'split' };
const modeKeys = { '1': 'plan', '2': 'view3d', '3': 'split' };
const shortToolLabels = { pan: 'shortPan', wall: 'shortWall', angled: 'shortAngled', room: 'shortRoom', detect: 'shortDetect', divide: 'shortDivide', image: 'shortImage' };

export async function renderBuilder(root, { locale, homeUrl = '/', appUrl = '/app', setLocale }) {
  const isPt = locale === 'pt-PT';
  const tr = (key) => labels[key]?.[isPt ? 0 : 1] ?? key;
  const localized = (item) => item?.[isPt ? 'pt' : 'en'] ?? '';
  const lng = (item) => typeof item === 'string' ? item : item?.[locale] ?? item?.['en-INT'] ?? item?.['pt-PT'] ?? '';
  const n = (number, places = 2) => formatNumber(number, locale, places);
  const money = (number) => formatMoney(number, locale);
  const str = (value) => esc(value ?? '');
  const systemIds = systems.map((system) => system.id);
  const defaultSystem = systemIds[0];
  const query = new URLSearchParams(location.search);
  const token = query.get('share');
  const shared = token ? await projectApi.shared(token).catch(() => null) : null;
  const requestedSystem = systemIds.includes(query.get('system')) ? query.get('system') : null;
  const starter = shared ?? makeTemplate(query.get('template'), locale);
  let project = clean(starter ?? makeProject('courtyard', requestedSystem ?? defaultSystem, isPt));
  if (requestedSystem && !shared) project.systemId = requestedSystem;
  let projectId = null;
  let projectList = [];
  let revision = 0;
  let savedRevision = 0;
  let saveTimer;
  let savePromise;
  let tool = 'select';
  let category = 'structure';
  let roomType = 'living';
  let activeFinish = 'natural';
  let newWallThickness = null;
  let newWallAssembly = 'custom';
  let planOptionsKey = '';
  let objectType = 'door';
  let viewMode = Object.hasOwn(fieldForMode, query.get('view')) ? fieldForMode[query.get('view')] : 'plan';
  let selected = null;
  let pendingPoint = null;
  let hoverPoint = null;
  let constrainAngle = false;
  let spacePan = false;
  let planFrame = 0;
  let redrawPlan = false;
  let movePlanViewport = false;
  let paintedGrid = '';
  let drag = null;
  let inspectorTab = 'properties';
  let inspectorOpen = window.matchMedia('(min-width: 1000px)').matches;
  let toolbarOpen = true;
  let mobileCatalog = false;
  let vat = 23;
  let allLevels = true;
  let cutaway = query.get('model') !== 'exterior';
  let showRoof = true;
  let modelScope = cutaway ? 'through' : 'all';
  let simulator = { ...simulatorDefaults };
  let sceneCache;
  let toastTimer;
  let modal = '';
  let currentModalData = {};
  let fromFocus;
  let camera = { x: 0, y: 0, zoom: 1, bounds: null };
  let pen = new Map();
  let pinch = null;
  let preventClick = false;
  let settings = { grid: true, snap: true, dimensions: true, furniture: true, labels: true,
    drawingStyle: 'technical', openingTags: true, wallLayers: true, roomDimensions: false, lowerLevel: false };
  const history = [];
  const future = [];
  const controller = new AbortController();
  const listen = { signal: controller.signal };

  function clean(raw) {
    const state = normalizeProject(raw, systemIds, isPt);
    state.notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 8000) : '';
    state.cameras = Array.isArray(raw.cameras) ? raw.cameras.filter((cam) => cam && typeof cam.name === 'string' && Number.isFinite(cam.orbit) && viewLevel(state, cam.levelId)).slice(0, 30).map((cam) => ({
      id: typeof cam.id === 'string' && /^[\w-]{1,90}$/.test(cam.id) ? cam.id : uid(), name: cam.name.slice(0, 80),
      orbit: clamp(cam.orbit, -360, 360), levelId: cam.levelId, cutaway: !!cam.cutaway, roof: cam.roof !== false,
      scope: ['level', 'through', 'all'].includes(cam.scope) ? cam.scope : 'through',
      projection: cam.projection === 'perspective' ? 'perspective' : 'orthographic',
      elevation: Number.isFinite(cam.elevation) ? clamp(cam.elevation, 3, 90) : 29,
      zoom: Number.isFinite(cam.zoom) ? clamp(cam.zoom, .3, 9) : 1,
      panX: Number.isFinite(cam.panX) ? clamp(cam.panX, -20, 20) : 0,
      panY: Number.isFinite(cam.panY) ? clamp(cam.panY, -20, 20) : 0,
      environment: cam.environment ? normalizeSimulator(cam.environment) : undefined,
    })) : [];
    state.levels.forEach((entry, index) => {
      const source = raw.levels.find(({ id }) => id === entry.id) ?? raw.levels[index];
      entry.annotations = Array.isArray(source?.annotations) ? source.annotations.filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y)).slice(0, 200).map((item) => ({ id: typeof item.id === 'string' && /^[\w-]{1,90}$/.test(item.id) ? item.id : uid(), x: clamp(item.x, -500, 500), y: clamp(item.y, -500, 500), text: typeof item.text === 'string' ? item.text.slice(0, 160) : '', north: !!item.north })) : [];
      entry.roof = ['flat', 'gable', 'hipped'].includes(source?.roof) ? source.roof : 'none';
      entry.pitch = Number.isFinite(source?.pitch) ? clamp(source.pitch, 5, 65) : 30;
      entry.ceiling = !!source?.ceiling;
      entry.rooms.forEach((room, roomIndex) => {
        const original = source?.rooms?.find?.((item) => item?.id === room.id) ?? source?.rooms?.[roomIndex];
        if (['wood', 'ceramic', 'concrete', 'stone'].includes(original?.finish)) room.finish = original.finish;
      });
      for (const wall of entry.walls) {
        const original = source?.walls?.find?.((item) => item?.id === wall.id);
        if (entry.rooms.some(({ id }) => original?.roomId === id)) wall.roomId = original.roomId;
        const spec = normalizeWallSpec(original?.spec, wall.thickness);
        if (spec) {
          wall.spec = spec;
          wall.thickness = wallSpecThickness(spec);
        }
      }
      for (const item of entry.items.filter(({ type }) => elements[type].opening)) {
        const original = source?.items?.find?.((candidate) => candidate?.id === item.id);
        const opening = normalizeOpening(original?.opening, item.type);
        if (opening) item.opening = opening;
      }
      const image = source?.image;
      if (image && typeof image.src === 'string' && /^data:image\/(png|jpeg|webp);base64,[a-zA-Z\d+/=]+$/.test(image.src) && image.src.length <= 1_250_000 && [image.x, image.y, image.width, image.height, image.opacity].every(Number.isFinite)) {
        entry.image = { src: image.src, x: clamp(image.x, -500, 500), y: clamp(image.y, -500, 500), width: clamp(image.width, 0.3, 100), height: clamp(image.height, 0.3, 100), opacity: clamp(image.opacity, 0.05, 0.95) };
      }
    });
    return state;
  }

  function viewLevel(state, id) { return state.levels.find((item) => item.id === id); }
  function level() { return viewLevel(project, project.levelId) ?? project.levels[0]; }
  function systemOptions(value) { return systems.map((system) => `<option value="${str(system.id)}" ${system.id === value ? 'selected' : ''}>${str(lng(system.name))}</option>`).join(''); }
  function roomOptions(value) { return roomTypes.map((type) => `<option value="${type}" ${type === value ? 'selected' : ''}>${str(localized(roomStyles[type]))}</option>`).join(''); }
  function toolbarButton(action, symbol, key, extra = '', visibleText = false, shortcut = '') {
    const title = str(shortcut ? `${tr(key)} (${shortcut})` : tr(key));
    const caption = typeof visibleText === 'string' ? visibleText : key;
    return `<button type="button" class="cv-tool" data-action="${action}" ${extra} ${shortcut ? `aria-keyshortcuts="${shortcut}"` : ''} title="${title}" aria-label="${str(tr(key))}">${icon(symbol)}${visibleText ? `<span>${str(tr(caption))}</span>` : ''}${shortcut ? `<kbd aria-hidden="true">${shortcut}</kbd>` : ''}</button>`;
  }
  function status(statusKey) {
    const target = root.querySelector('[data-role="status"]');
    target.dataset.status = statusKey;
    target.innerHTML = `<i></i><span>${str(tr(statusKey))}</span>`;
  }

  root.innerHTML = `<div class="cv-studio" lang="${isPt ? 'pt-PT' : locale === 'en-PT' ? 'en-GB' : 'en'}">
    <header class="cv-top">
      <a class="cv-builder-brand" href="${str(homeUrl)}" aria-label="Casovara · ${tr('back')}"><img src="/brand.svg" width="26" height="26" alt=""><b>casovara</b></a>
      <div class="cv-project-heading">
        <button class="cv-folder" data-action="projects" type="button" title="${tr('projects')}" aria-label="${tr('projects')}">${icon('folder')}</button>
        <label><span class="cv-sr-only">${tr('name')}</span><input data-role="name" data-field="name" maxlength="95" value="${str(project.name)}"></label>
        <span class="cv-status" data-role="status" aria-live="polite"></span>
      </div>
      <div class="cv-top-actions">
        <button class="cv-tool cv-search-trigger" type="button" data-action="commands" aria-label="${tr('commands')}" title="${tr('commands')}">${icon('search', 16)}<span>${tr('commands')}</span><kbd>⌘/Ctrl K</kbd></button>
        ${toolbarButton('help', 'info', 'help')}
        ${toolbarButton('export', 'export', 'export', '', true)}
        <button class="cv-button cv-primary" data-action="save" type="button" aria-label="${tr('save')}">${icon('save', 17)}<span>${tr('save')}</span></button>
      </div>
    </header>
    <div class="cv-ribbon" aria-label="${tr('align')}">
      <div class="cv-history">${toolbarButton('undo', 'undo', 'undo')}${toolbarButton('redo', 'redo', 'redo')}</div>
      <div class="cv-categories" data-role="categories"></div>
      <div class="cv-ribbon-actions">
        ${toolbarButton('settings', 'settings', 'settings', '', true)}
        ${toolbarButton('toggle-tools', 'chevron', 'toolDeck', 'aria-expanded="true" aria-controls="cv-tool-deck"')}
      </div>
    </div>
    <main class="cv-workspace">
      <div class="cv-stage">
        <div class="cv-stage-header">
          <div class="cv-view-tabs" role="group" aria-label="${tr('tabs')}">
            ${toolbarButton('mode:plan', 'plan', 'plan', '', true)}${toolbarButton('mode:view3d', 'cube', 'view3d', '', true)}${toolbarButton('mode:split', 'split', 'split', '', true)}
          </div>
          <div class="cv-level-control">
            ${icon('layers', 17)}<select data-field="levelId" aria-label="${tr('levelSelect')}"></select>${toolbarButton('levels', 'plus', 'levels')}
          </div>
          <button class="cv-inspector-toggle cv-tool" type="button" data-action="inspector" aria-controls="cv-studio-inspector" title="${tr('inspector')}" aria-label="${tr('inspector')}">${icon('dock')}</button>
        </div>
        <div class="cv-tool-deck" id="cv-tool-deck">
          <div class="cv-drawing-tools" data-role="tools" role="group" aria-label="${tr('mode')}"></div>
          <div class="cv-plan-options" data-role="plan-options" role="group" aria-label="${tr('drawOptions')}" hidden></div>
        </div>
        <div class="cv-view" data-role="view" data-mode="plan">
          <section class="cv-draft" aria-label="${tr('plan')}">
            <svg data-role="plan" xmlns="http://www.w3.org/2000/svg" aria-label="${tr('plan')}" role="img" tabindex="0" preserveAspectRatio="none"><g data-plan-grid pointer-events="none"></g><g data-plan-scene></g><g data-plan-overlay></g></svg>
            <div class="cv-empty" data-role="empty" hidden><b>${tr('emptyPlan')}</b><p>${tr('tryTools')}</p><button class="cv-button" data-action="new" type="button">${tr('templates')}</button></div>
            <div class="cv-canvas-controls cv-plan-controls">
              <div class="cv-plan-reference">
                <span class="cv-compass" aria-label="${tr('north')}" title="${tr('north')}">${icon('north', 18)}<small>N</small></span>
                <span class="cv-plan-ruler" data-role="plan-ruler" aria-hidden="true"></span>
              </div>
              <button class="cv-tool cv-finish-drawing" data-action="finish-drawing" type="button" hidden>${icon('check', 16)}${tr('finishDrawing')}</button>
              <div class="cv-zoom">
                ${toolbarButton('zoom-out', 'minus', 'zoomOut')}<span data-role="zoom">100%</span>${toolbarButton('zoom-in', 'plus', 'zoomIn')}${toolbarButton('fit', 'fit', 'fit')}${toolbarButton('fit-selection', 'select', 'fitSelection', 'disabled')}
              </div>
            </div>
          </section>
          <button class="cv-splitter" data-role="splitter" type="button" role="separator" aria-label="${tr('splitResize')}" aria-orientation="vertical" aria-valuemin="25" aria-valuemax="75" aria-valuenow="50"></button>
          <section class="cv-model" aria-label="${tr('view3d')}">
            <canvas data-role="model" role="img" aria-label="${tr('modelCanvas')}" aria-describedby="cv-model-keys" tabindex="0"></canvas>
            <span id="cv-model-keys" class="cv-sr-only">${tr('orbitHelp')}</span>
            <div class="cv-model-toolbar" role="group" aria-label="${tr('modelScope')}">
              <select data-field="modelScope" aria-label="${tr('modelScope')}">
                <option value="all">${tr('modelAll')}</option><option value="through" selected>${tr('modelThrough')}</option><option value="level">${tr('modelLevel')}</option>
              </select>
              <button class="cv-tool" data-action="cutaway" type="button" title="${tr('cutaway')}" aria-label="${tr('cutaway')}">${icon('layers', 16)}<span>${tr('section')}</span></button>
              <button class="cv-tool" data-action="model-roof" type="button" title="${tr('showRoof')}" aria-label="${tr('showRoof')}">${icon('roof', 17)}</button>
              <select data-field="modelProjection" aria-label="${tr('modelProjection')}">
                <option value="perspective">${tr('perspective')}</option><option value="orthographic">${tr('orthographic')}</option>
              </select>
              ${toolbarButton('simulator', 'sun', 'previewLabel', 'aria-expanded="false" aria-controls="cv-simulator-panel"', true)}
            </div>
            ${renderSimulatorControls(locale, simulator)}
            <p class="cv-empty" data-role="empty-model" hidden>${tr('empty3d')}</p>
            <div class="cv-canvas-controls cv-model-controls">
              <button class="cv-model-bearing cv-tool" data-action="cameraList" type="button" title="${tr('modelOrient')}" aria-label="${tr('modelOrient')}">${icon('north', 17)}<span data-role="bearing"></span></button>
              <div class="cv-zoom" aria-label="${tr('modelRotate')}">
                ${toolbarButton('orbit-left', 'undo', 'rotateLeft')}${toolbarButton('orbit-right', 'redo', 'rotateRight')}${toolbarButton('model-zoom-out', 'minus', 'zoomOut')}${toolbarButton('model-zoom-in', 'plus', 'zoomIn')}${toolbarButton('model-fit', 'fit', 'modelFit')}
              </div>
            </div>
          </section>
        </div>
        <footer class="cv-stage-footer"><span data-role="hint"></span><span data-role="scale"></span></footer>
      </div>
      <aside class="cv-inspector" id="cv-studio-inspector" aria-label="${tr('inspector')}" data-role="inspector"></aside>
    </main>
    <dialog class="cv-dialog" data-role="dialog"></dialog>
    <input type="file" accept="application/json,.json,.casovara" hidden data-role="file"><input type="file" accept="image/png,image/jpeg,image/webp" hidden data-role="file-image">
    <div class="cv-toast" data-role="toast" hidden aria-live="polite"></div>
  </div>`;
  const studio = root.querySelector('.cv-studio');
  const plane = root.querySelector('[data-role="plan"]');
  const planGrid = plane.querySelector('[data-plan-grid]');
  const planScene = plane.querySelector('[data-plan-scene]');
  const planOverlay = plane.querySelector('[data-plan-overlay]');
  const fitSelected = root.querySelector('[data-action="fit-selection"]');
  const model = root.querySelector('[data-role="model"]');
  const simulatorPanel = root.querySelector('[data-role="simulator-panel"]');
  const simulatorToggle = root.querySelector('.cv-model-toolbar [data-action="simulator"]');
  const toolDeck = root.querySelector('#cv-tool-deck');
  const deckToggle = root.querySelector('[data-action="toggle-tools"]');
  const inspectorToggle = root.querySelector('[data-action="inspector"]');
  const dialog = root.querySelector('[data-role="dialog"]');
  const studioPanel = root.querySelector('[data-role="inspector"]');
  const view = root.querySelector('[data-role="view"]');
  const bearings = isPt ? ['S', 'SE', 'E', 'NE', 'N', 'NO', 'O', 'SO'] : ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
  const viewer = createModelViewer({
    canvas: model, signal: controller.signal, scene: currentModelScene,
    onCamera: ({ azimuth, elevation, projection }) => {
      root.querySelector('[data-role="bearing"]').textContent = `${bearings[Math.round(azimuth / 45) % 8]} · ${Math.round(elevation)}°`;
      root.querySelector('.cv-model-bearing').style.setProperty('--bearing', `${-azimuth}deg`);
      root.querySelector('[data-field="modelProjection"]').value = projection;
    },
    onEmpty: (empty) => { root.querySelector('[data-role="empty-model"]').hidden = !empty; },
    onPick: (picked) => {
      if (!picked) {
        if (selected) { selected = null; render(); }
        return;
      }
      if (picked.levelId !== project.levelId) switchLevel(picked.levelId);
      selected = { kind: picked.kind, id: picked.id };
      inspectorOpen = true;
      setActiveShape();
    },
  });
  const resize = new ResizeObserver(() => paint());
  resize.observe(view);
  resize.observe(model);
  resize.observe(plane);

  function toast(key) {
    const element = root.querySelector('[data-role="toast"]');
    element.textContent = tr(key);
    element.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { element.hidden = true; }, 4200);
  }
  function markChanged() {
    revision++;
    status('unsaved');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void saveNow(); }, 900);
  }
  function change(operation, redraw = true) {
    history.push(clone(project));
    if (history.length > 45) history.shift();
    future.length = 0;
    operation();
    markChanged();
    if (redraw) render();
  }
  function undo(redo = false) {
    const from = redo ? future : history;
    if (!from.length) return;
    (redo ? history : future).push(clone(project));
    project = from.pop();
    selected = null;
    pendingPoint = null;
    markChanged();
    render();
  }
  async function saveNow(force = false) {
    clearTimeout(saveTimer);
    if (savePromise) {
      const success = await savePromise;
      if (!success) return false;
    }
    if (savedRevision === revision && (projectId || !force)) return true;
    const saved = revision;
    const snapshot = clone(project);
    status('saving');
    savePromise = (async () => {
      try {
        const record = projectId ? await projectApi.update(projectId, snapshot) : await projectApi.create(snapshot);
        projectId = record.id;
        if (token || starter || requestedSystem) {
          const url = new URL(location.href);
          for (const parameter of ['share', 'template', 'system']) url.searchParams.delete(parameter);
          if (url.href !== location.href) window.history.replaceState(null, '', url);
        }
        projectList = [record, ...projectList.filter(({ id }) => id !== record.id)];
        savedRevision = saved;
        status(revision === saved ? 'saved' : 'unsaved');
        return true;
      } catch {
        status('unsaved');
        toast('saveError');
        return false;
      } finally {
        savePromise = null;
      }
    })();
    return savePromise;
  }
  function loadProject(next, id) {
    project = clean(next);
    projectId = id ?? null;
    revision = 0;
    savedRevision = 0;
    selected = null;
    newWallThickness = null;
    newWallAssembly = 'custom';
    drag = null;
    pendingPoint = null;
    history.length = 0;
    future.length = 0;
    mobileCatalog = false;
    tool = 'select';
    resetCamera();
    viewer.fit();
    status(projectId ? 'saved' : 'draft');
    render();
  }

  function resetCamera() {
    const bounds = levelBounds(level());
    camera = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, zoom: 1, bounds };
  }
  function fitExtent(rect = plane.getBoundingClientRect()) {
    const ratio = rect.width && rect.height ? rect.width / rect.height : 1.3;
    const bounds = camera.bounds ?? levelBounds(level());
    const horizontalMargin = ratio < .9 ? 2.55 : 4.9;
    const world = Math.max((bounds.width + horizontalMargin) / ratio, bounds.height + 3.5, 8);
    return { width: world * ratio / camera.zoom, height: world / camera.zoom };
  }
  function worldPixel(rect = plane.getBoundingClientRect()) {
    return fitExtent(rect).width / Math.max(rect.width, 1);
  }
  function planPosition(event) {
    const rect = plane.getBoundingClientRect();
    const unit = worldPixel(rect);
    return point(camera.x + (event.clientX - rect.left - rect.width / 2) * unit,
      camera.y + (event.clientY - rect.top - rect.height / 2) * unit);
  }
  function position(event, raw = false) {
    const p = planPosition(event);
    if (raw || !settings.snap || event.altKey) return p;
    if (['wall', 'angled', 'room', 'measure'].includes(tool)) {
      const threshold = Math.min(.38, worldPixel() * (event.pointerType === 'touch' ? 18 : 12));
      const nearest = nearestEndpoint(p, threshold);
      if (nearest) return nearest;
      const wall = findWall(p, level().walls, threshold * .73);
      if (wall) return { ...wall, snap: 'wall' };
    }
    return { x: snapTo(p.x, gridStep()), y: snapTo(p.y, gridStep()), snap: 'grid' };
  }
  function nearestEndpoint(p, threshold, excluded) {
    let nearest;
    for (const wall of level().walls) {
      if (wall.id === excluded) continue;
      for (const end of [point(wall.x1, wall.y1), point(wall.x2, wall.y2)]) {
        const distance = Math.hypot(p.x - end.x, p.y - end.y);
        if (distance < threshold) { threshold = distance; nearest = { ...end, snap: 'endpoint' }; }
      }
    }
    return nearest;
  }
  function maybeSnapEnd(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (tool !== 'wall' && !(['angled', 'measure'].includes(tool) && constrainAngle)) return end;
    const step = tool === 'wall' ? Math.PI / 2 : Math.PI / 4;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    const horizontal = Math.abs(Math.sin(angle)) < 1e-6;
    const vertical = Math.abs(Math.cos(angle)) < 1e-6;
    if (tool === 'wall' && end.wall) {
      const wall = end.wall;
      const span = horizontal ? wall.y2 - wall.y1 : wall.x2 - wall.x1;
      if (Math.abs(span) > 1e-6) {
        const ratio = ((horizontal ? start.y : start.x) - (horizontal ? wall.y1 : wall.x1)) / span;
        if (ratio >= 0 && ratio <= 1) return { x: wall.x1 + ratio * (wall.x2 - wall.x1), y: wall.y1 + ratio * (wall.y2 - wall.y1), snap: 'wall' };
      }
    }
    let result;
    if (horizontal) result = point(end.x, start.y);
    else if (vertical) result = point(start.x, end.y);
    else {
      const length = dx * Math.cos(angle) + dy * Math.sin(angle);
      result = point(start.x + length * Math.cos(angle), start.y + length * Math.sin(angle));
    }
    return { ...result, snap: Math.hypot(end.x - result.x, end.y - result.y) < .015 ? end.snap : 'axis' };
  }
  function updateMode() {
    view.dataset.mode = viewMode;
    for (const button of root.querySelectorAll('[data-action^="mode:"]')) button.setAttribute('aria-pressed', String(button.dataset.action === `mode:${viewMode}`));
    root.querySelector('[data-action="cutaway"]').setAttribute('aria-pressed', String(cutaway));
    root.querySelector('[data-action="model-roof"]').setAttribute('aria-pressed', String(showRoof && !cutaway));
    root.querySelector('[data-field="modelScope"]').value = modelScope;
    root.querySelector('[data-role="scale"]').hidden = viewMode === 'view3d';
    if (viewMode === 'plan') setSimulatorOpen(false);
  }
  function setSimulatorOpen(visible) {
    simulatorPanel.hidden = !visible;
    simulatorToggle.setAttribute('aria-expanded', String(visible));
  }
  function updateTools() {
    studio.dataset.tool = tool;
    studio.dataset.inspector = String(inspectorOpen);
    studio.dataset.catalog = String(mobileCatalog);
    toolDeck.hidden = !toolbarOpen;
    deckToggle.setAttribute('aria-expanded', String(toolbarOpen));
    inspectorToggle.setAttribute('aria-expanded', String(inspectorOpen));
    const active = categories.find(({ id }) => id === category);
    const categoryRow = root.querySelector('[data-role="categories"]');
    const toolRow = root.querySelector('[data-role="tools"]');
    const categoryScroll = categoryRow.scrollLeft, toolScroll = toolRow.scrollLeft;
    const focused = [categoryRow, toolRow].some((row) => row.contains(document.activeElement)) ? document.activeElement?.dataset.action : '';
    categoryRow.innerHTML = categories.map((cat) => toolbarButton(`category:${cat.id}`, cat.icon, cat.id, `aria-pressed="${category === cat.id}"`, true)).join('');
    categoryRow.scrollLeft = categoryScroll;
    const sameTools = toolRow.dataset.category === category;
    toolRow.dataset.category = category;
    const groups = category === 'structure' ? structureGroups : [['navigateGroup', ['select', 'pan']], [category, active.tools]];
    const renderTool = (id) => {
      const setting = toolSettings[id] || {
        catalog: ['furnish', 'furnish'], slab: ['room', 'outer'], deck: ['room', 'deck'], stair: ['stair', 'stair'], rail: ['rail', 'rail'], image: ['image', 'image'],
        view3d: ['cube', 'view3d'], camera: ['camera', 'camera'], cameraList: ['layers', 'cameraList'], export: ['export', 'export'], exportPng: ['image', 'exportPng'], autoDimensions: ['measure', 'autoDimensions'],
      }[id];
      const action = ['levels', 'image', 'view3d', 'camera', 'cameraList', 'export', 'exportPng', 'autoDimensions', 'roof', 'ceiling', 'flooring', 'catalog'].includes(id) ? id : `tool:${id}`;
      const pressed = tool === id || (id === 'ceiling' && !!level().ceiling) || (id === 'roof' && !['none', undefined].includes(level().roof)) || (id === 'catalog' && tool === 'item') || (id === 'slab' && tool === 'room' && roomType === 'circulation') || (id === 'deck' && tool === 'room' && roomType === 'outdoor');
      return toolbarButton(action, ...setting, `aria-pressed="${pressed}"`, shortToolLabels[id] ?? true, shortcuts[id]);
    };
    toolRow.innerHTML = groups.map(([label, tools]) => `<div class="cv-tool-group" role="group" aria-label="${tr(label)}"><span class="cv-tool-group-label" aria-hidden="true">${tr(label)}</span><div>${tools.map(renderTool).join('')}</div></div>`).join('');
    toolRow.scrollLeft = sameTools ? toolScroll : 0;
    if (focused) root.querySelector(`[data-action="${focused}"]`)?.focus({ preventScroll: true });
    root.querySelector('[data-action="undo"]').disabled = !history.length;
    root.querySelector('[data-action="redo"]').disabled = !future.length;
    fitSelected.disabled = !selected;
    const hint = pendingPoint ? ['wall', 'angled'].includes(tool) ? 'chainMore' : 'pointSecond' :
      ['room', 'wall', 'angled', 'measure'].includes(tool) ? 'pointFirst' :
      ['door', 'window'].includes(tool) || (tool === 'item' && elements[objectType].opening) ? 'placeOpening' :
      tool === 'item' ? 'placeItem' : tool === 'label' || tool === 'north' ? 'placeLabel' :
      tool === 'flooring' ? 'applyFinish' : tool === 'divide' || tool === 'detect' || tool === 'wallChain' ? toolSettings[tool][1] : tool === 'pan' ? 'pan' : 'emptySelect';
    root.querySelector('[data-role="hint"]').textContent = tr(viewMode === 'view3d' ? 'orbitHint' : hint);
    root.querySelector('[data-action="finish-drawing"]').hidden = !pendingPoint;
    renderPlanOptions();
  }

  function drawingWallSpec() {
    if (newWallAssembly === 'custom') return undefined;
    const basis = normalizeWallSpec({ exteriorFinish: 'lime', interiorFinish: 'plaster', exteriorSide: -1 }, profile().defaults?.wallThickness);
    return applyWallAssembly(basis, newWallAssembly);
  }

  function wallThickness() {
    const spec = drawingWallSpec();
    return spec ? wallSpecThickness(spec) : newWallThickness ?? profile().defaults?.wallThickness ?? .15;
  }

  function renderPlanOptions() {
    const options = root.querySelector('[data-role="plan-options"]');
    const wall = ['wall', 'angled'].includes(tool);
    const size = wallThickness();
    const step = gridStep();
    const nextKey = [tool, size, step, roomType, settings.snap, newWallAssembly].join(':');
    options.hidden = !wall && tool !== 'room' && tool !== 'measure';
    if (options.hidden || nextKey === planOptionsKey) return;
    planOptionsKey = nextKey;
    const assemblies = Object.keys(wallAssemblies).filter((id) => id !== 'custom').sort((a, b) => Number(b === project.systemId) - Number(a === project.systemId));
    const field = wall ? `<label>${isPt ? 'Composição' : 'Assembly'} <select data-field="newWallAssembly">
      <option value="custom">${isPt ? 'Espessura livre' : 'Free thickness'}</option>
      ${assemblies.map((id) => `<option value="${id}" ${id === newWallAssembly ? 'selected' : ''}>${wallAssemblies[id].label[isPt ? 0 : 1]}</option>`).join('')}
      </select></label><label>${tr('thickness')} <input type="number" inputmode="decimal" data-field="newWallThickness" min=".08" max="1" step=".001" value="${size}" ${newWallAssembly !== 'custom' ? 'disabled' : ''}> <span>m</span></label>`
      : tool === 'room' ? `<label>${tr('type')} <select data-field="roomType">${roomOptions(roomType)}</select></label>` : '';
    options.innerHTML = `<span class="cv-plan-option-name">${tr(tool)}</span>${field}
      <button type="button" class="cv-tool cv-plan-snap" data-action="snap-plan" aria-pressed="${settings.snap}" aria-label="${tr('snap')}" title="${tr('temporarySnapOff')}">
        ${icon('grid', 15)}<span>${tr('snapDistance')} ${n(step)} m</span>
      </button>`;
  }

  function render() {
    const input = root.querySelector('[data-role="name"]');
    if (document.activeElement !== input) input.value = project.name;
    root.querySelector('[data-field="levelId"]').innerHTML = project.levels.map((item) => `<option value="${item.id}" ${item.id === project.levelId ? 'selected' : ''}>${str(item.name)}</option>`).join('');
    updateMode();
    updateTools();
    renderInspector();
    paint();
  }

  function currentModelScene() {
    const key = [project, revision, project.levelId, cutaway, showRoof, modelScope, selected?.kind, selected?.id, simulator];
    if (!sceneCache?.key.every((value, index) => value === key[index])) {
      const faces = modelFaces(project, project.levelId, cutaway, { scope: modelScope, roof: showRoof, selected, simulator });
      sceneCache = { key, scene: compileScene(faces) };
    }
    return sceneCache.scene;
  }

  function modelPaint() {
    if (viewMode !== 'plan') viewer.paint();
  }

  const finishes = { wood: '#d9c4a1', ceramic: '#dce5e1', concrete: '#deded6', stone: '#e5dcd1' };
  const technicalDrawing = () => settings.drawingStyle === 'technical';
  function roomShape(room, active = false) {
    const style = roomStyles[room.type];
    const technical = technicalDrawing();
    const fill = technical ? planRoomFill(room) : finishes[room.finish] || style.fill;
    const box = `x="${room.x}" y="${room.y}" width="${room.w}" height="${room.h}"`;
    const stroke = active && technical ? draftingInk.accent : technical ? '#99acb8' : style.floor;
    const outdoor = room.type === 'outdoor';
    return `<rect data-shape="rooms" data-id="${room.id}" class="cv-room-fill${active ? ' cv-active-shape' : ''}" ${box} fill="${fill}" stroke="${stroke}" stroke-width=".035" ${outdoor ? 'stroke-dasharray=".13 .12"' : ''}/>` +
      (technical && outdoor ? `<rect ${box} fill="url(#cv-plan-outdoor)" pointer-events="none"/>` : '');
  }
  function furnitureOutline(item) {
    const radians = item.angle * Math.PI / 180;
    const sine = Math.abs(Math.sin(radians));
    const cosine = Math.abs(Math.cos(radians));
    const depth = item.depth + (item.type === 'table' ? .42 : 0);
    return { x: item.x, y: item.y, halfW: (item.width * cosine + depth * sine) / 2, halfH: (item.width * sine + depth * cosine) / 2 };
  }
  function roomCaption(room, obstacles, unit) {
    const roomStyle = roomStyles[room.type];
    const roomName = room.name || localized(roomStyle);
    const size = Math.min(Math.max(.23, unit * 13), room.w * .29, room.h * .27);
    const letters = Math.floor((room.w - size * .30) / (size * .53));
    if (size < unit * 8 || letters < 3) return '';
    const wrap = roomName.length > letters && room.h > size * 3.8 ? roomName.lastIndexOf(' ', letters) : -1;
    const fit = (line) => line.length <= letters ? line : line.slice(0, letters - 1).trimEnd() + '…';
    const titles = wrap > 0 ? [roomName.slice(0, wrap), fit(roomName.slice(wrap + 1))] : [fit(roomName)];
    const showArea = room.h > size * (titles.length + 2.1);
    const halfW = Math.min(room.w * .48, Math.max(5, ...titles.map((title) => title.length)) * size * .30 + size * .28);
    const halfH = Math.min(room.h * .44, size * (titles.length * .55 + (showArea ? .68 : .15)));
    const center = point(room.x + room.w / 2, room.y + room.h / 2);
    const offsets = [[0, 0], [0, .22], [0, -.22], [-.21, 0], [.21, 0], [-.22, .22], [.22, .22], [-.22, -.22], [.22, -.22], [0, .35], [0, -.35]];
    const position = offsets.map(([x, y]) => point(center.x + room.w * x, center.y + room.h * y)).find(({ x, y }) =>
      x - halfW >= room.x && x + halfW <= room.x + room.w && y - halfH >= room.y && y + halfH <= room.y + room.h &&
      !obstacles.some((item) => Math.abs(x - item.x) < halfW + item.halfW && Math.abs(y - item.y) < halfH + item.halfH)) || center;
    const technical = technicalDrawing();
    const backdrop = technical ? draftingInk.halo : position === center ? '#fffdf4' : finishes[room.finish] || roomStyle.fill;
    const titleColor = technical ? draftingInk.text : '#29352e';
    const areaColor = technical ? draftingInk.line : '#425448';
    const baseline = position.y + size * (.32 - .54 * (titles.length - 1 + Number(showArea)));
    return `<g class="cv-room-caption" pointer-events="none" text-anchor="middle">
      <text x="${position.x}" y="${baseline}" font-size="${size}" font-weight="690" paint-order="stroke" stroke="${backdrop}" stroke-width="${size * .25}" stroke-linejoin="round" fill="${titleColor}">${titles.map((title, index) => `<tspan x="${position.x}" dy="${index ? '1.08em' : '0'}">${str(title)}</tspan>`).join('')}</text>
      ${showArea ? `<text x="${position.x}" y="${baseline + size * 1.08 * titles.length}" font-size="${size * .81}" fill="${areaColor}" paint-order="stroke" stroke="${backdrop}" stroke-width="${size * .24}" stroke-linejoin="round">${n(room.w * room.h, 1)} m²</text>` : ''}
    </g>`;
  }
  function itemShape(item, active = false, preview = false, walls = level().walls) {
    const data = elements[item.type];
    if (!data) return '';
    const { x, y, width: w, depth: h, angle } = item;
    const technical = technicalDrawing();
    const fill = technical ? '#536f82' : data.color;
    const stroke = active ? draftingInk.accent : technical ? '#586e7f' : '#555b4e';
    const furnitureColor = (color) => technical && color[0] === '#' ? `${color}65` : color;
    const rect = (px, py, width, height, color = 'none', radius = 0) => `<rect x="${px}" y="${py}" width="${width}" height="${height}" rx="${radius}" fill="${furnitureColor(color)}" stroke="${stroke}" stroke-width=".023"/>`;
    const line = (d, color = stroke, width = 0.022, dash = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
    let shape = '';
    if (data.opening) {
      const wall = findWall(item, walls, 0.14, w)?.wall;
      shape = openingSymbol(item, wall?.thickness ?? .15, { active, technical });
    } else if (item.type === 'sofa') {
      shape = rect(-w / 2, -h / 2, w, h, '#a4ad95', 0.12) + rect(-w * 0.41, -h * 0.25, w * 0.82, h * 0.66, '#bfcaaf', 0.05) + line(`M0 ${-h * 0.25}V${h * 0.4}`);
    } else if (item.type === 'table') {
      shape = rect(-w / 2, -h / 2, w, h, '#ccae8a', 0.11);
      for (const side of [-1, 1]) for (const offset of [-0.25, 0.25]) shape += rect(w * offset - 0.18, side * (h / 2 + 0.12) - 0.09, 0.36, 0.18, '#e4d2b3', 0.065);
    } else if (item.type === 'bed' || item.type === 'singleBed') {
      shape = rect(-w / 2, -h / 2, w, h, '#e9d3cb', 0.07) + rect(-w / 2, -h / 2, w, h * 0.09, '#b88877', 0.025) + rect(-w * 0.46, -h * 0.15, w * 0.92, h * 0.61, '#d5aba0', 0.05);
      const pillows = item.type === 'bed' ? 2 : 1;
      for (let index = 0; index < pillows; index++) shape += rect(-w * 0.39 + w * 0.43 * index, -h * 0.37, w * (pillows === 2 ? 0.36 : 0.78), h * 0.19, '#f2e8de', 0.06);
    } else if (item.type === 'tree') {
      shape = `<ellipse cx="0" cy="0" rx="${w / 2}" ry="${h / 2}" fill="#a9bca0" stroke="${stroke}" stroke-width=".028"/><ellipse rx="${w * 0.34}" ry="${h * 0.39}" fill="none" stroke="#637d63" stroke-dasharray=".08 .08" stroke-width=".028"/><path d="M-.11 0h.22m-.11-.11v.22" stroke="#637d63" stroke-width=".033"/>`;
    } else if (item.type === 'bath' || item.type === 'shower' || item.type === 'toilet') {
      shape = rect(-w / 2, -h / 2, w, h, '#d7e4df', item.type === 'shower' ? 0.04 : 0.11);
      shape += item.type === 'toilet' ? `<ellipse cx="0" cy="${-h * 0.08}" rx="${w * 0.35}" ry="${h * 0.31}" fill="#f2f3e9" stroke="${stroke}" stroke-width=".024"/>` : rect(-w * 0.41, -h * 0.4, w * 0.82, h * 0.8, '#eef0e6', 0.08);
      shape += `<circle cx="${w * 0.29}" cy="0" r=".045" fill="${fill}"/>`;
    } else if (item.type === 'kitchen') {
      shape = rect(-w / 2, -h / 2, w, h, '#d9c6ac', 0.027) + line(`M${-w * 0.16} ${-h / 2}V${h / 2}M${w * 0.16} ${-h / 2}V${h / 2}`) + rect(w * 0.22, -h * 0.31, w * 0.2, h * 0.62, '#dce5de', 0.06);
      for (const dx of [-0.38, -0.26]) for (const dy of [-0.18, 0.18]) shape += `<circle cx="${w * dx}" cy="${h * dy}" r=".065" fill="none" stroke="${stroke}" stroke-width=".028"/>`;
    } else if (item.type === 'stair' || item.type === 'rail') {
      shape = rect(-w / 2, -h / 2, w, h, item.type === 'stair' ? '#d4c5aa' : '#9a8168', 0.027);
      if (item.type === 'stair') {
        for (let index = 1; index < 8; index++) shape += line(`M${-w / 2} ${-h / 2 + h * index / 8}h${w}`);
        shape += line(`M0 ${h * .37}V${-h * .38}m-.12 .13 .12-.13 .12 .13`);
      }
    } else {
      shape = rect(-w / 2, -h / 2, w, h, '#d4b895', 0.027) + line(`M0 ${-h / 2}v${h}`);
    }
    return `<g data-shape="items" data-id="${item.id}" transform="translate(${x} ${y}) rotate(${angle})" ${preview ? 'opacity=".56" pointer-events="none"' : ''}>${shape}${active ? `<rect class="cv-active-shape" x="${-w / 2 - 0.07}" y="${-h / 2 - 0.07}" width="${w + 0.14}" height="${h + 0.14}" fill="none" stroke-width=".045" stroke-dasharray=".12 .08" pointer-events="none"/>` : ''}</g>`;
  }

  function measurementShape(measure, active = false, offsets = false, unit = .022) {
    if (technicalDrawing()) return dimensionLine(measure, unit, n, { automatic: offsets, active });
    const { x1, y1, x2, y2 } = measure;
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 0.04) return '';
    const dx = (x2 - x1) / length;
    const dy = (y2 - y1) / length;
    const accent = active ? '#a6462c' : '#4f5d52';
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const rotation = angle > 95 ? angle - 180 : angle < -95 ? angle + 180 : angle;
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const lineWidth = Math.min(unit * (active ? 1.5 : 1), .07);
    const tick = unit * 5;
    const labelSize = Math.max(.19, unit * 11);
    return `<g ${offsets ? 'pointer-events="none"' : `data-shape="measurements" data-id="${measure.id}"`}>
      ${offsets ? '' : `<path d="M${x1},${y1}L${x2},${y2}" stroke="transparent" stroke-width="${unit * 14}" pointer-events="stroke"/>`}
      <path d="M${x1},${y1}L${x2},${y2}M${x1 - dy * tick},${y1 + dx * tick}l${dy * 2 * tick},${-dx * 2 * tick}M${x2 - dy * tick},${y2 + dx * tick}l${dy * 2 * tick},${-dx * 2 * tick}" stroke="${accent}" stroke-width="${lineWidth}" fill="none"/>
      <text x="${centerX}" y="${centerY}" transform="rotate(${rotation} ${centerX} ${centerY})" dy="-${labelSize * .49}" text-anchor="middle" font-size="${labelSize}" font-weight="560" fill="${accent}" stroke="#faf8f2" stroke-width="${labelSize * .23}" stroke-linejoin="round" paint-order="stroke">${n(length)} m</text>
    </g>`;
  }
  function guides(bounds, unit) {
    const { x, y, width, height } = bounds;
    const gap = Math.max(.42, unit * 20);
    const inset = Math.max(.11, unit * 6);
    const extension = Math.max(.11, unit * 6);
    return `<path pointer-events="none" d="M${x} ${y - inset}v-${gap + extension - inset}M${x + width} ${y - inset}v-${gap + extension - inset}M${x - inset} ${y}h-${gap + extension - inset}M${x - inset} ${y + height}h-${gap + extension - inset}" fill="none" stroke="#89958a" stroke-width="${unit * .8}"/>` +
      measurementShape({ x1: x, y1: y - gap, x2: x + width, y2: y - gap }, false, true, unit) +
      measurementShape({ x1: x - gap, y1: y, x2: x - gap, y2: y + height }, false, true, unit);
  }
  function wallShape(wall, active = false, forExport = false, unit = .022) {
    if (technicalDrawing()) return technicalWall(wall, { active, forExport, layers: settings.wallLayers, unit });
    const coordinates = `x1="${wall.x1}" y1="${wall.y1}" x2="${wall.x2}" y2="${wall.y2}"`;
    return `<g class="cv-plan-wall${active ? ' cv-plan-wall-active' : ''}" data-shape="walls" data-id="${wall.id}">
      ${forExport ? '' : `<line ${coordinates} stroke="transparent" stroke-width="12" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`}
      <line class="cv-plan-wall-line" ${coordinates} stroke="${active ? '#a6462c' : '#374638'}" stroke-width="${wall.thickness}" stroke-linecap="square"/>
    </g>`;
  }
  function annotationShape(item, active) {
    const color = active ? draftingInk.accent : technicalDrawing() ? draftingInk.text : '#424539';
    return `<g data-shape="annotations" data-id="${item.id}" fill="${color}">${item.north ? `<path d="M${item.x} ${item.y - .43}l.17 .46-.17-.13-.17 .13Z"/>` : ''}<text x="${item.x}" y="${item.y}" font-size=".22" font-weight="600" stroke="${technicalDrawing() ? draftingInk.halo : '#faf8f2'}" stroke-width=".047" paint-order="stroke">${str(item.text)}</text></g>`;
  }

  function draftLayer(forExport = false, unit = .022, compact = false) {
    const current = level();
    const activeShape = (kind, id) => !forExport && selected?.kind === kind && selected.id === id;
    const moving = !forExport && drag?.type === 'shape' && drag.moved ? drag : null;
    const shifted = moving?.geometry;
    const image = current.image;
    const background = image ? `<image x="${image.x}" y="${image.y}" width="${image.width}" height="${image.height}" opacity="${image.opacity}" href="${image.src}" preserveAspectRatio="none" pointer-events="none"/>` : '';
    const moved = (kind, item) => moving?.id === item.id && moving.kind === kind ? moving.preview : shifted?.[kind]?.get(item.id) ?? item;
    const visibleRooms = current.rooms.map((room) => moved('rooms', room));
    const visibleWalls = current.walls.map((wall) => moved('walls', wall));
    const visibleItems = current.items.filter((item) => settings.furniture || elements[item.type].opening).map((item) => moved('items', item));
    const technical = technicalDrawing();
    const lowerLevel = !forExport && settings.lowerLevel ? project.levels[project.levels.indexOf(current) - 1] : null;
    const reference = lowerFloorReference(lowerLevel, unit);
    const outline = settings.dimensions && (visibleRooms.length || visibleWalls.length) ?
      technical ? overallPlanDimensions(visibleWalls, visibleRooms, unit, n) :
        guides(levelBounds({ ...current, rooms: visibleRooms, walls: visibleWalls, items: [], measurements: [] }), unit) : '';
    const obstacles = settings.labels ? visibleItems.filter((item) => !elements[item.type].opening).slice(0, 200).map(furnitureOutline) : [];
    const limit = settings.openingTags && (settings.dimensions || compact) ? draftingBounds(visibleWalls, visibleRooms) : null;
    const tags = settings.openingTags ? openingTags(visibleItems, visibleRooms, unit, n, isPt, { compact, limit }) : null;
    if (tags) obstacles.push(...tags.obstacles);
    const rooms = visibleRooms.map((room) => roomShape(room, activeShape('rooms', room.id))).join('');
    const walls = visibleWalls.map((wall) => wallShape(wall, activeShape('walls', wall.id), forExport, unit)).join('');
    const items = visibleItems.map((item) => itemShape(item, activeShape('items', item.id), false, visibleWalls)).join('');
    const captions = settings.labels ? visibleRooms.map((room) => roomCaption(room, obstacles, unit)).join('') : '';
    const measures = current.measurements.map((measure) => measurementShape(moved('measurements', measure), activeShape('measurements', measure.id), false, unit)).join('');
    const inside = settings.roomDimensions ? interiorPlanDimensions(visibleRooms, visibleWalls, unit, n) : '';
    const activeWall = technical && !forExport && selected?.kind === 'walls' ? visibleWalls.find((wall) => selected.id === wall.id) : null;
    const activeDimension = activeWall ? selectedWallDimension(activeWall, unit, n) : '';
    const annotations = (current.annotations ?? []).map((item) => annotationShape(moved('annotations', item), activeShape('annotations', item.id))).join('');
    return `${technical ? planPatterns() : ''}${background}${rooms}${reference}${outline}${walls}${items}${captions}${tags?.markup ?? ''}${inside}${measures}${annotations}${activeDimension}`;
  }

  function roomHandles(room) {
    return [['nw', room.x, room.y], ['ne', room.x + room.w, room.y],
      ['sw', room.x, room.y + room.h], ['se', room.x + room.w, room.y + room.h]];
  }
  function selectedHandles(unit) {
    if (tool !== 'select' || spacePan || !['rooms', 'walls'].includes(selected?.kind)) return '';
    const active = drag?.type === 'shape' ? drag.preview : entity();
    if (!active) return '';
    const handles = selected.kind === 'rooms' ? roomHandles(active) : [['start', active.x1, active.y1], ['end', active.x2, active.y2]];
    return handles.map(([name, x, y]) => `<g data-plan-handle="${name}" data-shape="${selected.kind}" data-id="${active.id}" transform="translate(${x} ${y})">
      <circle r="${unit * 13}" fill="transparent" pointer-events="all"/>
      <rect class="cv-plan-grip" x="${-unit * 4}" y="${-unit * 4}" width="${unit * 8}" height="${unit * 8}" rx="${unit}" fill="#fffdf6" stroke="#a6462c" stroke-width="${unit * 1.6}" pointer-events="none"/>
    </g>`).join('');
  }
  function drawMarker(p, unit, invalid = false) {
    const accent = invalid ? '#a23e37' : '#8b492f';
    const size = unit * 5.5;
    let shape;
    if (invalid) shape = `<path d="M${-size} ${-size}L${size} ${size}M${size} ${-size}L${-size} ${size}"/>`;
    else if (p.snap === 'endpoint') shape = `<rect x="${-size}" y="${-size}" width="${size * 2}" height="${size * 2}" rx="${unit}" fill="#fffaf0"/>`;
    else if (p.snap === 'wall') shape = `<path d="M0 ${-size}L${size} 0L0 ${size}L${-size} 0Z" fill="#fffaf0"/>`;
    else shape = `<circle r="${size * .74}" fill="#fffaf0"/>`;
    return `<g data-plan-snap="${invalid ? 'unavailable' : p.snap ?? 'free'}" transform="translate(${p.x} ${p.y})" fill="none" stroke="${accent}" stroke-width="${unit * 1.65}">${shape}<circle r="${unit * 1.35}" fill="${accent}" stroke="none"/></g>`;
  }
  function openingAt(p, entry, pointerType) {
    const radius = Math.min(.68, Math.max(.14, worldPixel() * (pointerType === 'touch' ? 20 : 15)));
    return findWall(p, level().walls, radius, entry.width);
  }
  function drawPreview(unit) {
    if (drag?.snap) return drawMarker(drag.snap, unit);
    if (spacePan || !hoverPoint || ['select', 'pan'].includes(tool)) return '';
    const current = level();
    if (pendingPoint) {
      const start = pendingPoint;
      const end = maybeSnapEnd(start, hoverPoint);
      let shape;
      if (tool === 'room') {
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.abs(start.x - end.x);
        const h = Math.abs(start.y - end.y);
        const edge = `stroke="#ad6246" stroke-width="${unit * 1.6}" stroke-dasharray="${unit * 6} ${unit * 4}"`;
        shape = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#bd7952" fill-opacity=".14" ${edge}/>`;
        if (w > unit * 40 && h > unit * 24) {
          const size = unit * 13;
          shape += `<text x="${x + w / 2}" y="${y + h / 2}" dy=".32em" text-anchor="middle" font-size="${size}" font-weight="680" fill="#823f27" paint-order="stroke" stroke="#fffaf0" stroke-width="${size * .3}" stroke-linejoin="round">${n(w)} × ${n(h)} m</text>`;
        }
      } else {
        const wallTool = ['wall', 'angled'].includes(tool);
        const thickness = wallThickness();
        shape = `${wallTool ? `<path d="M${start.x} ${start.y}L${end.x} ${end.y}" stroke="#bc715b" stroke-width="${thickness}" opacity=".4"/>` : ''}${measurementShape({ x1: start.x, y1: start.y, x2: end.x, y2: end.y }, true, true, unit)}`;
      }
      return shape + drawMarker(start, unit) + drawMarker(end, unit);
    }
    if (['door', 'window', 'item'].includes(tool)) {
      const type = tool === 'item' ? objectType : tool;
      const entry = elements[type];
      const snap = entry.opening ? openingAt(hoverPoint, entry, hoverPoint.pointerType) : hoverPoint;
      if (!snap) return drawMarker(hoverPoint, unit, true);
      const guide = entry.opening ? `<path d="M${snap.wall.x1} ${snap.wall.y1}L${snap.wall.x2} ${snap.wall.y2}" stroke="#d39065" stroke-width="${unit * 2}" opacity=".8"/>` : '';
      return guide + itemShape({ type, x: snap.x, y: snap.y, angle: snap.angle ?? 0, width: entry.width, depth: entry.depth, id: '' }, false, true);
    }
    if (tool === 'wallChain') {
      const snap = findWall(hoverPoint, current.walls, Math.min(.6, unit * 15));
      if (snap) return measurementShape(dimensionsAround(snap.wall), true, true, unit);
    }
    return drawMarker(hoverPoint, unit);
  }
  function paintPlan(scene = true, viewport = scene) {
    if (viewMode === 'view3d' || !plane.isConnected) return;
    const rect = plane.getBoundingClientRect();
    const { width, height } = fitExtent(rect);
    const unit = width / Math.max(rect.width, 1);
    const technical = technicalDrawing();
    plane.dataset.drafting = settings.drawingStyle;
    if (viewport) {
      const left = camera.x - width / 2;
      const top = camera.y - height / 2;
      plane.setAttribute('viewBox', `${left} ${top} ${width} ${height}`);
      const step = gridStep();
      const subdivisions = step / unit >= 6.5;
      const gridSize = unit > .085 ? 5 : 1;
      const gridKey = settings.grid ? [left, top, width, height, step, subdivisions, gridSize, technical].join(':') : '';
      if (gridKey !== paintedGrid) {
        paintedGrid = gridKey;
        planGrid.innerHTML = !settings.grid ? '' : `<defs>
          ${subdivisions ? `<pattern id="cv-plan-fine" patternUnits="userSpaceOnUse" x="${-step / 2}" y="${-step / 2}" width="${step}" height="${step}"><circle cx="${step / 2}" cy="${step / 2}" r="${unit * (technical ? .55 : .75)}" fill="${technical ? '#a9bfcc' : '#c8d1c6'}"/></pattern>` : ''}
          <pattern id="cv-plan-reference-grid" patternUnits="userSpaceOnUse" width="${gridSize}" height="${gridSize}"><path d="M${gridSize} 0H0V${gridSize}" fill="none" stroke="${technical ? '#b9ccd6' : '#ccd6cc'}" stroke-width="${unit * .95}" /></pattern>
        </defs>
        ${subdivisions ? `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="url(#cv-plan-fine)"/>` : ''}
        <rect x="${left}" y="${top}" width="${width}" height="${height}" fill="url(#cv-plan-reference-grid)"/>`;
      }
      const percentage = `${Math.round(camera.zoom * 100)}%`;
      root.querySelector('[data-role="zoom"]').textContent = percentage;
      root.querySelector('[data-role="scale"]').textContent = `m · ${percentage}`;
      const ruler = root.querySelector('[data-role="plan-ruler"]');
      const target = Math.max(unit * 72, .05);
      const base = 10 ** Math.floor(Math.log10(target));
      const rulerMeters = base * (target / base >= 5 ? 5 : target / base >= 2 ? 2 : 1);
      ruler.style.setProperty('--cv-ruler-width', `${rulerMeters / unit}px`);
      ruler.textContent = `${n(rulerMeters)} m`;
    }
    if (scene) {
      planScene.innerHTML = draftLayer(false, unit, rect.width < 535);
      const current = level();
      root.querySelector('[data-role="empty"]').hidden = tool !== 'select' || !!(current.rooms.length || current.walls.length || current.items.length || current.image || current.annotations?.length);
    }
    planOverlay.innerHTML = `<g pointer-events="none">${drawPreview(unit)}</g>${selectedHandles(unit)}`;
  }
  function schedulePlan(scene = false, viewport = scene) {
    redrawPlan ||= scene;
    movePlanViewport ||= viewport;
    if (!planFrame) planFrame = requestAnimationFrame(() => {
      planFrame = 0;
      const scene = redrawPlan;
      const viewport = movePlanViewport;
      redrawPlan = false;
      movePlanViewport = false;
      paintPlan(scene, viewport);
    });
  }
  function paint() {
    if (!plane.isConnected) return;
    cancelAnimationFrame(planFrame);
    planFrame = 0;
    redrawPlan = false;
    movePlanViewport = false;
    paintPlan();
    if (viewMode !== 'plan') modelPaint();
  }

  function entity() {
    return selected && level()[selected.kind]?.find((item) => item.id === selected.id);
  }
  function profile() { return systems.find(({ id }) => id === project.systemId) ?? systems[0]; }
  function field(name, key, value, { type = 'text', step = '.01', min, max, unit = '' } = {}) {
    const bounds = `${min === undefined ? '' : `min="${min}"`} ${max === undefined ? '' : `max="${max}"`}`;
    return `<label class="cv-field"><span>${tr(key)}</span><span class="cv-input-wrap"><input data-field="${name}" type="${type}" value="${str(value)}" ${type === 'number' ? `step="${step}" ${bounds}` : 'maxlength="160"'}>${unit ? `<small>${unit}</small>` : ''}</span></label>`;
  }
  function numberField(name, key, value, unit = 'm', min = 0.01, max = 100, step) {
    return field(name, key, typeof value === 'number' ? Number(value.toFixed(3)) : value, { type: 'number', unit, min, max, step });
  }
  function infoRows(rows) { return `<dl class="cv-metrics">${rows.map(([label, value]) => `<div><dt>${str(label)}</dt><dd>${str(value)}</dd></div>`).join('')}</dl>`; }
  function propertiesPanel() {
    const record = entity();
    const current = level();
    if (record) {
      let detail = '';
      let title = '';
      let allowRotation = false;
      if (selected.kind === 'rooms') {
        title = record.name || localized(roomStyles[record.type]);
        detail = field('shape:name', 'labelName', record.name ?? '') + `<label class="cv-field"><span>${tr('type')}</span><select data-field="shape:type">${roomOptions(record.type)}</select></label>` +
          `<div class="cv-row">${numberField('shape:w', 'width', record.w, 'm', 0.35)}${numberField('shape:h', 'length', record.h, 'm', 0.35)}</div><label class="cv-field"><span>${tr('flooring')}</span><select data-field="shape:finish">${['natural', ...Object.keys(finishes)].map((key) => `<option value="${key}" ${(record.finish ?? 'natural') === key ? 'selected' : ''}>${tr(key)}</option>`).join('')}</select></label>` +
          infoRows([[tr('roomArea'), `${n(record.w * record.h)} m²`]]);
      }
      if (selected.kind === 'walls') {
        title = isPt ? 'Parede' : 'Wall';
        detail = wallDetail(record);
      }
      if (selected.kind === 'items') {
        title = localized(elements[record.type]);
        allowRotation = true;
        detail = `<div class="cv-row">${numberField('shape:width', 'width', record.width, 'm', 0.1, 20)}${numberField('shape:depth', 'depth', record.depth, 'm', 0.05, 20)}</div>${numberField('shape:angle', 'angle', record.angle, '°', -360, 360, '1')}`;
        if (elements[record.type].opening) detail += renderOpeningFields(record, locale);
      }
      if (selected.kind === 'measurements') {
        title = tr('measure');
        detail = infoRows([[tr('length'), `${n(wallLength(record))} m`]]);
      }
      if (selected.kind === 'annotations') {
        title = tr(record.north ? 'north' : 'label');
        detail = field('shape:text', 'labelName', record.text);
      }
      return `<section class="cv-panel-section"><p class="cv-kicker">${tr('properties')}</p><h2>${str(title)}</h2>${detail}<div class="cv-action-row">${toolbarButton('duplicate-shape', 'duplicate', 'duplicate')}${allowRotation ? toolbarButton('rotate-shape', 'rotate', 'rotate') : ''}${toolbarButton('remove-shape', 'trash', 'delete')}</div></section>`;
    }
    if (tool === 'room') return `<section class="cv-panel-section"><p class="cv-kicker">${tr('structure')}</p><h2>${tr('room')}</h2><p>${tr(pendingPoint ? 'pointSecond' : 'pointFirst')}</p><label class="cv-field">${tr('drawingType')}<select data-field="roomType">${roomOptions(roomType)}</select></label></section>`;
    if (tool === 'item' || tool === 'door' || tool === 'window' || category === 'furniture') return catalogPanel();
    const system = profile();
    const area = projectArea(project);
    const estimate = estimateProject(project.systemId, area);
    const image = current.image ? `<section class="cv-panel-section"><h3>${tr('referenceControls')}</h3>${numberField('image:width', 'imageWidth', current.image.width, 'm', 0.3)}${numberField('image:opacity', 'imageOpacity', current.image.opacity * 100, '%', 5, 95, '1')}${toolbarButton('remove-image', 'trash', 'removeImage')}</section>` : '';
    return `<section class="cv-panel-section cv-overview"><p class="cv-kicker">${tr('project')}</p><h2>${tr('summary')}</h2><p>${tr(viewMode === 'view3d' ? 'emptySelectModel' : 'emptySelect')}</p><label class="cv-field"><span>${tr('siteSystem')}</span><select data-field="systemId">${systemOptions(project.systemId)}</select></label><p class="cv-system-text">${str(lng(system.description))}</p></section>
    <section class="cv-panel-section cv-overview-numbers"><div><span>${tr('area')}</span><strong>${n(area)} <em>m²</em></strong></div><div><span>${tr('costLabel')}</span><strong>${money(estimate.total)}</strong></div><button class="cv-button cv-subtle" data-action="tab:costs" type="button">${tr('details')} ${icon('chevron', 15)}</button></section>
    <section class="cv-panel-section cv-floor-summary"><h3>${str(current.name)}</h3>${infoRows([[tr('roomTotal'), current.rooms.length], [tr('wallTotal'), `${n(current.walls.reduce((total, wall) => total + wallLength(wall), 0))} m`], [tr('levelHeight'), `${n(current.height)} m`]])}</section>${image}`;
  }
  function catalogPanel() {
    return `<section class="cv-panel-section cv-catalog"><p class="cv-kicker">${tr('shutter')}</p><h2>${tr('furnish')}</h2><p>${tr(tool === 'door' || tool === 'window' || (tool === 'item' && elements[objectType].opening) ? 'placeOpening' : 'placeItem')}</p>
      ${elementGroups.map(([label, keys]) => `<h3>${tr(label)}</h3><div class="cv-catalog-grid">${keys.filter((type) => elements[type]).map((type) => {
        const entry = elements[type];
        const span = Math.max(entry.width, entry.depth, 1);
        return `<button type="button" class="cv-catalog-card" data-action="put:${type}" aria-pressed="${(tool === 'item' && objectType === type) || tool === type}"><svg viewBox="${-span * .72} ${-span * .72} ${span * 1.44} ${span * 1.44}" aria-hidden="true">${itemShape({ ...entry, x: 0, y: 0, angle: 0, id: '', type }, false, false, [])}</svg><span>${str(localized(entry))}</span></button>`;
      }).join('')}</div>`).join('')}</section>`;
  }
  function estimateData() {
    const scope = allLevels ? project : { ...project, levels: [level()] };
    const area = projectArea(scope);
    return { scope, area, estimate: estimateProject(project.systemId, area) };
  }
  function notebookPanel() {
    if (inspectorTab === 'notes') {
      return `<section class="cv-panel-section"><p class="cv-kicker">${tr('project')}</p><h2>${tr('notes')}</h2><label class="cv-field"><span class="cv-sr-only">${tr('notesLabel')}</span><textarea data-field="notes" rows="12" maxlength="8000" placeholder="${tr('notesPlaceholder')}">${str(project.notes)}</textarea></label></section>`;
    }
    const { scope, area, estimate } = estimateData();
    const scopeChooser = `<label class="cv-field"><span>${tr('levels')}</span><select data-field="estimateScope"><option value="all" ${allLevels ? 'selected' : ''}>${tr('allLevels')}</option><option value="active" ${!allLevels ? 'selected' : ''}>${tr('currentLevel')}</option></select></label>`;
    const actions = `<div class="cv-action-row">${toolbarButton('copy-report', 'duplicate', 'copy')}${toolbarButton('csv', 'export', 'csv')}${toolbarButton('report', 'file', 'report', '', true)}</div>`;
    if (inspectorTab === 'data') {
      const rooms = scope.levels.flatMap((entry) => entry.rooms);
      const walls = scope.levels.flatMap((entry) => entry.walls);
      const items = scope.levels.flatMap((entry) => entry.items);
      return `<section class="cv-panel-section"><p class="cv-kicker">${tr('project')}</p><h2>${tr('data')}</h2>${scopeChooser}${infoRows([[tr('area'), `${n(area)} m²`], [tr('roomTotal'), rooms.length], [tr('wallTotal'), `${n(walls.reduce((total, wall) => total + wallLength(wall), 0))} m`], [tr('itemTotal'), items.length], [tr('openings'), items.filter((item) => elements[item.type].opening).length]])}${actions}</section>
        <section class="cv-panel-section"><h3>${tr('roomTotal')}</h3>${infoRows(rooms.map((item) => [item.name || localized(roomStyles[item.type]), `${n(item.w * item.h)} m²`]))}</section>
        ${estimate.quantities?.length ? `<section class="cv-panel-section"><h3>${isPt ? 'Materiais' : 'Materials'}</h3>${infoRows(estimate.quantities.map((line) => [lng(line.label), `${n(line.quantity)} ${line.unit}`]))}</section>` : ''}`;
    }
    const detail = estimate.lines.map(({ kind, amount }) => [tr(kind), money(amount)]);
    return `<section class="cv-panel-section cv-cost"><p class="cv-kicker">${tr('project')}</p><h2>${tr('costs')}</h2>${scopeChooser}<label class="cv-field"><span>${tr('siteSystem')}</span><select data-field="systemId">${systemOptions(project.systemId)}</select></label>${infoRows(detail)}${infoRows([[tr('baseCost'), money(estimate.total)]])}${numberField('vat', 'tax', vat, '%', 0, 100, '0.1')}<div class="cv-total"><span>${tr('taxIncluded')}</span><strong>${money(estimate.total * (1 + vat / 100))}</strong></div><p>${tr('costNote')}</p>${actions}</section>`;
  }
  function renderInspector(force = false) {
    if (!force && studioPanel.contains(document.activeElement) && document.activeElement?.matches('input, textarea')) return;
    const tabs = ['properties', 'costs', 'data', 'notes'];
    const previousBody = studioPanel.querySelector('.cv-panel-body');
    const scroll = studioPanel.dataset.tab === inspectorTab ? previousBody?.scrollTop : 0;
    studioPanel.dataset.tab = inspectorTab;
    studioPanel.innerHTML = `<div class="cv-panel-tabs" role="group" aria-label="${tr('info')}">${tabs.map((id) => `<button type="button" data-action="tab:${id}" aria-pressed="${id === inspectorTab}">${tr(id)}</button>`).join('')}${toolbarButton('close-inspector', 'close', 'cancel')}</div><div class="cv-panel-body">${inspectorTab === 'properties' ? propertiesPanel() : notebookPanel()}</div>`;
    if (scroll) studioPanel.querySelector('.cv-panel-body').scrollTop = scroll;
  }

  function openModal(kind, data = {}) {
    const fromThis = !dialog.open;
    if (fromThis) fromFocus = document.activeElement;
    modal = kind;
    currentModalData = data;
    drawModal();
    if (fromThis) dialog.showModal();
  }
  function templatePicker() {
    const available = [{ id: 'blank', name: isPt ? 'Planta em branco' : 'Blank plan', description: isPt ? 'Comece com uma grelha vazia.' : 'Start with an empty grid.' }, ...templates];
    return `<form class="cv-form" data-form="new"><label class="cv-field">${tr('name')}<input name="name" required maxlength="95" value="${str(currentModalData.name ?? tr('new'))}"></label><label class="cv-field">${tr('siteSystem')}<select name="system">${systemOptions(currentModalData.systemId ?? project.systemId)}</select></label><div class="cv-template-grid">
    ${available.map((item, index) => `<label class="cv-template"><input type="radio" name="template" value="${str(item.id)}" ${item.id === (currentModalData.template ?? 'blank') ? 'checked' : ''}><span class="cv-template-thumb cv-template-thumb-${index % 4}" aria-hidden="true">${icon(index === 0 ? 'plus' : 'plan', 32)}</span><span class="cv-template-desc"><b>${str(lng(item.name))}</b><small>${str(lng(item.description))}</small>${item.area ? `<em>${n(item.area)} m²</em>` : ''}</span></label>`).join('')}
    </div><button class="cv-button cv-primary" type="submit">${tr('newTemplate')}</button></form>`;
  }
  function drawProjectList() {
    const wrapper = dialog.querySelector('[data-role="project-list"]');
    if (!wrapper) return;
    const search = (dialog.querySelector('input[type="search"]')?.value ?? '').toLocaleLowerCase(isPt ? 'pt-PT' : 'en');
    const list = projectList.filter((record) => record.name.toLocaleLowerCase(isPt ? 'pt-PT' : 'en').includes(search));
    const dateLocale = locale === 'en-INT' ? 'en-GB' : 'pt-PT';
    wrapper.innerHTML = list.length ? list.map((record) => {
      const date = new Date(record.updatedAt);
      const detail = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium' }).format(date);
      return `<div class="cv-project-row"><button class="cv-list-action" type="button" data-action="open:${str(record.id)}">${icon('file')}<div><b>${str(record.name)}</b><small>${str(detail)}</small></div></button>${toolbarButton(`delete-project:${str(record.id)}`, 'trash', 'removeProject')}</div>`;
    }).join('') : `<p>${tr('noProjects')}</p>`;
  }
  function modalMenu(actions) {
    return `<div class="cv-modal-menu">${actions.map(([action, glyph, key]) => toolbarButton(action, glyph, key, '', true)).join('')}</div>`;
  }
  const commands = [
    ['projects', 'folder', 'projects'], ['new', 'plus', 'new'], ['import', 'upload', 'import'], ['save', 'save', 'save'],
    ['tool:select', 'select', 'select'], ['tool:pan', 'pan', 'pan'], ['tool:wall', 'wall', 'wall'], ['tool:angled', 'angled', 'angled'],
    ['tool:room', 'room', 'room'], ['tool:detect', 'fit', 'detectRoom'], ['tool:divide', 'room', 'splitUpdate'], ['tool:door', 'door', 'door'], ['tool:window', 'window', 'window'], ['catalog', 'furnish', 'furnish'],
    ['image', 'image', 'image'], ['levels', 'layers', 'levels'], ['mode:plan', 'plan', 'plan'], ['mode:view3d', 'cube', 'view3d'], ['mode:split', 'split', 'split'], ['cameraList', 'camera', 'cameraList'],
    ['tool:measure', 'measure', 'measure'], ['tool:wallChain', 'measure', 'wallChain'], ['autoDimensions', 'measure', 'autoDimensions'], ['tool:label', 'text', 'label'], ['tool:north', 'north', 'north'],
    ['flooring', 'grid', 'flooring'], ['ceiling', 'layers', 'ceiling'], ['roof', 'roof', 'roof'], ['tab:costs', 'file', 'costs'], ['tab:data', 'file', 'data'], ['tab:notes', 'edit', 'notes'],
    ['report', 'file', 'report'], ['export', 'export', 'export'], ['share-link', 'external', 'shareLink'], ['settings', 'settings', 'settings'], ['help', 'info', 'help'],
    ['/guias', 'external', 'guides'], ['/calculadoras', 'external', 'calculators'],
  ];
  function drawCommands() {
    const results = dialog.querySelector('[data-role=command-list]');
    if (!results) return;
    const simplify = (value) => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const terms = simplify(dialog.querySelector('[data-role=command-search]').value).split(/\s+/).filter(Boolean);
    const matches = (text) => {
      const normalized = simplify(text);
      return terms.every((word) => normalized.includes(word));
    };
    const actions = commands.filter(([action, , key]) => matches(`${tr(key)} ${action}`));
    const found = terms.length ? project.levels.flatMap((floor) => {
      const openings = openingsIndex(floor.items, isPt);
      const rooms = floor.rooms.map(({ id, type, name }) => ({ id, title: name || localized(roomStyles[type]), kind: 'rooms', glyph: 'room' }));
      const items = floor.items.map(({ id, type }) => ({ id, title: [openings.get(id), localized(elements[type])].filter(Boolean).join(' · '), kind: 'items', glyph: elements[type]?.opening ? type === 'door' || type === 'doubleDoor' ? 'door' : 'window' : 'furnish' }));
      return [...rooms, ...items].filter(({ title }) => matches(`${title} ${floor.name}`)).map((entry) => ({ ...entry, floor }));
    }).slice(0, 32) : [];
    const elementsHtml = found.map(({ id, title, kind, glyph, floor }) => `<button type="button" class="cv-tool cv-command-entity" data-action="find-entity" data-command="true" data-id="${str(id)}" data-floor="${str(floor.id)}" data-kind="${kind}">${icon(glyph, 16)}<span>${str(title)}</span><small>${str(floor.name)}</small></button>`).join('');
    const toolsHtml = actions.map(([action, glyph, key]) => action.startsWith('/')
      ? `<a class="cv-tool" href="${action}">${icon(glyph)}<span>${tr(key)}</span></a>`
      : toolbarButton(action, glyph, key, 'data-command="true"', true)).join('');
    results.innerHTML = [elementsHtml && `<h3>${tr('commandEntities')}</h3>${elementsHtml}`, toolsHtml && `<h3>${tr('commandTools')}</h3>${toolsHtml}`].filter(Boolean).join('') || `<p>${tr('commandEmpty')}</p>`;
  }
  function drawModal() {
    let content = '';
    let title = tr(modal);
    if (modal === 'projects') {
      content = `${modalMenu([['new', 'plus', 'new'], ['import', 'upload', 'import'], ['commands', 'search', 'commands'], ['duplicate-project', 'duplicate', 'duplicate-project'], ['mirror-project', 'rotate', 'mirror-project']])}<label class="cv-field"><span class="cv-sr-only">${tr('findProjects')}</span><input type="search" maxlength="95" placeholder="${tr('findProjects')}"></label><div class="cv-project-list" data-role="project-list"></div>`;
    } else if (modal === 'commands') {
      content = `<label class="cv-field"><span class="cv-sr-only">${tr('commands')}</span><input type="search" autofocus maxlength="100" placeholder="${tr('commandPlaceholder')}" data-role="command-search"></label><div class="cv-command-list" data-role="command-list"></div>`;
    } else if (modal === 'new') {
      content = templatePicker();
    } else if (modal === 'export' || modal === 'sharing') {
      const rows = [['export-json', 'file', 'exportFile'], ['export-svg', 'plan', 'exportPlan'], ['exportPng', 'image', 'exportPng'], ['print', 'file', 'print'], ['report', 'file', 'report']];
      if (modal === 'export') rows.push(['sharing', 'external', 'share']);
      const shares = [['share-link', 'external', 'shareLink'], ['export-json', 'file', 'exportFile']];
      content = modal === 'sharing' ? `<p>${tr('fileShare')}</p>${modalMenu(shares)}` : modalMenu(rows);
    } else if (modal === 'levels') {
      content = `<div class="cv-project-list">${project.levels.map((entry, index) => `<div class="cv-project-row"><button class="cv-list-action" type="button" data-action="level:${entry.id}">${icon('layers')}<div><b>${str(entry.name)}${entry.id === project.levelId ? ' <span>✓</span>' : ''}</b><small>${n(entry.height)} m</small></div></button>${toolbarButton(`edit-level:${entry.id}`, 'edit', 'levelName')}${index !== 0 ? toolbarButton(`delete-level:${entry.id}`, 'trash', 'removeLevel') : ''}</div>`).join('')}</div><button class="cv-button cv-primary" type="button" data-action="add-level">${icon('plus', 17)}${tr('addLevel')}</button>`;
    } else if (modal === 'edit-level') {
      const item = viewLevel(project, currentModalData.id);
      title = tr(item ? 'levelConfiguration' : 'addLevel');
      content = `<form class="cv-form" data-form="level"><label class="cv-field">${tr('levelName')}<input name="name" maxlength="95" required value="${str(item?.name ?? `${tr('level')} ${project.levels.length}`)}"></label><label class="cv-field">${tr('levelHeight')} (m)<input name="height" type="number" min="1.5" max="12" step=".01" required value="${item?.height ?? profile().defaults?.roomHeight ?? 2.7}"></label><button class="cv-button cv-primary" type="submit">${tr('save')}</button></form>`;
    } else if (modal === 'settings') {
      content = `<label class="cv-field">${tr('drawingStyle')}<select data-field="settings:drawingStyle">${['technical', 'furnished'].map((style) => `<option value="${style}" ${settings.drawingStyle === style ? 'selected' : ''}>${tr(style)}</option>`).join('')}</select></label><div class="cv-switches">${Object.entries(settings).filter(([, value]) => typeof value === 'boolean').map(([key, value]) => `<label><span>${tr(key)}</span><input type="checkbox" data-field="settings:${key}" ${value ? 'checked' : ''}></label>`).join('')}</div><label class="cv-field">${tr('language')}<select data-field="locale"><option value="pt-PT" ${isPt ? 'selected' : ''}>Português (Portugal)</option><option value="en-PT" ${locale === 'en-PT' ? 'selected' : ''}>English (Portugal)</option><option value="en-INT" ${locale === 'en-INT' ? 'selected' : ''}>English (International)</option></select></label>`;
    } else if (modal === 'help') {
      content = `<div class="cv-help"><h3>${tr('keyboard')}</h3>${infoRows([[tr('select'), 'V'], [tr('pan'), 'H'], [tr('wall'), 'W'], [tr('room'), 'R'], [tr('measure'), 'M'], [tr('undo'), 'Ctrl / ⌘ + Z'], [tr('redo'), 'Ctrl / ⌘ + Shift + Z'], [tr('save'), 'Ctrl / ⌘ + S'], [tr('commands'), 'Ctrl / ⌘ + K'], [tr('cancel'), 'Esc'], [tr('delete'), 'Delete']])}<a class="cv-button" href="/guias">${isPt ? 'Guias de construção' : 'Construction guides'} ${icon('external', 16)}</a> <a class="cv-button" href="/calculadoras">${isPt ? 'Calculadoras' : 'Calculators'} ${icon('external', 16)}</a></div>`;
    } else if (modal === 'confirm') {
      title = tr(currentModalData.title);
      content = `<p>${tr(currentModalData.detail)}</p><div class="cv-action-row"><button class="cv-button" type="button" data-action="close">${tr('cancel')}</button><button class="cv-button cv-danger" type="button" data-action="confirm">${tr('delete')}</button></div>`;
    } else if (modal === 'roofs') {
      content = `<form class="cv-form" data-form="roof"><label class="cv-field">${tr('type')}<select name="type">${['none', 'flat', 'gable', 'hipped'].map((key) => `<option value="${key}" ${(level().roof ?? 'none') === key ? 'selected' : ''}>${tr(key)}</option>`).join('')}</select></label><label class="cv-field">${tr('roofPitch')} (°)<input name="pitch" type="number" min="5" max="65" step="1" required value="${level().pitch ?? 30}"></label><button class="cv-button cv-primary" type="submit">${tr('save')}</button></form>`;
    } else if (modal === 'flooring') {
      content = `<form class="cv-form" data-form="finish"><label class="cv-field">${tr('flooring')}<select name="finish">${['natural', ...Object.keys(finishes)].map((key) => `<option value="${key}">${tr(key)}</option>`).join('')}</select></label><button class="cv-button cv-primary" type="submit">${tr('save')}</button></form>`;
    } else if (modal === 'camera') {
      content = `<form class="cv-form" data-form="camera"><label class="cv-field">${tr('labelName')}<input name="name" maxlength="80" required value="${isPt ? 'Vista' : 'View'} ${(project.cameras?.length ?? 0) + 1}"></label><button class="cv-button cv-primary" type="submit">${tr('save')}</button></form>`;
    } else if (modal === 'cameraList') {
      const presets = [['iso', tr('isoView')], ['top', tr('topView')], [180, 'N'], [90, 'E'], [0, 'S'], [270, isPt ? 'O' : 'W']];
      content = `<div class="cv-camera-presets">${presets.map(([value, label]) => `<button class="cv-button" type="button" data-action="preset:${value}">${label}</button>`).join('')}</div><div class="cv-action-row"><button class="cv-button" type="button" data-action="camera">${icon('camera', 16)}${tr('camera')}</button></div>${project.cameras?.length ? `<div class="cv-project-list">${project.cameras.map((entry) => `<div class="cv-project-row"><button class="cv-list-action" data-action="camera-open:${entry.id}" type="button">${icon('camera')} ${str(entry.name)}</button>${toolbarButton(`camera-remove:${entry.id}`, 'trash', 'delete')}</div>`).join('')}</div>` : ''}`;
    } else if (modal === 'label') {
      content = `<form class="cv-form" data-form="label"><label class="cv-field">${tr('labelName')}<input name="text" maxlength="160" required></label><button class="cv-button cv-primary" type="submit">${tr('save')}</button></form>`;
    }
    dialog.innerHTML = `<div class="cv-dialog-head"><h2>${str(title)}</h2>${toolbarButton('close', 'close', 'cancel')}</div><div class="cv-dialog-body">${content}</div>`;
    drawProjectList();
    drawCommands();
  }

  const supplemental = {
    shareLink: ['Partilhar por ligação', 'Share a link'], invalidShare: ['Esta ligação de partilha expirou ou foi desativada.', 'This share link has expired or been deactivated.'],
    report: ['Relatório', 'Report'], 'duplicate-project': ['Duplicar projeto', 'Duplicate project'], 'mirror-project': ['Espelhar projeto', 'Mirror project'],
    mirrorSuffix: ['espelho', 'mirror'], copySuffix: ['cópia', 'copy'], openingWall: ['Aproxime o vão de uma parede com largura suficiente.', 'Move the opening near a wall wide enough to hold it.'],
    roomDetect: ['Não foi encontrado um compartimento retangular fechado neste ponto.', 'No enclosed rectangular room was found at this point.'],
    cannotDivide: ['Marque um ponto no interior de um compartimento.', 'Mark a point inside a room.'], tooSmall: ['Marque dois pontos mais afastados.', 'Mark two points further apart.'],
    levelLimit: ['O projeto já tem 20 pisos.', 'This project already has 20 levels.'], cameraLimit: ['O projeto já tem 30 vistas guardadas.', 'This project already has 30 saved views.'],
  };
  Object.assign(labels, supplemental);

  function switchLevel(id) {
    if (id === project.levelId || !viewLevel(project, id)) return;
    project.levelId = id;
    selected = null;
    pendingPoint = null;
    resetCamera();
    markChanged();
    render();
  }
  function setTool(id) {
    mobileCatalog = false;
    selected = null;
    pendingPoint = null;
    hoverPoint = null;
    if (id === 'stair' || id === 'rail') {
      objectType = id;
      id = 'item';
    }
    if (id === 'slab' || id === 'deck') {
      roomType = id === 'slab' ? 'circulation' : 'outdoor';
      id = 'room';
    }
    tool = id;
    if (viewMode === 'view3d' && id !== 'select') viewMode = 'split';
    if (['item', 'door', 'window'].includes(id)) inspectorTab = 'properties';
    render();
  }
  function finishDrawing() {
    pendingPoint = hoverPoint = null;
    updateTools();
    renderInspector();
    paintPlan(false);
  }
  function zoom(multiplier, location) {
    const before = camera.zoom;
    camera.zoom = clamp(camera.zoom * multiplier, 0.2, 7);
    if (location) {
      camera.x = location.x + (camera.x - location.x) * before / camera.zoom;
      camera.y = location.y + (camera.y - location.y) * before / camera.zoom;
    }
    schedulePlan(true);
  }
  function fitSelection() {
    const item = entity();
    if (!item) return;
    let x, y, width, height;
    if (selected.kind === 'rooms') {
      ({ w: width, h: height } = item);
      x = item.x + width / 2;
      y = item.y + height / 2;
    } else if (selected.kind === 'walls' || selected.kind === 'measurements') {
      x = (item.x1 + item.x2) / 2;
      y = (item.y1 + item.y2) / 2;
      width = Math.abs(item.x1 - item.x2);
      height = Math.abs(item.y1 - item.y2);
    } else if (selected.kind === 'items') {
      const bounds = furnitureOutline(item);
      ({ x, y } = bounds);
      width = bounds.halfW * 2;
      height = bounds.halfH * 2;
    } else ({ x, y, width = 1, height = 1 } = item);
    const extent = fitExtent();
    camera.zoom = clamp(camera.zoom * .72 * Math.min(extent.width / (width + .5), extent.height / (height + .5)), .2, 7);
    camera.x = x;
    camera.y = y;
    schedulePlan(true);
  }
  function mirror(state) {
    const bounds = state.levels.map(levelBounds);
    const center = (Math.min(...bounds.map((b) => b.x)) + Math.max(...bounds.map((b) => b.x + b.width))) / 2;
    const x = (value) => 2 * center - value;
    for (const entry of state.levels) {
      for (const room of entry.rooms) room.x = x(room.x + room.w);
      for (const item of entry.items) { item.x = x(item.x); item.angle = 180 - item.angle; }
      for (const wall of [...entry.walls, ...entry.measurements]) {
        wall.x1 = x(wall.x1); wall.x2 = x(wall.x2);
        if (wall.spec) wall.spec.exteriorSide *= -1;
      }
      for (const annotation of entry.annotations ?? []) annotation.x = x(annotation.x);
      if (entry.image) entry.image.x = x(entry.image.x + entry.image.width);
    }
    return state;
  }
  function detachRoomWalls(id) {
    for (const wall of level().walls) if (wall.roomId === id) delete wall.roomId;
  }
  function connectedGeometry(walls) {
    const current = level();
    const items = new Map();
    if (!walls.size) return { walls, items };
    for (const item of current.items) {
      if (!elements[item.type].opening) continue;
      const anchor = findWall(item, current.walls, .11, item.width);
      const edited = anchor && walls.get(anchor.wall.id);
      if (!edited) continue;
      const length = wallLength(edited);
      const width = Math.min(length, item.width);
      const margin = width / (2 * length);
      const ratio = clamp(anchor.ratio, margin, 1 - margin);
      const x = edited.x1 + (edited.x2 - edited.x1) * ratio;
      const y = edited.y1 + (edited.y2 - edited.y1) * ratio;
      const angle = item.angle + Math.atan2(edited.y2 - edited.y1, edited.x2 - edited.x1) * 180 / Math.PI - anchor.angle;
      items.set(item.id, { ...item, x, y, angle, width });
    }
    return { walls, items };
  }
  function roomGeometry(room, next) {
    const transformX = (x) => next.x + (x - room.x) * (next.w / room.w);
    const transformY = (y) => next.y + (y - room.y) * (next.h / room.h);
    const walls = new Map(level().walls.filter((wall) => wall.roomId === room.id).map((wall) => [wall.id, {
      ...wall, x1: transformX(wall.x1), x2: transformX(wall.x2), y1: transformY(wall.y1), y2: transformY(wall.y2),
    }]));
    return connectedGeometry(walls);
  }
  function applyGeometry(geometry) {
    for (const [kind, updates] of Object.entries(geometry)) {
      for (const shape of level()[kind]) {
        const update = updates.get(shape.id);
        if (update) Object.assign(shape, update);
      }
    }
  }
  function morphRoom(room, next) {
    applyGeometry(roomGeometry(room, next));
    Object.assign(room, next);
  }
  function duplicateEntity() {
    const item = entity();
    if (!item) return;
    const kind = selected.kind;
    const copy = { ...item, id: uid() };
    delete copy.roomId;
    if (kind === 'walls' || kind === 'measurements') { copy.x1 += 0.42; copy.x2 += 0.42; copy.y1 += 0.42; copy.y2 += 0.42; }
    else { copy.x += .46; copy.y += .46; }
    change(() => {
      level()[kind].push(copy);
      selected = { kind, id: copy.id };
    });
  }
  function removeEntity() {
    if (!entity()) return false;
    change(() => {
      if (selected.kind === 'rooms') detachRoomWalls(selected.id);
      if (selected.kind === 'walls') {
        const floor = level();
        const remaining = floor.walls.filter((wall) => wall.id !== selected.id);
        floor.items = floor.items.filter((item) => !elements[item.type].opening ||
          findWall(item, floor.walls, .11, item.width)?.wall.id !== selected.id ||
          !!findWall(item, remaining, .11, item.width));
      }
      level()[selected.kind] = level()[selected.kind].filter((item) => item.id !== selected.id);
      selected = null;
    });
    return true;
  }
  function selectEntity(target) {
    const shape = target?.closest?.('[data-shape]');
    if (!shape || !plane.contains(shape)) return null;
    const kind = shape.dataset.shape;
    const id = shape.dataset.id;
    if (!level()[kind]?.some((item) => item.id === id)) return null;
    return { kind, id };
  }
  function dimensionsAround(wall) {
    const len = wallLength(wall);
    const offset = wall.thickness / 2 + .29;
    const dx = (wall.y1 - wall.y2) * offset / len;
    const dy = (wall.x2 - wall.x1) * offset / len;
    return { id: uid(), x1: wall.x1 + dx, y1: wall.y1 + dy, x2: wall.x2 + dx, y2: wall.y2 + dy };
  }
  function detectAt(p) {
    const current = level();
    const axes = current.walls;
    const horizontal = axes.filter((wall) => Math.abs(wall.y1 - wall.y2) < .02 && p.x >= Math.min(wall.x1, wall.x2) && p.x <= Math.max(wall.x1, wall.x2));
    const vertical = axes.filter((wall) => Math.abs(wall.x1 - wall.x2) < .02 && p.y >= Math.min(wall.y1, wall.y2) && p.y <= Math.max(wall.y1, wall.y2));
    const y = Math.max(...horizontal.filter((wall) => wall.y1 < p.y).map((wall) => wall.y1));
    const bottom = Math.min(...horizontal.filter((wall) => wall.y1 > p.y).map((wall) => wall.y1));
    const x = Math.max(...vertical.filter((wall) => wall.x1 < p.x).map((wall) => wall.x1));
    const right = Math.min(...vertical.filter((wall) => wall.x1 > p.x).map((wall) => wall.x1));
    if (![x, y, right, bottom].every(Number.isFinite)) { toast('roomDetect'); return; }
    const hasSpan = (wall, coord, a, b) => Math.min(wall[`${coord}1`], wall[`${coord}2`]) <= a + .06 && Math.max(wall[`${coord}1`], wall[`${coord}2`]) >= b - .06;
    const closed = [y, bottom].every((pos) => horizontal.some((wall) => wall.y1 === pos && hasSpan(wall, 'x', x, right))) &&
      [x, right].every((pos) => vertical.some((wall) => wall.x1 === pos && hasSpan(wall, 'y', y, bottom)));
    if (!closed || right - x < .35 || bottom - y < .35) { toast('roomDetect'); return; }
    const existing = current.rooms.find((room) => Math.abs(room.x - x) < .05 && Math.abs(room.y - y) < .05 && Math.abs(room.w - (right - x)) < .05 && Math.abs(room.h - (bottom - y)) < .05);
    if (existing) { selected = { kind: 'rooms', id: existing.id }; setActiveShape(); return; }
    const room = makeRoom(roomType, x, y, right - x, bottom - y);
    change(() => { current.rooms.push(room); selected = { kind: 'rooms', id: room.id }; setActiveShape(); });
  }
  function divideAt(p) {
    const current = level();
    const room = [...current.rooms].reverse().find((entry) => entry.x < p.x && entry.x + entry.w > p.x && entry.y < p.y && entry.y + entry.h > p.y);
    if (!room) { toast('cannotDivide'); return; }
    const vertical = room.w >= room.h;
    const dimension = vertical ? room.w : room.h;
    if (dimension < .7) { toast('tooSmall'); return; }
    const origin = vertical ? room.x : room.y;
    const offset = clamp((vertical ? p.x : p.y) - origin, .35, dimension - .35);
    const split = origin + offset;
    const thickness = profile().defaults?.wallThickness ?? .15;
    change(() => {
      detachRoomWalls(room.id);
      const copy = { ...room, id: uid() };
      if (vertical) {
        copy.x = split;
        copy.w = room.w - offset;
        room.w = offset;
      } else {
        copy.y = split;
        copy.h = room.h - offset;
        room.h = offset;
      }
      const wall = vertical ? makeWall(split, room.y, split, room.y + room.h, thickness) : makeWall(room.x, split, room.x + room.w, split, thickness);
      current.rooms.push(copy);
      current.walls.push(wall);
    });
  }
  function setActiveShape() {
    if (!selected) return;
    inspectorTab = 'properties';
    tool = 'select';
    mobileCatalog = false;
    render();
  }
  function drawAction(event) {
    constrainAngle = event.shiftKey;
    const p = position(event);
    const current = level();
    if (tool === 'pan') return;
    if (tool === 'detect') { detectAt(p); return; }
    if (tool === 'divide') { divideAt(p); return; }
    if (tool === 'flooring') {
      const room = [...current.rooms].reverse().find((entry) => entry.x <= p.x && entry.x + entry.w >= p.x && entry.y <= p.y && entry.y + entry.h >= p.y);
      if (room && (room.finish ?? 'natural') !== activeFinish) change(() => { room.finish = activeFinish; });
      return;
    }
    if (tool === 'wallChain') {
      const snap = findWall(p, current.walls, .65);
      if (snap) change(() => { current.measurements.push(dimensionsAround(snap.wall)); });
      return;
    }
    if (tool === 'label') { openModal('label', p); return; }
    if (tool === 'north') {
      change(() => { (current.annotations ??= []).push({ id: uid(), x: p.x, y: p.y, text: 'N', north: true }); });
      return;
    }
    if (['door', 'window', 'item'].includes(tool)) {
      const type = tool === 'item' ? objectType : tool;
      const data = elements[type];
      const snap = data.opening ? openingAt(planPosition(event), data, event.pointerType) : p;
      if (!snap) { toast('openingWall'); return; }
      const created = makeItem(type, snap.x, snap.y, snap.angle);
      change(() => { current.items.push(created); selected = { kind: 'items', id: created.id }; setActiveShape(); });
      return;
    }
    if (tool === 'select') return;
    if (!pendingPoint) {
      pendingPoint = p;
      hoverPoint = p;
      updateTools();
      renderInspector();
      paintPlan(false);
      return;
    }
    const start = pendingPoint;
    const end = maybeSnapEnd(start, p);
    if (Math.hypot(start.x - end.x, start.y - end.y) < .1) { toast('tooSmall'); return; }
    if (tool === 'room') {
      const w = Math.abs(start.x - end.x);
      const h = Math.abs(start.y - end.y);
      if (w < .35 || h < .35) { toast('tooSmall'); return; }
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const created = makeRoom(roomType, x, y, w, h);
      const perimeter = [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]];
      const thickness = profile().defaults?.wallThickness ?? .15;
      change(() => {
        current.rooms.push(created);
        if (category !== 'floors' && roomType !== 'outdoor') {
          for (const [x1, y1, x2, y2] of perimeter) {
            const midpoint = point((x1 + x2) / 2, (y1 + y2) / 2);
            const existing = findWall(midpoint, current.walls, .06, Math.hypot(x2 - x1, y2 - y1));
            if (!existing) current.walls.push({ ...makeWall(x1, y1, x2, y2, thickness), roomId: created.id });
          }
        }
        pendingPoint = null;
        selected = { kind: 'rooms', id: created.id };
        setActiveShape();
      });
      return;
    }
    if (tool === 'measure') {
      change(() => { current.measurements.push(makeWall(start.x, start.y, end.x, end.y)); pendingPoint = null; });
      return;
    }
    if (tool === 'wall' || tool === 'angled') {
      const thickness = wallThickness();
      const created = makeWall(start.x, start.y, end.x, end.y, thickness);
      const spec = drawingWallSpec();
      if (spec) created.spec = spec;
      change(() => { current.walls.push(created); pendingPoint = end; });
    }
  }

  function dragShape(deltaX, deltaY) {
    const moving = drag.original;
    if (drag.handle && drag.kind === 'rooms') {
      const west = drag.handle.endsWith('w');
      const north = drag.handle.startsWith('n');
      const dx = west ? Math.min(deltaX, moving.w - .35) : Math.max(deltaX, .35 - moving.w);
      const dy = north ? Math.min(deltaY, moving.h - .35) : Math.max(deltaY, .35 - moving.h);
      return { ...moving, x: moving.x + (west ? dx : 0), y: moving.y + (north ? dy : 0), w: moving.w + (west ? -dx : dx), h: moving.h + (north ? -dy : dy) };
    }
    if (drag.kind === 'walls' || drag.kind === 'measurements') {
      if (drag.handle) {
        const edge = drag.handle === 'start' ? 1 : 2;
        const edited = { ...moving, [`x${edge}`]: moving[`x${edge}`] + deltaX, [`y${edge}`]: moving[`y${edge}`] + deltaY };
        return wallLength(edited) >= .1 ? edited : moving;
      }
      return { ...moving, x1: moving.x1 + deltaX, y1: moving.y1 + deltaY, x2: moving.x2 + deltaX, y2: moving.y2 + deltaY };
    }
    const p = point(moving.x + deltaX, moving.y + deltaY);
    if (drag.kind === 'items' && elements[moving.type].opening) {
      const nearest = findWall(p, level().walls, .75, moving.width);
      return nearest ? { ...moving, x: nearest.x, y: nearest.y, angle: nearest.angle } : moving;
    }
    return { ...moving, ...p };
  }
  function midpoint(positions) { return point((positions[0].x + positions[1].x) / 2, (positions[0].y + positions[1].y) / 2); }
  function separation(positions) { return Math.hypot(positions[1].x - positions[0].x, positions[1].y - positions[0].y); }
  function panFrom(event) {
    plane.dataset.panning = 'true';
    return { type: 'pan', start: point(event.clientX, event.clientY), camera: { ...camera }, scale: worldPixel(), moved: false };
  }
  plane.addEventListener('pointerdown', (event) => {
    if ((event.button !== 0 && event.button !== 1) || pen.size >= 2) return;
    preventClick = false;
    plane.setPointerCapture(event.pointerId);
    pen.set(event.pointerId, point(event.clientX, event.clientY));
    const positions = [...pen.values()];
    if (positions.length >= 2) {
      const mid = midpoint(positions);
      pinch = { distance: separation(positions), midpoint: mid };
      if (drag?.type === 'draw' && drag.moved) pendingPoint = null;
      drag = null;
      plane.dataset.panning = 'true';
      updateTools();
      schedulePlan(true);
      return;
    }
    const hit = tool === 'select' && !spacePan && event.button === 0 ? selectEntity(event.target) : null;
    if (studioPanel.contains(document.activeElement) && document.activeElement?.matches('input, textarea')) document.activeElement.blur();
    plane.focus({ preventScroll: true });
    const world = position(event, true);
    if (tool === 'pan' || spacePan || event.button === 1) {
      preventClick = true;
      drag = panFrom(event);
    } else if (tool === 'select') {
      const wasSelected = selected;
      selected = hit;
      fitSelected.disabled = !selected;
      const item = entity();
      const handle = event.target.closest?.('[data-plan-handle]')?.dataset.planHandle;
      if (item) {
        inspectorTab = 'properties';
        if (event.pointerType !== 'touch' || handle || wasSelected?.id === selected.id) {
          drag = { type: 'shape', ...selected, handle, start: world, screen: point(event.clientX, event.clientY), original: item, preview: item, moved: false };
        }
      } else drag = panFrom(event);
      renderInspector();
      paintPlan();
      modelPaint();
    } else if (!pendingPoint && ['room', 'wall', 'angled', 'measure'].includes(tool)) {
      drag = { type: 'draw', origin: position(event), screen: point(event.clientX, event.clientY), moved: false };
    }
  }, listen);
  plane.addEventListener('pointermove', (event) => {
    constrainAngle = event.shiftKey;
    if (pen.has(event.pointerId)) pen.set(event.pointerId, point(event.clientX, event.clientY));
    const positions = [...pen.values()];
    if (pinch && positions.length >= 2) {
      const mid = midpoint(positions);
      const distance = separation(positions);
      if (pinch.distance > 10 && distance > 10) {
        const anchor = planPosition({ clientX: pinch.midpoint.x, clientY: pinch.midpoint.y });
        zoom(distance / pinch.distance, anchor);
        const shifted = planPosition({ clientX: mid.x, clientY: mid.y });
        camera.x += anchor.x - shifted.x;
        camera.y += anchor.y - shifted.y;
      }
      pinch = { distance, midpoint: mid };
      return;
    }
    if (drag?.type === 'pan') {
      const dx = event.clientX - drag.start.x;
      const dy = event.clientY - drag.start.y;
      drag.moved ||= Math.hypot(dx, dy) > 2;
      camera.x = drag.camera.x - dx * drag.scale;
      camera.y = drag.camera.y - dy * drag.scale;
      schedulePlan(false, true);
    } else if (drag?.type === 'shape') {
      drag.moved ||= Math.hypot(event.clientX - drag.screen.x, event.clientY - drag.screen.y) > 5;
      if (drag.moved) {
        const p = position(event, true);
        const snap = (value) => settings.snap && !event.altKey ? snapTo(value, gridStep()) : value;
        let deltaX = snap(p.x - drag.start.x);
        let deltaY = snap(p.y - drag.start.y);
        drag.snap = null;
        if (drag.handle && drag.kind === 'walls' && settings.snap && !event.altKey) {
          const edge = drag.handle === 'start' ? 1 : 2;
          const x = drag.original[`x${edge}`];
          const y = drag.original[`y${edge}`];
          const raw = point(x + p.x - drag.start.x, y + p.y - drag.start.y);
          drag.snap = nearestEndpoint(raw, Math.min(.38, worldPixel() * 14), drag.id);
          if (drag.snap) { deltaX = drag.snap.x - x; deltaY = drag.snap.y - y; }
        }
        drag.preview = deltaX || deltaY ? dragShape(deltaX, deltaY) : drag.original;
        if (drag.kind === 'rooms') drag.geometry = roomGeometry(drag.original, drag.preview);
        if (drag.kind === 'walls') drag.geometry = connectedGeometry(new Map([[drag.original.id, drag.preview]]));
        schedulePlan(true);
      }
    } else if (!['select', 'pan'].includes(tool)) {
      if (drag?.type === 'draw' && !drag.moved && Math.hypot(event.clientX - drag.screen.x, event.clientY - drag.screen.y) > 6) {
        drag.moved = true;
        pendingPoint = drag.origin;
        updateTools();
      }
      const opening = ['door', 'window'].includes(tool) || (tool === 'item' && elements[objectType].opening);
      hoverPoint = { ...position(event, opening), pointerType: event.pointerType };
      schedulePlan();
    }
  }, listen);
  function releasePointer(event, cancelled = false) {
    if (!pen.has(event.pointerId)) return;
    pen.delete(event.pointerId);
    if (pinch || pen.size) {
      preventClick = true;
      if (!pen.size) { pinch = null; delete plane.dataset.panning; }
      return;
    }
    delete plane.dataset.panning;
    const moved = drag?.moved;
    const drawing = drag?.type === 'draw';
    const panning = drag?.type === 'pan';
    if (!cancelled && moved && drag?.type === 'shape' && drag.preview !== drag.original) {
      const { kind, original, preview, geometry } = drag;
      drag = null;
      change(() => {
        if (geometry) applyGeometry(geometry);
        Object.assign(original, preview);
        if (kind === 'walls') delete original.roomId;
      });
    } else {
      drag = null;
      if (cancelled && drawing && moved) { pendingPoint = null; updateTools(); }
      if (cancelled || moved) schedulePlan(!panning, true);
    }
    if (!cancelled && (!moved || drawing) && !preventClick && event.button === 0) drawAction(event);
  }
  plane.addEventListener('pointerup', releasePointer, listen);
  plane.addEventListener('pointercancel', (event) => releasePointer(event, true), listen);
  plane.addEventListener('lostpointercapture', (event) => releasePointer(event, true), listen);
  plane.addEventListener('contextmenu', (event) => {
    if (!pendingPoint) return;
    event.preventDefault();
    finishDrawing();
  }, listen);
  plane.addEventListener('pointerleave', () => { if (!pen.size) { hoverPoint = null; schedulePlan(); } }, listen);
  plane.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (spacePan) return;
    spacePan = true;
    plane.dataset.spacePan = 'true';
    schedulePlan();
  }, listen);
  function releaseSpacePan() {
    if (!spacePan) return;
    spacePan = false;
    delete plane.dataset.spacePan;
    schedulePlan();
  }
  window.addEventListener('keyup', (event) => { if (event.code === 'Space') releaseSpacePan(); }, listen);
  window.addEventListener('blur', releaseSpacePan, listen);
  plane.addEventListener('wheel', (event) => {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? plane.offsetHeight : 1;
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      camera.x += (event.deltaX || event.deltaY) * unit * worldPixel();
      schedulePlan(false, true);
    } else zoom(Math.exp(clamp(-event.deltaY * unit * .0018, -.7, .7)), planPosition(event));
  }, { ...listen, passive: false });
  const splitter = view.querySelector('[data-role="splitter"]');
  const stacked = window.matchMedia('(max-width: 680px)');
  let split = 50;
  const syncSplitter = () => splitter.setAttribute('aria-orientation', stacked.matches ? 'horizontal' : 'vertical');
  stacked.addEventListener('change', syncSplitter, listen);
  syncSplitter();
  function splitAt(value) {
    split = clamp(value, 25, 75);
    view.style.setProperty('--plan-share', `${split}%`);
    splitter.setAttribute('aria-valuenow', Math.round(split));
  }
  splitter.addEventListener('pointerdown', (event) => {
    if (event.button === 0) splitter.setPointerCapture(event.pointerId);
  }, listen);
  splitter.addEventListener('pointermove', (event) => {
    if (!splitter.hasPointerCapture(event.pointerId)) return;
    const bounds = view.getBoundingClientRect();
    splitAt(stacked.matches ? (event.clientY - bounds.top) / bounds.height * 100 : (event.clientX - bounds.left) / bounds.width * 100);
  }, listen);
  splitter.addEventListener('dblclick', () => splitAt(50), listen);
  splitter.addEventListener('keydown', (event) => {
    const forward = stacked.matches ? 'ArrowDown' : 'ArrowRight';
    const back = stacked.matches ? 'ArrowUp' : 'ArrowLeft';
    if (event.key === forward) splitAt(split + 5);
    else if (event.key === back) splitAt(split - 5);
    else if (event.key === 'Home') splitAt(25);
    else if (event.key === 'End') splitAt(75);
    else return;
    event.preventDefault();
  }, listen);

  function download(content, extension, mime) {
    const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type: mime }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${project.name.replace(/[^\p{L}\p{N}_ -]/gu, '').trim().replace(/\s+/g, '-') || 'casovara'}.${extension}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('savedFile');
  }
  function exportSvg() {
    const b = levelBounds(level());
    const margin = technicalDrawing() ? 1.6 : 1.15;
    const box = { x: b.x - margin, y: b.y - margin, w: b.width + 2 * margin, h: b.height + 2 * margin };
    const paper = technicalDrawing() ? draftingInk.halo : '#faf8f2';
    return `<svg xmlns="http://www.w3.org/2000/svg" font-family="Arial,sans-serif" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="1600" height="1200"><title>${str(project.name)} · ${str(level().name)}</title><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="${paper}"/>${draftLayer(true)}</svg>`;
  }
  function exportPng() {
    if (viewMode !== 'plan') {
      const scene = compileScene(modelFaces(project, project.levelId, cutaway, { scope: modelScope, roof: showRoof, simulator }));
      if (scene.empty) { toast('exportError'); return; }
      modelImage(scene, viewer.camera()).toBlob((blob) => blob ? download(blob, 'png', 'image/png') : toast('exportError'));
      return;
    }
    const url = URL.createObjectURL(new Blob([exportSvg()], { type: 'image/svg+xml' }));
    const source = new Image();
    source.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 1200;
      const context = canvas.getContext('2d');
      context.fillStyle = '#faf8f2';
      context.fillRect(0, 0, 1600, 1200);
      context.drawImage(source, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => { if (blob) download(blob, 'png', 'image/png'); else toast('exportError'); });
    };
    source.onerror = () => { URL.revokeObjectURL(url); toast('exportError'); };
    source.src = url;
  }
  function printPlan() {
    const print = window.open('', '_blank');
    if (!print) { toast('exportError'); return; }
    print.document.write(`<!doctype html><title>${str(project.name)}</title><style>body{font:15px system-ui;margin:24px;color:#21231c}main{max-width:1100px;margin:auto}svg{display:block;width:100%;height:auto}h1{margin:0}p{margin:3px 0 12px}@page{size:A4 landscape;margin:12mm}</style><main><h1>${str(project.name)}</h1><p>${str(level().name)} · Casovara</p>${exportSvg()}</main>`);
    print.document.close();
    print.addEventListener('load', () => print.print(), { once: true });
    if (print.document.readyState === 'complete') print.print();
  }
  function reportRows() {
    const { scope, area, estimate } = estimateData();
    if (inspectorTab === 'data') {
      return [[tr('labelName'), tr('roomArea'), tr('level')], ...scope.levels.flatMap((entry) => entry.rooms.map((room) => [room.name || localized(roomStyles[room.type]), `${n(room.w * room.h)} m²`, entry.name])), ...estimate.quantities.map((line) => [lng(line.label), `${n(line.quantity)} ${line.unit}`, '']), [tr('area'), `${n(area)} m²`, '']];
    }
    return [[tr('labelName'), tr('costLabel')], ...estimate.lines.map((line) => [tr(line.kind), money(line.amount)]), [tr('baseCost'), money(estimate.total)], [tr('tax'), `${n(vat)}%`], [tr('taxIncluded'), money(estimate.total * (1 + vat / 100))]];
  }
  function csvData() {
    const safe = (value) => /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return '\ufeff' + reportRows().map((row) => row.map((value) => `"${safe(String(value)).replaceAll('"', '""')}"`).join(';')).join('\r\n');
  }

  async function updateProjectList() {
    try {
      projectList = await projectApi.list();
      drawProjectList();
    } catch { toast('loadError'); }
  }
  const simpleDialogs = new Set(['commands', 'projects', 'new', 'export', 'sharing', 'settings', 'help', 'levels', 'camera', 'cameraList']);
  root.addEventListener('click', async (event) => {
    const button = event.target.closest?.('[data-action]');
    if (!button || !root.contains(button)) return;
    const action = button.dataset.action;
    const [type, arg] = action.split(':');
    if (button.dataset.command && dialog.open) {
      dialog.close();
      if (type === 'tool') category = categories.find((entry) => entry.tools.includes(arg))?.id ?? 'structure';
    }
    if (simpleDialogs.has(type)) {
      if (type === 'camera' && (project.cameras?.length ?? 0) >= 30) { toast('cameraLimit'); return; }
      if (type === 'camera') { viewMode = 'view3d'; render(); }
      openModal(type);
      if (type === 'projects') void updateProjectList();
      return;
    }
    switch (type) {
      case 'close': dialog.close(); break;
      case 'save': await saveNow(true); break;
      case 'share-link':
        if (await saveNow(true)) {
          if (dialog.open) dialog.close();
          openBuilderShare({ locale, projectId, appUrl });
        }
        break;
      case 'confirm': {
        const { operation } = currentModalData;
        dialog.close();
        await operation();
        break;
      }
      case 'category':
        category = arg;
        toolbarOpen = true;
        setTool('select');
        if (arg === 'furniture') { inspectorOpen = true; inspectorTab = 'properties'; render(); }
        if (arg === 'visualise' && viewMode === 'plan') { viewMode = 'split'; render(); }
        break;
      case 'tool': setTool(arg); break;
      case 'find-entity': {
        const { floor, kind, id } = button.dataset;
        const target = viewLevel(project, floor);
        if (!target?.[kind]?.some((entry) => entry.id === id)) break;
        if (viewMode === 'view3d') viewMode = 'split';
        switchLevel(floor);
        selected = { kind, id };
        inspectorOpen = true;
        setActiveShape();
        fitSelection();
        break;
      }
      case 'toggle-tools': toolbarOpen = !toolbarOpen; updateTools(); break;
      case 'simulator':
        setSimulatorOpen(simulatorPanel.hidden);
        if (simulatorPanel.hidden) simulatorToggle.focus({ preventScroll: true });
        break;
      case 'snap-plan':
        settings.snap = !settings.snap;
        updateTools();
        paintPlan(false);
        root.querySelector('[data-action="snap-plan"]')?.focus();
        break;
      case 'finish-drawing': finishDrawing(); break;
      case 'put':
        objectType = arg;
        inspectorOpen = false;
        setTool('item');
        break;
      case 'catalog':
        inspectorOpen = true;
        mobileCatalog = true;
        inspectorTab = 'properties';
        selected = null;
        tool = 'item';
        render();
        break;
      case 'mode': viewMode = arg; render(); break;
      case 'view3d': viewMode = 'view3d'; render(); break;
      case 'undo': undo(); break;
      case 'redo': undo(true); break;
      case 'zoom-in': zoom(1.22); break;
      case 'zoom-out': zoom(1 / 1.22); break;
      case 'fit': resetCamera(); paintPlan(); break;
      case 'fit-selection': fitSelection(); break;
      case 'orbit-left': viewer.rotate(-30); break;
      case 'orbit-right': viewer.rotate(30); break;
      case 'model-zoom-in': viewer.zoom(1.2); break;
      case 'model-zoom-out': viewer.zoom(1 / 1.2); break;
      case 'model-fit': viewer.fit(); break;
      case 'cutaway': cutaway = !cutaway; updateMode(); modelPaint(); break;
      case 'model-roof':
        showRoof = cutaway ? true : !showRoof;
        cutaway = false;
        updateMode();
        modelPaint();
        break;
      case 'tab': inspectorTab = arg; inspectorOpen = true; updateTools(); renderInspector(); break;
      case 'inspector': inspectorOpen = !inspectorOpen; updateTools(); break;
      case 'close-inspector': inspectorOpen = false; updateTools(); inspectorToggle.focus({ preventScroll: true }); break;
      case 'level': switchLevel(arg); dialog.close(); break;
      case 'add-level':
        if (project.levels.length >= 20) { toast('levelLimit'); break; }
        openModal('edit-level');
        break;
      case 'edit-level': openModal('edit-level', { id: arg }); break;
      case 'delete-level':
        openModal('confirm', { title: 'removeLevel', detail: 'removeLevelPrompt', operation: () => change(() => {
          project.levels = project.levels.filter((item) => item.id !== arg);
          project.cameras = (project.cameras ?? []).filter((item) => item.levelId !== arg);
          if (project.levelId === arg) project.levelId = project.levels[0].id;
          selected = null;
          pendingPoint = null;
          resetCamera();
        }) });
        break;
      case 'duplicate-shape': duplicateEntity(); break;
      case 'remove-shape': removeEntity(); break;
      case 'rotate-shape': {
        const item = entity();
        if (item) change(() => { item.angle = (item.angle + 90) % 360; });
        break;
      }
      case 'duplicate-project':
      case 'mirror-project': {
        if (!await saveNow()) break;
        const copy = type === 'mirror-project' ? mirror(clone(project)) : clone(project);
        copy.name = `${project.name.slice(0, 84)} (${tr(type === 'mirror-project' ? 'mirrorSuffix' : 'copySuffix')})`;
        loadProject(copy);
        dialog.close();
        await saveNow(true);
        break;
      }
      case 'open': {
        const record = projectList.find((entry) => entry.id === arg);
        if (record && await saveNow()) {
          try { loadProject(record, arg); dialog.close(); }
          catch { toast('invalidFile'); }
        }
        break;
      }
      case 'delete-project':
        openModal('confirm', { title: 'removeProject', detail: 'removePrompt', operation: async () => {
          try {
            if (projectId === arg && !await saveNow()) return;
            await projectApi.remove(arg);
            projectList = projectList.filter((record) => record.id !== arg);
            if (projectId === arg) {
              const latest = projectList[0];
              loadProject(latest ?? makeProject('blank', defaultSystem, isPt), latest?.id);
            }
          } catch { toast('removeError'); }
          openModal('projects');
        } });
        break;
      case 'import': root.querySelector('[data-role="file"]').click(); break;
      case 'image': root.querySelector('[data-role="file-image"]').click(); break;
      case 'remove-image': change(() => { delete level().image; }); break;
      case 'export-json': download(JSON.stringify({ app: 'Casovara', version: 1, project }, null, 2), 'casovara.json', 'application/json'); break;
      case 'export-svg': download(exportSvg(), 'svg', 'image/svg+xml'); break;
      case 'exportPng': exportPng(); break;
      case 'print': printPlan(); break;
      case 'csv': download(csvData(), 'csv', 'text/csv;charset=utf-8'); break;
      case 'copy-report':
        try { await navigator.clipboard.writeText(reportRows().map((row) => row.join('\t')).join('\n')); toast('copied'); }
        catch { toast('copyError'); }
        break;
      case 'report': {
        const { scope, area, estimate } = estimateData();
        if (dialog.open) dialog.close();
        openBuilderReport({ locale, project: scope, system: profile(), area, estimate });
        break;
      }
      case 'autoDimensions':
        if (level().walls.length) change(() => {
          const entry = level();
          const measured = entry.walls.map(dimensionsAround).filter((measure) => !entry.measurements.some((item) => Math.abs(item.x1 - measure.x1) + Math.abs(item.y1 - measure.y1) + Math.abs(item.x2 - measure.x2) + Math.abs(item.y2 - measure.y2) < .04));
          entry.measurements.push(...measured);
        });
        break;
      case 'ceiling':
        cutaway = false;
        showRoof = true;
        if (viewMode === 'plan') viewMode = 'split';
        change(() => { level().ceiling = !level().ceiling; });
        break;
      case 'roof': openModal('roofs'); break;
      case 'flooring': openModal('flooring'); break;
      case 'preset':
        if (viewMode === 'plan') viewMode = 'view3d';
        if (arg === 'iso') viewer.set(initialModelCamera);
        else {
          const top = arg === 'top';
          viewer.set({ azimuth: top ? 0 : Number(arg), elevation: top ? 90 : 14, projection: 'orthographic', zoom: 1, panX: 0, panY: 0 });
        }
        render();
        dialog.close();
        break;
      case 'camera-open': {
        const entry = project.cameras.find((item) => item.id === arg);
        if (!entry) break;
        viewer.set({ azimuth: entry.orbit, elevation: entry.elevation, zoom: entry.zoom, panX: entry.panX, panY: entry.panY, projection: entry.projection });
        cutaway = entry.cutaway;
        showRoof = entry.roof;
        modelScope = entry.scope;
        if (entry.environment) {
          simulator = { ...entry.environment };
          syncSimulatorControls(simulatorPanel, locale, simulator);
        }
        if (viewMode === 'plan') viewMode = 'view3d';
        switchLevel(entry.levelId);
        render();
        dialog.close();
        break;
      }
      case 'camera-remove': change(() => { project.cameras = project.cameras.filter((entry) => entry.id !== arg); }); drawModal(); break;
    }
  }, listen);

  function gridStep() { return profile().defaults?.gridStep ?? .1; }
  function wallDetail(wall) {
    return renderWallInspector(wall, level(), { locale, systemId: project.systemId, findWall });
  }
  function updateWallDetails(wall) {
    syncWallInspector(studioPanel, wallDetail(wall));
    updateTools();
    paint();
  }
  function wallSpecChange(key, input) {
    const wall = selected?.kind === 'walls' && entity();
    if (!wall) return;
    const current = level();
    const spec = getWallSpec(wall, current.height);
    let candidate = spec;
    if (key === 'assembly') candidate = applyWallAssembly(spec, input.value);
    else if (key === 'heightMode') {
      const height = input.value === 'fixed' ? effectiveWallHeight(wall, current.height) : spec.height;
      candidate = { ...spec, heightMode: input.value, height };
    } else if (key === 'exteriorSide') candidate = { ...spec, exteriorSide: input.checked ? -1 : 1 };
    else if (input.type !== 'number') candidate = { ...spec, [key]: input.value };
    else if (Number.isFinite(input.valueAsNumber)) {
      const value = clamp(input.valueAsNumber, Number(input.min), Number(input.max));
      candidate = { ...spec, [key]: ['core', 'insulation', 'outside', 'inside'].includes(key) ? value / 1000 : value };
    }
    const safe = normalizeWallSpec(candidate, wall.thickness);
    if (safe.heightMode === 'floor') safe.baseOffset = Math.min(safe.baseOffset, Number((current.height - .05).toFixed(3)));
    if (Object.keys(spec).some((field) => spec[field] !== safe[field])) {
      change(() => { wall.spec = safe; wall.thickness = wallSpecThickness(safe); }, false);
    }
    updateWallDetails(wall);
  }
  function shapeChange(key, input) {
    const item = entity();
    if (!item) return;
    const number = input.type === 'number' ? input.valueAsNumber : Number.NaN;
    if (selected.kind === 'items' && elements[item.type].opening && ['openingHeight', 'openingSill'].includes(key)) {
      const opening = normalizeOpening(item.opening ?? {}, item.type);
      const field = key === 'openingHeight' ? 'height' : 'sill';
      if (Number.isFinite(number)) {
        const edited = normalizeOpening({ ...opening, [field]: number }, item.type);
        if (opening[field] !== edited[field]) change(() => { item.opening = edited; });
      }
      input.value = normalizeOpening(item.opening ?? {}, item.type)[field];
      return;
    }
    if (input.type === 'number' && !Number.isFinite(number)) { input.value = item[key] ?? wallLength(item); return; }
    const value = Number.isFinite(number) ? clamp(number, Number(input.min), Number(input.max)) : input.value.trim();
    if (selected.kind === 'walls' && key === 'length') {
      const length = wallLength(item);
      if (Math.abs(value - length) < .0005) return;
      const factor = value / Math.max(.01, length);
      const next = { ...item, x2: item.x1 + (item.x2 - item.x1) * factor, y2: item.y1 + (item.y2 - item.y1) * factor };
      change(() => {
        applyGeometry(connectedGeometry(new Map([[item.id, next]])));
        delete item.roomId;
      }, false);
      updateWallDetails(item);
      return;
    }
    if (selected.kind === 'items' && elements[item.type].opening && key === 'width') {
      const attached = findWall(item, level().walls, .15, item.width);
      if (attached) {
        const width = Math.min(value, wallLength(attached.wall));
        const checked = findWall(item, [attached.wall], Infinity, width);
        if (width !== item.width) change(() => { Object.assign(item, { width, x: checked.x, y: checked.y }); });
        input.value = Number(width.toFixed(3));
        return;
      }
    }
    if (item[key] === value) return;
    change(() => {
      if (key === 'length') {
        const factor = value / Math.max(.01, wallLength(item));
        const next = { ...item, x2: item.x1 + (item.x2 - item.x1) * factor, y2: item.y1 + (item.y2 - item.y1) * factor };
        if (selected.kind === 'walls') applyGeometry(connectedGeometry(new Map([[item.id, next]])));
        else Object.assign(item, next);
        delete item.roomId;
      } else if (selected.kind === 'rooms' && (key === 'w' || key === 'h')) morphRoom(item, { ...item, [key]: value });
      else item[key] = value;
    });
    if (input.type === 'number') input.value = Number(value.toFixed(3));
    if (selected?.kind === 'rooms') {
      const title = studioPanel.querySelector('h2');
      const area = studioPanel.querySelector('.cv-metrics dd');
      if (title) title.textContent = item.name || localized(roomStyles[item.type]);
      if (area) area.textContent = `${n(item.w * item.h)} m²`;
    }
  }
  simulatorPanel.addEventListener('input', (event) => {
    if (!event.target.matches('[data-simulator]')) return;
    const next = readSimulatorOption(simulator, event.target);
    if (next === simulator) return;
    simulator = next;
    syncSimulatorControls(simulatorPanel, locale, simulator);
    modelPaint();
  }, listen);
  root.addEventListener('change', async (event) => {
    const input = event.target;
    if (input.matches('[data-role="file"]')) {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      try {
        if (file.size > 3_500_000) throw new Error('large file');
        const data = JSON.parse(await file.text());
        const candidate = clean(data.project ?? data);
        if (!await saveNow()) return;
        loadProject(candidate);
        if (dialog.open) dialog.close();
        await saveNow(true);
      } catch { toast('invalidFile'); }
      return;
    }
    if (input.matches('[data-role="file-image"]')) {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 900000) { toast('invalidImage'); return; }
      const reader = new FileReader();
      const originLevel = level();
      const originProject = project;
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          if (originProject !== project || !project.levels.includes(originLevel) || !image.naturalWidth) return;
          const b = levelBounds(originLevel);
          change(() => { originLevel.image = { src: reader.result, x: b.x, y: b.y, width: b.width, height: b.width * image.naturalHeight / image.naturalWidth, opacity: .38 }; });
          inspectorOpen = true;
          setTool('select');
        };
        image.onerror = () => toast('invalidImage');
        image.src = reader.result;
      };
      reader.onerror = () => toast('invalidImage');
      reader.readAsDataURL(file);
      return;
    }
    const [key, property] = (input.dataset.field ?? '').split(':');
    if (key === 'shape') { shapeChange(property, input); return; }
    if (key === 'wall') { wallSpecChange(property, input); return; }
    if (key === 'settings' && Object.hasOwn(settings, property)) {
      if (property === 'drawingStyle' && ['technical', 'furnished'].includes(input.value)) settings.drawingStyle = input.value;
      else if (input.type === 'checkbox') settings[property] = input.checked;
      updateTools();
      paint();
      return;
    }
    switch (key) {
      case 'modelScope':
        modelScope = input.value;
        viewer.fit();
        break;
      case 'modelProjection': viewer.set({ projection: input.value }); break;
      case 'name': {
        const name = input.value.trim();
        if (!name) input.value = project.name;
        else if (name !== project.name) change(() => { project.name = name; });
        break;
      }
      case 'systemId':
        if (systemIds.includes(input.value) && project.systemId !== input.value) {
          newWallThickness = null;
          newWallAssembly = 'custom';
          change(() => { project.systemId = input.value; });
        }
        break;
      case 'levelId': switchLevel(input.value); break;
      case 'roomType':
        if (Object.hasOwn(roomStyles, input.value)) {
          roomType = input.value;
          const other = Array.from(root.querySelectorAll('[data-field="roomType"]')).find((select) => select !== input);
          if (other) other.value = roomType;
          paintPlan(false);
        }
        break;
      case 'newWallAssembly':
        if (!Object.hasOwn(wallAssemblies, input.value)) break;
        newWallAssembly = input.value;
        renderPlanOptions();
        root.querySelector('[data-field="newWallAssembly"]')?.focus({ preventScroll: true });
        paintPlan(false);
        break;
      case 'newWallThickness':
        if (newWallAssembly !== 'custom') break;
        newWallThickness = Number.isFinite(input.valueAsNumber) ? Number(clamp(input.valueAsNumber, .08, 1).toFixed(3)) : null;
        input.value = wallThickness();
        paintPlan(false);
        break;
      case 'locale':
        if (setLocale && await saveNow()) {
          try { await setLocale(input.value); }
          catch { input.value = locale; }
        } else input.value = locale;
        break;
      case 'estimateScope': allLevels = input.value === 'all'; renderInspector(); break;
      case 'vat': {
        vat = clamp(Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : 23, 0, 100);
        input.value = vat;
        const total = studioPanel.querySelector('.cv-total strong');
        if (total) total.textContent = money(estimateData().estimate.total * (1 + vat / 100));
        break;
      }
      case 'notes': if (input.value !== (project.notes ?? '')) change(() => { project.notes = input.value; }, false); updateTools(); break;
      case 'image': {
        const image = level().image;
        if (!image || !Number.isFinite(input.valueAsNumber)) break;
        change(() => {
          if (property === 'opacity') image.opacity = clamp(input.valueAsNumber / 100, .05, .95);
          if (property === 'width') {
            const next = clamp(input.valueAsNumber, 0.3, 100);
            image.height *= next / image.width;
            image.width = next;
          }
        });
        break;
      }
    }
  }, listen);
  dialog.addEventListener('input', (event) => {
    if (event.target.matches('[data-role=command-search]')) drawCommands();
    else if (event.target.matches('[type="search"]')) drawProjectList();
  }, listen);
  dialog.addEventListener('keydown', (event) => {
    if (modal !== 'commands') return;
    const search = dialog.querySelector('[data-role=command-search]');
    const entries = [...dialog.querySelectorAll('[data-role=command-list] > :is(button, a)')];
    if (event.key === 'Enter' && event.target === search && entries.length) { event.preventDefault(); entries[0].click(); }
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const active = entries.indexOf(event.target);
    const target = event.key === 'ArrowUp' ? entries[active - 1] ?? search : entries[active + 1] ?? search;
    event.preventDefault();
    target.focus();
  }, listen);
  dialog.addEventListener('close', () => {
    if (!dialog.open && fromFocus?.isConnected) fromFocus.focus({ preventScroll: true });
  }, listen);
  dialog.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const kind = event.target.dataset.form;
    if (kind === 'new') {
      if (!await saveNow()) return;
      const template = data.get('template');
      const name = String(data.get('name') ?? '').trim();
      if (!name) return;
      const systemId = data.get('system');
      const next = template === 'blank' ? makeProject('blank', systemId, isPt, name) : { ...makeTemplate(template, locale), name, systemId };
      if (template === 'blank') next.levels[0].height = systems.find((s) => s.id === systemId)?.defaults?.roomHeight ?? 2.7;
      loadProject(next);
      dialog.close();
      await saveNow(true);
    }
    if (kind === 'level') {
      const name = String(data.get('name') ?? '').trim();
      if (!name) return;
      const height = clamp(Number(data.get('height')), 1.5, 12);
      const target = viewLevel(project, currentModalData.id);
      change(() => {
        if (target) Object.assign(target, { name, height });
        else {
          const added = makeLevel(name, height);
          project.levels.push(added);
          project.levelId = added.id;
          pendingPoint = null;
          selected = null;
          resetCamera();
        }
      });
      dialog.close();
    }
    if (kind === 'roof') {
      const roof = data.get('type');
      if (roof !== 'none') { cutaway = false; showRoof = true; }
      if (viewMode === 'plan') viewMode = 'split';
      change(() => { level().roof = roof; level().pitch = clamp(Number(data.get('pitch')), 5, 65); });
      dialog.close();
    }
    if (kind === 'finish') {
      activeFinish = data.get('finish');
      const item = entity();
      if (selected?.kind === 'rooms' && item) change(() => { item.finish = activeFinish; });
      else setTool('flooring');
      dialog.close();
    }
    if (kind === 'camera') {
      const name = String(data.get('name') ?? '').trim();
      if (!name) return;
      const { azimuth, ...viewpoint } = viewer.camera();
      change(() => { (project.cameras ??= []).push({ id: uid(), name, levelId: project.levelId, orbit: azimuth,
        cutaway, roof: showRoof, scope: modelScope, environment: { ...simulator }, ...viewpoint }); });
      dialog.close();
    }
    if (kind === 'label') {
      const value = String(data.get('text') ?? '').trim();
      if (!value) return;
      const { x, y } = currentModalData;
      change(() => { (level().annotations ??= []).push({ id: uid(), x, y, text: value }); });
      dialog.close();
    }
  }, listen);

  window.addEventListener('keydown', (event) => {
    if (!root.isConnected || dialog.open || document.querySelector('dialog[open]')) return;
    const editing = event.target.matches?.('input, textarea, select, [contenteditable]');
    const key = event.key.toLowerCase();
    const chord = event.ctrlKey || event.metaKey;
    if (chord && key === 'k') {
      event.preventDefault();
      if (editing) event.target.blur();
      openModal('commands');
      return;
    }
    if (chord && key === 's') {
      event.preventDefault();
      if (editing) event.target.blur();
      void saveNow(true);
      return;
    }
    if (editing || event.altKey) return;
    if (!chord && ['pageup', 'pagedown'].includes(key)) {
      const index = project.levels.findIndex(({ id }) => id === project.levelId);
      const target = project.levels[index + (key === 'pageup' ? 1 : -1)];
      if (target) { event.preventDefault(); switchLevel(target.id); }
      return;
    }
    if (chord && (key === 'z' || key === 'y')) {
      event.preventDefault();
      undo(event.shiftKey || key === 'y');
    } else if (key === 'escape' || key === 'enter' && pendingPoint) {
      if (key === 'escape' && !simulatorPanel.hidden) { setSimulatorOpen(false); simulatorToggle.focus({ preventScroll: true }); }
      else if (pendingPoint) finishDrawing();
      else setTool('select');
    } else if (key === 'delete' || key === 'backspace') {
      if (removeEntity()) event.preventDefault();
    } else if (!chord) {
      if (Object.hasOwn(modeKeys, key)) {
        event.preventDefault(); viewMode = modeKeys[key]; render(); return;
      }
      if (key === 'f') {
        event.preventDefault();
        if (viewMode === 'view3d') viewer.fit();
        else { resetCamera(); paintPlan(); }
        return;
      }
      const shortcut = Object.keys(shortcuts).find((id) => shortcuts[id].toLowerCase() === key);
      if (shortcut) {
        event.preventDefault();
        category = ['measure', 'label'].includes(shortcut) ? 'annotate' : 'structure';
        toolbarOpen = true;
        setTool(shortcut);
      }
    }
  }, listen);
  window.addEventListener('beforeunload', (event) => {
    if (revision !== savedRevision) { event.preventDefault(); event.returnValue = ''; }
  }, listen);

  resetCamera();
  viewer.set(initialModelCamera);
  status('draft');
  render();
  if (token && !shared) toast('invalidShare');
  void updateProjectList().then(() => {
    if (!starter && !requestedSystem && revision === 0 && !projectId && projectList.length) {
      const candidate = projectList[0];
      try { loadProject(candidate, candidate.id); }
      catch { toast('invalidFile'); }
    }
  });
  return () => {
    controller.abort();
    resize.disconnect();
    viewer.dispose();
    cancelAnimationFrame(planFrame);
    clearTimeout(saveTimer);
    clearTimeout(toastTimer);
  };
}
