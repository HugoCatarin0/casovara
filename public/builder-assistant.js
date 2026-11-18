import { elements, levelBounds, projectArea, roomStyles } from './builder-engine.js';
import { formatNumber } from './core.js';
import { normalizeBuildingServices, resolveServiceNode, serviceNodeSymbol, serviceRunPoints, serviceSystems } from './building-services.js';
import { normalizeConstructionSchedule, scheduleConstruction } from './construction-schedule.js';
import { slabFor, slabFootprints, slabOutline } from './slab.js';

const copy = {
  pt: {
    title: 'Assistente de projeto', close: 'Fechar assistente', checking: 'A verificar ligação',
    online: 'Modelo ligado', guided: 'Demonstração local', offline: 'Ligação indisponível',
    verify: 'Voltar a verificar', onlineInfo: 'Ao enviar, o pedido e a geometria da planta são partilhados com a OpenAI.',
    guidedInfo: 'Experimenta o fluxo de revisão com um exemplo T3. Os pedidos livres ficam disponíveis quando o servidor tiver um modelo configurado.',
    offlineInfo: 'Verifica a ligação ao servidor e volta a tentar.',
    intro: 'Descreve a casa que queres criar ou a alteração que pretendes fazer nesta planta.',
    prompts: [
      ['Casa térrea com três quartos', 'Desenha uma casa térrea T3 com cerca de 110 m², sala e cozinha abertas, duas casas de banho e acesso direto ao exterior.'],
      ['Rever as circulações', 'Analisa a circulação na planta atual e sugere melhorias. Preserva as divisões existentes.'],
      ['Adicionar um escritório', 'Propõe uma forma de criar um escritório na planta atual, com janela e acesso pelo corredor.'],
      ['Gerar instalações', 'Gera propostas de eletricidade, águas e esgotos, VMC e ar condicionado para a casa atual. Preserva os esquemas que já existirem.'],
      ['Planear a obra', 'Gera um plano de obra para a casa atual, com dependências, equipas e tarefas que possam avançar em paralelo. Preserva um plano existente.'],
    ],
    demo: 'Experimentar um T3', demoRequest: 'Gerar exemplo T3',
    prompt: 'Pedido para o assistente', placeholder: 'Ex.: desenha uma casa térrea de 110 m² com três quartos…',
    send: 'Enviar', stop: 'Interromper', working: 'A preparar a resposta…', applying: 'A aplicar…',
    you: 'Tu', assistant: 'Assistente', stopped: 'Pedido interrompido.', ready: 'Proposta pronta para rever.',
    proposal: 'Rever proposta', before: 'Antes', after: 'Depois', floor: 'Piso a pré-visualizar',
    comparison: 'Comparar a planta atual e a proposta', noFloor: 'Sem piso', noSlab: 'Sem laje', slab: 'Laje', slabs: 'Lajes',
    slabChanges: { added: 'Adicionadas', changed: 'Alteradas', removed: 'Removidas' },
    area: 'Área interior', units: 'm²', levels: 'Pisos', rooms: 'Divisões', walls: 'Paredes', items: 'Objetos e vãos',
    services: 'Pontos e traçados', layers: 'Camada da proposta', architecture: 'Arquitetura',
    construction: 'Plano de obra', noConstruction: 'Esta versão ainda não tem um plano de obra.',
    workdays: 'Dias úteis', savedDays: 'Dias úteis ganhos face à sequência', critical: 'Caminho crítico das dependências',
    added: 'Adicionados', changed: 'Alterados', removed: 'Removidos',
    warnings: 'Pontos a rever', emptyPlan: 'Este piso não tem geometria para mostrar.',
    discard: 'Descartar proposta', apply: 'Aplicar à planta', discarded: 'Proposta descartada.',
    applied: 'Proposta aplicada. Podes usar Desfazer para voltar atrás.',
    stale: 'A planta mudou entretanto. Pede uma nova proposta para rever as alterações sobre a versão atual.',
    applyError: 'Não foi possível aplicar a proposta. Volta a tentar ou pede uma nova versão.',
    unavailable: 'O servidor não tem um modelo configurado.',
    busy: 'O assistente está a processar outros pedidos. Tenta novamente daqui a pouco.',
    timeout: 'O assistente demorou demasiado tempo a responder. Tenta um pedido mais curto.',
    invalid: 'O pedido não pôde ser processado. Reformula-o e tenta novamente.',
    error: 'Não foi possível obter uma resposta. Tenta novamente.',
  },
  en: {
    title: 'Design assistant', close: 'Close assistant', checking: 'Checking connection',
    online: 'Model connected', guided: 'Local demonstration', offline: 'Connection unavailable',
    verify: 'Check again', onlineInfo: 'Sending a request shares your prompt and plan geometry with OpenAI.',
    guidedInfo: 'Try the review workflow with a three-bedroom example. Free-text requests become available when a model is configured on the server.',
    offlineInfo: 'Check the server connection and try again.',
    intro: 'Describe the house you want to build or what you want to change in this floor plan.',
    prompts: [
      ['Three-bedroom single-storey house', 'Draw a single-storey three-bedroom house of about 110 m², with an open-plan kitchen and living room, two bathrooms, and direct outside access.'],
      ['Review circulation', 'Assess circulation in the current floor plan and suggest improvements. Keep the existing rooms.'],
      ['Add a home office', 'Suggest a way to add a home office to the current floor plan, with a window and access from the hall.'],
      ['Generate building services', 'Generate electrical, plumbing, VMC ventilation and air-conditioning schemes for the house. Preserve existing schemes.'],
      ['Plan the build', 'Generate a construction programme for the house, with dependencies, crews and opportunities for parallel tasks. Preserve any existing programme.'],
    ],
    demo: 'Try a three-bedroom example', demoRequest: 'Generate three-bedroom example',
    prompt: 'Request for the assistant', placeholder: 'E.g. draw a 110 m² single-storey house with three bedrooms…',
    send: 'Send', stop: 'Stop', working: 'Preparing the response…', applying: 'Applying…',
    you: 'You', assistant: 'Assistant', stopped: 'Request stopped.', ready: 'Your proposal is ready to review.',
    proposal: 'Review proposal', before: 'Before', after: 'After', floor: 'Storey to preview',
    comparison: 'Compare the current plan and proposal', noFloor: 'No storey', noSlab: 'No slab', slab: 'Slab', slabs: 'Slabs',
    area: 'Internal area', units: 'm²', levels: 'Storeys', rooms: 'Rooms', walls: 'Walls', items: 'Objects and openings',
    services: 'Points and routes', layers: 'Proposal layer', architecture: 'Architecture',
    construction: 'Construction programme', noConstruction: 'There is no construction programme in this version.',
    workdays: 'Workdays', savedDays: 'Workdays saved against sequential work', critical: 'Dependency critical path',
    added: 'Added', changed: 'Changed', removed: 'Removed',
    warnings: 'Points to review', emptyPlan: 'This storey has no geometry to display.',
    discard: 'Discard proposal', apply: 'Apply to plan', discarded: 'Proposal discarded.',
    applied: 'Proposal applied. Use Undo to go back.',
    stale: 'The plan has changed. Request a fresh proposal to review changes against the current version.',
    applyError: 'The proposal could not be applied. Try again or request a fresh proposal.',
    unavailable: 'The server has no model configured.',
    busy: 'The assistant is processing other requests. Try again shortly.',
    timeout: 'The assistant took too long to respond. Try a shorter request.',
    invalid: 'The request could not be processed. Rephrase it and try again.',
    error: 'A response could not be retrieved. Try again.',
  },
};

const iconPaths = {
  spark: '<path d="M13 2 9.5 10 2 13l7.5 3 3.5 8 3.5-8 7.5-3-7.5-3L13 2ZM21 2v6m-3-3h6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  send: '<path d="m4 11 16-7-7 16-2.5-6.5L4 11Zm6.5 2.5L20 4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  compare: '<path d="m10 8-5 5 5 5m6-10 5 5-5 5"/>',
};
const icon = (name, size = 18) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name]}</svg>`;
const namespace = 'http://www.w3.org/2000/svg';
const lists = ['rooms', 'walls', 'items'];
const maxPrompt = 1600;
const maxContext = 8;

function metricEntity(entity, keys) {
  return typeof entity?.id === 'string' && keys.every((key) => Number.isFinite(entity[key]));
}

function validPlan(project) {
  return Array.isArray(project?.levels) && project.levels.length > 0 && project.levels.length <= 20 && project.levels.every((level) =>
    typeof level?.id === 'string' && lists.every((key) => Array.isArray(level[key]) && level[key].length <= 1000) &&
    level.rooms.every((room) => metricEntity(room, ['x', 'y', 'w', 'h']) && room.w > 0 && room.h > 0) &&
    level.walls.every((wall) => metricEntity(wall, ['x1', 'y1', 'x2', 'y2', 'thickness']) && wall.thickness > 0) &&
    level.items.every((item) => metricEntity(item, ['x', 'y', 'angle', 'width', 'depth']) && typeof item.type === 'string' && item.width > 0 && item.depth > 0));
}

function compareKey(entity, fields) {
  return JSON.stringify(fields.map((field) => entity[field] ?? null));
}

function comparePlans(base, next) {
  const fields = {
    rooms: ['type', 'name', 'x', 'y', 'w', 'h', 'finish'],
    walls: ['x1', 'y1', 'x2', 'y2', 'thickness', 'spec'],
    items: ['type', 'x', 'y', 'width', 'depth', 'angle', 'opening'],
  };
  return [...lists, 'slabs', 'services'].map((kind) => {
    const entries = (project) => new Map((project?.levels ?? []).flatMap((level) => {
      if (kind === 'slabs') {
        return slabFootprints(level).length ? [[level.id, JSON.stringify(slabFor(level))]] : [];
      }
      if (kind === 'services') return Object.entries(normalizeBuildingServices(level.services, level)).flatMap(([system, net]) =>
        ['nodes', 'runs'].flatMap((type) => net[type].map((item) => [`${level.id}:${system}:${type}:${item.id}`, JSON.stringify(item)])));
      return level[kind].map((item) => [item.id, JSON.stringify([level.id, compareKey(item, fields[kind])])]);
    }));
    const before = entries(base);
    const after = entries(next);
    const added = [...after.keys()].filter((id) => !before.has(id));
    const removed = [...before.keys()].filter((id) => !after.has(id));
    const changed = [...after.keys()].filter((id) => before.has(id) && before.get(id) !== after.get(id));
    return { kind, added, removed, changed };
  });
}

export function comparisonLevelPairs(base, proposed) {
  const before = base?.levels ?? [];
  const after = proposed.levels;
  const beforeById = new Map(before.map((floor) => [floor.id, floor]));
  const replacement = !after.some(({ id }) => beforeById.has(id));
  const used = new Set();
  const pairs = after.map((floor, index) => {
    const previous = replacement ? before[index] : beforeById.get(floor.id);
    if (previous) used.add(previous.id);
    return { id: floor.id, before: previous, after: floor };
  });
  return pairs.concat(before.filter(({ id }) => !used.has(id)).map((floor) => ({ id: floor.id, before: floor })));
}

function hasPreviewGeometry(level) {
  return Boolean(level && (lists.some((list) => level[list].length) ||
    Object.values(level.services ?? {}).some((network) => network?.nodes?.length) || slabFor(level).mode === 'custom'));
}

export function comparisonViewport(before, after) {
  const bounds = [before, after].filter(hasPreviewGeometry).map((level) => levelBounds({
    ...level, measurements: [], services: normalizeBuildingServices(level.services, level),
  }));
  if (!bounds.length) return { width: 10, height: 7, viewBox: '-5 -3.5 10 7' };
  const x = Math.min(...bounds.map((bounds) => bounds.x));
  const y = Math.min(...bounds.map((bounds) => bounds.y));
  const width = Math.max(...bounds.map((bounds) => bounds.x + bounds.width)) - x;
  const height = Math.max(...bounds.map((bounds) => bounds.y + bounds.height)) - y;
  const gap = Math.min(4, Math.max(.5, Math.max(width, height) * .08));
  return { width, height, viewBox: `${x - gap} ${y - gap} ${width + 2 * gap} ${height + 2 * gap}` };
}

function svgNode(parent, tag, attributes, content) {
  const element = document.createElementNS(namespace, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (content !== undefined) element.textContent = content;
  parent.append(element);
  return element;
}

function previewPlan(container, level, viewport, copy, differences, proposed, isPortuguese, system) {
  container.replaceChildren();
  if (!hasPreviewGeometry(level)) return;
  const { viewBox, width, height } = viewport;
  const svg = svgNode(container, 'svg', {
    viewBox, role: 'img', 'aria-label': `${proposed ? copy.after : copy.before} · ${level.name}`,
  });
  const highlight = Object.fromEntries(differences.map((row) => [
    row.kind,
    new Set(proposed ? [...row.added, ...row.changed] : row.removed),
  ]));
  const strokeFor = (kind, entity, normal) => highlight[kind].has(entity.id) ? (proposed ? '#14796f' : '#9a492e') : normal;
  const slabLayer = system === 'slab';
  const footprints = slabLayer || slabFor(level).mode === 'custom' ? slabFootprints(level) : [];
  for (const { x, y, width, depth } of footprints) {
    svgNode(svg, 'rect', { x, y, width, height: depth, fill: '#b4c9dd', 'fill-opacity': slabLayer ? .54 : .34 });
  }
  for (const room of level.rooms) {
    svgNode(svg, 'rect', {
      x: room.x, y: room.y, width: room.w, height: room.h,
      fill: roomStyles[room.type]?.fill ?? '#e5edf2', 'fill-opacity': slabLayer ? .23 : 1,
      stroke: strokeFor('rooms', room, '#a4b4bf'), 'stroke-width': .04,
    });
  }
  for (const wall of level.walls) {
    svgNode(svg, 'line', {
      x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2,
      stroke: strokeFor('walls', wall, '#243c51'), 'stroke-opacity': slabLayer ? .45 : 1, 'stroke-width': wall.thickness,
    });
  }
  if (footprints.length) {
    svgNode(svg, 'path', { d: slabOutline(footprints).map(([x1, y1, x2, y2]) => `M${x1} ${y1}L${x2} ${y2}`).join(''),
      fill: 'none', stroke: strokeFor('slabs', level, '#3b6791'), 'stroke-width': slabLayer ? 2 : 1,
      'stroke-dasharray': '5 3', 'vector-effect': 'non-scaling-stroke' });
  }
  for (const item of level.items) {
    const category = elements[item.type];
    const group = svgNode(svg, 'g', { transform: `translate(${item.x},${item.y}) rotate(${item.angle})` });
    svgNode(group, 'rect', {
      x: -item.width / 2, y: -item.depth / 2, width: item.width, height: item.depth,
      fill: category?.opening ? (item.type.toLowerCase().includes('door') ? '#f2c6ac' : '#a8cfde') : category?.color ?? '#a4b4bf',
      stroke: strokeFor('items', item, '#566c7b'), 'stroke-width': .04,
    });
  }
  for (const room of level.rooms) {
    const style = roomStyles[room.type];
    const label = room.name || style?.[isPortuguese ? 'pt' : 'en'] || '';
    const size = Math.min(.48, Math.max(width, height) * .034, room.h / 4, room.w * .3);
    const characters = Math.floor(room.w / (size * .58));
    if (!label || size < .16 || characters < 3) continue;
    const caption = label.length <= characters ? label : label.slice(0, characters - 1).trimEnd() + '…';
    svgNode(svg, 'text', {
      x: room.x + room.w / 2, y: room.y + room.h / 2,
      fill: '#193347', 'font-size': size, 'font-weight': 650, 'text-anchor': 'middle',
      'dominant-baseline': 'middle', stroke: '#f4f8fa', 'stroke-width': .075, 'paint-order': 'stroke',
    }, caption);
  }
  const network = normalizeBuildingServices(level.services, level)[system];
  if (network) {
    const profile = serviceSystems[system];
    const layer = svgNode(svg, 'g', { 'data-review-services': system });
    for (const run of network.runs) {
      const points = serviceRunPoints(network, run, level);
      if (!points?.length) continue;
      svgNode(layer, 'polyline', { points: points.map(({ x, y }) => `${x},${y}`).join(' '), fill: 'none',
        stroke: profile.media[run.medium].color, 'stroke-width': 2, 'stroke-linejoin': 'round',
        'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' });
    }
    const size = Math.max(.13, Math.min(.32, Math.max(width, height) * .019));
    for (const fixture of network.nodes) {
      const node = resolveServiceNode(level, fixture);
      const symbol = serviceNodeSymbol(system, node);
      const markerWidth = Math.max(size * 1.25, (symbol.length * .61 + .55) * size);
      const offset = Number.isFinite(node.angle) ? Math.PI * node.angle / 180 : null;
      const length = Math.max(size * 1.1, markerWidth * .58);
      const x = offset === null ? node.x : node.x + length * Math.cos(offset);
      const y = offset === null ? node.y : node.y + length * Math.sin(offset);
      if (offset !== null) svgNode(layer, 'line', { x1: node.x, y1: node.y, x2: x, y2: y,
        stroke: profile.color, 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' });
      const mark = svgNode(layer, 'g', { transform: `translate(${x},${y})` });
      svgNode(mark, 'rect', { x: -markerWidth / 2, y: -size * .68, width: markerWidth, height: size * 1.36, rx: size * .24,
        fill: '#fff', stroke: profile.color, 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' });
      svgNode(mark, 'text', { x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#193347',
        'font-size': size, 'font-weight': 700 }, symbol);
      svgNode(mark, 'title', {}, node.label ?? profile.kinds[node.kind][isPortuguese ? 'pt' : 'en']);
    }
  }
}

function serviceLayers(base, proposed) {
  const floors = [...(base?.levels ?? []), ...proposed.levels];
  return Object.keys(serviceSystems).filter((id) => floors.some(({ services }) => services?.[id]?.nodes?.length || services?.[id]?.runs?.length));
}

function constructionTimeline(project) {
  const plan = normalizeConstructionSchedule(project?.constructionPlan);
  try { return plan ? scheduleConstruction(plan) : null; }
  catch { return null; }
}

function getWarnings(analysis) {
  if (!Array.isArray(analysis?.warnings)) return [];
  return analysis.warnings.map((warning) => typeof warning === 'string' ? warning : warning?.message)
    .filter((warning) => typeof warning === 'string' && warning.trim()).slice(0, 8);
}

export function mountBuilderAssistant(root, { locale, getProject, applyProject }) {
  const isPortuguese = locale === 'pt-PT';
  const t = isPortuguese ? copy.pt : copy.en;
  const studio = root.querySelector('.cv-studio') ?? root;
  const panel = document.createElement('dialog');
  panel.className = 'cva-panel';
  panel.id = 'cv-assistant';
  panel.setAttribute('aria-labelledby', 'cv-assistant-title');
  panel.innerHTML = `
    <header class="cva-header">
      <div class="cva-heading"><div class="cva-mark">${icon('spark', 19)}</div><h2 id="cv-assistant-title">${t.title}</h2></div>
      <button type="button" class="cva-icon-button" data-cva="close" aria-label="${t.close}">${icon('close')}</button>
    </header>
    <div class="cva-connection">
      <div><span data-cva="connection-state" class="cva-indicator" data-state="checking">${t.checking}</span><span data-cva="connection-text" class="cva-connection-text"></span></div>
      <button type="button" data-cva="retry" class="cva-text-button" hidden>${t.verify}</button>
    </div>
    <div class="cva-scroll" data-cva="scroll">
      <section class="cva-start" data-cva="start">
        <p>${t.intro}</p>
        <div class="cva-examples" data-cva="examples" hidden>${t.prompts.map(([label], index) => `<button type="button" data-example="${index}">${label}</button>`).join('')}</div>
        <button type="button" class="cva-button" data-cva="demo" hidden>${icon('spark')}${t.demo}</button>
      </section>
      <div role="log" aria-live="polite" aria-relevant="additions" class="cva-messages" data-cva="messages"></div>
      <section class="cva-proposal" data-cva="proposal" aria-labelledby="cv-assistant-proposal" hidden>
        <header class="cva-proposal-head"><div>${icon('layers', 17)}<h3 id="cv-assistant-proposal">${t.proposal}</h3></div><strong data-cva="delta"></strong></header>
        <div class="cva-split-controls">
          <select data-cva="level" aria-label="${t.floor}"></select>
          <select data-cva="layer" aria-label="${t.layers}" hidden></select>
        </div>
        <div class="cva-preview" data-cva="preview">
          <div class="cva-comparison-layer cva-comparison-before" data-cva="before-preview"></div>
          <div class="cva-comparison-layer cva-comparison-after" data-cva="after-preview"></div>
          <p class="cva-empty-preview" data-cva="empty-preview" hidden>${t.emptyPlan}</p>
          <input type="range" class="cva-comparison-range" data-cva="compare" min="0" max="100" value="50" aria-label="${t.comparison}">
          <div class="cva-comparison-divider" aria-hidden="true"></div>
          <span class="cva-comparison-handle" aria-hidden="true">${icon('compare', 22)}</span>
          <button type="button" class="cva-comparison-side" data-compare="before" aria-pressed="false">${t.before}<small data-cva="before-detail"></small></button>
          <button type="button" class="cva-comparison-side" data-compare="after" aria-pressed="false">${t.after}<small data-cva="after-detail"></small></button>
        </div>
        <ul class="cva-service-legend" data-cva="service-legend" hidden></ul>
        <dl class="cva-metrics" data-cva="metrics"></dl>
        <section class="cva-construction" data-cva="construction" hidden></section>
        <div class="cva-changes" data-cva="changes"></div>
        <div class="cva-checks" data-cva="checks" hidden><h4>${t.warnings}</h4><ul data-cva="warnings"></ul></div>
        <p class="cva-stale" data-cva="stale" role="alert" hidden>${t.stale}</p>
        <div class="cva-proposal-actions">
          <button type="button" class="cva-button" data-cva="discard">${t.discard}</button>
          <button type="button" class="cva-button cva-primary" data-cva="apply">${icon('check')}${t.apply}</button>
        </div>
      </section>
    </div>
    <form class="cva-composer" data-cva="composer">
      <p data-cva="activity" class="cva-activity" role="status"></p>
      <label class="cva-sr-only" for="cv-assistant-prompt">${t.prompt}</label>
      <textarea id="cv-assistant-prompt" data-cva="prompt" rows="2" maxlength="${maxPrompt}" placeholder="${t.placeholder}" disabled></textarea>
      <div class="cva-composer-actions">
        <button type="button" class="cva-button" data-cva="stop" hidden>${t.stop}</button>
        <button type="submit" class="cva-button cva-primary" data-cva="send" disabled>${icon('send', 17)}${t.send}</button>
      </div>
    </form>`;
  studio.append(panel);
  const controller = new AbortController();
  const signal = controller.signal;
  const $ = (name) => panel.querySelector(`[data-cva="${name}"]`);
  const prompt = $('prompt');
  let history = [];
  let mode = 'checking';
  let statusCheck = null;
  let request = null;
  let applying = false;
  let proposal = null;
  let showingBeforeSummary = false;
  let activeLevelId = null;
  let activeLayer = '';
  let returnFocus = null;
  let previousProject = null;

  function number(value) {
    return formatNumber(value, locale);
  }

  function renderConstruction(timeline) {
    const section = $('construction');
    section.hidden = !proposal.construction;
    if (section.hidden) return;
    const title = document.createElement('h4');
    title.textContent = t.construction;
    const overview = document.createElement('p');
    section.replaceChildren(title, overview);
    if (!timeline) { overview.textContent = t.noConstruction; return; }
    const date = new Intl.DateTimeFormat(isPortuguese ? 'pt-PT' : 'en-GB', { dateStyle: 'medium', timeZone: 'UTC' });
    const formatDate = (value) => date.format(new Date(value + 'T12:00:00Z'));
    const dates = timeline.startDate && timeline.endDate ? `${formatDate(timeline.startDate)} – ${formatDate(timeline.endDate)} · ` : '';
    overview.textContent = `${dates}${number(timeline.workingDays)} ${t.workdays.toLowerCase()}`;
    const savings = document.createElement('p');
    savings.textContent = `${t.savedDays} · ${number(timeline.savedDays)}`;
    section.append(savings);
    const idLookup = new Map(timeline.tasks.map((task) => [task.id, task.label]));
    const path = timeline.criticalPath.map((id) => idLookup.get(id)).filter(Boolean);
    if (path.length) {
      const caption = document.createElement('p');
      const size = path.length > 4 ? ` → … → ${path.at(-1)}` : '';
      caption.textContent = `${t.critical} · ${path.slice(0, 4).join(' → ')}${size}`;
      section.append(caption);
    }
  }

  function snapshot() {
    const project = getProject();
    return validPlan(project) ? JSON.parse(JSON.stringify(project)) : null;
  }

  function synchronize() {
    const busy = request !== null || applying;
    const online = mode === 'online';
    $('connection-state').dataset.state = mode;
    $('connection-state').textContent = t[mode];
    $('connection-text').textContent = t[mode + 'Info'] ?? '';
    $('retry').hidden = mode !== 'offline';
    $('examples').hidden = !online;
    $('demo').hidden = mode !== 'guided';
    $('demo').disabled = busy;
    $('composer').hidden = !online && !busy;
    prompt.hidden = !online;
    prompt.disabled = !online || busy;
    $('send').hidden = !online;
    $('send').disabled = !online || busy || !prompt.value.trim();
    $('stop').hidden = request === null;
    $('activity').textContent = applying ? t.applying : request ? t.working : '';
    $('composer').setAttribute('aria-busy', String(busy));
    $('apply').disabled = busy || Boolean(proposal?.stale);
    $('discard').disabled = applying;
    $('start').querySelectorAll('[data-example]').forEach((button) => { button.disabled = busy; });
  }

  function appendMessage(role, text, remember = true) {
    if (typeof text !== 'string' || !text.trim()) return;
    if (remember) {
      history.push({ role, content: text.slice(0, 3000) });
      history = history.slice(-maxContext);
    }
    const message = document.createElement('article');
    message.className = 'cva-message';
    message.dataset.role = role;
    const label = document.createElement('strong');
    label.textContent = role === 'user' ? t.you : t.assistant;
    const body = document.createElement('p');
    body.textContent = text;
    message.append(label, body);
    $('messages').append(message);
    while ($('messages').childElementCount > 24) $('messages').firstChild.remove();
  }

  function showLastContent() {
    if (!panel.open) return;
    const scroll = $('scroll');
    if (proposal) $('proposal').scrollIntoView({ block: 'start' });
    else scroll.scrollTop = scroll.scrollHeight;
  }

  async function check() {
    if (statusCheck) return statusCheck;
    mode = 'checking';
    synchronize();
    const pending = fetch('/api/assistant', { headers: { Accept: 'application/json' }, cache: 'no-store', signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error()))
      .then((result) => { mode = result.available ? 'online' : result.guided ? 'guided' : 'offline'; })
      .catch(() => { mode = 'offline'; })
      .finally(() => {
        statusCheck = null;
        synchronize();
      });
    statusCheck = pending;
    return pending;
  }

  function renderReviewSummary(before) {
    const view = before ? proposal.base : proposal.project;
    const levels = view?.levels ?? [];
    const area = view ? projectArea(view) : 0;
    $('metrics').replaceChildren(...[[t.area, `${number(area)} ${t.units}`], [t.levels, String(levels.length)], [t.rooms, String(levels.reduce((sum, floor) => sum + floor.rooms.length, 0))]].map(([name, amount]) => {
      const section = document.createElement('div');
      const label = document.createElement('dt');
      const value = document.createElement('dd');
      label.textContent = name;
      value.textContent = amount;
      section.append(label, value);
      return section;
    }));
    renderConstruction(before ? proposal.construction?.current : proposal.construction?.suggested);
  }

  function setComparison(value, refreshSummary = false) {
    const control = $('compare');
    control.value = value;
    const percent = control.valueAsNumber;
    $('preview').style.setProperty('--cva-split', `${percent}%`);
    control.setAttribute('aria-valuetext', `${t.before} ${percent}% · ${t.after} ${100 - percent}%`);
    const before = percent === 100;
    $('before-preview').setAttribute('aria-hidden', String(percent === 0));
    $('after-preview').setAttribute('aria-hidden', String(before));
    panel.querySelector('[data-compare="before"]').setAttribute('aria-pressed', String(before));
    panel.querySelector('[data-compare="after"]').setAttribute('aria-pressed', String(percent === 0));
    if (proposal && (refreshSummary || before !== showingBeforeSummary)) {
      showingBeforeSummary = before;
      renderReviewSummary(before);
    }
  }

  function renderComparison() {
    if (!proposal) return;
    const pairs = proposal.levels;
    const level = pairs.find(({ id }) => id === activeLevelId) ?? pairs[0];
    activeLevelId = level.id;
    const picker = $('level');
    picker.replaceChildren(...pairs.map(({ id, before, after }) => {
      const name = (after ?? before).name || t.floor;
      return new Option(after ? name : `${name} · ${t.before}`, id, false, id === activeLevelId);
    }));
    picker.hidden = pairs.length < 2;
    const layerPicker = $('layer');
    const language = isPortuguese ? 'pt' : 'en';
    layerPicker.replaceChildren(new Option(t.architecture, '', false, !activeLayer), ...proposal.layers.map((id) =>
      new Option(id === 'slab' ? t.slab : serviceSystems[id][language], id, false, activeLayer === id)));
    layerPicker.hidden = !proposal.layers.length;
    const { before, after } = level;
    const viewport = comparisonViewport(before, after);
    previewPlan($('before-preview'), before, viewport, t, proposal.differences, false, isPortuguese, activeLayer);
    previewPlan($('after-preview'), after, viewport, t, proposal.differences, true, isPortuguese, activeLayer);
    $('empty-preview').hidden = hasPreviewGeometry(before) || hasPreviewGeometry(after);
    for (const [side, floor] of [['before', before], ['after', after]]) {
      const detail = $(side + '-detail');
      detail.textContent = '';
      if (!floor) detail.textContent = t.noFloor;
      else if (activeLayer === 'slab') detail.textContent = slabFootprints(floor).length
        ? `${number(slabFor(floor).thickness * 100)} cm` : t.noSlab;
      detail.hidden = !detail.textContent;
    }
    const mediaUsed = new Set([before, after].flatMap((floor) => (floor?.services?.[activeLayer]?.runs ?? []).map(({ medium }) => medium)));
    const legend = $('service-legend');
    legend.replaceChildren(...Object.entries(serviceSystems[activeLayer]?.media ?? {}).filter(([id]) => mediaUsed.has(id)).map(([, entry]) => {
      const line = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.style.backgroundColor = entry.color;
      line.append(swatch, entry[language]);
      return line;
    }));
    legend.hidden = !legend.childElementCount;
    setComparison($('compare').value, true);
  }

  function renderProposal() {
    $('proposal').hidden = !proposal;
    if (!proposal) { synchronize(); return; }
    const delta = projectArea(proposal.project) - (proposal.base ? projectArea(proposal.base) : 0);
    const roundedDelta = Math.round(delta * 100) / 100;
    $('delta').textContent = roundedDelta ? `${roundedDelta > 0 ? '+' : '−'}${number(Math.abs(roundedDelta))} ${t.units}` : '';
    $('changes').replaceChildren(...proposal.differences.filter((row) => ['added', 'changed', 'removed'].some((key) => row[key].length)).map((row) => {
      const line = document.createElement('p');
      const labels = row.kind === 'slabs' ? t.slabChanges ?? t : t;
      line.textContent = `${t[row.kind]} · ${['added', 'changed', 'removed'].filter((key) => row[key].length).map((key) => `${labels[key]} ${row[key].length}`).join(' · ')}`;
      return line;
    }));
    const warnings = getWarnings(proposal.analysis);
    $('checks').hidden = !warnings.length;
    $('warnings').replaceChildren(...warnings.map((message) => {
      const line = document.createElement('li');
      line.textContent = message;
      return line;
    }));
    $('stale').hidden = !proposal.stale;
    renderComparison();
    synchronize();
  }

  function updateStale(project = snapshot()) {
    if (proposal) proposal.stale = proposal.baseKey !== JSON.stringify(project);
    return Boolean(proposal?.stale);
  }

  function adopt(project, { base = snapshot(), analysis } = {}) {
    if (!validPlan(project)) return false;
    const levels = comparisonLevelPairs(base, project);
    const layers = serviceLayers(base, project);
    activeLayer = layers.find((id) => project.levels.some((floor) => JSON.stringify(floor.services?.[id]) !==
      JSON.stringify(base?.levels.find((previous) => previous.id === floor.id)?.services?.[id]))) ?? '';
    if (levels.some(({ before, after }) => slabFootprints(before).length || slabFootprints(after).length)) {
      layers.unshift('slab');
      if (!activeLayer && levels.some(({ before, after }) => (before?.slab || after?.slab) &&
        JSON.stringify(slabFor(before)) !== JSON.stringify(slabFor(after)))) activeLayer = 'slab';
    }
    const construction = JSON.stringify(project.constructionPlan) !== JSON.stringify(base?.constructionPlan)
      ? { current: constructionTimeline(base), suggested: constructionTimeline(project) } : null;
    proposal = { project, base, baseKey: JSON.stringify(base), analysis, differences: comparePlans(base, project), levels, layers, construction, stale: false };
    $('compare').value = '50';
    activeLevelId = project.levelId;
    updateStale();
    renderProposal();
    return true;
  }

  function open() {
    if (panel.open) return;
    returnFocus = document.activeElement;
    const current = snapshot();
    const currentKey = JSON.stringify(current);
    if (!proposal && !request && previousProject !== null && currentKey !== previousProject) {
      history = [];
      $('messages').replaceChildren();
    }
    previousProject = currentKey;
    updateStale(current);
    renderProposal();
    panel.showModal();
    void check();
    if (proposal) showLastContent();
  }

  function close() {
    if (panel.open) panel.close();
  }

  function stage(project, { summary = t.ready, analysis, baseProject } = {}) {
    if (applying || !validPlan(project)) return false;
    request?.abort();
    request = null;
    const staged = adopt(project, { base: validPlan(baseProject) ? baseProject : snapshot(), analysis });
    if (staged) {
      appendMessage('assistant', summary, false);
      open();
      showLastContent();
    }
    return staged;
  }

  function failureMessage(error) {
    return t[{
      assistant_unavailable: 'unavailable', assistant_busy: 'busy', assistant_timeout: 'timeout',
      assistant_provider: 'error', invalid_prompt: 'invalid', invalid_preset: 'invalid',
    }[error?.message] ?? 'error'];
  }

  async function send({ preset } = {}) {
    const guided = Boolean(preset);
    const text = guided ? t.demoRequest : prompt.value.trim();
    if (request || applying || !text || (guided ? mode !== 'guided' : mode !== 'online')) return;
    const base = snapshot();
    const continuing = proposal && !updateStale(base);
    const workingProject = continuing ? proposal.project : base;
    if (proposal?.stale) {
      proposal = null;
      history = [];
      renderProposal();
    }
    const body = guided ? { preset, locale, systemId: base?.systemId } :
      { prompt: text, locale, project: workingProject, history: [...history] };
    if (!guided) prompt.value = '';
    appendMessage('user', text, false);
    const run = new AbortController();
    request = run;
    synchronize();
    showLastContent();
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body), signal: run.signal,
      });
      const answer = await response.json().catch(() => null);
      if (request !== run) return;
      if (!response.ok || !answer || (answer.project && !validPlan(answer.project))) throw new Error(answer?.error);
      if (!guided) history.push({ role: 'user', content: text });
      appendMessage('assistant', answer.text || (answer.project ? t.ready : t.error), !guided);
      if (answer.project) adopt(answer.project, { base, analysis: answer.analysis });
    } catch (error) {
      if (request !== run || error.name === 'AbortError') return;
      appendMessage('assistant', failureMessage(error), false);
      if (!guided) prompt.value = text;
      if (error.message === 'assistant_unavailable') void check();
    } finally {
      if (request === run) {
        request = null;
        synchronize();
        showLastContent();
      }
    }
  }

  async function apply() {
    if (!proposal || request || applying) return;
    if (updateStale()) { renderProposal(); return; }
    const pending = proposal;
    applying = true;
    synchronize();
    try {
      const result = await applyProject(pending.project, { baseProject: pending.base });
      if (result === false) throw new Error();
      proposal = null;
      previousProject = JSON.stringify(snapshot());
      appendMessage('assistant', t.applied, false);
      renderProposal();
    } catch {
      if (updateStale()) renderProposal();
      else appendMessage('assistant', t.applyError, false);
    } finally {
      applying = false;
      synchronize();
      showLastContent();
    }
  }

  panel.addEventListener('close', () => {
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }, { signal });
  panel.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const action = button.dataset.cva;
    if (action === 'close') close();
    else if (action === 'retry') void check();
    else if (action === 'demo') void send({ preset: 't3' });
    else if (action === 'stop') {
      request?.abort();
      request = null;
      appendMessage('assistant', t.stopped, false);
      synchronize();
    } else if (action === 'apply') void apply();
    else if (action === 'discard') {
      proposal = null;
      history = [];
      appendMessage('assistant', t.discarded, false);
      renderProposal();
    } else if (button.dataset.compare) {
      const target = button.dataset.compare === 'before' ? 100 : 0;
      setComparison($('compare').valueAsNumber === target ? 50 : target);
    } else if (Object.hasOwn(button.dataset, 'example')) {
      prompt.value = t.prompts[Number(button.dataset.example)][1];
      synchronize();
      prompt.focus();
    }
  }, { signal });
  $('compare').addEventListener('input', (event) => setComparison(event.target.value), { signal });
  $('level').addEventListener('change', (event) => {
    activeLevelId = event.target.value;
    renderComparison();
  }, { signal });
  $('layer').addEventListener('change', (event) => {
    activeLayer = event.target.value;
    renderComparison();
  }, { signal });
  $('composer').addEventListener('submit', (event) => {
    event.preventDefault();
    void send();
  }, { signal });
  prompt.addEventListener('input', synchronize, { signal });
  prompt.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
    event.preventDefault();
    void send();
  }, { signal });

  function dispose() {
    request?.abort();
    request = null;
    controller.abort();
    panel.remove();
  }

  return { open, close, dispose, stage };
}
