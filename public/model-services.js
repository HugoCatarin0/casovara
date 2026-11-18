import { resolveServiceNode, serviceLimits, serviceSystems } from './building-services.js';
import { shade } from './model-furniture.js';
import { effectiveWallHeight, wallBaseOffset } from './wall-spec.js';

// These display bands separate networks vertically in the model. They describe
// the schematic view and are independent of the actual installation heights.
const bands = {
  electrical: { serviceFeed: [.062, .078], lighting: [.86, .055], power: [.12, .057], control: [.80, .055], dedicated: [.16, .066] },
  plumbing: { cold: [.076, .070], hot: [.105, .070], drain: [.039, .095] },
  vmc: { supply: [.925, .105], extract: [.885, .105], intake: [.949, .105], exhaust: [.908, .105] },
  airConditioning: { refrigerant: [.786, .082], condensate: [.209, .065] },
  radiantFloor: { supply: [.042, .055], return: [.023, .055], loop: [.018, .035] },
};

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
  const { mount, height, wallHeight } = node;
  const wall = mount === 'wall';
  const normal = wall ? node.angle * Math.PI / 180 : 0;
  const cos = Math.cos(normal), sin = Math.sin(normal);
  const vertex = wall
    ? (u, v, offset) => [node.x - u * sin + offset * cos, node.y + u * cos + offset * sin, height + v]
    : (u, v, offset) => [node.x + u, node.y + v, height + offset * (mount === 'ceiling' ? -1 : 1)];
  const dimensions = (w, h, x = 0, y = 0) => centeredSquare({ x, y }, w, h);
  const count = outlets.has(node.kind) && Number.isInteger(node.count) ? Math.max(1, Math.min(serviceLimits.count, node.count))
    : node.kind === 'supplyEntry' && node.phase === 'three' ? 3 : 1;
  const columns = Math.min(10, count);
  const rows = Math.ceil(count / columns);
  const width = Math.max(size, Math.min(.58, columns * .12 + .035));
  const faceHeight = Math.min(wallHeight, Math.max(size * .82, Math.min(.50, rows * .10 + .035)));
  // The anchor sits slightly clear of the face so plan markers remain visible.
  const back = wall ? -.011 : 0;
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

const validPosition = (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y);

export function appendModelServices(faces, level, floor, systems, selected, ceilingHeightAt) {
  if (!level.services || !Number.isFinite(level.height) || level.height <= .1) return;
  const localHeight = (fraction) => floor + Math.min(level.height - .028, level.height * fraction);
  const walls = new Map((level.walls ?? []).map((wall) => [wall.id, wall]));
  for (const system of systems) {
    if (!Object.hasOwn(serviceSystems, system)) continue;
    const descriptor = serviceSystems[system];
    const network = level.services[system];
    if (!Array.isArray(network?.nodes) || !Array.isArray(network.runs)) continue;
    const nodes = new Map();
    for (const source of network.nodes) {
      if (!source || !Object.hasOwn(descriptor.kinds, source.kind)) continue;
      const position = resolveServiceNode(level, source);
      if (!validPosition(position)) continue;
      const wall = source.mount === 'wall' && Number.isFinite(position.angle) ? walls.get(source.wall?.wallId) : null;
      const mount = wall ? 'wall' : ['floor', 'ceiling'].includes(source.mount) ? source.mount : 'free';
      const nominalHeight = localHeight(fixtureHeights[system][source.kind] ?? .45);
      const bottom = wall ? floor + wallBaseOffset(wall) : floor;
      const wallHeight = wall ? effectiveWallHeight(wall, level.height) : level.height;
      const margin = Math.min(wallHeight / 2, outlets.has(source.kind) ? .26 : .16);
      const height = mount === 'wall' ? Math.max(bottom + margin, Math.min(bottom + wallHeight - margin, nominalHeight))
        : mount === 'floor' ? floor + .013 : mount === 'ceiling' ? ceilingHeightAt(position) - .006 : nominalHeight;
      nodes.set(source.id, { ...source, ...position, mount, height, wallHeight });
    }
    const active = (kind, id) => selected?.levelId === level.id && selected.system === system && selected.kind === kind && selected.id === id;

    for (const run of network.runs) {
      if (!run) continue;
      const material = Object.hasOwn(descriptor.media, run.medium) ? descriptor.media[run.medium] : null;
      if (!material) continue;
      const start = nodes.get(run.from), end = nodes.get(run.to);
      if (!start || !end) continue;
      const [band, size] = bands[system][run.medium] ?? [.45, .065];
      const isActive = active('run', run.id);
      const width = isActive ? size * 1.65 : size;
      const height = localHeight(band);
      const depth = Math.min(width * .44, level.height * .018);
      const color = isActive ? shade(material.color, 32) : material.color;
      const owner = { kind: 'service-run', system, id: run.id, levelId: level.id };
      const bends = Array.isArray(run.points) ? run.points.filter(validPosition) : [];
      const chain = [start, ...bends, end];
      for (let index = 1; index < chain.length; index++) {
        const footprint = span(chain[index - 1], chain[index], width);
        if (footprint) solid(faces, owner, footprint, height, depth, color);
      }
      for (const bend of bends) solid(faces, owner, centeredSquare(bend, width), height, depth, color);
      for (const fixture of [start, end]) {
        const fixtureHeight = fixture.height;
        const size = Math.abs(fixtureHeight - height);
        if (size > .04) solid(faces, owner, centeredSquare(fixture, width * .71), Math.min(fixtureHeight, height), size, color);
      }
    }

    for (const node of nodes.values()) {
      const height = node.height;
      const owner = { kind: 'service-node', system, id: node.id, levelId: level.id };
      const width = largeDevices.has(node.kind) ? .30 : .17;
      const thickness = largeDevices.has(node.kind) ? .13 : .075;
      const isActive = active('node', node.id);
      if (node.mount !== 'free' || node.kind === 'supplyEntry' || (outlets.has(node.kind) && node.count > 1)) {
        mountedFixture(faces, owner, node, width, descriptor.color, isActive);
        continue;
      }
      if (isActive) solid(faces, owner, centeredSquare(node, width + .09), height, .027, fixtureDetail);
      const outline = diffusers.has(node.kind) ? Array.from({ length: 8 }, (_, index) => {
        const angle = index * Math.PI / 4;
        return [node.x + Math.cos(angle) * width / 2, node.y + Math.sin(angle) * width / 2];
      }) : centeredSquare(node, width, width * .82);
      solid(faces, owner, outline, height + .009, thickness, descriptor.color);
      solid(faces, owner, centeredSquare(node, width * .39), height + .009 + thickness, .006, fixtureDetail);
    }
  }
}
