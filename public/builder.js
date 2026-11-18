import { openBuilderReport } from './builder-report.js';
import { openBuilderShare } from './builder-share.js';
import { estimateProject, formatMoney, formatNumber, projectApi, systems } from './core.js';
import { makeTemplate, templates } from './templates.js';
import {
  clamp, clone, elements, escapeHtml as esc, findWall, levelBounds, makeItem, makeLevel, makeProject, makeRoom,
  makeWall, normalizeProject, point, polygons3D, projectArea, roomStyles, snapTo, uid, wallLength,
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
const icon = (name, size = 19) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.65" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.room}</svg>`;
const labels = {
  commands: ['Pesquisar ferramentas', 'Find tools'], commandPlaceholder: ['Pesquise uma ação ou ferramenta', 'Search actions or tools'], commandEmpty: ['Nenhuma ação encontrada.', 'No matching actions.'], guides: ['Guias de construção', 'Construction guides'], calculators: ['Calculadoras', 'Calculators'],
  back: ['Início', 'Home'], builder: ['Estúdio de projeto', 'Design studio'], projects: ['Projetos', 'Projects'], project: ['Projeto', 'Project'], name: ['Nome do projeto', 'Project name'],
  change: ['Mudar nome', 'Rename'], new: ['Novo projeto', 'New project'], templates: ['Modelos de casa', 'House templates'], import: ['Importar projeto', 'Import project'], export: ['Exportar', 'Export'], share: ['Partilhar', 'Share'], sharing: ['Partilhar projeto', 'Share project'], fileShare: ['Envie o ficheiro do projeto para que outra pessoa possa abrir e editar a planta.', 'Send the project file so someone else can open and edit the floor plan.'],
  exportFile: ['Ficheiro do projeto (.json)', 'Project file (.json)'], exportPlan: ['Planta vetorial (.svg)', 'Vector drawing (.svg)'], exportPng: ['Imagem (.png)', 'Image (.png)'], print: ['Imprimir planta', 'Print plan'],
  save: ['Guardar', 'Save'], saving: ['A guardar…', 'Saving…'], saved: ['Guardado', 'Saved'], draft: ['Rascunho', 'Draft'], unsaved: ['Alterações por guardar', 'Unsaved changes'], saveError: ['O projeto não foi guardado. Tente novamente ou descarregue o ficheiro.', 'The project could not be saved. Try again or download the file.'], savedFile: ['Ficheiro descarregado.', 'File downloaded.'],
  select: ['Selecionar', 'Select'], pan: ['Mover vista', 'Pan'], room: ['Compartimento', 'Room'], wall: ['Parede ortogonal', 'Orthogonal wall'], angled: ['Parede livre', 'Angled wall'], door: ['Porta', 'Door'], window: ['Janela', 'Window'],
  furnish: ['Biblioteca de objetos', 'Object library'], measure: ['Cota', 'Dimension'], label: ['Texto', 'Text'],
  undo: ['Desfazer', 'Undo'], redo: ['Refazer', 'Redo'], plan: ['Planta', 'Plan'], view3d: ['3D', '3D'], split: ['Dividida', 'Split'],
  zoomIn: ['Ampliar', 'Zoom in'], zoomOut: ['Reduzir', 'Zoom out'], fit: ['Enquadrar planta', 'Fit plan'], rotateLeft: ['Rodar vista para a esquerda', 'Rotate view left'], rotateRight: ['Rodar vista para a direita', 'Rotate view right'], cutaway: ['Paredes seccionadas', 'Cutaway walls'],
  levels: ['Pisos', 'Levels'], level: ['Piso', 'Level'], addLevel: ['Adicionar piso', 'Add level'], levelName: ['Nome do piso', 'Level name'], levelHeight: ['Pé-direito', 'Ceiling height'], removeLevel: ['Eliminar piso', 'Delete level'], removeLevelPrompt: ['Os elementos e as cotas deste piso serão eliminados.', 'The elements and dimensions on this level will be deleted.'],
  properties: ['Propriedades', 'Properties'], data: ['Medições', 'Quantities'], notes: ['Notas', 'Notes'], costs: ['Estimativa', 'Estimate'],
  siteSystem: ['Sistema construtivo', 'Construction system'], area: ['Área interior', 'Internal area'], roomArea: ['Área', 'Area'], costLabel: ['Custo indicativo', 'Indicative cost'], tax: ['IVA', 'VAT'], baseCost: ['Subtotal', 'Subtotal'], taxIncluded: ['Total c/ IVA', 'Total incl. VAT'],
  costNote: ['Valores de demonstração para planeamento. Peça um orçamento com base no terreno e no projeto final.', 'Demonstration figures for planning. Request a quote based on the plot and final design.'],
  structure: ['Estrutura', 'Structure'], envelope: ['Envolvente', 'Envelope'], interior: ['Interiores', 'Interiors'], installation: ['Instalações', 'Services'], details: ['Ver estimativa e quantidades', 'View estimate and quantities'],
  width: ['Largura', 'Width'], depth: ['Profundidade', 'Depth'], length: ['Comprimento', 'Length'], thickness: ['Espessura', 'Thickness'], angle: ['Rotação', 'Rotation'], type: ['Tipo', 'Type'], labelName: ['Nome', 'Name'],
  delete: ['Eliminar', 'Delete'], duplicate: ['Duplicar', 'Duplicate'], rotate: ['Rodar 90°', 'Rotate 90°'], newTemplate: ['Criar projeto', 'Create project'], cancel: ['Cancelar', 'Cancel'],
  drawingType: ['Tipo de compartimento', 'Room type'], pointFirst: ['Marque o primeiro ponto na planta.', 'Mark the first point on the plan.'], pointSecond: ['Marque o segundo ponto. Prima Esc para cancelar.', 'Mark the second point. Press Esc to cancel.'],
  placeItem: ['Clique ou toque na planta para colocar o objeto.', 'Click or tap the plan to place the object.'], placeOpening: ['Clique ou toque junto a uma parede para ancorar o vão.', 'Click or tap near a wall to anchor the opening.'], placeLabel: ['Clique ou toque na planta para colocar o texto.', 'Click or tap the plan to place the text.'],
  emptySelect: ['Selecione um elemento na planta para editar as suas propriedades.', 'Select an element in the plan to edit its properties.'],
  noProjects: ['Ainda não tem projetos guardados.', 'You have no saved projects yet.'], findProjects: ['Pesquisar projetos', 'Search projects'], removeProject: ['Eliminar projeto', 'Delete project'], removePrompt: ['O projeto guardado e os seus pisos serão eliminados.', 'The saved project and its levels will be deleted.'], removeError: ['Não foi possível eliminar o projeto.', 'The project could not be deleted.'], loadError: ['Não foi possível abrir a lista de projetos.', 'Your project list could not be opened.'],
  invalidFile: ['Abra um ficheiro de projeto Casovara válido.', 'Open a valid Casovara project file.'],
  tryTools: ['Selecione Compartimento ou Parede para começar.', 'Select Room or Wall to get started.'], emptyPlan: ['Desenhe a primeira divisão', 'Draw your first room'], empty3d: ['O seu modelo aparece aqui à medida que desenha a planta.', 'Your model appears here as you draw the plan.'],
  grid: ['Grelha', 'Grid'], snap: ['Ajustar à grelha', 'Snap to grid'], dimensions: ['Dimensões gerais', 'Overall dimensions'], furniture: ['Mobiliário', 'Furniture'], labels: ['Identificação de divisões', 'Room labels'], settings: ['Opções de visualização', 'Display options'],
  language: ['Idioma', 'Language'], keyboard: ['Atalhos de teclado', 'Keyboard shortcuts'], help: ['Ajuda', 'Help'], fitLabel: ['Enquadrar', 'Fit'],
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
  let objectType = 'door';
  let viewMode = 'plan';
  let selected = null;
  let pendingPoint = null;
  let hoverPoint = null;
  let drag = null;
  let inspectorTab = 'properties';
  let inspectorOpen = false;
  let mobileCatalog = false;
  let vat = 23;
  let allLevels = true;
  let orbit = -38;
  let zoom3d = 1;
  let cutaway = true;
  let toastTimer;
  let modal = '';
  let currentModalData = {};
  let fromFocus;
  let camera = { x: 0, y: 0, zoom: 1 };
  let pen = new Map();
  let pinch = null;
  let preventClick = false;
  let settings = { grid: true, snap: true, dimensions: true, furniture: true, labels: true };
  const history = [];
  const future = [];
  const controller = new AbortController();
  const listen = { signal: controller.signal };

  function clean(raw) {
    const state = normalizeProject(raw, systemIds, isPt);
    state.notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 8000) : '';
    state.cameras = Array.isArray(raw.cameras) ? raw.cameras.filter((cam) => cam && typeof cam.name === 'string' && Number.isFinite(cam.orbit) && viewLevel(state, cam.levelId)).slice(0, 30).map((cam) => ({ id: typeof cam.id === 'string' && /^[\w-]{1,90}$/.test(cam.id) ? cam.id : uid(), name: cam.name.slice(0, 80), orbit: clamp(cam.orbit, -360, 360), levelId: cam.levelId, cutaway: !!cam.cutaway })) : [];
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
  function toolbarButton(action, symbol, key, extra = '', visibleText = false) {
    return `<button type="button" class="cv-tool" data-action="${action}" ${extra} title="${str(tr(key))}" aria-label="${str(tr(key))}">${icon(symbol)}${visibleText ? `<span>${str(tr(key))}</span>` : ''}</button>`;
  }
  function status(statusKey) {
    const target = root.querySelector('[data-role="status"]');
    target.dataset.status = statusKey;
    target.innerHTML = `<i></i><span>${str(tr(statusKey))}</span>`;
  }

  root.innerHTML = `<div class="cv-studio" lang="${isPt ? 'pt-PT' : locale === 'en-PT' ? 'en-GB' : 'en'}">
    <header class="cv-top">
      <a class="cv-builder-brand" href="${str(homeUrl)}" aria-label="Casovara · ${tr('back')}"><img src="/brand.svg" width="28" height="28" alt=""><b>casovara</b></a>
      <div class="cv-project-heading">
        <button class="cv-folder" data-action="projects" type="button" title="${tr('projects')}" aria-label="${tr('projects')}">${icon('folder')}</button>
        <label><span class="cv-sr-only">${tr('name')}</span><input data-role="name" data-field="name" maxlength="95" value="${str(project.name)}"></label>
        <span class="cv-status" data-role="status" aria-live="polite"></span>
      </div>
      <div class="cv-top-actions">
        ${toolbarButton('commands', 'search', 'commands')}
        ${toolbarButton('help', 'info', 'help')}
        ${toolbarButton('export', 'export', 'export', '', true)}
        <button class="cv-button cv-primary" data-action="save" type="button" aria-label="${tr('save')}">${icon('save', 17)}<span>${tr('save')}</span></button>
      </div>
    </header>
    <div class="cv-ribbon" aria-label="${tr('align')}">
      <div class="cv-history">${toolbarButton('undo', 'undo', 'undo')}${toolbarButton('redo', 'redo', 'redo')}</div>
      <div class="cv-categories" data-role="categories"></div>
      ${toolbarButton('settings', 'settings', 'settings')}
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
          <button class="cv-inspector-toggle cv-tool" type="button" data-action="inspector" title="${tr('info')}" aria-label="${tr('info')}">${icon('settings')}</button>
        </div>
        <div class="cv-view" data-role="view" data-mode="plan">
          <section class="cv-draft" aria-label="${tr('plan')}">
            <svg data-role="plan" xmlns="http://www.w3.org/2000/svg" aria-label="${tr('plan')}" role="img" tabindex="0" preserveAspectRatio="none"></svg>
            <div class="cv-empty" data-role="empty" hidden><b>${tr('emptyPlan')}</b><p>${tr('tryTools')}</p><button class="cv-button" data-action="new" type="button">${tr('templates')}</button></div>
            <div class="cv-drawing-tools" data-role="tools" role="group" aria-label="${tr('mode')}"></div>
            <div class="cv-canvas-controls cv-plan-controls">
              <span class="cv-compass" aria-label="${tr('north')}" title="${tr('north')}">${icon('north', 18)}<small>N</small></span>
              <div class="cv-zoom">
                ${toolbarButton('zoom-out', 'minus', 'zoomOut')}<span data-role="zoom">100%</span>${toolbarButton('zoom-in', 'plus', 'zoomIn')}${toolbarButton('fit', 'fit', 'fit')}
              </div>
            </div>
          </section>
          <section class="cv-model" aria-label="${tr('view3d')}">
            <svg data-role="model" xmlns="http://www.w3.org/2000/svg" aria-label="${tr('view3d')}" role="img"></svg>
            <p class="cv-empty" data-role="empty-model" hidden>${tr('empty3d')}</p>
            <div class="cv-canvas-controls cv-model-controls">
              <div class="cv-zoom">
              ${toolbarButton('orbit-left', 'undo', 'rotateLeft')}${toolbarButton('orbit-right', 'redo', 'rotateRight')}${toolbarButton('cutaway', 'layers', 'cutaway')}${toolbarButton('model-zoom-out', 'minus', 'zoomOut')}${toolbarButton('model-zoom-in', 'plus', 'zoomIn')}${toolbarButton('model-fit', 'fit', 'fit')}
              </div>
            </div>
          </section>
        </div>
        <footer class="cv-stage-footer"><span data-role="hint"></span><span data-role="scale"></span></footer>
      </div>
      <aside class="cv-inspector" aria-label="${tr('info')}" data-role="inspector"></aside>
    </main>
    <dialog class="cv-dialog" data-role="dialog"></dialog>
    <input type="file" accept="application/json,.json,.casovara" hidden data-role="file"><input type="file" accept="image/png,image/jpeg,image/webp" hidden data-role="file-image">
    <div class="cv-toast" data-role="toast" hidden aria-live="polite"></div>
  </div>`;
  const studio = root.querySelector('.cv-studio');
  const plane = root.querySelector('[data-role="plan"]');
  const model = root.querySelector('[data-role="model"]');
  const dialog = root.querySelector('[data-role="dialog"]');
  const studioPanel = root.querySelector('[data-role="inspector"]');
  const view = root.querySelector('[data-role="view"]');
  const resize = new ResizeObserver(() => paint());
  resize.observe(view);

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
    drag = null;
    pendingPoint = null;
    history.length = 0;
    future.length = 0;
    mobileCatalog = false;
    tool = 'select';
    resetCamera();
    status(projectId ? 'saved' : 'draft');
    render();
  }

  function resetCamera() {
    const bounds = levelBounds(level());
    camera = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, zoom: 1 };
  }
  function fitExtent() {
    const rect = plane.getBoundingClientRect();
    const ratio = rect.width && rect.height ? rect.width / rect.height : 1.3;
    const bounds = levelBounds(level());
    const horizontalMargin = ratio < .9 ? 2.55 : 4.9;
    const world = Math.max((bounds.width + horizontalMargin) / ratio, bounds.height + 3.5, 8);
    return { width: world * ratio / camera.zoom, height: world / camera.zoom };
  }
  function planPosition(event) {
    const matrix = plane.getScreenCTM();
    if (!matrix) return point(0, 0);
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return point(p.x, p.y);
  }
  function position(event, raw = false) {
    const p = planPosition(event);
    if (raw || !settings.snap) return p;
    if (['wall', 'angled', 'room', 'measure'].includes(tool)) {
      const threshold = Math.min(.28, fitExtent().width / plane.getBoundingClientRect().width * 10);
      let distance = threshold;
      let nearest;
      for (const wall of level().walls) {
        for (const end of [point(wall.x1, wall.y1), point(wall.x2, wall.y2)]) {
          const delta = Math.hypot(p.x - end.x, p.y - end.y);
          if (delta < distance) { distance = delta; nearest = end; }
        }
      }
      if (nearest) return nearest;
    }
    return point(snapTo(p.x, gridStep()), snapTo(p.y, gridStep()));
  }
  function maybeSnapEnd(start, end) {
    if (tool !== 'wall') return end;
    if (Math.abs(end.x - start.x) > Math.abs(end.y - start.y)) return point(end.x, start.y);
    return point(start.x, end.y);
  }
  function updateMode() {
    view.dataset.mode = viewMode;
    for (const button of root.querySelectorAll('[data-action^="mode:"]')) button.setAttribute('aria-pressed', String(button.dataset.action === `mode:${viewMode}`));
    root.querySelector('[data-action="cutaway"]').setAttribute('aria-pressed', String(cutaway));
  }
  function updateTools() {
    studio.dataset.tool = tool;
    studio.dataset.inspector = String(inspectorOpen);
    studio.dataset.catalog = String(mobileCatalog);
    const active = categories.find(({ id }) => id === category);
    root.querySelector('[data-role="categories"]').innerHTML = categories.map((cat) => toolbarButton(`category:${cat.id}`, cat.icon, cat.id, `aria-pressed="${category === cat.id}"`, true)).join('');
    let tools = active.tools;
    if (category !== 'structure') tools = ['select', 'pan', ...tools];
    root.querySelector('[data-role="tools"]').innerHTML = tools.map((id) => {
      const setting = toolSettings[id] || {
        catalog: ['furnish', 'furnish'], slab: ['room', 'outer'], deck: ['room', 'deck'], stair: ['stair', 'stair'], rail: ['rail', 'rail'], image: ['image', 'image'],
        view3d: ['cube', 'view3d'], camera: ['camera', 'camera'], cameraList: ['layers', 'cameraList'], export: ['export', 'export'], exportPng: ['image', 'exportPng'], autoDimensions: ['measure', 'autoDimensions'],
      }[id];
      const action = ['levels', 'image', 'view3d', 'camera', 'cameraList', 'export', 'exportPng', 'autoDimensions', 'roof', 'ceiling', 'flooring', 'catalog'].includes(id) ? id : `tool:${id}`;
      const pressed = tool === id || (id === 'ceiling' && !!level().ceiling) || (id === 'roof' && !['none', undefined].includes(level().roof)) || (id === 'catalog' && tool === 'item') || (id === 'slab' && tool === 'room' && roomType === 'circulation') || (id === 'deck' && tool === 'room' && roomType === 'outdoor');
      return toolbarButton(action, ...setting, `aria-pressed="${pressed}"`);
    }).join('');
    root.querySelector('[data-action="undo"]').disabled = !history.length;
    root.querySelector('[data-action="redo"]').disabled = !future.length;
    const hint = pendingPoint ? 'pointSecond' :
      ['room', 'wall', 'angled', 'measure'].includes(tool) ? 'pointFirst' :
      ['door', 'window'].includes(tool) || (tool === 'item' && elements[objectType].opening) ? 'placeOpening' :
      tool === 'item' ? 'placeItem' : tool === 'label' || tool === 'north' ? 'placeLabel' :
      tool === 'flooring' ? 'applyFinish' : tool === 'divide' || tool === 'detect' || tool === 'wallChain' ? toolSettings[tool][1] : tool === 'pan' ? 'pan' : 'emptySelect';
    root.querySelector('[data-role="hint"]').textContent = tr(hint);
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

  function modelPaint() {
    const shapes = polygons3D(project, project.levelId, orbit, cutaway);
    const empty = root.querySelector('[data-role="empty-model"]');
    empty.hidden = shapes.length > 0;
    if (!shapes.length) { model.innerHTML = ''; return; }
    const pts = shapes.flatMap(({ points }) => points);
    const minX = Math.min(...pts.map(([x]) => x));
    const maxX = Math.max(...pts.map(([x]) => x));
    const minY = Math.min(...pts.map(([, y]) => y));
    const maxY = Math.max(...pts.map(([, y]) => y));
    const width = (maxX - minX + 3.8) / zoom3d;
    const height = (maxY - minY + 3.4) / zoom3d;
    const middleX = (minX + maxX) / 2;
    const middleY = (minY + maxY) / 2;
    model.setAttribute('viewBox', `${middleX - width / 2} ${middleY - height / 2} ${width} ${height}`);
    model.innerHTML = `<ellipse cx="${middleX}" cy="${maxY - 0.22}" rx="${Math.max(0.4, (maxX - minX) * 0.51)}" ry="0.42" fill="#afaaa0" opacity=".19"/>${shapes.map(({ points, fill, opacity }) => `<polygon points="${points.map(([x, y]) => `${x},${y}`).join(' ')}" fill="${fill}" opacity="${opacity}" stroke="#766c5a" stroke-opacity=".48" stroke-width=".014" stroke-linejoin="round"/>`).join('')}`;
  }

  const finishes = { wood: '#d9c4a1', ceramic: '#dce5e1', concrete: '#deded6', stone: '#e5dcd1' };
  function roomShape(room, active = false) {
    const style = roomStyles[room.type];
    const fill = finishes[room.finish] || style.fill;
    return `<rect data-shape="rooms" data-id="${room.id}" class="cv-room-fill${active ? ' cv-active-shape' : ''}" x="${room.x}" y="${room.y}" width="${room.w}" height="${room.h}" fill="${fill}" stroke="${style.floor}" stroke-width=".035" ${room.type === 'outdoor' ? 'stroke-dasharray=".13 .12"' : ''}/>`;
  }
  function furnitureOutline(item) {
    const radians = item.angle * Math.PI / 180;
    const sine = Math.abs(Math.sin(radians));
    const cosine = Math.abs(Math.cos(radians));
    const depth = item.depth + (item.type === 'table' ? .42 : 0);
    return { x: item.x, y: item.y, halfW: (item.width * cosine + depth * sine) / 2, halfH: (item.width * sine + depth * cosine) / 2 };
  }
  function roomCaption(room, obstacles) {
    const roomStyle = roomStyles[room.type];
    const roomName = room.name || localized(roomStyle);
    const size = clamp(room.w / (Math.max(7, roomName.length) * .64), .085, .25);
    const halfW = Math.min(room.w * .48, Math.max(7, roomName.length) * size * .28 + .06);
    const halfH = Math.min(room.h * .44, size * 1.1);
    const center = point(room.x + room.w / 2, room.y + room.h / 2);
    const offsets = [[0, 0], [0, .22], [0, -.22], [-.21, 0], [.21, 0], [-.22, .22], [.22, .22], [-.22, -.22], [.22, -.22], [0, .35], [0, -.35]];
    const position = offsets.map(([x, y]) => point(center.x + room.w * x, center.y + room.h * y)).find(({ x, y }) =>
      x - halfW >= room.x && x + halfW <= room.x + room.w && y - halfH >= room.y && y + halfH <= room.y + room.h &&
      !obstacles.some((item) => Math.abs(x - item.x) < halfW + item.halfW && Math.abs(y - item.y) < halfH + item.halfH)) || center;
    const fill = finishes[room.finish] || roomStyle.fill;
    return `<g class="cv-room-caption" pointer-events="none" text-anchor="middle"><text x="${position.x}" y="${position.y - .055}" font-size="${size}" font-weight="620" paint-order="stroke" stroke="${fill}" stroke-width=".060" stroke-linejoin="round" fill="#394037">${str(roomName)}</text><text x="${position.x}" y="${position.y + size}" font-size="${Math.min(size, .185)}" fill="#52554a" paint-order="stroke" stroke="${fill}" stroke-width=".045">${n(room.w * room.h, 1)} m²</text></g>`;
  }
  function itemShape(item, active = false, preview = false, walls = level().walls) {
    const data = elements[item.type];
    if (!data) return '';
    const { x, y, width: w, depth: h, angle } = item;
    const fill = data.color;
    const stroke = active ? '#a6462c' : '#555b4e';
    const rect = (px, py, width, height, color = 'none', radius = 0) => `<rect x="${px}" y="${py}" width="${width}" height="${height}" rx="${radius}" fill="${color}" stroke="${stroke}" stroke-width=".023"/>`;
    const line = (d, color = stroke, width = 0.022, dash = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
    let shape = '';
    if (data.opening) {
      const wall = findWall(item, walls, 0.14)?.wall;
      const opening = Math.max(h, wall?.thickness ?? 0.15) + 0.024;
      const isWindow = item.type === 'window' || item.type === 'slidingWindow';
      shape = rect(-w / 2, -opening / 2, w, opening, isWindow ? '#b9d8d4' : '#fbf7eb');
      if (isWindow) shape += line(`M${-w / 2} 0H${w / 2}`, '#34716e', 0.034);
      else {
        const swing = item.type === 'doubleDoor' ? w / 2 : w;
        shape += line(`M${-w / 2} 0V${-swing}`, '#996a4b', 0.046) + line(`M${-w / 2} ${-swing}a${swing} ${swing} 0 0 1 ${swing} ${swing}`, '#996a4b', 0.023, '.065 .06');
        if (item.type === 'doubleDoor') shape += line(`M${w / 2} 0V${-swing}M${w / 2} ${-swing}a${swing} ${swing} 0 0 0 ${-swing} ${swing}`, '#996a4b', 0.029, '.07 .045');
      }
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

  function measurementShape(measure, active = false, offsets = false) {
    const { x1, y1, x2, y2 } = measure;
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 0.04) return '';
    const dx = (x2 - x1) / length;
    const dy = (y2 - y1) / length;
    const accent = active ? '#a6462c' : '#77796b';
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const rotation = angle > 95 ? angle - 180 : angle < -95 ? angle + 180 : angle;
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    return `<g ${offsets ? 'pointer-events="none"' : `data-shape="measurements" data-id="${measure.id}"`}>
      <path d="M${x1},${y1}L${x2},${y2}" stroke="${accent}" stroke-width=".026" fill="none"/>
      <path d="M${x1 - dy * .12},${y1 + dx * .12}l${dy * .24},${-dx * .24}M${x2 - dy * .12},${y2 + dx * .12}l${dy * .24},${-dx * .24}" stroke="${accent}" stroke-width=".026" fill="none"/>
      <text x="${centerX}" y="${centerY}" transform="rotate(${rotation} ${centerX} ${centerY})" dy="-.09" text-anchor="middle" font-size=".19" fill="${accent}" stroke="#faf8f2" stroke-width=".055" paint-order="stroke">${n(length)} m</text>
    </g>`;
  }
  function guides(bounds) {
    return measurementShape(makeWall(bounds.x, bounds.y - 0.56, bounds.x + bounds.width, bounds.y - 0.56), false, true) +
      measurementShape(makeWall(bounds.x - 0.54, bounds.y, bounds.x - 0.54, bounds.y + bounds.height), false, true);
  }
  function wallShape(wall, active = false) {
    return `<line data-shape="walls" data-id="${wall.id}" ${active ? 'class="cv-active-shape"' : ''} x1="${wall.x1}" y1="${wall.y1}" x2="${wall.x2}" y2="${wall.y2}" stroke="${active ? '#a6462c' : '#454a40'}" stroke-width="${wall.thickness}" stroke-linecap="square"/>`;
  }
  function annotationShape(item, active) {
    return `<g data-shape="annotations" data-id="${item.id}" fill="${active ? '#a6462c' : '#424539'}">${item.north ? `<path d="M${item.x} ${item.y - .43}l.17 .46-.17-.13-.17 .13Z"/>` : ''}<text x="${item.x}" y="${item.y}" font-size=".22" font-weight="600" stroke="#faf8f2" stroke-width=".047" paint-order="stroke">${str(item.text)}</text></g>`;
  }

  function draftLayer(forExport = false) {
    const current = level();
    const activeShape = (kind, id) => !forExport && selected?.kind === kind && selected.id === id;
    const active = drag?.type === 'shape' ? drag.preview : null;
    const image = current.image;
    const background = image ? `<image x="${image.x}" y="${image.y}" width="${image.width}" height="${image.height}" opacity="${image.opacity}" href="${image.src}" preserveAspectRatio="none" pointer-events="none"/>` : '';
    const outline = (current.rooms.length || current.walls.length) && settings.dimensions ? guides(levelBounds({ ...current, items: [], measurements: [] })) : '';
    let ghost = '';
    if (!forExport && hoverPoint) {
      if (pendingPoint) {
        const end = maybeSnapEnd(pendingPoint, hoverPoint);
        const x = Math.min(pendingPoint.x, end.x);
        const y = Math.min(pendingPoint.y, end.y);
        if (tool === 'room') ghost = `<rect x="${x}" y="${y}" width="${Math.abs(pendingPoint.x - end.x)}" height="${Math.abs(pendingPoint.y - end.y)}" fill="#b06e46" fill-opacity=".14" stroke="#aa5a37" stroke-width=".036" stroke-dasharray=".12 .09"/>`;
        else ghost = measurementShape({ x1: pendingPoint.x, y1: pendingPoint.y, x2: end.x, y2: end.y }, true, true);
      } else if (['door', 'window', 'item'].includes(tool)) {
        const type = tool === 'item' ? objectType : tool;
        const entry = elements[type];
        const snap = entry.opening ? findWall(hoverPoint, current.walls, 0.75, entry.width) : hoverPoint;
        if (snap) ghost = itemShape({ type, x: snap.x, y: snap.y, angle: snap.angle ?? 0, width: entry.width, depth: entry.depth, id: '' }, false, true);
      }
    }
    const moved = (kind, item) => active && drag.id === item.id && drag.kind === kind ? active : item;
    const visibleRooms = current.rooms.map((room) => moved('rooms', room));
    const visibleItems = current.items.filter((item) => settings.furniture || elements[item.type].opening).map((item) => moved('items', item));
    const obstacles = visibleItems.filter((item) => !elements[item.type].opening).slice(0, 200).map(furnitureOutline);
    const rooms = visibleRooms.map((room) => roomShape(room, activeShape('rooms', room.id))).join('');
    const walls = current.walls.map((wall) => wallShape(moved('walls', wall), activeShape('walls', wall.id))).join('');
    const items = visibleItems.map((item) => itemShape(item, activeShape('items', item.id))).join('');
    const captions = settings.labels ? visibleRooms.map((room) => roomCaption(room, obstacles)).join('') : '';
    const measures = current.measurements.map((measure) => measurementShape(moved('measurements', measure), activeShape('measurements', measure.id))).join('');
    const annotations = (current.annotations ?? []).map((item) => annotationShape(moved('annotations', item), activeShape('annotations', item.id))).join('');
    return `${background}${rooms}${outline}${walls}${items}${captions}${measures}${annotations}<g pointer-events="none">${ghost}</g>`;
  }

  function paint() {
    if (!plane.isConnected) return;
    if (viewMode !== 'view3d') {
      const { width, height } = fitExtent();
      const left = camera.x - width / 2;
      const top = camera.y - height / 2;
      plane.setAttribute('viewBox', `${left} ${top} ${width} ${height}`);
      const grid = settings.grid ? `<defs><pattern id="cv-fine" patternUnits="userSpaceOnUse" width=".25" height=".25"><path d="M.25 0H0V.25" fill="none" stroke="#e5e4da" stroke-width=".020"/></pattern><pattern id="cv-grid" patternUnits="userSpaceOnUse" width="1" height="1"><rect width="1" height="1" fill="url(#cv-fine)"/><path d="M1 0H0V1" fill="none" stroke="#d9d9ce" stroke-width=".03"/></pattern></defs><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="url(#cv-grid)" pointer-events="none"/>` : '';
      plane.innerHTML = grid + draftLayer();
      root.querySelector('[data-role="zoom"]').textContent = `${Math.round(camera.zoom * 100)}%`;
      root.querySelector('[data-role="scale"]').textContent = `m · ${Math.round(camera.zoom * 100)}%`;
      const current = level();
      root.querySelector('[data-role="empty"]').hidden = tool !== 'select' || !!(current.rooms.length || current.walls.length || current.items.length || current.image || current.annotations?.length);
    }
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
        detail = `<div class="cv-row">${numberField('shape:length', 'length', wallLength(record), 'm', 0.1)}${numberField('shape:thickness', 'thickness', record.thickness, 'm', 0.05, 1.5)}</div>`;
      }
      if (selected.kind === 'items') {
        title = localized(elements[record.type]);
        allowRotation = true;
        detail = `<div class="cv-row">${numberField('shape:width', 'width', record.width, 'm', 0.1, 20)}${numberField('shape:depth', 'depth', record.depth, 'm', 0.05, 20)}</div>${numberField('shape:angle', 'angle', record.angle, '°', -360, 360, '1')}`;
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
    return `<section class="cv-panel-section cv-overview"><p class="cv-kicker">${tr('project')}</p><h2>${tr('summary')}</h2><p>${tr('emptySelect')}</p><label class="cv-field"><span>${tr('siteSystem')}</span><select data-field="systemId">${systemOptions(project.systemId)}</select></label><p class="cv-system-text">${str(lng(system.description))}</p></section>
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
    studioPanel.innerHTML = `<div class="cv-panel-tabs" role="group" aria-label="${tr('info')}">${tabs.map((id) => `<button type="button" data-action="tab:${id}" aria-pressed="${id === inspectorTab}">${tr(id)}</button>`).join('')}${toolbarButton('close-inspector', 'close', 'cancel')}</div><div class="cv-panel-body">${inspectorTab === 'properties' ? propertiesPanel() : notebookPanel()}</div>`;
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
    const matches = commands.filter(([action, , key]) => terms.every((word) => simplify(`${tr(key)} ${action}`).includes(word)));
    results.innerHTML = matches.length ? matches.map(([action, glyph, key]) => action.startsWith('/')
      ? `<a class="cv-tool" href="${action}">${icon(glyph)}<span>${tr(key)}</span></a>`
      : toolbarButton(action, glyph, key, 'data-command="true"', true)).join('') : `<p>${tr('commandEmpty')}</p>`;
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
      content = `<div class="cv-switches">${Object.entries(settings).map(([key, value]) => `<label><span>${tr(key)}</span><input type="checkbox" data-field="settings:${key}" ${value ? 'checked' : ''}></label>`).join('')}</div><label class="cv-field">${tr('language')}<select data-field="locale"><option value="pt-PT" ${isPt ? 'selected' : ''}>Português (Portugal)</option><option value="en-PT" ${locale === 'en-PT' ? 'selected' : ''}>English (Portugal)</option><option value="en-INT" ${locale === 'en-INT' ? 'selected' : ''}>English (International)</option></select></label>`;
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
      const presets = [0, 90, 180, 270, 45, -45];
      content = `<div class="cv-camera-presets">${presets.map((value) => `<button class="cv-button" type="button" data-action="preset:${value}">${value < 0 ? value + 360 : value}°</button>`).join('')}</div>${project.cameras?.length ? `<div class="cv-project-list">${project.cameras.map((entry) => `<div class="cv-project-row"><button class="cv-list-action" data-action="camera-open:${entry.id}" type="button">${icon('camera')} ${str(entry.name)}</button>${toolbarButton(`camera-remove:${entry.id}`, 'trash', 'delete')}</div>`).join('')}</div>` : `<p>${tr('noCameras')}</p>`}`;
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
    if (viewMode === 'view3d' && id !== 'select') viewMode = 'plan';
    if (['item', 'door', 'window'].includes(id)) inspectorTab = 'properties';
    render();
  }
  function zoom(multiplier, location) {
    const before = camera.zoom;
    camera.zoom = clamp(camera.zoom * multiplier, 0.2, 7);
    if (location) {
      camera.x = location.x + (camera.x - location.x) * before / camera.zoom;
      camera.y = location.y + (camera.y - location.y) * before / camera.zoom;
    }
    paint();
  }
  function mirror(state) {
    const bounds = state.levels.map(levelBounds);
    const center = (Math.min(...bounds.map((b) => b.x)) + Math.max(...bounds.map((b) => b.x + b.width))) / 2;
    const x = (value) => 2 * center - value;
    for (const entry of state.levels) {
      for (const room of entry.rooms) room.x = x(room.x + room.w);
      for (const item of entry.items) { item.x = x(item.x); item.angle = 180 - item.angle; }
      for (const wall of [...entry.walls, ...entry.measurements]) { wall.x1 = x(wall.x1); wall.x2 = x(wall.x2); }
      for (const annotation of entry.annotations ?? []) annotation.x = x(annotation.x);
      if (entry.image) entry.image.x = x(entry.image.x + entry.image.width);
    }
    return state;
  }
  function detachRoomWalls(id) {
    for (const wall of level().walls) if (wall.roomId === id) delete wall.roomId;
  }
  function morphRoom(room, next) {
    const current = level();
    const affected = current.walls.filter((wall) => wall.roomId === room.id);
    const openings = current.items.filter((item) => elements[item.type].opening).map((item) => [item, findWall(item, current.walls, .11, item.width)]);
    const transformX = (x) => next.x + (x - room.x) * (next.w / room.w);
    const transformY = (y) => next.y + (y - room.y) * (next.h / room.h);
    for (const wall of affected) {
      wall.x1 = transformX(wall.x1);
      wall.x2 = transformX(wall.x2);
      wall.y1 = transformY(wall.y1);
      wall.y2 = transformY(wall.y2);
    }
    for (const [item, anchor] of openings) {
      if (anchor?.wall.roomId !== room.id) continue;
      const { wall, ratio } = anchor;
      const length = wallLength(wall);
      if (length < item.width) item.width = length;
      const margin = item.width / (2 * length);
      const along = clamp(ratio, margin, 1 - margin);
      item.x = wall.x1 + (wall.x2 - wall.x1) * along;
      item.y = wall.y1 + (wall.y2 - wall.y1) * along;
    }
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
      const snap = data.opening ? findWall(p, current.walls, .75, data.width) : p;
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
      paint();
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
      const thickness = profile().defaults?.wallThickness ?? .15;
      change(() => { current.walls.push(makeWall(start.x, start.y, end.x, end.y, thickness)); pendingPoint = end; });
    }
  }

  function dragShape(deltaX, deltaY) {
    const moving = drag.original;
    if (drag.kind === 'walls' || drag.kind === 'measurements') {
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
  plane.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.button !== 1) return;
    preventClick = false;
    plane.setPointerCapture(event.pointerId);
    pen.set(event.pointerId, point(event.clientX, event.clientY));
    const positions = [...pen.values()];
    if (positions.length >= 2) {
      const mid = midpoint(positions);
      pinch = { distance: separation(positions), midpoint: mid };
      drag = null;
      return;
    }
    const world = position(event, true);
    if (tool === 'pan' || event.button === 1) {
      drag = { type: 'pan', start: point(event.clientX, event.clientY), camera: { ...camera }, scale: fitExtent().width / plane.getBoundingClientRect().width, moved: false };
    } else if (tool === 'select') {
      if (studioPanel.contains(document.activeElement) && document.activeElement?.matches('input, textarea')) document.activeElement.blur();
      selected = selectEntity(event.target);
      const item = entity();
      if (item) {
        drag = { type: 'shape', ...selected, start: world, screen: point(event.clientX, event.clientY), original: item, preview: item, moved: false };
        inspectorTab = 'properties';
      }
      renderInspector();
      paint();
    }
  }, listen);
  plane.addEventListener('pointermove', (event) => {
    if (pen.has(event.pointerId)) pen.set(event.pointerId, point(event.clientX, event.clientY));
    const positions = [...pen.values()];
    if (pinch && positions.length >= 2) {
      const mid = midpoint(positions);
      const distance = separation(positions);
      if (pinch.distance > 10 && distance > 10) {
        const p = planPosition({ clientX: mid.x, clientY: mid.y });
        const scale = fitExtent().width / plane.getBoundingClientRect().width;
        camera.x -= (mid.x - pinch.midpoint.x) * scale;
        camera.y -= (mid.y - pinch.midpoint.y) * scale;
        zoom(distance / pinch.distance, p);
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
      paint();
    } else if (drag?.type === 'shape') {
      drag.moved ||= Math.hypot(event.clientX - drag.screen.x, event.clientY - drag.screen.y) > 5;
      if (drag.moved) {
        const p = position(event, true);
        const snap = (value) => settings.snap ? snapTo(value, gridStep()) : value;
        drag.preview = dragShape(snap(p.x - drag.start.x), snap(p.y - drag.start.y));
        paint();
      }
    } else if (!['select', 'pan'].includes(tool)) {
      hoverPoint = position(event);
      paint();
    }
  }, listen);
  function releasePointer(event, cancelled = false) {
    pen.delete(event.pointerId);
    if (pinch || pen.size) {
      preventClick = true;
      if (!pen.size) pinch = null;
      return;
    }
    const moved = drag?.moved;
    if (!cancelled && moved && drag?.type === 'shape' && drag.preview !== drag.original) {
      const { kind, original, preview } = drag;
      drag = null;
      change(() => {
        if (kind === 'rooms') morphRoom(original, preview);
        else {
          Object.assign(original, preview);
          if (kind === 'walls') delete original.roomId;
        }
      });
    } else {
      drag = null;
      if (cancelled || moved) paint();
    }
    if (!cancelled && !moved && !preventClick && event.button === 0) drawAction(event);
  }
  plane.addEventListener('pointerup', releasePointer, listen);
  plane.addEventListener('pointercancel', (event) => releasePointer(event, true), listen);
  plane.addEventListener('pointerleave', () => { if (!pen.size) { hoverPoint = null; paint(); } }, listen);
  plane.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoom(Math.exp(-event.deltaY * .0014), planPosition(event));
  }, { ...listen, passive: false });
  let modelDrag;
  model.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    model.setPointerCapture(event.pointerId);
    modelDrag = { start: event.clientX, orbit };
  }, listen);
  model.addEventListener('pointermove', (event) => {
    if (!modelDrag) return;
    orbit = (modelDrag.orbit + (event.clientX - modelDrag.start) * .6) % 360;
    modelPaint();
  }, listen);
  model.addEventListener('pointerup', () => { modelDrag = null; }, listen);
  model.addEventListener('pointercancel', () => { modelDrag = null; }, listen);
  model.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoom3d = clamp(zoom3d * Math.exp(-event.deltaY * .0014), .3, 6);
    modelPaint();
  }, { ...listen, passive: false });

  function download(content, extension, mime) {
    const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type: mime }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${project.name.replace(/[^\p{L}\p{N}_ -]/gu, '').trim().replace(/\s+/g, '-') || 'casovara'}.${extension}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('savedFile');
  }
  function exportSvg(useModel = false) {
    if (useModel) {
      modelPaint();
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${model.getAttribute('viewBox') || '0 0 8 6'}" width="1600" height="1200"><rect x="-2000" y="-2000" width="4000" height="4000" fill="#f7f3e8"/>${model.innerHTML}</svg>`;
    }
    const b = levelBounds(level());
    return `<svg xmlns="http://www.w3.org/2000/svg" font-family="Arial,sans-serif" viewBox="${b.x - 1.15} ${b.y - 1.15} ${b.width + 2.3} ${b.height + 2.3}" width="1600" height="1200"><title>${str(project.name)} · ${str(level().name)}</title><rect x="${b.x - 1.15}" y="${b.y - 1.15}" width="${b.width + 2.3}" height="${b.height + 2.3}" fill="#faf8f2"/>${draftLayer(true)}</svg>`;
  }
  function exportPng() {
    const url = URL.createObjectURL(new Blob([exportSvg(viewMode !== 'plan')], { type: 'image/svg+xml' }));
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
        setTool('select');
        if (arg === 'furniture') { inspectorOpen = true; inspectorTab = 'properties'; render(); }
        if (arg === 'visualise' && viewMode === 'plan') { viewMode = 'split'; render(); }
        break;
      case 'tool': setTool(arg); break;
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
      case 'fit': resetCamera(); paint(); break;
      case 'orbit-left': orbit = (orbit - 30) % 360; modelPaint(); break;
      case 'orbit-right': orbit = (orbit + 30) % 360; modelPaint(); break;
      case 'model-zoom-in': zoom3d = clamp(zoom3d * 1.2, .3, 6); modelPaint(); break;
      case 'model-zoom-out': zoom3d = clamp(zoom3d / 1.2, .3, 6); modelPaint(); break;
      case 'model-fit': zoom3d = 1; modelPaint(); break;
      case 'cutaway': cutaway = !cutaway; updateMode(); modelPaint(); break;
      case 'tab': inspectorTab = arg; inspectorOpen = true; updateTools(); renderInspector(); break;
      case 'inspector': inspectorOpen = !inspectorOpen; updateTools(); break;
      case 'close-inspector': inspectorOpen = false; updateTools(); break;
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
        if (viewMode === 'plan') viewMode = 'split';
        change(() => { level().ceiling = !level().ceiling; });
        break;
      case 'roof': openModal('roofs'); break;
      case 'flooring': openModal('flooring'); break;
      case 'preset': orbit = Number(arg); viewMode = 'view3d'; render(); dialog.close(); break;
      case 'camera-open': {
        const entry = project.cameras.find((item) => item.id === arg);
        if (!entry) break;
        orbit = entry.orbit;
        cutaway = entry.cutaway;
        viewMode = 'view3d';
        switchLevel(entry.levelId);
        render();
        dialog.close();
        break;
      }
      case 'camera-remove': change(() => { project.cameras = project.cameras.filter((entry) => entry.id !== arg); }); drawModal(); break;
    }
  }, listen);

  function gridStep() { return profile().defaults?.gridStep ?? .1; }
  function shapeChange(key, input) {
    const item = entity();
    if (!item) return;
    const number = input.type === 'number' ? input.valueAsNumber : Number.NaN;
    if (input.type === 'number' && !Number.isFinite(number)) { input.value = item[key] ?? wallLength(item); return; }
    const value = Number.isFinite(number) ? clamp(number, Number(input.min), Number(input.max)) : input.value.trim();
    if (item[key] === value) return;
    change(() => {
      if (key === 'length') {
        const factor = value / Math.max(.01, wallLength(item));
        item.x2 = item.x1 + (item.x2 - item.x1) * factor;
        item.y2 = item.y1 + (item.y2 - item.y1) * factor;
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
    if (key === 'settings' && Object.hasOwn(settings, property)) { settings[property] = input.checked; paint(); return; }
    switch (key) {
      case 'name': {
        const name = input.value.trim();
        if (!name) input.value = project.name;
        else if (name !== project.name) change(() => { project.name = name; });
        break;
      }
      case 'systemId': if (systemIds.includes(input.value) && project.systemId !== input.value) change(() => { project.systemId = input.value; }); break;
      case 'levelId': switchLevel(input.value); break;
      case 'roomType': roomType = input.value; paint(); break;
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
    if (modal === 'commands' && event.target.matches('[data-role=command-search]')) {
      const item = dialog.querySelector('[data-role=command-list] > button, [data-role=command-list] > a');
      if (event.key === 'Enter' && item) { event.preventDefault(); item.click(); }
      if (event.key === 'ArrowDown' && item) { event.preventDefault(); item.focus(); }
    }
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
      if (roof !== 'none') cutaway = false;
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
      change(() => { (project.cameras ??= []).push({ id: uid(), name, levelId: project.levelId, orbit, cutaway }); });
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
    if (chord && (key === 'z' || key === 'y')) {
      event.preventDefault();
      undo(event.shiftKey || key === 'y');
    } else if (key === 'escape' || key === 'enter' && pendingPoint) {
      pendingPoint = null;
      hoverPoint = null;
      if (key === 'escape') setTool('select'); else render();
    } else if (key === 'delete' || key === 'backspace') {
      if (removeEntity()) event.preventDefault();
    } else if (!chord) {
      const shortcut = { v: 'select', h: 'pan', w: 'wall', r: 'room', m: 'measure', t: 'label' }[key];
      if (shortcut) {
        category = ['measure', 'label'].includes(shortcut) ? 'annotate' : 'structure';
        setTool(shortcut);
      }
    }
  }, listen);
  window.addEventListener('beforeunload', (event) => {
    if (revision !== savedRevision) { event.preventDefault(); event.returnValue = ''; }
  }, listen);

  resetCamera();
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
    clearTimeout(saveTimer);
    clearTimeout(toastTimer);
  };
}
