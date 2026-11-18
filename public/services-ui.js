import { applyServiceOperations, inspectServices, serviceLimits, serviceRunPoints, serviceSystems } from './building-services.js';

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
  power: [5, 3], control: [2, 3], dedicated: [8, 3], hot: [6, 3], drain: [2, 3],
  extract: [5, 2], intake: [2, 2], exhaust: [6, 3, 2, 3], condensate: [2, 3], return: [5, 3],
};

function linePoints(points) {
  return points.map(({ x, y }) => `${x},${y}`).join(' ');
}

export function renderServicesPlan(level, { layers, unit = .019, locale, selection, move, interactive = false } = {}) {
  const language = locale === 'pt-PT' ? 'pt' : 'en';
  return (layers ?? []).filter((id) => serviceSystems[id] && level.services?.[id]).map((id) => {
    const spec = serviceSystems[id];
    const original = level.services[id];
    const network = move?.selection.system === id ? { ...original, nodes: original.nodes.map((node) => node.id === move.selection.id ? { ...node, ...move.point } : node) } : original;
    const selected = (kind, targetId) => selection?.system === id && selection.kind === kind && selection.id === targetId;
    const runs = network.runs.map((run) => {
      const points = serviceRunPoints(network, run);
      if (points.length < 2) return '';
      const medium = spec.media[run.medium];
      const active = selected('run', run.id);
      const dash = mediumDashes[run.medium]?.map((length) => length * unit).join(' ');
      return `<g data-service-system="${id}" data-service-kind="run" data-service-id="${esc(run.id)}"><title>${esc(run.label || medium[language])}</title>
        ${interactive ? `<polyline points="${linePoints(points)}" stroke="transparent" stroke-width="${unit * 16}" pointer-events="stroke"/>` : ''}
        <polyline points="${linePoints(points)}" stroke="#fffdf9" stroke-width="${unit * (active ? 7 : 5)}" pointer-events="none"/>
        <polyline points="${linePoints(points)}" stroke="${medium.color}" stroke-width="${unit * (active ? 4.2 : 2.55)}" ${dash ? `stroke-dasharray="${dash}"` : ''} pointer-events="none"/>
        ${active && interactive ? (run.points ?? []).map((point) => `<circle cx="${point.x}" cy="${point.y}" r="${unit * 3}" fill="#fff" stroke="${medium.color}" stroke-width="${unit * 1.6}"/>`).join('') : ''}</g>`;
    }).join('');
    const nodes = network.nodes.map((node) => {
      const type = spec.kinds[node.kind];
      const active = selected('node', node.id);
      const radius = unit * (active ? 10 : 8.5);
      const outline = `fill="${active ? spec.color : '#fffdf9'}" stroke="${spec.color}" stroke-width="${unit * 1.7}"`;
      return `<g transform="translate(${node.x} ${node.y})" data-service-system="${id}" data-service-kind="node" data-service-id="${esc(node.id)}"><title>${esc(node.label || type[language])}</title>
        ${interactive ? `<circle r="${unit * 15}" fill="transparent" pointer-events="all"/>` : ''}
        <circle r="${radius}" ${outline} pointer-events="none"/>
        <text y=".34em" fill="${active ? '#fff' : spec.color}" font-size="${unit * 8.8}" font-weight="760" text-anchor="middle" pointer-events="none">${esc(type.symbol)}</text></g>`;
    }).join('');
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
  let medium = Object.keys(serviceSystems[system].media)[0];
  let mode = 'select';
  let scope = 'current';
  let selected = null;
  let route = null;
  let message = '';

  function network(id = system) { return getLevel().services?.[id] ?? empty; }
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
    medium = Object.keys(serviceSystems[system].media)[0];
    clear();
  }
  function clear() {
    mode = 'select'; selected = route = null; message = '';
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
  function generate() {
    const floors = scope === 'all' ? getProject().levels : [getLevel()];
    const target = system;
    const existing = floors.some((floor) => floor.services?.[target]?.nodes.length || floor.services?.[target]?.runs.length);
    function perform() {
      try {
        const updates = floors.map((floor) => ({ floor, system: target, next: applyServiceOperations(floor, target, [{ op: 'generate', replace: true }]) }));
        visible.add(target);
        update(updates.filter(({ floor, next }) => JSON.stringify(floor.services?.[target] ?? empty) !== JSON.stringify(next)), () => {
          clear();
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
  function nodeTitle(node, spec = serviceSystems[system]) {
    return node.label || `${spec.kinds[node.kind][language]} · ${number.format(node.x)}, ${number.format(node.y)}`;
  }
  function runTitle(run, current, spec = serviceSystems[system]) {
    if (run.label) return run.label;
    const from = current.nodes.find((node) => node.id === run.from);
    const to = current.nodes.find((node) => node.id === run.to);
    return [spec.media[run.medium][language], from && spec.kinds[from.kind][language], to && spec.kinds[to.kind][language]].filter(Boolean).join(' · ');
  }
  function button(action, key, icon, extra = '', pressed) {
    return `<button type="button" class="cv-button" data-action="service-action:${action}" ${pressed === undefined ? '' : `aria-pressed="${pressed}"`} ${extra}>${icon ? glyph(icon) : ''}<span>${t(key)}</span></button>`;
  }
  function detail(current, spec) {
    const item = record();
    if (item == null) return '';
    const node = selected.kind === 'node';
    const nodes = current.nodes.map((value) => [value.id, nodeTitle(value)]);
    const media = Object.entries(spec.media).map(([id, entry]) => [id, entry[language]]);
    const kinds = Object.entries(spec.kinds).map(([id, entry]) => [id, entry[language]]);
    return `<form data-service-form="${selected.kind}" class="cv-service-detail"><h3>${t(selected.kind)}</h3>
      <label class="cv-field">${t('label')}<input name="label" maxlength="${serviceLimits.label}" value="${esc(item.label)}"></label>
      ${node ? `${choose('', 'type', kinds, item.kind, 'kind')}<div class="cv-row">${numberField('x', 'x', item.x)}${numberField('y', 'y', item.y)}</div>` : `
        ${choose('', 'medium', media, item.medium, 'medium')}${choose('', 'from', nodes, item.from, 'from')}${choose('', 'to', nodes, item.to, 'to')}
        <div class="cv-service-points"><h4>${t('bends')}</h4>
        ${(item.points ?? []).map(({ x, y }, index) => `<div class="cv-service-point-row">${numberField(`bx${index}`, 'x', x, String(index))}${numberField(`by${index}`, 'y', y, String(index))}<button type="button" aria-label="${t('remove')} ${index + 1}" data-action="service-action:remove-bend" data-index="${index}" class="cv-tool">×</button></div>`).join('')}
        ${button('bend', 'bend', 'bend', '', mode === 'bend')}</div>`}
      <div class="cv-service-actions"><button type="submit" class="cv-button cv-primary">${t('apply')}</button>${button('remove', 'remove')}</div></form>`;
  }

  function panel() {
    const current = network();
    const spec = serviceSystems[system];
    const inspection = inspectServices(getLevel(), system);
    const nodes = current.nodes.map((node) => option(`node:${node.id}`, nodeTitle(node), selected?.kind === 'node' ? `node:${selected.id}` : ''));
    const runs = current.runs.map((run) => option(`run:${run.id}`, runTitle(run, current), selected?.kind === 'run' ? `run:${selected.id}` : ''));
    const kinds = Object.entries(spec.kinds).map(([id, info]) => [id, info[language]]);
    const media = Object.entries(spec.media).map(([id, info]) => [id, info[language]]);
    const length = Object.values(inspection.lengths).reduce((sum, value) => sum + value, 0);
    const planned = current.nodes.length || current.runs.length;
    return `<section class="cv-panel-section cv-service-section">
      <p class="cv-service-floor">${t('floor')} · ${esc(getLevel().name)}</p>
      ${choose('system', 'system', Object.entries(serviceSystems).map(([id, info]) => [id, info[language]]), system)}
      <div class="cv-service-generate">${choose('scope', 'scope', [['current', t('current')], ['all', t('all')]], scope)}${button('generate', planned ? 'reset' : 'generate')}</div>
      <p class="cv-service-note">${t('schematic')}</p>
      <details class="cv-service-layers"><summary>${t('visible')}</summary><div>${ids.map((id) => `<label><input type="checkbox" data-service-field="visible" value="${id}"${visible.has(id) ? ' checked' : ''}><i style="--cv-network-color:${serviceSystems[id].color}"></i>${esc(serviceSystems[id][language])}</label>`).join('')}</div></details>
    </section>
    <section class="cv-panel-section cv-service-section">
      <div class="cv-service-tools" role="group" aria-label="${t('title')}">${button('select', 'select', 'select', '', mode === 'select')}${button('place', 'place', 'node', '', mode === 'place')}${button('link', 'link', 'run', current.nodes.length < 2 ? 'disabled' : '', mode === 'link')}</div>
      ${mode === 'place' ? choose('kind', 'type', kinds, kind) : mode === 'link' ? choose('medium', 'medium', media, medium) : ''}
      <p class="cv-service-hint">${hint()}</p>
      ${button('canvas', 'canvas', null, 'data-service-canvas')}
      ${message ? `<p class="cv-service-message" role="status">${esc(message)}</p>` : ''}
      ${planned ? `<label class="cv-field">${t('choose')}<select data-service-field="pick"><option value="">${t('none')}</option><optgroup label="${t('nodes')}">${nodes.join('')}</optgroup><optgroup label="${t('runs')}">${runs.join('')}</optgroup></select></label>` : ''}
      ${detail(current, spec)}
    </section>
    <section class="cv-panel-section cv-service-section">
      <dl class="cv-service-counts"><div><dt>${t('nodes')}</dt><dd>${current.nodes.length}</dd></div><div><dt>${t('runs')}</dt><dd>${current.runs.length}</dd></div><div><dt>${t('total')}</dt><dd>${number.format(length)} m</dd></div></dl>
      <ul class="cv-service-legend">${Object.entries(spec.media).map(([id, entry]) => `<li><i style="--cv-network-color:${entry.color}"${mediumDashes[id] ? ' data-dashed' : ''}></i>${esc(entry[language])}</li>`).join('')}</ul>
      ${inspection.warnings.length ? `<details class="cv-service-warnings"><summary>${t('warnings')} · ${inspection.warnings.length}</summary><ul>${inspection.warnings.map((warning) => `<li>${esc(warning[language])}</li>`).join('')}</ul></details>` : ''}
    </section>`;
  }

  function hint() {
    return t(mode === 'place' ? 'placeHint' : mode === 'bend' ? 'bendHint' : mode === 'link' ? (route ? 'viaHint' : 'linkHint') : 'selectHint');
  }
  function modeAction(action) {
    if (action === 'generate') { generate(); return; }
    if (action === 'remove') { remove(); return; }
    if (action === 'remove-bend') return;
    if (!['select', 'place', 'link', 'bend'].includes(action)) return;
    visible.add(system);
    message = '';
    route = null;
    mode = action;
    if (mode !== 'bend') selected = null;
  }
  function remove() {
    if (!record()) return false;
    return apply([{ op: `delete_${selected.kind}`, id: selected.id }], clear);
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
      case 'kind': kind = input.value; break;
      case 'medium': medium = input.value; route = null; break;
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
  function submit(data) {
    const item = record();
    if (!item) return;
    const label = String(data.get('label') ?? '').trim();
    const fields = selected.kind === 'node' ? { label, kind: data.get('kind'), ...nodeLocation({ x: Number(data.get('x')), y: Number(data.get('y')) }, item) } : {
      label, medium: data.get('medium'), from: data.get('from'), to: data.get('to'),
      points: item.points.map((_, index) => ({ x: Number(data.get(`bx${index}`)), y: Number(data.get(`by${index}`)) })),
    };
    apply([{ op: `update_${selected.kind}`, id: item.id, [selected.kind]: fields }]);
  }

  function hitNode(hit, raw, tolerance) {
    if (hit?.system === system && hit.kind === 'node') return record(hit);
    let result;
    for (const node of network().nodes) {
      const distance = Math.hypot(node.x - raw.x, node.y - raw.y);
      if (distance < tolerance) { result = node; tolerance = distance; }
    }
    return result;
  }
  function click(point, raw, hit, tolerance) {
    if (mode === 'place') {
      const before = new Set(network().nodes.map(({ id }) => id));
      apply([{ op: 'add_node', node: { kind, ...nodeLocation(point) } }], (next) => {
        mode = 'select';
        const added = next.nodes.find(({ id }) => !before.has(id));
        if (added) select({ kind: 'node', id: added.id, system, levelId: getLevel().id });
      });
      return;
    }
    if (mode === 'bend') {
      const item = record();
      if (!item || selected.kind !== 'run') { clear(); refresh(); return; }
      const index = nearestSegment(point, serviceRunPoints(network(), item));
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
      apply([{ op: 'add_run', run: { medium, to: node.id, ...route } }], (next) => {
        mode = 'select'; route = null;
        const added = next.runs.find(({ id }) => !before.has(id));
        if (added) select({ kind: 'run', id: added.id, system, levelId: getLevel().id });
      });
      return;
    } else if (!node && !samePoint(route.points.at(-1) ?? network().nodes.find(({ id }) => id === route.from), point)) {
      if (route.points.length < serviceLimits.points) { route.points.push(point); message = ''; }
      else message = t('tooManyBends');
    }
    refresh();
  }
  function moveNode(picked, point) {
    const current = record(picked);
    if (!current || picked.kind !== 'node') return false;
    return apply([{ op: 'update_node', id: picked.id, node: nodeLocation(point, current) }]);
  }
  function nodeLocation(point, current) {
    if (current && current.x === point.x && current.y === point.y) return point;
    const room = getLevel().rooms.find(({ x, y, w, h, type }) => type !== 'outdoor' && point.x >= x && point.y >= y && point.x <= x + w && point.y <= y + h);
    return { ...point, roomId: room?.id ?? null };
  }
  function preview(hover, unit) {
    if (!hover || mode === 'select') return '';
    const spec = serviceSystems[system];
    const stroke = mode === 'link' ? spec.media[medium].color : spec.color;
    const start = route && network().nodes.find(({ id }) => id === route.from);
    const routeLine = start ? `<polyline points="${linePoints([start, ...route.points, hover])}" fill="none" stroke="${stroke}" stroke-width="${2 * unit}" stroke-dasharray="${4 * unit} ${3 * unit}" />` : '';
    return `${routeLine}<circle cx="${hover.x}" cy="${hover.y}" r="${5 * unit}" fill="#fffdf9" stroke="${stroke}" stroke-width="${1.8 * unit}"/>`;
  }

  return {
    clear, click, field, hint, locate, modeAction, moveNode, panel, preview, remove, removeBend, select, selection, submit,
    reveal(id = system, { keepVisible = false } = {}) { setSystem(id, keepVisible); },
    reset() { clear(); visible.clear(); pinned.clear(); },
    get mode() { return mode; },
    get layers() { return [...visible]; },
    get system() { return system; },
    get key() { return `${[...visible].join(',')}/${selection() ? tag(selected) : ''}`; },
  };
}
