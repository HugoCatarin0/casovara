import { elements } from './object-catalog.js';

function service(pt, en, color, media, kinds) {
  return {
    pt, en, color,
    media: Object.fromEntries(media.map(([id, titlePt, titleEn, hue]) => [id, { pt: titlePt, en: titleEn, color: hue }])),
    kinds: Object.fromEntries(kinds.map(([id, titlePt, titleEn, symbol, defaultMount, channels]) => [id, {
      pt: titlePt, en: titleEn, symbol, defaultMount, media: channels,
    }])),
  };
}

export const serviceSystems = Object.freeze({
  electrical: service('Eletricidade', 'Electrical', '#a76914', [
    ['serviceFeed', 'Alimentação principal', 'Main service feed', '#765da6'],
    ['lighting', 'Iluminação', 'Lighting', '#bd7b0a'],
    ['power', 'Tomadas', 'Outlets', '#951663'],
    ['control', 'Comando', 'Switch control', '#81551d'],
    ['dedicated', 'Circuito dedicado', 'Dedicated circuit', '#cb4439'],
  ], [
    ['supplyEntry', 'Entrada de energia', 'Electrical service entry', 'E', 'wall', ['serviceFeed']],
    ['panel', 'Quadro elétrico', 'Distribution board', 'QE', 'wall'],
    ['junction', 'Caixa de derivação', 'Junction box', 'JD', 'wall', ['lighting', 'power', 'control', 'dedicated']],
    ['light', 'Ponto de luz', 'Light point', 'L', 'ceiling', ['lighting', 'control']],
    ['switch', 'Interruptor', 'Switch', 'I', 'wall', ['lighting', 'control']],
    ['outlet', 'Tomada', 'Outlet', 'T', 'wall', ['power']],
    ['dedicatedOutlet', 'Tomada dedicada', 'Dedicated outlet', 'TD', 'wall', ['dedicated']],
  ]),
  plumbing: service('Águas e esgotos', 'Plumbing and drainage', '#16749d', [
    ['cold', 'Água fria', 'Cold water', '#1469c2'],
    ['hot', 'Água quente', 'Hot water', '#c8453a'],
    ['drain', 'Esgotos', 'Wastewater', '#76543e'],
  ], [
    ['waterEntry', 'Entrada de água', 'Water service entry', 'EA', 'wall', ['cold']],
    ['sewerOutlet', 'Saída para esgotos', 'Sewer outlet', 'SE', 'floor', ['drain']],
    ['coldManifold', 'Coletor de água fria', 'Cold-water manifold', 'AF', 'wall', ['cold']],
    ['hotManifold', 'Coletor de água quente', 'Hot-water manifold', 'AQ', 'wall', ['hot']],
    ['drainStack', 'Prumada de esgotos', 'Drain stack', 'ES', 'wall', ['drain']],
    ['waterHeater', 'Equipamento de água quente', 'Water heater', 'AQS', 'wall', ['cold', 'hot']],
    ['junction', 'Derivação', 'Junction', 'J', 'free'],
    ['sink', 'Lava-loiça', 'Kitchen sink', 'LL', 'wall'],
    ['basin', 'Lavatório ou bidé', 'Washbasin or bidet', 'LV', 'wall'],
    ['shower', 'Duche', 'Shower', 'D', 'floor'],
    ['bath', 'Banheira', 'Bath', 'B', 'floor'],
    ['toilet', 'Sanita', 'Toilet', 'S', 'floor', ['cold', 'drain']],
    ['washer', 'Máquina de lavar roupa', 'Washing machine', 'MLR', 'wall', ['cold', 'drain']],
    ['dishwasher', 'Máquina de lavar loiça', 'Dishwasher', 'MLL', 'wall', ['cold', 'drain']],
    ['tap', 'Torneira', 'Tap', 'T', 'wall', ['cold', 'hot']],
  ]),
  vmc: service('VMC', 'Mechanical ventilation', '#177f76', [
    ['supply', 'Insuflação', 'Supply air', '#078477'],
    ['extract', 'Extração', 'Extract air', '#7d489d'],
    ['intake', 'Admissão exterior', 'Outdoor air intake', '#367e46'],
    ['exhaust', 'Rejeição para o exterior', 'Outdoor exhaust', '#bd5962'],
  ], [
    ['unit', 'Unidade VMC', 'Ventilation unit', 'VMC', 'ceiling'],
    ['ductJunction', 'Derivação de conduta', 'Duct junction', 'J', 'ceiling'],
    ['supplyVent', 'Boca de insuflação', 'Supply vent', 'IN', 'ceiling', ['supply']],
    ['extractVent', 'Boca de extração', 'Extract vent', 'EX', 'ceiling', ['extract']],
    ['outsideAir', 'Tomada de ar exterior', 'Outdoor air intake', 'AE', 'wall', ['intake']],
    ['exhaustOutlet', 'Saída de ar para o exterior', 'Outdoor exhaust', 'SE', 'wall', ['exhaust']],
  ]),
  airConditioning: service('Ar condicionado', 'Air conditioning', '#3e6992', [
    ['refrigerant', 'Linhas frigoríficas', 'Refrigerant lines', '#355bbb'],
    ['condensate', 'Condensados', 'Condensate drainage', '#237f94'],
  ], [
    ['outdoorUnit', 'Unidade exterior', 'Outdoor unit', 'UE', 'floor', ['refrigerant']],
    ['indoorUnit', 'Unidade interior', 'Indoor unit', 'UI', 'wall', ['refrigerant', 'condensate']],
    ['junction', 'Derivação', 'Junction', 'J', 'free'],
    ['condensateDrain', 'Destino dos condensados', 'Condensate drain point', 'DC', 'floor', ['condensate']],
  ]),
  radiantFloor: service('Piso radiante', 'Radiant floor', '#bf5424', [
    ['supply', 'Ida ao circuito', 'Loop supply', '#cc4534'],
    ['return', 'Retorno do circuito', 'Loop return', '#3d72a7'],
    ['loop', 'Circuito no pavimento', 'Floor loop', '#d4751d'],
  ], [
    ['manifold', 'Coletor de piso radiante', 'Radiant floor manifold', 'CP', 'wall', ['supply', 'return']],
    ['zone', 'Extremo do circuito', 'Loop end', 'Z', 'floor'],
    ['junction', 'Derivação', 'Junction', 'J', 'floor'],
  ]),
});

export const serviceMounts = Object.freeze(['wall', 'floor', 'ceiling', 'free']);
export const servicePhases = Object.freeze(['single', 'three']);
export const serviceLimits = Object.freeze({
  coordinate: 600, label: 95, count: 99, nodes: 300, runs: 500, points: 80, operations: 100,
});

const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,90}$/.test(value);
const record = (value) => value && typeof value === 'object' && !Array.isArray(value);
const validPoint = (value) => [value?.x, value?.y].every((number) => Number.isFinite(number) && Math.abs(number) <= serviceLimits.coordinate);
const metres = (number) => Number(number.toFixed(3));
const position = ({ x, y }) => ({ x: metres(x), y: metres(y) });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const text = (value) => typeof value === 'string' ? value.trim().slice(0, serviceLimits.label) : '';
const emptyNetwork = () => ({ nodes: [], runs: [] });
const listOf = (value) => Array.isArray(value) ? value : [];
const outletKind = (kind) => kind === 'outlet' || kind === 'dedicatedOutlet';
const validCount = (count) => Number.isInteger(count) && count >= 1 && count <= serviceLimits.count;
const validWallSide = (side) => side === -1 || side === 1;
const validAnchor = (wall) => validId(wall?.wallId) && Number.isFinite(wall.fraction) &&
  wall.fraction >= 0 && wall.fraction <= 1 && validWallSide(wall.side);
const fractional = (fraction) => Number(fraction.toFixed(6));
const exteriorKinds = new Set(['supplyEntry', 'waterEntry', 'outsideAir', 'exhaustOutlet']);

function checkSystem(systemId) {
  if (!Object.hasOwn(serviceSystems, systemId)) throw new Error('Unknown building service system.');
  return serviceSystems[systemId];
}

export function serviceNodeSymbol(systemId, node) {
  const symbol = serviceSystems[systemId]?.kinds?.[node?.kind]?.symbol ?? '';
  if (node?.kind === 'supplyEntry') return `${symbol} ${node.phase === 'three' ? '3' : '1'}~`;
  return outletKind(node?.kind) && node.count > 1 ? `${symbol} ${node.count}×` : symbol;
}

function tidyNode(input, system, level) {
  if (!record(input)) return null;
  input = resolveServiceNode(level, input);
  if (!validId(input.id) || !Object.hasOwn(system.kinds, input.kind) || !validPoint(input)) return null;
  const label = text(input.label);
  const wall = validAnchor(input.wall) ? input.wall : null;
  const mount = input.mount === 'wall' && !wall ? 'free' : input.mount;
  return { id: input.id, kind: input.kind, ...position(input),
    ...(label ? { label } : {}), ...(validId(input.roomId) ? { roomId: input.roomId } : {}),
    ...(serviceMounts.includes(mount) ? { mount } : {}),
    ...(mount === 'wall' && wall ? { wall: { wallId: wall.wallId, fraction: fractional(wall.fraction), side: wall.side } } : {}),
    ...(outletKind(input.kind) ? { count: validCount(input.count) ? input.count : 1 } : {}),
    ...(input.kind === 'supplyEntry' ? { phase: servicePhases.includes(input.phase) ? input.phase : 'single' } : {}),
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
  if (input.medium === 'serviceFeed' && nodes.get(input.from).kind === nodes.get(input.to).kind) return null;
  const label = text(input.label);
  return { id: input.id, medium: input.medium, from: input.from, to: input.to, points: (input.points ?? []).map(position),
    ...(label ? { label } : {}),
  };
}

function normalizeNetwork(input, system, level) {
  const nodes = new Map();
  const runs = new Map();
  for (const value of (Array.isArray(input?.nodes) ? input.nodes.slice(0, serviceLimits.nodes) : [])) {
    const node = tidyNode(value, system, level);
    if (node && !nodes.has(node.id)) nodes.set(node.id, node);
  }
  for (const value of (Array.isArray(input?.runs) ? input.runs.slice(0, serviceLimits.runs) : [])) {
    const run = tidyRun(value, system, nodes);
    if (run && !nodes.has(run.id) && !runs.has(run.id)) runs.set(run.id, run);
  }
  return { nodes: [...nodes.values()], runs: [...runs.values()] };
}

export function normalizeBuildingServices(input, level) {
  if (!record(input)) return {};
  return Object.fromEntries(Object.entries(serviceSystems)
    .filter(([id]) => Object.hasOwn(input, id) && record(input[id]))
    .map(([id, system]) => [id, normalizeNetwork(input[id], system, level)]));
}

export function serviceRunPoints(network, run, level) {
  const from = network.nodes.find(({ id }) => id === run.from);
  const to = network.nodes.find(({ id }) => id === run.to);
  return from && to ? [position(resolveServiceNode(level, from)), ...(run.points ?? []), position(resolveServiceNode(level, to))] : [];
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
  return listOf(level?.rooms).filter((room) => validPoint(room) && room.type !== 'outdoor' &&
    Number.isFinite(room.w) && room.w > 0 && Number.isFinite(room.h) && room.h > 0);
}

const within = (value, min, max) => Math.max(min, Math.min(max, value));
const isWet = (room) => ['bath', 'kitchen'].includes(room.type);
const isHabitable = (room) => ['living', 'bedroom'].includes(room.type);
const at = (room, fx = .5, fy = .5) => ({ x: room.x + fx * room.w, y: room.y + fy * room.h });
const contains = (room, p, margin = 0) => p.x >= room.x - margin && p.x <= room.x + room.w + margin &&
  p.y >= room.y - margin && p.y <= room.y + room.h + margin;
const identify = (room, p) => ({ ...p, ...(validId(room?.id) ? { roomId: room.id } : {}) });

function wallGeometry(wall) {
  const dx = wall?.x2 - wall?.x1;
  const dy = wall?.y2 - wall?.y1;
  const length = Math.hypot(dx, dy);
  if (!validId(wall?.id) || !Number.isFinite(length) || length <= .01) return null;
  const radius = (Number.isFinite(wall.thickness) ? Math.max(0, wall.thickness) : .15) / 2 + .015;
  return { wall, dx, dy, length, nx: -dy / length, ny: dx / length, radius };
}

function facePoint(host, fraction, side) {
  const { wall, dx, dy, nx, ny, radius } = host;
  return { x: wall.x1 + dx * fraction + nx * radius * side, y: wall.y1 + dy * fraction + ny * radius * side };
}

function fractionAt({ wall, dx, dy, length }, point) {
  return ((point.x - wall.x1) * dx + (point.y - wall.y1) * dy) / length ** 2;
}

function faceRoom(rooms, point, preferredId) {
  const isInside = (room) => validId(room.id) && contains(room, point, .025);
  return rooms.find((room) => room.id === preferredId && isInside(room)) ?? rooms.find(isInside);
}

function wallPlacement(host, fraction, side, rooms, preferredRoomId) {
  const point = facePoint(host, fraction, side);
  return {
    ...position(point),
    mount: 'wall',
    wall: { wallId: host.wall.id, fraction: fractional(fraction), side },
    angle: metres(Math.atan2(host.ny * side, host.nx * side) * 180 / Math.PI),
    roomId: faceRoom(rooms, point, preferredRoomId)?.id,
  };
}

export function resolveServiceNode(level, node) {
  if (node?.mount !== 'wall' || !validAnchor(node.wall)) return node;
  const host = wallGeometry(listOf(level?.walls).find((wall) => wall?.id === node.wall.wallId));
  if (!host) return node;
  return { ...node, ...wallPlacement(host, node.wall.fraction, node.wall.side, roomsOf(level), node.roomId) };
}

function roomSpan(host, side, room) {
  const origin = facePoint(host, 0, side);
  let start = 0;
  let end = 1;
  for (const [value, delta, min, max] of [
    [origin.x, host.dx, room.x - .025, room.x + room.w + .025],
    [origin.y, host.dy, room.y - .025, room.y + room.h + .025],
  ]) {
    if (Math.abs(delta) < .00001) {
      if (value < min || value > max) return null;
      continue;
    }
    const a = (min - value) / delta;
    const b = (max - value) / delta;
    start = Math.max(start, Math.min(a, b));
    end = Math.min(end, Math.max(a, b));
  }
  return start <= end ? [start, end] : null;
}

function subtractRanges(ranges, blocked) {
  for (const [left, right] of blocked) {
    ranges = ranges.flatMap(([start, end]) => {
      if (start >= right || end <= left) return [[start, end]];
      const fragments = [];
      if (start < left) fragments.push([start, left]);
      if (end > right) fragments.push([right, end]);
      return fragments;
    });
  }
  return ranges;
}

function openingsByWall(level, hosts) {
  const all = new Map();
  for (const item of listOf(level?.items)) {
    const profile = elements[item?.type];
    if (!profile?.opening || !validPoint(item)) continue;
    const width = Number.isFinite(item.width) ? item.width : profile.width;
    let nearest = null;
    let shortest = .15;
    for (const host of hosts) {
      if (width > host.length) continue;
      const margin = width / (2 * host.length);
      const fraction = within(fractionAt(host, item), margin, 1 - margin);
      const point = { x: host.wall.x1 + host.dx * fraction, y: host.wall.y1 + host.dy * fraction };
      const gap = distance(item, point);
      if (gap < shortest) {
        shortest = gap;
        nearest = { host, fraction };
      }
    }
    if (!nearest) continue;
    const { host, fraction } = nearest;
    const clearance = (width / 2 + .12) / host.length;
    const list = all.get(host.wall.id) ?? [];
    list.push([fraction - clearance, fraction + clearance]);
    all.set(host.wall.id, list);
  }
  return all;
}

function prepareWallSnapping(level) {
  const hosts = listOf(level?.walls).map(wallGeometry).filter(Boolean);
  return { hosts, rooms: roomsOf(level), openings: openingsByWall(level, hosts) };
}

function snapToWall({ hosts, rooms, openings }, point, { roomId, threshold = .85, wallId, side, exterior, occupied = [] }) {
  if (!validPoint(point)) return null;
  const room = rooms.find((candidate) => candidate.id === roomId);
  let best = null;
  let shortest = threshold;
  for (const host of hosts) {
    if (wallId && wallId !== host.wall.id) continue;
    const dot = (point.x - host.wall.x1) * host.nx + (point.y - host.wall.y1) * host.ny;
    const sides = validWallSide(side) ? [side] : [dot < 0 ? -1 : 1, dot < 0 ? 1 : -1];
    const margin = Math.min(.25, Math.max(.12, host.radius) / host.length);
    const desired = fractionAt(host, point);
    for (const candidateSide of sides) {
      if (!room && !exterior && !validWallSide(side) && Math.abs(dot) > .025 && candidateSide !== sides[0]) continue;
      const span = room ? roomSpan(host, candidateSide, room) : [0, 1];
      if (!span) continue;
      const from = Math.max(margin, span[0]);
      const to = Math.min(1 - margin, span[1]);
      if (from > to) continue;
      const obstacles = [...(openings.get(host.wall.id) ?? [])];
      for (const { wall } of occupied) {
        if (wall?.wallId !== host.wall.id || wall.side !== candidateSide) continue;
        const clearance = .22 / host.length;
        obstacles.push([wall.fraction - clearance, wall.fraction + clearance]);
      }
      let ranges = [[from, to]];
      if (exterior) {
        const exteriorSpans = rooms.map((candidate) => roomSpan(host, -candidateSide, candidate)).filter(Boolean);
        ranges = exteriorSpans.map(([start, end]) => [Math.max(from, start), Math.min(to, end)])
          .filter(([start, end]) => start <= end);
        obstacles.push(...rooms.map((candidate) => roomSpan(host, candidateSide, candidate)).filter(Boolean));
      }
      for (const [start, end] of subtractRanges(ranges, obstacles)) {
        const inset = exterior ? Math.min((end - start) / 2, .002 / host.length) : 0;
        const fraction = within(desired, start + inset, end - inset);
        const candidate = wallPlacement(host, fraction, candidateSide, rooms, roomId);
        if (exterior && candidate.roomId) continue;
        const distanceToFace = distance(point, candidate);
        const preferIndoorOnTie = distanceToFace === shortest && Math.abs(dot) <= .025 && candidate.roomId && !best?.roomId;
        if (distanceToFace < shortest || preferIndoorOnTie) {
          best = candidate;
          shortest = distanceToFace;
        }
      }
    }
  }
  return best;
}

export function snapServiceNode(level, point, options = {}) {
  return snapToWall(prepareWallSnapping(level), point, options);
}

function entrance(level, room) {
  const door = level.items?.find((item) => ['door', 'doubleDoor'].includes(item.type) && validPoint(item) && contains(room, item, .13));
  if (!door) return at(room, .18, .23);
  return { x: door.x, y: door.y };
}

function roomNode(add, kind, room, fx, fy) {
  return add(kind, identify(room, at(room, fx, fy)));
}

function serviceBuilder(level, system) {
  const graph = emptyNetwork();
  const snapping = prepareWallSnapping(level);
  const clamp = (value) => Math.max(-serviceLimits.coordinate, Math.min(serviceLimits.coordinate, value));
  const safe = (point) => position({ x: clamp(point.x), y: clamp(point.y) });
  return {
    network: graph,
    add(kind, p, { count, phase, threshold = Infinity } = {}) {
      const defaultMount = system.kinds[kind].defaultMount;
      const anchor = defaultMount === 'wall' && snapToWall(snapping, p, {
        roomId: p.roomId, exterior: exteriorKinds.has(kind), threshold, occupied: graph.nodes,
      });
      const node = {
        id: 'n' + (graph.nodes.length + 1), kind, ...safe(p), roomId: p.roomId,
        mount: defaultMount === 'wall' ? 'free' : defaultMount, ...anchor, count, phase,
      };
      graph.nodes.push(node);
      return node;
    },
    link(medium, from, to, points = orthogonal(from, to)) {
      graph.runs.push({ id: 'r' + (graph.runs.length + 1), medium, from: from.id, to: to.id, points: points.map(safe) });
    },
  };
}

function electrical(level, rooms, { add, link }, { phase, includeEntry }) {
  const entry = rooms.find(({ type }) => type === 'circulation') ?? rooms[0];
  const panel = roomNode(add, 'panel', entry, .18, .15);
  if (includeEntry) {
    const supply = add('supplyEntry', outsideNear(rooms, panel), { phase });
    link('serviceFeed', supply, panel);
  }
  const kitchenAppliances = new Set(['cooktop', 'oven', 'rangeCooker', 'dishwasher', 'integratedDishwasher', 'ovenCabinet']);
  for (const room of rooms) {
    const light = roomNode(add, 'light', room, .5, .5);
    const control = add('switch', identify(room, entrance(level, room)));
    link('lighting', panel, light);
    link('control', control, light);
    if (room.type === 'bath') continue;
    const locations = room.type === 'circulation' ? [[.80, .22, 1]]
      : [[.18, .80, room.type === 'bedroom' ? 2 : 3], [.82, .20, 2]];
    if (room.w * room.h >= 21) locations.push([.80, .82, 2]);
    for (const [fx, fy, count] of locations) {
      const outlet = add('outlet', identify(room, at(room, fx, fy)), { count });
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
    if (room) placed.get(room).push({ kind: plumbingKinds[item.type], p: identify(room, item), fromItem: true });
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

function plumbing(level, rooms, { add, link }, { includeEntry }) {
  const fixtures = plumbingFixtures(level, rooms);
  if (!fixtures.length) return;
  const utility = rooms.find(isWet) ?? rooms[0];
  const heaterLocation = (level.items ?? []).find((item) => ['hotWaterCylinder', 'gasBoiler'].includes(item.type) && validPoint(item) && rooms.some((room) => contains(room, item)));
  const cold = roomNode(add, 'coldManifold', utility, .18, .23);
  const hot = roomNode(add, 'hotManifold', utility, .33, .23);
  const stack = roomNode(add, 'drainStack', utility, .18, .80);
  const heater = heaterLocation ? add('waterHeater', identify(rooms.find((room) => contains(room, heaterLocation)), heaterLocation))
    : roomNode(add, 'waterHeater', utility, .30, .43);
  if (includeEntry) {
    const inlet = add('waterEntry', outsideNear(rooms, at(utility, .16, .28)));
    const outlet = add('sewerOutlet', outsideNear(rooms, at(utility, .32, .85)));
    link('cold', inlet, cold);
    link('drain', stack, outlet);
  }
  link('cold', cold, heater);
  link('hot', heater, hot);
  for (const { kind, p, fromItem } of fixtures) {
    const fixture = add(kind, p, { threshold: fromItem ? .85 : Infinity });
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

function outsideNear(rooms, point) {
  const { left, top, right, bottom } = bounds(rooms);
  const edges = [{ x: left - .4, y: point.y }, { x: right + .4, y: point.y },
    { x: point.x, y: top - .4 }, { x: point.x, y: bottom + .4 }];
  return edges.reduce((nearest, edge) => distance(edge, point) < distance(nearest, point) ? edge : nearest);
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
    const indoor = equipment ? add('indoorUnit', identify(room, equipment), { threshold: .85 }) : roomNode(add, 'indoorUnit', room, .84, .23);
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

export function generateServices(level, systemId, { includeEntry = true, phase = 'single' } = {}) {
  const system = checkSystem(systemId);
  if (typeof includeEntry !== 'boolean' || !servicePhases.includes(phase)) throw new Error('Invalid installation generation options.');
  const rooms = roomsOf(level);
  const build = serviceBuilder(level, system);
  if (rooms.length) generators[systemId](level, rooms, build, { includeEntry, phase });
  if (build.network.nodes.length > serviceLimits.nodes || build.network.runs.length > serviceLimits.runs) {
    throw new Error('This installation proposal is too large. Generate on a smaller storey or draw part of the network manually.');
  }
  return normalizeNetwork(build.network, system, level);
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

function editServiceNode(level, system, edit, id, previous) {
  const input = { ...previous, ...edit, id };
  if (!Object.hasOwn(system.kinds, input.kind) ||
    (edit.mount !== undefined && !serviceMounts.includes(edit.mount)) ||
    (edit.wall != null && !validAnchor(edit.wall)) ||
    (edit.count !== undefined && (!outletKind(input.kind) || !validCount(edit.count))) ||
    (edit.phase !== undefined && (input.kind !== 'supplyEntry' || !servicePhases.includes(edit.phase)))) {
    throw new Error('Invalid installation node or mounting options.');
  }
  if (edit.wall) {
    if (edit.mount && edit.mount !== 'wall') throw new Error('Wall attachment requires wall mounting.');
    const anchor = resolveServiceNode(level, { ...input, mount: 'wall' });
    if (anchor.angle === undefined) throw new Error('The wall for this installation point does not exist.');
    const placement = snapServiceNode(level, anchor, {
      wallId: anchor.wall.wallId, side: anchor.wall.side, threshold: Infinity,
    });
    if (!placement) throw new Error('No clear mounting position on this wall. Choose another wall or mounting surface.');
    return tidyNode({ ...input, ...placement }, system);
  }
  const requested = input.mount ?? (!previous ? system.kinds[input.kind].defaultMount : undefined);
  const moved = edit.x !== undefined || edit.y !== undefined;
  if (requested === 'wall' && (!input.wall || moved)) {
    const placement = snapServiceNode(level, input, { roomId: edit.roomId });
    if (placement) return tidyNode({ ...input, ...placement }, system);
    if (edit.mount === 'wall' || previous?.mount === 'wall') {
      throw new Error('No clear mounting position nearby. Choose a wall or another mounting surface.');
    }
  }
  return tidyNode({ ...input, mount: requested === 'wall' && !input.wall ? 'free' : requested }, system, level);
}

export function applyServiceOperations(level, systemId, operations) {
  const system = checkSystem(systemId);
  if (!Array.isArray(operations) || operations.length < 1 || operations.length > serviceLimits.operations) throw new Error('Invalid installation operations.');
  const network = normalizeNetwork(level?.services?.[systemId], system, level);
  const nodes = new Map(network.nodes.map((node) => [node.id, node]));
  const runs = new Map(network.runs.map((run) => [run.id, run]));
  for (const edit of operations) {
    switch (edit?.op) {
      case 'add_node': {
        if (nodes.size >= serviceLimits.nodes || !record(edit.node)) throw new Error('Invalid installation node.');
        const id = suppliedId(edit.node.id, 'n', nodes, runs);
        const node = editServiceNode(level, system, edit.node, id);
        if (!node) throw new Error('Invalid installation node.');
        nodes.set(id, node);
        break;
      }
      case 'update_node': {
        if (!nodes.has(edit.id) || !record(edit.node)) throw new Error('Unknown installation node.');
        const node = editServiceNode(level, system, edit.node, edit.id, nodes.get(edit.id));
        if (!node) throw new Error('Invalid installation node.');
        nodes.set(edit.id, node);
        if ([...runs.values()].some((run) => (run.from === node.id || run.to === node.id) && !tidyRun(run, system, nodes))) {
          throw new Error('The node type is incompatible with one or more connected runs.');
        }
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
        const existingPhase = systemId === 'electrical' ? [...nodes.values()].find(({ kind }) => kind === 'supplyEntry')?.phase : undefined;
        const fresh = generateServices(level, systemId, { includeEntry: edit.includeEntry, phase: edit.phase === undefined ? existingPhase : edit.phase });
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

export function inspectServices(level, systemId, { includeEntry = true } = {}) {
  const system = checkSystem(systemId);
  const network = normalizeNetwork(level?.services?.[systemId], system);
  const visibleNodes = network.nodes.map((node) => ({ ...resolveServiceNode(level, node), symbol: serviceNodeSymbol(systemId, node) }));
  const nodes = new Map(visibleNodes.map((node) => [node.id, node]));
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
    if (includeEntry && systemId === 'electrical' && !network.nodes.some(({ kind }) => kind === 'supplyEntry')) {
      warnings.push(warning('missing_service_entry', 'Falta a entrada principal de energia neste piso.', 'This storey has no main electrical service entry.'));
    }
    if (includeEntry && systemId === 'plumbing') {
      if (!network.nodes.some(({ kind }) => kind === 'waterEntry')) warnings.push(warning('missing_service_entry', 'Falta a entrada de água neste piso.', 'This storey has no water service entry.'));
      if (!network.nodes.some(({ kind }) => kind === 'sewerOutlet')) warnings.push(warning('missing_sewer_outlet', 'Falta a saída de esgotos neste piso.', 'This storey has no sewer outlet.'));
    }
    if (systemId === 'vmc' && !lengths.supply) warnings.push(warning('no_supply', 'O traçado ainda não inclui insuflação.', 'The layout does not include supply air yet.'));
    if (systemId === 'vmc' && !lengths.extract) warnings.push(warning('no_extract', 'O traçado ainda não inclui extração.', 'The layout does not include extract air yet.'));
  }
  const { openings } = prepareWallSnapping(level);
  for (const node of visibleNodes) {
    const room = roomMap.get(node.roomId);
    if (!attached.has(node.id)) warnings.push(warning('unconnected', 'Ponto sem traçado ligado.', 'Point without a connected run.', { nodeId: node.id }));
    if (node.mount === 'wall' && node.angle === undefined) {
      warnings.push(warning('missing_wall', 'A parede de suporte foi removida. Associe o ponto a outra parede ou superfície.', 'The supporting wall was removed. Attach this point to another wall or surface.', { nodeId: node.id }));
    } else if (node.wall && openings.get(node.wall.wallId)?.some(([start, end]) => node.wall.fraction > start + .000001 && node.wall.fraction < end - .000001)) {
      warnings.push(warning('wall_opening', 'O ponto sobrepõe-se a um vão. Ajuste a posição na parede.', 'The point overlaps an opening. Adjust its position on the wall.', { nodeId: node.id }));
    }
    if (node.roomId && !room) warnings.push(warning('missing_room', 'A divisão associada a este ponto já não existe.', 'The room associated with this point no longer exists.', { nodeId: node.id }));
    if (room && !contains(room, node, .09)) warnings.push(warning('outside_room', 'O ponto está fora da divisão associada.', 'The point is outside its associated room.', { nodeId: node.id }));
  }
  return { ...network, nodes: visibleNodes, lengths: Object.fromEntries(Object.entries(lengths).map(([key, length]) => [key, metres(length)])), warnings: warnings.slice(0, 100) };
}
