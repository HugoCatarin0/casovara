import { radiantCabinetPorts, resolveServiceNode, serviceLimits, serviceRunPoints, serviceSystems, snapServiceNode } from './building-services.js';
import { shade } from './model-furniture.js';
import { isServiceExteriorNode, serviceRunSurface, supportedRouteSpans } from './service-routing.js';
import { effectiveWallHeight, wallBaseOffset } from './wall-spec.js';

const wideRoutes = new Set(['drain', 'refrigerant']);

const fixtureHeights = {
  electrical: { supplyEntry: .32, panel: .50, junction: .84, light: .90, switch: .41, outlet: .16, dedicatedOutlet: .24 },
  plumbing: { waterEntry: .18, sewerOutlet: .039, coldManifold: .21, hotManifold: .28, drainStack: .090, waterHeater: .50,
    junction: .13, sink: .35, basin: .33, shower: .31, bath: .20, toilet: .13, washer: .25, dishwasher: .23, tap: .48 },
  vmc: { unit: .81, ductJunction: .86, supplyVent: .91, extractVent: .89, outsideAir: .93, exhaustOutlet: .90 },
  airConditioning: { outdoorUnit: .22, indoorUnit: .84, junction: .76, condensateDrain: .18 },
  radiantFloor: { manifold: .20, zone: .059, junction: .092 },
};

const largeDevices = new Set(['panel', 'coldManifold', 'hotManifold', 'waterHeater', 'unit', 'outdoorUnit', 'indoorUnit', 'manifold']);
const diffusers = new Set(['light', 'supplyVent', 'extractVent', 'exhaustOutlet', 'outsideAir']);
const outlets = new Set(['outlet', 'dedicatedOutlet']);
const fixtureDetail = '#fff6da';

function centeredSquare({ x, y }, width, depth = width) {
  return [[x - width / 2, y - depth / 2], [x + width / 2, y - depth / 2],
    [x + width / 2, y + depth / 2], [x - width / 2, y + depth / 2]];
}

function span(a, b, width) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < .001) return null;
  const nx = -dy * width / (2 * length), ny = dx * width / (2 * length);
  return [[a.x + nx, a.y + ny], [b.x + nx, b.y + ny], [b.x - nx, b.y - ny], [a.x - nx, a.y - ny]];
}

function solid(faces, owner, points, base, depth, fill) {
  const top = points.map(([x, y]) => [x, y, base + depth]);
  const bottom = points.map(([x, y]) => [x, y, base]);
  faces.push({ points: top, fill, opacity: 1, owner });
  for (let index = 0; index < top.length; index++) {
    const next = (index + 1) % top.length;
    faces.push({ points: [top[index], bottom[index], bottom[next], top[next]], fill: shade(fill, index % 2 ? -30 : -18), opacity: 1, owner });
  }
}

function fixturePlate(faces, owner, vertex, outline, back, depth, fill) {
  const front = outline.map(([u, v]) => vertex(u, v, back + depth));
  faces.push({ points: front, fill, opacity: 1, owner });
  if (!depth) return;
  const rear = outline.map(([u, v]) => vertex(u, v, back));
  faces.push({ points: rear, fill: shade(fill, -30), opacity: 1, owner });
  for (let index = 0; index < front.length; index++) {
    const next = (index + 1) % front.length;
    faces.push({ points: [front[index], rear[index], rear[next], front[next]], fill: shade(fill, -22), opacity: 1, owner });
  }
}

function mountedFixture(faces, owner, node, size, color, selected) {
  const { mount, height, wall } = node;
  const vertex = wall
    ? (u, v, offset) => {
      const { x, y } = wallPoint(wall, u, offset);
      return [x, y, height + v];
    }
    : (u, v, offset) => [node.x + u, node.y + v, height + offset * (mount === 'ceiling' ? -1 : 1)];
  const dimensions = (w, h, x = 0, y = 0) => centeredSquare({ x, y }, w, h);
  const count = outlets.has(node.kind) && Number.isInteger(node.count) ? Math.max(1, Math.min(serviceLimits.count, node.count))
    : node.kind === 'supplyEntry' && node.phase === 'three' ? 3 : 1;
  const columns = Math.min(10, count);
  const rows = Math.ceil(count / columns);
  const width = Math.max(size, Math.min(.58, columns * .12 + .035));
  const faceHeight = Math.min(wall ? wall.fullHeight : Infinity, Math.max(size * .82, Math.min(.50, rows * .10 + .035)));
  const back = wall ? -.001 : 0;
  const depth = largeDevices.has(node.kind) ? .10 : .045;
  if (selected) fixturePlate(faces, owner, vertex, dimensions(width + .065, faceHeight + .065), back, .009, fixtureDetail);
  const outline = diffusers.has(node.kind) ? Array.from({ length: 8 }, (_, index) => {
    const angle = index * Math.PI / 4;
    return [Math.cos(angle) * width / 2, Math.sin(angle) * faceHeight / 2];
  }) : dimensions(width, faceHeight);
  fixturePlate(faces, owner, vertex, outline, back + (selected ? .01 : 0), depth, color);
  const front = back + depth + (selected ? .011 : .001);
  const cellWidth = width / columns;
  const cellHeight = faceHeight / rows;
  const socketColor = shade(color, -35);
  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / columns);
    const cells = Math.min(columns, count - row * columns);
    const x = (index % columns - (cells - 1) / 2) * cellWidth;
    const y = ((rows - 1) / 2 - row) * cellHeight;
    const border = dimensions(cellWidth * .64, cellHeight * .56, x, y);
    fixturePlate(faces, owner, vertex, border, front, 0, fixtureDetail);
    if (outlets.has(node.kind)) {
      const holeWidth = Math.min(cellWidth, cellHeight) * .12;
      for (const side of [-1, 1]) {
        const hole = dimensions(holeWidth, holeWidth, x + side * cellWidth * .15, y);
        fixturePlate(faces, owner, vertex, hole, front + .001, 0, socketColor);
      }
    }
  }
}

function radiantCabinet(faces, owner, node, selected) {
  const { wall, height, cabinet } = node;
  const width = cabinet.width;
  const tall = cabinetHeight(node);
  if (tall < .08) return;
  const vertex = (u, v, inset) => {
    const { x, y } = wallPoint(wall, u, inset);
    return [x, y, height + v];
  };
  const plate = (x, y, w, h, back, depth, fill) =>
    fixturePlate(faces, owner, vertex, centeredSquare({ x, y }, w, h), back, depth, fill);
  const rim = Math.min(.028, tall * .13);
  const inside = width - rim * 2;
  const frame = selected ? '#83cabc' : '#e8e9e1';
  plate(0, 0, width, tall, .001, .009, '#464d53');
  for (const side of [-1, 1]) {
    plate(side * (width - rim) / 2, 0, rim, tall, .004, .032, frame);
    plate(0, side * (tall - rim) / 2, inside, rim, .004, .032, frame);
  }
  const { supply, return: returning } = serviceSystems.radiantFloor.media;
  for (const [line, color] of [[tall * .20, supply.color], [-tall * .12, returning.color]]) {
    plate(0, line, inside * .86, Math.min(.027, tall * .08), .014, .015, color);
  }
  const pinWidth = Math.min(.012, cabinet.ports.length ? inside / (cabinet.ports.length * 5) : .012);
  for (const { supplyOffset, returnOffset } of cabinet.ports) {
    const bottom = -tall / 2 + rim * .4;
    for (const [offset, top, depth, color] of [
      [supplyOffset, tall * .23, .022, supply.color],
      [returnOffset, -tall * .08, .032, returning.color],
    ]) {
      plate(offset, (top + bottom) / 2, pinWidth, top - bottom, depth, .007, color);
      plate(offset, top, pinWidth * 1.35, Math.min(.021, tall * .08), depth + .008, .004, '#e3d5b1');
    }
  }
}

const validPosition = (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y);

const covers = ({ x, y, width, depth }, point) => point.x >= x - 1e-6 && point.y >= y - 1e-6 &&
  point.x <= x + width + 1e-6 && point.y <= y + depth + 1e-6;

function wallFrame(position, host, levelHeight, floor, sectionTop, openings) {
  if (!host) return null;
  const { fraction, side } = position.wall;
  const dx = host.x2 - host.x1, dy = host.y2 - host.y1;
  const length = Math.hypot(dx, dy);
  const tx = -dx * side / length, ty = -dy * side / length;
  const nx = ty, ny = -tx;
  const halfThickness = host.thickness / 2;
  const bottom = floor + wallBaseOffset(host);
  const fullHeight = effectiveWallHeight(host, levelHeight);
  return {
    x: host.x1 + dx * fraction + nx * halfThickness, y: host.y1 + dy * fraction + ny * halfThickness,
    tx, ty, nx, ny, halfThickness, length, fraction, side, bottom,
    fullHeight, top: Math.min(sectionTop, bottom + fullHeight),
    openings: openings.get(host.id) ?? [],
  };
}

function wallPoint(wall, tangent, normal) {
  return { x: wall.x + wall.tx * tangent + wall.nx * normal, y: wall.y + wall.ty * tangent + wall.ny * normal };
}

function cabinetHeight({ wall, height }) {
  return Math.min(.46, 2 * Math.max(0, Math.min(height - wall.bottom, wall.top - height)));
}

function manifoldEndpoint(node, point) {
  const { wall } = node;
  const offset = (point.x - wall.x) * wall.tx + (point.y - wall.y) * wall.ty;
  const location = wallPoint(wall, offset, 0);
  return {
    ...node, ...location, height: node.height - cabinetHeight(node) / 2,
    wall: { ...wall, ...location, fraction: wall.fraction - wall.side * offset / wall.length },
  };
}

function roundedCircuit(points) {
  const rounded = [points[0]];
  for (let index = 1; index + 1 < points.length; index++) {
    const a = points[index - 1], b = points[index], c = points[index + 1];
    const before = Math.hypot(a.x - b.x, a.y - b.y);
    const after = Math.hypot(c.x - b.x, c.y - b.y);
    const radius = Math.min(.06, before / 4, after / 4);
    const cross = (a.x - b.x) * (c.y - b.y) - (a.y - b.y) * (c.x - b.x);
    if (radius < .008 || Math.abs(cross) < 1e-6) {
      rounded.push(b);
      continue;
    }
    const from = { x: b.x + (a.x - b.x) * radius / before, y: b.y + (a.y - b.y) * radius / before };
    const to = { x: b.x + (c.x - b.x) * radius / after, y: b.y + (c.y - b.y) * radius / after };
    for (const amount of [0, 1 / 3, 2 / 3, 1]) {
      const remaining = 1 - amount;
      rounded.push({
        x: remaining ** 2 * from.x + 2 * amount * remaining * b.x + amount ** 2 * to.x,
        y: remaining ** 2 * from.y + 2 * amount * remaining * b.y + amount ** 2 * to.y,
      });
    }
  }
  rounded.push(points.at(-1));
  return rounded;
}

function mountingPosition(level, source, defaults) {
  if (source.mount || defaults !== 'wall') return resolveServiceNode(level, source);
  const nearby = snapServiceNode(level, source, { roomId: source.roomId, threshold: .30 });
  return nearby ? { ...source, ...nearby } : source;
}

function drawWallRun(faces, owner, node, target, width, exposed, floor, color) {
  const { wall, height } = node;
  if (!wall) return;
  let bottom = Math.max(wall.bottom, Math.min(height, target));
  let top = Math.min(wall.top, Math.max(height, target));
  const halfWidth = Math.min(width * .36, wall.length * Math.min(wall.fraction, 1 - wall.fraction));
  const margin = halfWidth / wall.length;
  for (const cut of wall.openings) {
    if (wall.fraction + margin <= cut.a || wall.fraction - margin >= cut.b) continue;
    const sill = floor + cut.sill, lintel = floor + cut.top;
    if (height >= sill && height <= lintel) return;
    if (height > lintel) bottom = Math.max(bottom, lintel);
    else top = Math.min(top, sill);
  }
  if (top - bottom < .005 || halfWidth < .002) return;
  const front = exposed ? .004 : -.007;
  const back = Math.max(-wall.halfThickness, front - .009);
  const footprint = [[-halfWidth, back], [halfWidth, back], [halfWidth, front], [-halfWidth, front]].map(([offset, inset]) => {
    const { x, y } = wallPoint(wall, offset, inset);
    return [x, y];
  });
  solid(faces, owner, footprint, bottom, top - bottom, color);
}

function drawSurfaceRun(faces, owner, chain, areas, base, width, depth, color, excluded = []) {
  for (const segment of supportedRouteSpans(chain, areas)) {
    if (!segment.supported) continue;
    const visible = excluded.length ? supportedRouteSpans([segment.from, segment.to], excluded).filter(({ supported }) => !supported) : [segment];
    for (const { from, to } of visible) {
      const footprint = span(from, to, width);
      if (footprint) solid(faces, owner, footprint, base, depth, color);
    }
  }
}

export function appendModelServices(faces, level, floor, systems, selected, {
  ceilingPlanes, floorAreas, terrain, sectionTop, exposeFloor, exposeCeiling, openings,
}) {
  if (!level.services || !Number.isFinite(level.height) || level.height <= .1) return;
  const localHeight = (fraction) => floor + Math.min(level.height - .028, level.height * fraction);
  const walls = new Map((level.walls ?? []).map((wall) => [wall.id, wall]));
  const undersideAt = (point) => ceilingPlanes.find(({ areas }) => areas.some((area) => covers(area, point)))?.z;
  const floorAt = (point, exterior) => floorAreas.some((area) => covers(area, point)) ? floor
    : exterior && terrain && covers(terrain, point) ? terrain.z : undefined;
  for (const system of systems) {
    if (!Object.hasOwn(serviceSystems, system)) continue;
    const descriptor = serviceSystems[system];
    const systemOrder = Object.keys(serviceSystems).indexOf(system);
    const mediaOrder = Object.keys(descriptor.media);
    const network = level.services[system];
    if (!Array.isArray(network?.nodes) || !Array.isArray(network.runs)) continue;
    const nodes = new Map();
    for (const source of network.nodes) {
      if (!source || !Object.hasOwn(descriptor.kinds, source.kind)) continue;
      const defaults = descriptor.kinds[source.kind].defaultMount;
      const position = mountingPosition(level, source, defaults);
      if (!validPosition(position)) continue;
      const host = position.mount === 'wall' && Number.isFinite(position.angle) ? walls.get(position.wall?.wallId) : null;
      const wall = wallFrame(position, host, level.height, floor, sectionTop, openings);
      const mount = wall ? 'wall' : (source.mount ?? defaults) === 'ceiling' ? 'ceiling' : 'floor';
      const location = wall ?? position;
      let height;
      let visible;
      if (wall) {
        const nominalHeight = localHeight(fixtureHeights[system][source.kind] ?? .45);
        const margin = Math.min(wall.fullHeight / 2, outlets.has(source.kind) ? .26 : .16);
        height = Math.max(wall.bottom + margin, Math.min(wall.bottom + wall.fullHeight - margin, nominalHeight));
        visible = height <= wall.top && !wall.openings.some(({ a, b, sill, top }) => wall.fraction > a && wall.fraction < b &&
          height >= floor + sill && height <= floor + top);
      } else {
        const support = mount === 'ceiling' ? undersideAt(location) : floorAt(location, isServiceExteriorNode(source));
        visible = Number.isFinite(support);
        height = mount === 'ceiling' ? support - .006 : support + .006;
      }
      const cabinet = system === 'radiantFloor' && source.kind === 'manifold' && wall ? radiantCabinetPorts(network, position, level) : null;
      nodes.set(source.id, { ...source, ...position, x: location.x, y: location.y, mount, wall, height, visible, cabinet });
    }
    const active = (kind, id) => selected?.levelId === level.id && selected.system === system && selected.kind === kind && selected.id === id;

    for (const run of network.runs) {
      if (!run) continue;
      const material = Object.hasOwn(descriptor.media, run.medium) ? descriptor.media[run.medium] : null;
      if (!material) continue;
      let start = nodes.get(run.from), end = nodes.get(run.to);
      if (!start || !end) continue;
      if (run.port && (start.cabinet || end.cabinet)) {
        const route = serviceRunPoints(network, run, level);
        if (start.cabinet) start = manifoldEndpoint(start, route[0]);
        if (end.cabinet) end = manifoldEndpoint(end, route.at(-1));
      }
      const surface = serviceRunSurface(system, run);
      const size = system === 'radiantFloor' ? .026 : (system === 'vmc' || wideRoutes.has(run.medium)) ? .055 : .035;
      const isActive = active('run', run.id);
      const width = isActive ? size * 1.65 : size;
      // Keep coincident traces on the same surface without sharing the same depth.
      const separation = systemOrder * .001 + mediaOrder.indexOf(run.medium) * .00015;
      const color = isActive ? shade(material.color, 32) : material.color;
      const owner = { kind: 'service-run', system, id: run.id, levelId: level.id };
      const bends = Array.isArray(run.points) ? run.points.filter(validPosition) : [];
      const route = [start, ...bends, end];
      const chain = system === 'radiantFloor' && run.medium === 'loop' ? roundedCircuit(route) : route;
      if (surface === 'floor') {
        const datum = floor + separation + (exposeFloor ? .003 : -.025);
        drawSurfaceRun(faces, owner, chain, floorAreas, datum, width, .006, color);
      } else {
        const lowerPlanes = [];
        for (const { z, areas } of ceilingPlanes) {
          const datum = exposeCeiling ? z - .006 - separation : z + .008 + separation;
          drawSurfaceRun(faces, owner, chain, areas, datum, width, .006, color, lowerPlanes);
          lowerPlanes.push(...areas);
        }
      }
      for (const node of [start, end]) {
        if (!node.wall) continue;
        const target = surface === 'floor' ? floorAt(node, isServiceExteriorNode(node)) ?? floor
          : undersideAt(node) ?? node.wall.top;
        drawWallRun(faces, owner, node, target, width, surface === 'floor' ? exposeFloor : exposeFloor || exposeCeiling, floor, color);
      }
    }

    for (const node of nodes.values()) {
      if (!node.visible) continue;
      const owner = { kind: 'service-node', system, id: node.id, levelId: level.id };
      const selectedNode = active('node', node.id);
      if (node.cabinet) {
        radiantCabinet(faces, owner, node, selectedNode);
        continue;
      }
      if (system === 'radiantFloor' && node.kind === 'zone' && !selectedNode) continue;
      const width = largeDevices.has(node.kind) ? .30 : .17;
      mountedFixture(faces, owner, node, width, descriptor.color, selectedNode);
    }
  }
}
