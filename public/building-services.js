function service(pt, en, color, media, kinds) {
  return {
    pt, en, color,
    media: Object.fromEntries(media.map(([id, titlePt, titleEn, hue]) => [id, { pt: titlePt, en: titleEn, color: hue }])),
    kinds: Object.fromEntries(kinds.map(([id, titlePt, titleEn, symbol, channels]) => [id, {
      pt: titlePt, en: titleEn, symbol, media: channels,
    }])),
  };
}

export const serviceSystems = Object.freeze({
  electrical: service('Eletricidade', 'Electrical', '#a76914', [
    ['lighting', 'Iluminação', 'Lighting', '#bd7b0a'],
    ['power', 'Tomadas', 'Outlets', '#951663'],
    ['control', 'Comando', 'Switch control', '#81551d'],
    ['dedicated', 'Circuito dedicado', 'Dedicated circuit', '#cb4439'],
  ], [
    ['panel', 'Quadro elétrico', 'Distribution board', 'QE'],
    ['junction', 'Caixa de derivação', 'Junction box', 'JD'],
    ['light', 'Ponto de luz', 'Light point', 'L', ['lighting', 'control']],
    ['switch', 'Interruptor', 'Switch', 'I', ['lighting', 'control']],
    ['outlet', 'Tomada', 'Outlet', 'T', ['power']],
    ['dedicatedOutlet', 'Tomada dedicada', 'Dedicated outlet', 'TD', ['dedicated']],
  ]),
  plumbing: service('Águas e esgotos', 'Plumbing and drainage', '#16749d', [
    ['cold', 'Água fria', 'Cold water', '#1469c2'],
    ['hot', 'Água quente', 'Hot water', '#c8453a'],
    ['drain', 'Esgotos', 'Wastewater', '#76543e'],
  ], [
    ['coldManifold', 'Coletor de água fria', 'Cold-water manifold', 'AF', ['cold']],
    ['hotManifold', 'Coletor de água quente', 'Hot-water manifold', 'AQ', ['hot']],
    ['drainStack', 'Prumada de esgotos', 'Drain stack', 'ES', ['drain']],
    ['waterHeater', 'Equipamento de água quente', 'Water heater', 'AQS', ['cold', 'hot']],
    ['junction', 'Derivação', 'Junction', 'J'],
    ['sink', 'Lava-loiça', 'Kitchen sink', 'LL'],
    ['basin', 'Lavatório ou bidé', 'Washbasin or bidet', 'LV'],
    ['shower', 'Duche', 'Shower', 'D'],
    ['bath', 'Banheira', 'Bath', 'B'],
    ['toilet', 'Sanita', 'Toilet', 'S', ['cold', 'drain']],
    ['washer', 'Máquina de lavar roupa', 'Washing machine', 'MLR', ['cold', 'drain']],
    ['dishwasher', 'Máquina de lavar loiça', 'Dishwasher', 'MLL', ['cold', 'drain']],
    ['tap', 'Torneira', 'Tap', 'T', ['cold', 'hot']],
  ]),
  vmc: service('VMC', 'Mechanical ventilation', '#177f76', [
    ['supply', 'Insuflação', 'Supply air', '#078477'],
    ['extract', 'Extração', 'Extract air', '#7d489d'],
    ['intake', 'Admissão exterior', 'Outdoor air intake', '#367e46'],
    ['exhaust', 'Rejeição para o exterior', 'Outdoor exhaust', '#bd5962'],
  ], [
    ['unit', 'Unidade VMC', 'Ventilation unit', 'VMC'],
    ['ductJunction', 'Derivação de conduta', 'Duct junction', 'J'],
    ['supplyVent', 'Boca de insuflação', 'Supply vent', 'IN', ['supply']],
    ['extractVent', 'Boca de extração', 'Extract vent', 'EX', ['extract']],
    ['outsideAir', 'Tomada de ar exterior', 'Outdoor air intake', 'AE', ['intake']],
    ['exhaustOutlet', 'Saída de ar para o exterior', 'Outdoor exhaust', 'SE', ['exhaust']],
  ]),
  airConditioning: service('Ar condicionado', 'Air conditioning', '#3e6992', [
    ['refrigerant', 'Linhas frigoríficas', 'Refrigerant lines', '#355bbb'],
    ['condensate', 'Condensados', 'Condensate drainage', '#237f94'],
  ], [
    ['outdoorUnit', 'Unidade exterior', 'Outdoor unit', 'UE', ['refrigerant']],
    ['indoorUnit', 'Unidade interior', 'Indoor unit', 'UI', ['refrigerant', 'condensate']],
    ['junction', 'Derivação', 'Junction', 'J'],
    ['condensateDrain', 'Destino dos condensados', 'Condensate drain point', 'DC', ['condensate']],
  ]),
  radiantFloor: service('Piso radiante', 'Radiant floor', '#bf5424', [
    ['supply', 'Ida ao circuito', 'Loop supply', '#cc4534'],
    ['return', 'Retorno do circuito', 'Loop return', '#3d72a7'],
    ['loop', 'Circuito no pavimento', 'Floor loop', '#d4751d'],
  ], [
    ['manifold', 'Coletor de piso radiante', 'Radiant floor manifold', 'CP', ['supply', 'return']],
    ['zone', 'Extremo do circuito', 'Loop end', 'Z'],
    ['junction', 'Derivação', 'Junction', 'J'],
  ]),
});

export const serviceLimits = Object.freeze({
  coordinate: 600, label: 95, nodes: 300, runs: 500, points: 80, operations: 100,
});

const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,90}$/.test(value);
const record = (value) => value && typeof value === 'object' && !Array.isArray(value);
const validPoint = (value) => [value?.x, value?.y].every((number) => Number.isFinite(number) && Math.abs(number) <= serviceLimits.coordinate);
const metres = (number) => Number(number.toFixed(3));
const position = ({ x, y }) => ({ x: metres(x), y: metres(y) });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const text = (value) => typeof value === 'string' ? value.trim().slice(0, serviceLimits.label) : '';
const emptyNetwork = () => ({ nodes: [], runs: [] });

function checkSystem(systemId) {
  if (!Object.hasOwn(serviceSystems, systemId)) throw new Error('Unknown building service system.');
  return serviceSystems[systemId];
}

function tidyNode(input, system) {
  if (!record(input) || !validId(input.id) || !Object.hasOwn(system.kinds, input.kind) || !validPoint(input)) return null;
  const label = text(input.label);
  return { id: input.id, kind: input.kind, ...position(input),
    ...(label ? { label } : {}), ...(validId(input.roomId) ? { roomId: input.roomId } : {}),
  };
}

function allows(node, medium, system) {
  const usable = system.kinds[node.kind].media;
  return !usable || usable.includes(medium);
}

function tidyRun(input, system, nodes) {
  if (!record(input) || !validId(input.id) || !Object.hasOwn(system.media, input.medium) ||
    input.from === input.to || !nodes.has(input.from) || !nodes.has(input.to) ||
    !allows(nodes.get(input.from), input.medium, system) || !allows(nodes.get(input.to), input.medium, system) ||
    (input.points !== undefined && (!Array.isArray(input.points) || input.points.length > serviceLimits.points || !input.points.every(validPoint)))) return null;
  const label = text(input.label);
  return { id: input.id, medium: input.medium, from: input.from, to: input.to, points: (input.points ?? []).map(position),
    ...(label ? { label } : {}),
  };
}

function normalizeNetwork(input, system) {
  const nodes = new Map();
  const runs = new Map();
  for (const value of (Array.isArray(input?.nodes) ? input.nodes.slice(0, serviceLimits.nodes) : [])) {
    const node = tidyNode(value, system);
    if (node && !nodes.has(node.id)) nodes.set(node.id, node);
  }
  for (const value of (Array.isArray(input?.runs) ? input.runs.slice(0, serviceLimits.runs) : [])) {
    const run = tidyRun(value, system, nodes);
    if (run && !nodes.has(run.id) && !runs.has(run.id)) runs.set(run.id, run);
  }
  return { nodes: [...nodes.values()], runs: [...runs.values()] };
}

export function normalizeBuildingServices(input) {
  if (!record(input)) return {};
  return Object.fromEntries(Object.entries(serviceSystems)
    .filter(([id]) => Object.hasOwn(input, id) && record(input[id]))
    .map(([id, system]) => [id, normalizeNetwork(input[id], system)]));
}

export function serviceRunPoints(network, run) {
  const from = network.nodes.find(({ id }) => id === run.from);
  const to = network.nodes.find(({ id }) => id === run.to);
  return from && to ? [position(from), ...(run.points ?? []), position(to)] : [];
}

function orthogonal(from, to, offset = 0) {
  if (!offset && (from.x === to.x || from.y === to.y)) return [];
  const horizontal = Math.abs(from.x - to.x) >= Math.abs(from.y - to.y);
  if (horizontal) {
    const y = (from.y + to.y) / 2 + offset;
    return [{ x: from.x, y }, { x: to.x, y }];
  }
  const x = (from.x + to.x) / 2 + offset;
  return [{ x, y: from.y }, { x, y: to.y }];
}

function roomsOf(level) {
  const rooms = Array.isArray(level?.rooms) ? level.rooms : [];
  return rooms.filter((room) => validPoint(room) && room.type !== 'outdoor' &&
    Number.isFinite(room.w) && room.w > 0 && Number.isFinite(room.h) && room.h > 0);
}

const isWet = (room) => ['bath', 'kitchen'].includes(room.type);
const isHabitable = (room) => ['living', 'bedroom'].includes(room.type);
const at = (room, fx = .5, fy = .5) => ({ x: room.x + fx * room.w, y: room.y + fy * room.h });
const contains = (room, p, margin = 0) => p.x >= room.x - margin && p.x <= room.x + room.w + margin &&
  p.y >= room.y - margin && p.y <= room.y + room.h + margin;
const identify = (room, p) => ({ ...p, ...(validId(room?.id) ? { roomId: room.id } : {}) });

function entrance(level, room) {
  const door = level.items?.find((item) => ['door', 'doubleDoor'].includes(item.type) && validPoint(item) && contains(room, item, .13));
  if (!door) return at(room, .18, .23);
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;
  return { x: door.x + (cx - door.x) * .25, y: door.y + (cy - door.y) * .25 };
}

function roomNode(add, kind, room, fx, fy) {
  return add(kind, identify(room, at(room, fx, fy)));
}

function serviceBuilder() {
  const graph = emptyNetwork();
  const clamp = (value) => Math.max(-serviceLimits.coordinate, Math.min(serviceLimits.coordinate, value));
  const safe = (point) => position({ x: clamp(point.x), y: clamp(point.y) });
  return {
    network: graph,
    add(kind, p) {
      const node = { id: 'n' + (graph.nodes.length + 1), kind, ...safe(p), ...(p.roomId ? { roomId: p.roomId } : {}) };
      graph.nodes.push(node);
      return node;
    },
    link(medium, from, to, points = orthogonal(from, to)) {
      graph.runs.push({ id: 'r' + (graph.runs.length + 1), medium, from: from.id, to: to.id, points: points.map(safe) });
    },
  };
}

function electrical(level, rooms, { add, link }) {
  const entry = rooms.find(({ type }) => type === 'circulation') ?? rooms[0];
  const panel = roomNode(add, 'panel', entry, .18, .15);
  const kitchenAppliances = new Set(['cooktop', 'oven', 'rangeCooker', 'dishwasher', 'integratedDishwasher', 'ovenCabinet']);
  for (const room of rooms) {
    const light = roomNode(add, 'light', room, .5, .5);
    const control = add('switch', identify(room, entrance(level, room)));
    link('lighting', panel, light);
    link('control', control, light);
    if (room.type === 'bath') continue;
    const locations = room.type === 'circulation' ? [[.80, .22]] : [[.18, .80], [.82, .20]];
    if (room.w * room.h >= 21) locations.push([.80, .82]);
    for (const [fx, fy] of locations) {
      const outlet = roomNode(add, 'outlet', room, fx, fy);
      link('power', panel, outlet, orthogonal(panel, outlet, .09));
    }
    if (room.type === 'kitchen') {
      const appliances = (level.items ?? []).filter((item) => kitchenAppliances.has(item.type) && validPoint(item) && contains(room, item)).slice(0, 4);
      for (const p of appliances.length ? appliances : [at(room, .84, .77)]) {
        const outlet = add('dedicatedOutlet', identify(room, p));
        link('dedicated', panel, outlet, orthogonal(panel, outlet, -.11));
      }
    }
  }
}

const plumbingKinds = {
  kitchen: 'sink', kitchenWallRun: 'sink', sink: 'sink', utilitySink: 'sink',
  basin: 'basin', bidet: 'basin', compactBasin: 'basin', pedestalBasin: 'basin', wallBidet: 'basin',
  vanity: 'basin', doubleVanity: 'basin', washstand: 'basin',
  shower: 'shower', walkInShower: 'shower', quadrantShower: 'shower',
  bath: 'bath', cornerBath: 'bath', freestandingBath: 'bath',
  toilet: 'toilet', wallToilet: 'toilet', urinal: 'toilet',
  washingMachine: 'washer', topLoadWasher: 'washer', laundryTower: 'washer',
  dishwasher: 'dishwasher', integratedDishwasher: 'dishwasher',
};

function plumbingFixtures(level, rooms) {
  const placed = new Map(rooms.map((room) => [room, []]));
  for (const item of level.items ?? []) {
    if (!Object.hasOwn(plumbingKinds, item.type) || !validPoint(item)) continue;
    const room = rooms.find((candidate) => contains(candidate, item));
    if (room) placed.get(room).push({ kind: plumbingKinds[item.type], p: identify(room, item) });
  }
  for (const [room, fixtures] of placed) {
    const propose = (kind, x, y, alternatives = [kind]) => {
      if (!fixtures.some((fixture) => alternatives.includes(fixture.kind))) {
        fixtures.push({ kind, p: identify(room, at(room, x, y)) });
      }
    };
    if (room.type === 'kitchen') propose('sink', .77, .74);
    if (room.type === 'bath') {
      propose('basin', .73, .24);
      propose('toilet', .79, .67);
      propose('shower', .30, .72, ['shower', 'bath']);
    }
  }
  return [...placed.values()].flat();
}

function plumbing(level, rooms, { add, link }) {
  const fixtures = plumbingFixtures(level, rooms);
  if (!fixtures.length) return;
  const utility = rooms.find(isWet) ?? rooms[0];
  const heaterLocation = (level.items ?? []).find((item) => ['hotWaterCylinder', 'gasBoiler'].includes(item.type) && validPoint(item) && rooms.some((room) => contains(room, item)));
  const cold = roomNode(add, 'coldManifold', utility, .18, .23);
  const hot = roomNode(add, 'hotManifold', utility, .33, .23);
  const stack = roomNode(add, 'drainStack', utility, .18, .80);
  const heater = heaterLocation ? add('waterHeater', identify(rooms.find((room) => contains(room, heaterLocation)), heaterLocation))
    : roomNode(add, 'waterHeater', utility, .30, .43);
  link('cold', cold, heater);
  link('hot', heater, hot);
  for (const { kind, p } of fixtures) {
    const fixture = add(kind, p);
    link('cold', cold, fixture, orthogonal(cold, fixture, -.07));
    if (!['toilet', 'washer', 'dishwasher'].includes(kind)) link('hot', hot, fixture, orthogonal(hot, fixture, .07));
    link('drain', fixture, stack, orthogonal(fixture, stack, .15));
  }
}

function bounds(rooms) {
  return {
    left: Math.min(...rooms.map((room) => room.x)), top: Math.min(...rooms.map((room) => room.y)),
    right: Math.max(...rooms.map((room) => room.x + room.w)), bottom: Math.max(...rooms.map((room) => room.y + room.h)),
  };
}

function vmc(_level, rooms, { add, link }) {
  if (!rooms.some((room) => isWet(room) || isHabitable(room))) return;
  const utility = rooms.find(({ type }) => type === 'circulation') ?? rooms[0];
  const box = bounds(rooms);
  const unit = roomNode(add, 'unit', utility, .31, .38);
  const intake = add('outsideAir', { x: box.left - .40, y: box.top + (box.bottom - box.top) * .25 });
  const exhaust = add('exhaustOutlet', { x: box.left - .40, y: box.top + (box.bottom - box.top) * .75 });
  link('intake', intake, unit, orthogonal(intake, unit, -.12));
  link('exhaust', unit, exhaust, orthogonal(unit, exhaust, .12));
  for (const room of rooms) {
    if (isHabitable(room)) link('supply', unit, roomNode(add, 'supplyVent', room, .67, .61));
    if (isWet(room)) link('extract', roomNode(add, 'extractVent', room, .62, .65), unit, orthogonal(at(room, .62, .65), unit, .12));
  }
}

function airConditioning(level, rooms, { add, link }) {
  const occupied = rooms.filter(isHabitable);
  if (!occupied.length) return;
  const home = bounds(rooms);
  const outdoor = add('outdoorUnit', { x: home.right + .42, y: home.top + (home.bottom - home.top) * .24 });
  const drain = add('condensateDrain', { x: home.right + .42, y: home.top + (home.bottom - home.top) * .62 });
  for (const room of occupied) {
    const equipment = (level.items ?? []).find((item) => item.type === 'acUnit' && validPoint(item) && contains(room, item));
    const indoor = equipment ? add('indoorUnit', identify(room, equipment)) : roomNode(add, 'indoorUnit', room, .84, .23);
    link('refrigerant', outdoor, indoor, orthogonal(outdoor, indoor, -.12));
    link('condensate', indoor, drain, orthogonal(indoor, drain, .14));
  }
}

const canHeat = (room) => (isHabitable(room) || isWet(room)) && room.w >= 1.2 && room.h >= 1.2;

function radiantFloor(_level, rooms, { add, link }) {
  const heated = rooms.filter(canHeat);
  if (!heated.length) return;
  const passage = rooms.find(({ type }) => type === 'circulation') ?? heated[0];
  const manifold = roomNode(add, 'manifold', passage, .15, .20);
  for (const room of heated) {
    const xCount = room.w >= 6 ? 2 : 1;
    const yCount = room.h >= 6 ? 2 : 1;
    for (let ix = 0; ix < xCount; ix++) {
      for (let iy = 0; iy < yCount; iy++) {
        const w = room.w / xCount, h = room.h / yCount;
        const x = room.x + w * ix;
        const y = room.y + h * iy;
        const margin = .23;
        const rowCount = Math.max(4, Math.min(12, Math.ceil((h - margin * 2) / .48)));
        const path = [];
        for (let row = 0; row < rowCount; row++) {
          const a = { x: x + margin, y: y + margin + row * (h - margin * 2) / (rowCount - 1) };
          const b = { x: x + w - margin, y: a.y };
          path.push(...(row % 2 ? [b, a] : [a, b]));
        }
        const start = add('zone', identify(room, path[0]));
        const end = add('zone', identify(room, path.at(-1)));
        link('supply', manifold, start, orthogonal(manifold, start, -.06));
        link('loop', start, end, path.slice(1, -1));
        link('return', end, manifold, orthogonal(end, manifold, .06));
      }
    }
  }
}

const generators = { electrical, plumbing, vmc, airConditioning, radiantFloor };

export function generateServices(level, systemId) {
  const system = checkSystem(systemId);
  const rooms = roomsOf(level);
  const build = serviceBuilder();
  if (rooms.length) generators[systemId](level, rooms, build);
  if (build.network.nodes.length > serviceLimits.nodes || build.network.runs.length > serviceLimits.runs) {
    throw new Error('This installation proposal is too large. Generate on a smaller storey or draw part of the network manually.');
  }
  return normalizeNetwork(build.network, system);
}

function suppliedId(input, prefix, nodes, runs) {
  if (input !== undefined) {
    if (!validId(input) || nodes.has(input) || runs.has(input)) throw new Error('Invalid or duplicate installation element ID.');
    return input;
  }
  let index = 1;
  while (nodes.has(prefix + index) || runs.has(prefix + index)) index++;
  return prefix + index;
}

export function applyServiceOperations(level, systemId, operations) {
  const system = checkSystem(systemId);
  if (!Array.isArray(operations) || operations.length < 1 || operations.length > serviceLimits.operations) throw new Error('Invalid installation operations.');
  const network = normalizeNetwork(level?.services?.[systemId], system);
  const nodes = new Map(network.nodes.map((node) => [node.id, node]));
  const runs = new Map(network.runs.map((run) => [run.id, run]));
  for (const edit of operations) {
    switch (edit?.op) {
      case 'add_node': {
        if (nodes.size >= serviceLimits.nodes || !record(edit.node)) throw new Error('Invalid installation node.');
        const id = suppliedId(edit.node.id, 'n', nodes, runs);
        const node = tidyNode({ ...edit.node, id }, system);
        if (!node) throw new Error('Invalid installation node.');
        nodes.set(id, node);
        break;
      }
      case 'update_node': {
        if (!nodes.has(edit.id) || !record(edit.node)) throw new Error('Unknown installation node.');
        const node = tidyNode({ ...nodes.get(edit.id), ...edit.node, id: edit.id }, system);
        if (!node) throw new Error('Invalid installation node.');
        if ([...runs.values()].some((run) => (run.from === node.id || run.to === node.id) && !allows(node, run.medium, system))) {
          throw new Error('The node type is incompatible with one or more connected runs.');
        }
        nodes.set(edit.id, node);
        break;
      }
      case 'delete_node':
        if (!nodes.delete(edit.id)) throw new Error('Unknown installation node.');
        for (const [id, run] of runs) if (run.from === edit.id || run.to === edit.id) runs.delete(id);
        break;
      case 'add_run': {
        if (runs.size >= serviceLimits.runs || !record(edit.run)) throw new Error('Invalid installation run.');
        const id = suppliedId(edit.run.id, 'r', nodes, runs);
        const run = tidyRun({ ...edit.run, id }, system, nodes);
        if (!run) throw new Error('Invalid installation run or incompatible endpoint.');
        runs.set(id, run);
        break;
      }
      case 'update_run': {
        if (!runs.has(edit.id) || !record(edit.run)) throw new Error('Unknown installation run.');
        const run = tidyRun({ ...runs.get(edit.id), ...edit.run, id: edit.id }, system, nodes);
        if (!run) throw new Error('Invalid installation run or incompatible endpoint.');
        runs.set(edit.id, run);
        break;
      }
      case 'delete_run':
        if (!runs.delete(edit.id)) throw new Error('Unknown installation run.');
        break;
      case 'clear':
        nodes.clear();
        runs.clear();
        break;
      case 'generate': {
        if (edit.replace !== true && (nodes.size || runs.size)) throw new Error('An installation already exists. Confirm replacement to generate again.');
        const fresh = generateServices(level, systemId);
        // If the current layout has no eligible rooms, retain the existing drawing.
        if (!fresh.nodes.length) break;
        nodes.clear();
        runs.clear();
        fresh.nodes.forEach((node) => nodes.set(node.id, node));
        fresh.runs.forEach((run) => runs.set(run.id, run));
        break;
      }
      default:
        throw new Error('Unknown installation operation.');
    }
  }
  return { nodes: [...nodes.values()], runs: [...runs.values()] };
}

function warning(code, pt, en, context) {
  return { code, pt, en, ...context };
}

const missingEquipment = {
  electrical: ['panel', 'Falta um quadro elétrico no traçado.', 'The layout has no distribution board.'],
  plumbing: ['coldManifold', 'Falta um coletor de água fria no traçado.', 'The layout has no cold-water manifold.'],
  vmc: ['unit', 'Falta uma unidade VMC no traçado.', 'The layout has no mechanical ventilation unit.'],
  airConditioning: ['outdoorUnit', 'Falta uma unidade exterior no traçado.', 'The layout has no outdoor unit.'],
  radiantFloor: ['manifold', 'Falta um coletor de piso radiante no traçado.', 'The layout has no radiant floor manifold.'],
};

export function inspectServices(level, systemId) {
  const system = checkSystem(systemId);
  const network = normalizeNetwork(level?.services?.[systemId], system);
  const nodes = new Map(network.nodes.map((node) => [node.id, node]));
  const roomMap = new Map((level?.rooms ?? []).map((room) => [room.id, room]));
  const lengths = Object.fromEntries(Object.keys(system.media).map((medium) => [medium, 0]));
  const attached = new Set();
  const warnings = [];
  for (const run of network.runs) {
    const route = [nodes.get(run.from), ...run.points, nodes.get(run.to)];
    let length = 0;
    for (let i = 1; i < route.length; i++) length += distance(route[i - 1], route[i]);
    lengths[run.medium] += length;
    attached.add(run.from);
    attached.add(run.to);
    if (length < .001) warnings.push(warning('zero_length', 'Um traçado tem comprimento nulo.', 'A run has zero length.', { runId: run.id }));
  }
  if (!network.nodes.length) {
    warnings.push(roomsOf(level).length
      ? warning('empty_network', 'Ainda não há elementos desta instalação no piso.', 'This installation has no elements on the storey yet.')
      : warning('no_rooms', 'Desenhe divisões neste piso para gerar uma proposta.', 'Draw rooms on this storey to generate a layout.'));
  } else {
    const [required, pt, en] = missingEquipment[systemId];
    if (!network.nodes.some(({ kind }) => kind === required)) warnings.push(warning('missing_equipment', pt, en));
    if (systemId === 'vmc' && !lengths.supply) warnings.push(warning('no_supply', 'O traçado ainda não inclui insuflação.', 'The layout does not include supply air yet.'));
    if (systemId === 'vmc' && !lengths.extract) warnings.push(warning('no_extract', 'O traçado ainda não inclui extração.', 'The layout does not include extract air yet.'));
  }
  for (const node of network.nodes) {
    const room = roomMap.get(node.roomId);
    if (!attached.has(node.id)) warnings.push(warning('unconnected', 'Ponto sem traçado ligado.', 'Point without a connected run.', { nodeId: node.id }));
    if (node.roomId && !room) warnings.push(warning('missing_room', 'A divisão associada a este ponto já não existe.', 'The room associated with this point no longer exists.', { nodeId: node.id }));
    if (room && !contains(room, node, .09)) warnings.push(warning('outside_room', 'O ponto está fora da divisão associada.', 'The point is outside its associated room.', { nodeId: node.id }));
  }
  return { ...network, lengths: Object.fromEntries(Object.entries(lengths).map(([key, length]) => [key, metres(length)])), warnings: warnings.slice(0, 100) };
}
