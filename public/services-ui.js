import { applyServiceOperations, inspectServices, resolveServiceNode, serviceLimits, serviceMounts, serviceNodeSymbol, servicePhases, serviceRunPoints, serviceSystems, snapServiceNode } from './building-services.js';
import { roomStyles } from './builder-engine.js';
import { isServiceExteriorNode, serviceRouteSurfaces, serviceRunSurface, serviceSurfaceFootprints, supportedRouteSpans } from './service-routing.js';

const ids = Object.keys(serviceSystems);
const empty = { nodes: [], runs: [] };
const paths = {
  select: '<path d="M5 3 19 13l-7 1.5-3 6z"/>',
  node: '<circle cx="12" cy="12" r="7"/><path d="M12 9v6m-3-3h6"/>',
  run: '<path d="M5 6h8v12h6"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="18" r="2"/>',
  bend: '<path d="M4 17 12 7l8 10"/><circle cx="12" cy="7" r="2"/>',
};
const copy = {
  title: ['Instalações', 'Building services'], floor: ['Piso', 'Storey'], scope: ['Âmbito da geração', 'Generation scope'], current: ['Piso atual', 'Current storey'], all: ['Todos os pisos', 'All storeys'],
  system: ['Especialidade', 'Service'], visible: ['Camadas visíveis em 2D e 3D', 'Layers visible in 2D and 3D'],
  generate: ['Gerar traçado', 'Generate layout'], reset: ['Refazer traçado', 'Regenerate layout'], ready: ['Traçado gerado.', 'Layout generated.'],
  schematic: ['Traçado esquemático para coordenação. O dimensionamento e a conformidade são validados no projeto de especialidade.', 'Schematic layout for coordination. Sizing and compliance are verified in the detailed design.'],
  node: ['Ponto', 'Point'], nodes: ['Pontos', 'Points'], run: ['Ligação', 'Connection'], runs: ['Ligações', 'Connections'],
  select: ['Selecionar', 'Select'], place: ['Colocar ponto', 'Place point'], link: ['Traçar ligação', 'Draw connection'], bend: ['Marcar desvio', 'Add bend'], type: ['Tipo', 'Type'], medium: ['Rede', 'Network'],
  choose: ['Selecionar elemento', 'Select element'], none: ['Sem seleção', 'No selection'],
  label: ['Identificação', 'Label'], apply: ['Aplicar alterações', 'Apply changes'], remove: ['Eliminar', 'Delete'], from: ['Origem', 'From'], to: ['Destino', 'To'],
  bends: ['Pontos de passagem', 'Waypoints'], x: ['X (m)', 'X (m)'], y: ['Y (m)', 'Y (m)'],
  mount: ['Montagem', 'Mounting'], wall: ['Parede', 'Wall'], floorMount: ['Chão', 'Floor'], ceiling: ['Teto', 'Ceiling'], free: ['Livre', 'Free'],
  routeSurface: ['Superfície do traçado', 'Route surface'], autoSurface: ['Automática', 'Automatic'], routeFloor: ['Pavimento', 'Floor'],
  routeSupport: ['Os troços verticais acompanham a parede dos pontos fixos. Na planta podes rever todo o percurso, incluindo os troços ocultos em 3D.', 'Vertical segments follow the wall at wall-mounted points. Review the full route in plan, including segments concealed in 3D.'],
  unsupportedRoute: ['A linha tracejada castanha assinala um troço sem suporte.', 'A brown dashed line marks an unsupported segment.'],
  face: ['Face da parede', 'Wall face'], wallSide: ['Face {side} · {direction}', 'Face {side} · {direction}'],
  exterior: ['Exterior', 'Outside'], unassignedFace: ['Sem divisão atribuída', 'No room assigned'],
  wallPosition: ['Posição na parede (%)', 'Position along wall (%)'],
  wallStart: ['0% no primeiro extremo · 100% no segundo', '0% at the start · 100% at the end'],
  noWall: ['Desenha uma parede para montar o ponto numa das suas faces.', 'Draw a wall to mount the point on one of its faces.'],
  wallHint: ['Clica ou toca junto à face da parede voltada para a zona que o ponto serve.', 'Click or tap beside the wall face that faces the zone this point serves.'],
  wallMiss: ['Aproxima-te da face que queres usar ou escolhe outra montagem.', 'Move closer to the wall face you want or choose a different mounting.'],
  sockets: ['Número de tomadas', 'Number of outlets'], phase: ['Alimentação', 'Supply'], generationPhase: ['Alimentação da proposta', 'Proposed supply'],
  single: ['Monofásica', 'Single-phase'], three: ['Trifásica', 'Three-phase'],
  selectHint: ['Seleciona um ponto ou uma ligação na planta. Arrasta pontos para os mover.', 'Select a point or connection in the plan. Drag points to move them.'],
  placeHint: ['Clica ou toca na planta para colocar o ponto.', 'Click or tap the plan to place the point.'],
  linkHint: ['Seleciona o ponto de origem na planta.', 'Select the starting point in the plan.'],
  viaHint: ['Marca desvios na planta e termina noutro ponto da mesma especialidade.', 'Mark bends in the plan and finish at another point in the same service.'],
  bendHint: ['Indica na planta a posição do novo ponto de passagem.', 'Choose the location of the new waypoint in the plan.'],
  invalid: ['Não foi possível fazer esta alteração. Verifica os pontos, a rede e as coordenadas.', 'This change could not be made. Check the points, network and coordinates.'],
  pickSource: ['Seleciona um ponto da especialidade ativa.', 'Select a point in the active service.'],
  incompatible: ['Este tipo de ponto não suporta a rede escolhida.', 'This point type does not support the selected network.'],
  tooManyBends: ['A ligação já tem o número máximo de pontos de passagem.', 'The connection already has the maximum number of waypoints.'],
  noGeometry: ['Desenha compartimentos ou coloca pontos para começar.', 'Draw rooms or place points to get started.'],
  warnings: ['Pontos a rever', 'Items to review'], edit: ['Painel de instalações', 'Building services panel'], exit: ['Sair da edição', 'Exit editing'],
  total: ['Comprimento em planta', 'Length in plan'], canvas: ['Continuar na planta', 'Continue in the plan'],
};

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const glyph = (key) => `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${paths[key]}</svg>`;
const tag = ({ id, kind, system, levelId }) => `${levelId}:${system}:${kind}:${id}`;
const samePoint = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < .015;
const mediumDashes = {
  power: [5, 3], control: [2, 3], dedicated: [8, 3], serviceFeed: [10, 3, 2, 3], hot: [6, 3], drain: [2, 3],
  extract: [5, 2], intake: [2, 2], exhaust: [6, 3, 2, 3], condensate: [2, 3], return: [5, 3],
};

function linePoints(points) {
  return points.map(({ x, y }) => `${x},${y}`).join(' ');
}

function routePath(spans) {
  return spans.map(({ from, to }) => `M ${from.x} ${from.y} L ${to.x} ${to.y}`).join(' ');
}

const mountLabel = (mount) => mount === 'floor' ? 'floorMount' : mount;
const surfaceLabel = (surface) => surface === 'floor' ? 'routeFloor' : 'ceiling';
const hasOutlets = (id, kind) => id === 'electrical' && ['outlet', 'dedicatedOutlet'].includes(kind);
const hasPhase = (id, kind) => id === 'electrical' && kind === 'supplyEntry';
const supplyPhase = (node) => node.phase ?? 'single';

function nodeDescription(id, node, language) {
  const local = language === 'pt' ? 0 : 1;
  return [node.label || serviceSystems[id].kinds[node.kind][language],
    hasOutlets(id, node.kind) && node.count > 1 ? `${node.count}×` : null,
    hasPhase(id, node.kind) ? copy[supplyPhase(node)][local] : null,
    node.mount ? copy[mountLabel(node.mount)]?.[local] : null,
  ].filter(Boolean).join(' · ');
}

function nodeGraphic(id, node, unit, active, interactive) {
  const symbol = serviceNodeSymbol(id, node);
  const color = serviceSystems[id].color;
  const radius = unit * (active ? 10 : 8.5);
  const halfWidth = Math.max(radius, unit * (symbol.length * 2.9 + 3));
  const wallMounted = node.mount === 'wall' && Number.isFinite(node.angle);
  const angle = node.angle * Math.PI / 180;
  const normal = wallMounted ? { x: Math.cos(angle), y: Math.sin(angle) } : { x: 0, y: 0 };
  const reach = Math.hypot(halfWidth * normal.x, radius * normal.y) + unit * 4;
  const cx = Number((normal.x * reach).toFixed(6));
  const cy = Number((normal.y * reach).toFixed(6));
  const outline = `fill="${active ? color : '#fffdf9'}" stroke="${color}" stroke-width="${unit * 1.7}"`;
  const stem = wallMounted ? `<path d="M0 0L${cx} ${cy}" stroke="#fffdf9" stroke-width="${unit * 4.5}" pointer-events="none"/><path d="M0 0L${cx} ${cy}" stroke="${color}" stroke-width="${unit * 1.8}" pointer-events="none"/><circle r="${unit * 2}" fill="${color}" pointer-events="none"/>` : '';
  return `${interactive && wallMounted ? `<path d="M0 0L${cx} ${cy}" stroke="transparent" stroke-width="${unit * 17}" pointer-events="stroke"/>` : ''}
    ${stem}<g transform="translate(${cx} ${cy})" data-service-marker>
      ${interactive ? `<rect x="${-halfWidth - unit * 5}" y="${-unit * 15}" width="${(halfWidth + unit * 5) * 2}" height="${unit * 30}" fill="transparent" pointer-events="all"/>` : ''}
      <rect x="${-halfWidth}" y="${-radius}" width="${halfWidth * 2}" height="${radius * 2}" rx="${radius}" ${outline} pointer-events="none"/>
      <text y=".34em" fill="${active ? '#fff' : color}" font-size="${unit * 9.5}" font-weight="760" text-anchor="middle" pointer-events="none">${esc(symbol)}</text>
    </g>`;
}

export function renderServicesPlan(level, { layers, unit = .019, locale, selection, move, interactive = false } = {}) {
  const language = locale === 'pt-PT' ? 'pt' : 'en';
  const footprints = new Map();
  return (layers ?? []).filter((id) => serviceSystems[id] && level.services?.[id]).map((id) => {
    const spec = serviceSystems[id];
    const original = level.services[id];
    const network = { ...original, nodes: original.nodes.map((node) => resolveServiceNode(level,
      move?.selection.system === id && node.id === move.selection.id ? { ...node, ...move.point } : node)) };
    const nodesById = new Map(network.nodes.map((node) => [node.id, node]));
    const selected = (kind, targetId) => selection?.system === id && selection.kind === kind && selection.id === targetId;
    const runs = network.runs.map((run) => {
      const points = serviceRunPoints(network, run);
      if (points.length < 2) return '';
      const medium = spec.media[run.medium];
      const active = selected('run', run.id);
      const dash = mediumDashes[run.medium]?.map((length) => length * unit).join(' ');
      const surface = serviceRunSurface(id, run);
      if (!footprints.has(surface)) footprints.set(surface, serviceSurfaceFootprints(level, surface));
      const spans = supportedRouteSpans(points, footprints.get(surface), {
        exteriorFrom: isServiceExteriorNode(nodesById.get(run.from)),
        exteriorTo: isServiceExteriorNode(nodesById.get(run.to)),
      });
      const unsupported = spans.filter((span) => !span.supported && !span.exterior);
      const title = [run.label || medium[language], copy[surfaceLabel(surface)][language === 'pt' ? 0 : 1]].join(' · ');
      const vertices = linePoints(points);
      const supportedLine = unsupported.length
        ? `<path d="${routePath(spans.filter((span) => span.supported || span.exterior))}"`
        : `<polyline points="${vertices}"`;
      return `<g data-service-system="${id}" data-service-kind="run" data-service-id="${esc(run.id)}" data-run-surface="${surface}"><title>${esc(title)}</title>
        ${interactive ? `<polyline points="${vertices}" stroke="transparent" stroke-width="${unit * 16}" pointer-events="stroke"/>` : ''}
        <polyline points="${vertices}" stroke="#fffdf9" stroke-width="${unit * (active ? 7 : 5)}" pointer-events="none"/>
        ${supportedLine} stroke="${medium.color}" stroke-width="${unit * (active ? 4.2 : 2.55)}" ${dash ? `stroke-dasharray="${dash}"` : ''} pointer-events="none"/>
        ${unsupported.length ? `<path data-unsupported-route d="${routePath(unsupported)}" stroke="#925127" stroke-width="${unit * (active ? 4.2 : 2.55)}" stroke-dasharray="${unit * 3} ${unit * 5}" pointer-events="none"/>` : ''}
        ${active && interactive ? (run.points ?? []).map((point) => `<circle cx="${point.x}" cy="${point.y}" r="${unit * 3}" fill="#fff" stroke="${medium.color}" stroke-width="${unit * 1.6}"/>`).join('') : ''}</g>`;
    }).join('');
    const nodes = network.nodes.map((node) => `<g transform="translate(${node.x} ${node.y})" data-service-system="${id}" data-service-kind="node" data-service-id="${esc(node.id)}"><title>${esc(nodeDescription(id, node, language))}</title>
      ${nodeGraphic(id, node, unit, selected('node', node.id), interactive)}</g>`).join('');
    return `<g class="cv-services-overlay" data-plotted-service="${id}" fill="none" stroke-linecap="round" stroke-linejoin="round">${runs}${nodes}</g>`;
  }).join('');
}

export function servicesPrintLegend(level, layers, { locale, x, y, width }) {
  const language = locale === 'pt-PT' ? 'pt' : 'en';
  const groups = layers.flatMap((id) => {
    const network = level.services?.[id];
    if (!network?.nodes.length) return [];
    const spec = serviceSystems[id];
    const used = new Set(network.runs.map(({ medium }) => medium));
    return [{ name: spec[language], entries: Object.entries(spec.media).filter(([key]) => used.has(key)) }];
  });
  if (!groups.length) return { markup: '', height: 0 };
  const size = Math.min(.19, width / 54);
  const row = 1.7 * size;
  const column = width / 2;
  const rows = new Array(2).fill(0);
  let markup = '';
  for (const group of groups) {
    const col = rows[0] <= rows[1] ? 0 : 1;
    const left = x + col * column;
    const top = y + row * rows[col];
    markup += `<text x="${left}" y="${top}" font-weight="700">${esc(group.name)}</text>`;
    group.entries.forEach(([key, medium], index) => {
      const baseline = top + (index + 1) * row;
      const dash = mediumDashes[key]?.map((length) => length * size / 10).join(' ');
      markup += `<path d="M${left} ${baseline - size * .28}h${size * 2}" stroke="${medium.color}" stroke-width="${size * .25}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/><text x="${left + size * 2.8}" y="${baseline}">${esc(medium[language])}</text>`;
    });
    rows[col] += group.entries.length + 1.45;
  }
  return { markup: `<g fill="#2a4656" font-size="${size}">${markup}</g>`, height: row * (Math.max(...rows) + .4) };
}

function nearestSegment(point, route) {
  let index = 0, minimum = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const fraction = Math.min(1, Math.max(0, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const distance = Math.hypot(point.x - a.x - dx * fraction, point.y - a.y - dy * fraction);
    if (distance < minimum) { index = i; minimum = distance; }
  }
  return index;
}

export function createServicesEditor({ locale, getProject, getLevel, commit, refresh, confirmReplace }) {
  const language = locale === 'pt-PT' ? 'pt' : 'en';
  const t = (key) => copy[key]?.[language === 'pt' ? 0 : 1] ?? key;
  const number = new Intl.NumberFormat(locale === 'en-INT' ? 'en-GB' : 'pt-PT', { maximumFractionDigits: 2 });
  const visible = new Set();
  const pinned = new Set();
  let system = ids[0];
  let kind = 'light';
  let mount;
  let count = 1;
  let phase = 'single';
  let generationPhase;
  let medium = 'lighting';
  let routeSurface = '';
  let mode = 'select';
  let scope = 'current';
  let selected = null;
  let route = null;
  let message = '';
  let detailDraft = null;

  function network(id = system) { return getLevel().services?.[id] ?? empty; }
  function defaultMount(id = kind) { return serviceSystems[system].kinds[id].defaultMount ?? 'free'; }
  function placementMount() { return mount ?? defaultMount(); }
  function record(selection = selected) {
    if (!selection || getLevel().id !== selection.levelId) return null;
    return network(selection.system)[selection.kind === 'node' ? 'nodes' : 'runs'].find(({ id }) => id === selection.id);
  }
  function setSystem(id, keepVisible = false) {
    if (!serviceSystems[id]) return;
    if (id !== system && !keepVisible && !pinned.has(system)) visible.delete(system);
    visible.add(id);
    if (id === system) return;
    system = id;
    kind = Object.keys(serviceSystems[system].kinds)[0];
    mount = undefined;
    count = 1;
    phase = 'single';
    medium = system === 'electrical' ? 'lighting' : Object.keys(serviceSystems[system].media)[0];
    routeSurface = '';
    clear();
  }
  function clear() {
    mode = 'select'; selected = route = detailDraft = null; message = '';
  }
  function selection() { return record() ? selected : null; }
  function locate(element) {
    const hit = element.closest?.('[data-service-id]');
    if (!hit) return null;
    const { serviceKind: kind, serviceId: id, serviceSystem: system } = hit.dataset;
    const picked = { kind, id, system, levelId: getLevel().id };
    return record(picked) ? picked : null;
  }
  function select(picked) {
    if (picked && record(picked)) setSystem(picked.system);
    if (picked?.id !== selected?.id || picked?.kind !== selected?.kind) detailDraft = null;
    selected = picked;
    message = '';
  }
  function update(floors, after) {
    if (floors.length) commit(floors, after);
    else { after?.(); refresh(); }
  }
  function apply(operations, after, floor = getLevel()) {
    try {
      const next = applyServiceOperations(floor, system, operations);
      message = '';
      update([{ floor, system, next }], () => after?.(next));
      return true;
    } catch {
      message = t('invalid');
      refresh();
      return false;
    }
  }
  function groundFloor() { return getProject().levels[0]; }
  function entryPhase() {
    return generationPhase ?? supplyPhase(groundFloor()?.services?.electrical?.nodes.find((node) => node.kind === 'supplyEntry') ?? {});
  }
  function generate() {
    const floors = scope === 'all' ? getProject().levels : [getLevel()];
    const target = system;
    const entry = entryPhase();
    const existing = floors.some((floor) => floor.services?.[target]?.nodes.length || floor.services?.[target]?.runs.length);
    function perform() {
      try {
        const updates = floors.map((floor) => ({
          floor, system: target,
          next: applyServiceOperations(floor, target, [{ op: 'generate', replace: true, includeEntry: floor.id === groundFloor()?.id, ...(target === 'electrical' ? { phase: entry } : {}) }]),
        }));
        visible.add(target);
        update(updates.filter(({ floor, next }) => JSON.stringify(floor.services?.[target] ?? empty) !== JSON.stringify(next)), () => {
          clear();
          if (target === 'electrical' && floors.some((floor) => floor.id === groundFloor()?.id)) generationPhase = undefined;
          message = updates.some(({ next }) => next.nodes.length) ? t('ready') : t('noGeometry');
        });
      } catch { message = t('invalid'); refresh(); }
    }
    if (existing) confirmReplace(perform);
    else perform();
  }

  function option(value, label, chosen) { return `<option value="${esc(value)}"${chosen === value ? ' selected' : ''}>${esc(label)}</option>`; }
  function choose(key, label, options, chosen, name = key) {
    return `<label class="cv-field">${t(label)}<select name="${name}"${key ? ` data-service-field="${key}"` : ''}>${options.map(([id, title]) => option(id, title, chosen)).join('')}</select></label>`;
  }
  function numberField(name, title, value, key = '') {
    return `<label class="cv-field">${t(title)}<input required type="number" inputmode="decimal" step="any" min="${-serviceLimits.coordinate}" max="${serviceLimits.coordinate}" name="${name}" value="${esc(value)}"${key ? ` data-bend="${key}"` : ''}></label>`;
  }
  function nodeTitle(node) {
    const item = resolveServiceNode(getLevel(), node);
    return `${nodeDescription(system, item, language)} · ${number.format(item.x)}, ${number.format(item.y)}`;
  }
  function runTitle(run, current, spec = serviceSystems[system]) {
    const surface = t(surfaceLabel(serviceRunSurface(system, run)));
    if (run.label) return `${run.label} · ${surface}`;
    const from = current.nodes.find((node) => node.id === run.from);
    const to = current.nodes.find((node) => node.id === run.to);
    return [spec.media[run.medium][language], surface, from && spec.kinds[from.kind][language], to && spec.kinds[to.kind][language]].filter(Boolean).join(' · ');
  }
  function button(action, key, icon, extra = '', pressed) {
    return `<button type="button" class="cv-button" data-action="service-action:${action}" ${pressed === undefined ? '' : `aria-pressed="${pressed}"`} ${extra}>${icon ? glyph(icon) : ''}<span>${t(key)}</span></button>`;
  }
  function mountOptions() {
    return serviceMounts.map((type) => [type, t(mountLabel(type))]);
  }
  function surfaceField(key, runMedium, chosen) {
    const automatic = t(surfaceLabel(serviceRunSurface(system, { medium: runMedium })));
    return choose(key, 'routeSurface', [['', `${t('autoSurface')} · ${automatic}`],
      ...serviceRouteSurfaces.map((surface) => [surface, t(surfaceLabel(surface))])], chosen, 'surface');
  }
  function phaseField(key, value) {
    return choose(key, key === 'generation-phase' ? 'generationPhase' : 'phase', servicePhases.map((phase) => [phase, t(phase)]), value, 'phase');
  }
  function countField(key, value) {
    return `<label class="cv-field">${t('sockets')}<input required type="number" inputmode="numeric" step="1" min="1" max="${serviceLimits.count}" name="count"${key ? ` data-service-field="${key}"` : ''} value="${esc(value)}"></label>`;
  }
  function facing(wall, side) {
    const angle = Math.atan2((wall.x2 - wall.x1) * side, (wall.y1 - wall.y2) * side) * 180 / Math.PI;
    const directions = language === 'pt' ? ['E', 'SE', 'S', 'SO', 'O', 'NO', 'N', 'NE'] : ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    return directions[(Math.round(angle / 45) + 8) % 8];
  }
  function wallFaceOptions(wall, fraction) {
    const floor = getLevel();
    const sides = [1, -1];
    const faceRooms = sides.map((side) => {
      const position = resolveServiceNode(floor, { mount: 'wall', wall: { wallId: wall.id, fraction, side } });
      return floor.rooms.find(({ id }) => id === position.roomId);
    });
    return sides.map((value, index) => {
      const room = faceRooms[index];
      const exterior = faceRooms[1 - index] && wall.spec?.assembly !== 'partition' && wall.thickness >= .18;
      const name = room?.name || roomStyles[room?.type]?.[language] || t(exterior ? 'exterior' : 'unassignedFace');
      const heading = t('wallSide').replace('{side}', index + 1).replace('{direction}', facing(wall, value));
      return [String(value), `${heading} · ${name}`];
    });
  }
  function wallFields(location, draft) {
    const floor = getLevel();
    const walls = floor.walls ?? [];
    if (!walls.length) return `<p class="cv-service-hint">${t('noWall')}</p>`;
    const anchor = walls.some(({ id }) => id === location.wall?.wallId) ? location.wall
      : snapServiceNode(floor, location, { threshold: Infinity })?.wall;
    const wall = walls.find(({ id }) => id === (draft.wallId ?? anchor?.wallId)) ?? walls[0];
    const fraction = draft.fraction ?? Number(((anchor?.fraction ?? .5) * 100).toFixed(4));
    const side = draft.side ?? String(anchor?.side ?? 1);
    return `
      ${choose('detail-wall', 'wall', walls.map(({ id, x1, x2, y1, y2 }, index) => [id, `${t('wall')} ${index + 1} · ${number.format(Math.hypot(x2 - x1, y2 - y1))} m`]), wall.id, 'wallId')}
      ${choose('', 'face', wallFaceOptions(wall, Number(fraction) / 100), side, 'side')}
      <label class="cv-field">${t('wallPosition')}<input required type="number" inputmode="decimal" name="fraction" min="0" max="100" step="any" value="${esc(fraction)}"><small>${t('wallStart')}</small></label>`;
  }
  function nodeDetail(item, kinds) {
    const draft = detailDraft ?? {};
    const type = draft.kind ?? item.kind;
    const mounting = draft.mount ?? item.mount ?? 'free';
    const location = resolveServiceNode(getLevel(), item);
    return `${choose('detail-kind', 'type', kinds, type, 'kind')}
      ${choose('detail-mount', 'mount', mountOptions(), mounting, 'mount')}
      ${mounting === 'wall' ? wallFields(location, draft) : `<div class="cv-row">${numberField('x', 'x', draft.x ?? location.x)}${numberField('y', 'y', draft.y ?? location.y)}</div>`}
      ${hasOutlets(system, type) ? countField('', draft.count ?? item.count ?? 1) : ''}
      ${hasPhase(system, type) ? phaseField('', draft.phase ?? supplyPhase(item)) : ''}`;
  }
  function detail(current, spec) {
    const item = record();
    if (item == null) return '';
    const node = selected.kind === 'node';
    const nodes = current.nodes.map((value) => [value.id, nodeTitle(value)]);
    const media = Object.entries(spec.media).map(([id, entry]) => [id, entry[language]]);
    const kinds = Object.entries(spec.kinds).map(([id, entry]) => [id, entry[language]]);
    const draft = detailDraft ?? {};
    return `<form data-service-form="${selected.kind}" class="cv-service-detail"><h3>${t(selected.kind)}</h3>
      <label class="cv-field">${t('label')}<input name="label" maxlength="${serviceLimits.label}" value="${esc(draft.label ?? item.label)}"></label>
      ${node ? nodeDetail(item, kinds) : `
        ${choose('detail-run-medium', 'medium', media, draft.medium ?? item.medium, 'medium')}
        ${surfaceField('', draft.medium ?? item.medium, draft.surface ?? item.surface ?? '')}
        <p class="cv-service-hint">${t('routeSupport')}</p>
        ${choose('', 'from', nodes, draft.from ?? item.from, 'from')}${choose('', 'to', nodes, draft.to ?? item.to, 'to')}
        <div class="cv-service-points"><h4>${t('bends')}</h4>
        ${(item.points ?? []).map(({ x, y }, index) => `<div class="cv-service-point-row">${numberField(`bx${index}`, 'x', draft[`bx${index}`] ?? x, String(index))}${numberField(`by${index}`, 'y', draft[`by${index}`] ?? y, String(index))}<button type="button" aria-label="${t('remove')} ${index + 1}" data-action="service-action:remove-bend" data-index="${index}" class="cv-tool">×</button></div>`).join('')}
        ${button('bend', 'bend', 'bend', '', mode === 'bend')}</div>`}
      <div class="cv-service-actions"><button type="submit" class="cv-button cv-primary">${t('apply')}</button>${button('remove', 'remove')}</div></form>`;
  }

  function panel() {
    const current = network();
    const spec = serviceSystems[system];
    const onGround = getLevel().id === groundFloor()?.id;
    const inspection = inspectServices(getLevel(), system, { includeEntry: onGround });
    const nodes = current.nodes.map((node) => option(`node:${node.id}`, nodeTitle(node), selected?.kind === 'node' ? `node:${selected.id}` : ''));
    const runs = current.runs.map((run) => option(`run:${run.id}`, runTitle(run, current), selected?.kind === 'run' ? `run:${selected.id}` : ''));
    const kinds = Object.entries(spec.kinds).map(([id, info]) => [id, info[language]]);
    const media = Object.entries(spec.media).map(([id, info]) => [id, info[language]]);
    const length = Object.values(inspection.lengths).reduce((sum, value) => sum + value, 0);
    const planned = current.nodes.length || current.runs.length;
    return `<section class="cv-panel-section cv-service-section">
      <p class="cv-service-floor">${t('floor')} · ${esc(getLevel().name)}</p>
      ${choose('system', 'system', Object.entries(serviceSystems).map(([id, info]) => [id, info[language]]), system)}
      <div class="cv-service-generate"><div class="cv-service-generate-options">${choose('scope', 'scope', [['current', t('current')], ['all', t('all')]], scope)}
        ${system === 'electrical' && (onGround || scope === 'all') ? phaseField('generation-phase', entryPhase()) : ''}</div>${button('generate', planned ? 'reset' : 'generate')}</div>
      <p class="cv-service-note">${t('schematic')}</p>
      <details class="cv-service-layers"><summary>${t('visible')}</summary><div>${ids.map((id) => `<label><input type="checkbox" data-service-field="visible" value="${id}"${visible.has(id) ? ' checked' : ''}><i style="--cv-network-color:${serviceSystems[id].color}"></i>${esc(serviceSystems[id][language])}</label>`).join('')}</div></details>
    </section>
    <section class="cv-panel-section cv-service-section">
      <div class="cv-service-tools" role="group" aria-label="${t('title')}">${button('select', 'select', 'select', '', mode === 'select')}${button('place', 'place', 'node', '', mode === 'place')}${button('link', 'link', 'run', current.nodes.length < 2 ? 'disabled' : '', mode === 'link')}</div>
      ${mode === 'place' ? `${choose('kind', 'type', kinds, kind)}
        ${choose('mount', 'mount', mountOptions(), placementMount())}
        ${placementMount() === 'wall' && !getLevel().walls?.length ? `<p class="cv-service-hint">${t('noWall')}</p>` : ''}
        ${hasOutlets(system, kind) ? countField('count', count) : ''}${hasPhase(system, kind) ? phaseField('phase', phase) : ''}` : mode === 'link' ? `
        ${choose('medium', 'medium', media, medium)}${surfaceField('route-surface', medium, routeSurface)}` : ''}
      <p class="cv-service-hint">${hint()}</p>
      ${button('canvas', 'canvas', null, 'data-service-canvas')}
      ${message ? `<p class="cv-service-message" role="status">${esc(message)}</p>` : ''}
      ${planned ? `<label class="cv-field">${t('choose')}<select data-service-field="pick"><option value="">${t('none')}</option><optgroup label="${t('nodes')}">${nodes.join('')}</optgroup><optgroup label="${t('runs')}">${runs.join('')}</optgroup></select></label>` : ''}
      ${detail(current, spec)}
    </section>
    <section class="cv-panel-section cv-service-section">
      <dl class="cv-service-counts"><div><dt>${t('nodes')}</dt><dd>${current.nodes.length}</dd></div><div><dt>${t('runs')}</dt><dd>${current.runs.length}</dd></div><div><dt>${t('total')}</dt><dd>${number.format(length)} m</dd></div></dl>
      <ul class="cv-service-legend">${Object.entries(spec.media).map(([id, entry]) => `<li><i style="--cv-network-color:${entry.color}"${mediumDashes[id] ? ' data-dashed' : ''}></i>${esc(entry[language])}</li>`).join('')}</ul>
      ${warningsPanel(inspection.warnings, current)}
    </section>`;
  }

  function warningsPanel(warnings, current) {
    if (!warnings.length) return '';
    const runs = new Map(current.runs.map((run) => [run.id, run]));
    const unsupported = warnings.some(({ code }) => code === 'unsupported_surface');
    return `<details class="cv-service-warnings"><summary>${t('warnings')} · ${warnings.length}</summary>
      ${unsupported ? `<p class="cv-service-hint">${t('unsupportedRoute')}</p>` : ''}<ul>${warnings.map((warning) => {
      const run = runs.get(warning.runId);
      const selection = run ? ` <button type="button" class="cv-service-warning-link" data-action="service-action:inspect-run" data-run-id="${esc(run.id)}">${esc(runTitle(run, current))}</button>` : '';
      return `<li>${esc(warning[language])}${selection}</li>`;
    }).join('')}</ul></details>`;
  }

  function hint() {
    if (mode === 'place') return t(placementMount() === 'wall' ? 'wallHint' : 'placeHint');
    return t(mode === 'bend' ? 'bendHint' : mode === 'link' ? (route ? 'viaHint' : 'linkHint') : 'selectHint');
  }
  function modeAction(action) {
    if (action === 'generate') { generate(); return; }
    if (action === 'remove') { remove(); return; }
    if (action === 'remove-bend') return;
    if (!['select', 'place', 'link', 'bend'].includes(action)) return;
    visible.add(system);
    message = '';
    route = null;
    detailDraft = null;
    mode = action;
    if (mode !== 'bend') selected = null;
  }
  function remove() {
    if (!record()) return false;
    return apply([{ op: `delete_${selected.kind}`, id: selected.id }], clear);
  }
  function inspectRun(id) {
    const picked = { system, kind: 'run', id, levelId: getLevel().id };
    if (!record(picked)) return;
    mode = 'select';
    route = null;
    select(picked);
  }
  function removeBend(index) {
    const item = record();
    if (selected?.kind !== 'run' || !item || !Number.isInteger(index) || index < 0 || index >= item.points.length) return;
    apply([{ op: 'update_run', id: item.id, run: { points: item.points.filter((_, at) => at !== index) } }]);
  }
  function field(input) {
    switch (input.dataset.serviceField) {
      case 'system': setSystem(input.value); break;
      case 'scope': scope = input.value; break;
      case 'kind': kind = input.value; mount = undefined; message = ''; break;
      case 'mount': mount = input.value; message = ''; break;
      case 'count': count = clampCount(input.value); input.value = String(count); break;
      case 'phase': phase = input.value; break;
      case 'generation-phase': generationPhase = input.value; break;
      case 'detail-kind':
      case 'detail-mount':
      case 'detail-wall':
      case 'detail-run-medium':
        detailDraft = { ...detailDraft, ...Object.fromEntries(new FormData(input.form)) };
        break;
      case 'medium': medium = input.value; route = null; routeSurface = ''; break;
      case 'route-surface': routeSurface = input.value; break;
      case 'visible':
        if (input.checked) { visible.add(input.value); pinned.add(input.value); }
        else { visible.delete(input.value); pinned.delete(input.value); }
        break;
      case 'pick': {
        const [itemType, id] = input.value.split(':');
        select(id ? { kind: itemType, id, system, levelId: getLevel().id } : null);
        mode = 'select'; route = null;
        break;
      }
    }
  }
  function updateWallFaces(input) {
    if (!input.validity.valid) return;
    const { wallId, side } = input.form.elements;
    const wall = getLevel().walls.find(({ id }) => id === wallId.value);
    if (!wall) return;
    const faces = wallFaceOptions(wall, input.valueAsNumber / 100);
    for (const [index, option] of [...side.options].entries()) option.textContent = faces[index][1];
  }
  function submit(data) {
    const item = record();
    if (!item) return;
    const label = String(data.get('label') ?? '').trim();
    const fields = selected.kind === 'node' ? nodeFields(data, item, label) : {
      label, medium: data.get('medium'), from: data.get('from'), to: data.get('to'),
      ...(data.has('surface') ? { surface: data.get('surface') || null } : {}),
      points: item.points.map((_, index) => ({ x: Number(data.get(`bx${index}`)), y: Number(data.get(`by${index}`)) })),
    };
    if (!fields) { message = t('noWall'); refresh(); return; }
    apply([{ op: `update_${selected.kind}`, id: item.id, [selected.kind]: fields }], () => { detailDraft = null; });
  }
  function clampCount(value) {
    return Math.min(serviceLimits.count, Math.max(1, Math.round(Number(value)) || 1));
  }
  function optionsFor(type, count, phase) {
    return { ...(hasOutlets(system, type) ? { count: clampCount(count) } : {}), ...(hasPhase(system, type) ? { phase } : {}) };
  }
  function nodeFields(data, item, label) {
    const kind = data.get('kind');
    const mount = data.get('mount') ?? item.mount ?? 'free';
    const phase = data.get('phase') ?? supplyPhase(item);
    const fields = { label, kind, ...optionsFor(kind, data.get('count') ?? item.count, phase) };
    if (mount === 'wall') {
      const wallId = data.get('wallId');
      if (!wallId) return null;
      const wall = { wallId, fraction: Number(data.get('fraction')) / 100, side: Number(data.get('side')) };
      return { ...fields, mount, wall };
    }
    return { ...fields, ...nodeLocation({ x: Number(data.get('x')), y: Number(data.get('y')) }, item, mount), mount, wall: null };
  }

  function hitNode(hit, raw, tolerance) {
    if (hit?.system === system && hit.kind === 'node') return record(hit);
    let result;
    for (const item of network().nodes) {
      const node = resolveServiceNode(getLevel(), item);
      const distance = Math.hypot(node.x - raw.x, node.y - raw.y);
      if (distance < tolerance) { result = node; tolerance = distance; }
    }
    return result;
  }
  function click(point, raw, hit, tolerance) {
    if (mode === 'place') {
      const node = placement(point, raw, tolerance);
      if (!node) { message = t('wallMiss'); refresh(); return; }
      const before = new Set(network().nodes.map(({ id }) => id));
      apply([{ op: 'add_node', node: { kind, ...locationFields(node), ...optionsFor(kind, count, phase) } }], (next) => {
        mode = 'select';
        const added = next.nodes.find(({ id }) => !before.has(id));
        if (added) select({ kind: 'node', id: added.id, system, levelId: getLevel().id });
      });
      return;
    }
    if (mode === 'bend') {
      const item = record();
      if (!item || selected.kind !== 'run') { clear(); refresh(); return; }
      const index = nearestSegment(point, serviceRunPoints(network(), item, getLevel()));
      const points = [...item.points];
      points.splice(index, 0, point);
      apply([{ op: 'update_run', id: item.id, run: { points } }], () => { mode = 'select'; });
      return;
    }
    if (mode !== 'link') return;
    const node = hitNode(hit, raw, tolerance);
    const accepts = node && serviceSystems[system].kinds[node.kind].media;
    if (accepts && !accepts.includes(medium)) { message = t('incompatible'); refresh(); return; }
    if (!route) {
      if (node) { route = { from: node.id, points: [] }; message = ''; }
      else message = t('pickSource');
    } else if (node && node.id !== route.from) {
      const before = new Set(network().runs.map(({ id }) => id));
      apply([{ op: 'add_run', run: { medium, to: node.id, ...route, ...(routeSurface ? { surface: routeSurface } : {}) } }], (next) => {
        mode = 'select'; route = null;
        const added = next.runs.find(({ id }) => !before.has(id));
        if (added) select({ kind: 'run', id: added.id, system, levelId: getLevel().id });
      });
      return;
    } else if (!node && !samePoint(route.points.at(-1) ?? resolveServiceNode(getLevel(), network().nodes.find(({ id }) => id === route.from)), point)) {
      if (route.points.length < serviceLimits.points) { route.points.push(point); message = ''; }
      else message = t('tooManyBends');
    }
    refresh();
  }
  function moveNode(picked, point, resolved = false) {
    const current = record(picked);
    if (!current || picked.kind !== 'node') return false;
    const next = resolved ? point : previewMove(picked, point);
    return next && apply([{ op: 'update_node', id: picked.id, node: locationFields(next) }], () => { detailDraft = null; });
  }
  function previewMove(picked, point, threshold = .45) {
    const current = record(picked);
    if (!current) return null;
    if (current.mount !== 'wall') return nodeLocation(point, current);
    const host = current.wall;
    const floor = getLevel();
    const snapped = snapServiceNode(floor, point, { threshold: Math.max(threshold, .18) });
    if (snapped) return snapped;
    return host && snapServiceNode(floor, point, { threshold: Infinity, wallId: host.wallId, side: host.side });
  }
  function locationFields({ x, y, mount, wall, roomId }) {
    return { x, y, ...(mount ? { mount } : {}), ...(wall ? { wall } : {}), roomId: roomId ?? null };
  }
  function nodeLocation({ x, y }, current, mount = current?.mount) {
    if (current && current.x === x && current.y === y && current.mount === mount) return { x, y, mount, roomId: current.roomId };
    const point = { x, y };
    const room = getLevel().rooms.find(({ x, y, w, h, type }) => type !== 'outdoor' && point.x >= x && point.y >= y && point.x <= x + w && point.y <= y + h);
    return { ...point, mount, roomId: room?.id ?? null };
  }
  function placement(point, raw, threshold) {
    const mount = placementMount();
    return mount === 'wall' ? snapServiceNode(getLevel(), raw, { threshold: Math.max(threshold, .18) }) : nodeLocation(point, null, mount);
  }
  function preview(hover, unit, raw = hover, tolerance = .45) {
    if (!hover || mode === 'select') return '';
    const spec = serviceSystems[system];
    const stroke = mode === 'link' ? spec.media[medium].color : spec.color;
    if (mode === 'place') {
      const node = placement(hover, raw, tolerance);
      if (node) return `<g transform="translate(${node.x} ${node.y})" opacity=".78">${nodeGraphic(system, { ...node, kind, count, phase }, unit, false, false)}</g>`;
      return `<path d="M${hover.x - 4 * unit} ${hover.y - 4 * unit}l${8 * unit} ${8 * unit}m0 ${-8 * unit}l${-8 * unit} ${8 * unit}" stroke="${stroke}" stroke-width="${1.8 * unit}" opacity=".7"/>`;
    }
    const start = route && resolveServiceNode(getLevel(), network().nodes.find(({ id }) => id === route.from));
    const routeLine = start ? `<polyline points="${linePoints([start, ...route.points, hover])}" fill="none" stroke="${stroke}" stroke-width="${2 * unit}" stroke-dasharray="${4 * unit} ${3 * unit}" />` : '';
    return `${routeLine}<circle cx="${hover.x}" cy="${hover.y}" r="${5 * unit}" fill="#fffdf9" stroke="${stroke}" stroke-width="${1.8 * unit}"/>`;
  }

  return {
    clear, click, field, hint, inspectRun, locate, modeAction, moveNode, panel, preview, previewMove, remove, removeBend, select, selection, submit, updateWallFaces,
    reveal(id = system, { keepVisible = false } = {}) { setSystem(id, keepVisible); },
    reset() { clear(); visible.clear(); pinned.clear(); generationPhase = undefined; routeSurface = ''; },
    get mode() { return mode; },
    get layers() { return [...visible]; },
    get system() { return system; },
    get key() { return `${[...visible].join(',')}/${selection() ? tag(selected) : ''}`; },
  };
}
