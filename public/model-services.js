import { serviceSystems } from './building-services.js';
import { shade } from './model-furniture.js';

// These display bands separate networks vertically in the model. They describe
// the schematic view and are independent of the actual installation heights.
const bands = {
  electrical: { lighting: [.86, .055], power: [.12, .057], control: [.80, .055], dedicated: [.16, .066] },
  plumbing: { cold: [.076, .070], hot: [.105, .070], drain: [.039, .095] },
  vmc: { supply: [.925, .105], extract: [.885, .105], intake: [.949, .105], exhaust: [.908, .105] },
  airConditioning: { refrigerant: [.786, .082], condensate: [.209, .065] },
  radiantFloor: { supply: [.042, .055], return: [.023, .055], loop: [.018, .035] },
};

const fixtureHeights = {
  electrical: { panel: .50, junction: .84, light: .90, switch: .41, outlet: .16, dedicatedOutlet: .24 },
  plumbing: { coldManifold: .21, hotManifold: .28, drainStack: .090, waterHeater: .50,
    junction: .13, sink: .35, basin: .33, shower: .31, bath: .20, toilet: .13, washer: .25, dishwasher: .23, tap: .48 },
  vmc: { unit: .81, ductJunction: .86, supplyVent: .91, extractVent: .89, outsideAir: .93, exhaustOutlet: .90 },
  airConditioning: { outdoorUnit: .22, indoorUnit: .84, junction: .76, condensateDrain: .18 },
  radiantFloor: { manifold: .20, zone: .059, junction: .092 },
};

const largeDevices = new Set(['panel', 'coldManifold', 'hotManifold', 'waterHeater', 'unit', 'outdoorUnit', 'indoorUnit', 'manifold']);
const diffusers = new Set(['light', 'supplyVent', 'extractVent', 'exhaustOutlet', 'outsideAir']);

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

const validPosition = (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y);

export function appendModelServices(faces, level, floor, systems, selected) {
  if (!level.services || !Number.isFinite(level.height) || level.height <= .1) return;
  const localHeight = (fraction) => floor + Math.min(level.height - .028, level.height * fraction);
  for (const system of systems) {
    if (!Object.hasOwn(serviceSystems, system)) continue;
    const descriptor = serviceSystems[system];
    const network = level.services[system];
    if (!Array.isArray(network?.nodes) || !Array.isArray(network.runs)) continue;
    const nodes = new Map(network.nodes.filter((node) => validPosition(node) && Object.hasOwn(descriptor.kinds, node.kind))
      .map((node) => [node.id, node]));
    const nodeHeight = (node) => localHeight(fixtureHeights[system][node.kind] ?? .45);
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
        const fixtureHeight = nodeHeight(fixture);
        const size = Math.abs(fixtureHeight - height);
        if (size > .04) solid(faces, owner, centeredSquare(fixture, width * .71), Math.min(fixtureHeight, height), size, color);
      }
    }

    for (const node of nodes.values()) {
      const height = nodeHeight(node);
      const owner = { kind: 'service-node', system, id: node.id, levelId: level.id };
      const width = largeDevices.has(node.kind) ? .30 : .17;
      const thickness = largeDevices.has(node.kind) ? .13 : .075;
      if (active('node', node.id)) solid(faces, owner, centeredSquare(node, width + .09), height, .027, '#fff6da');
      const outline = diffusers.has(node.kind) ? Array.from({ length: 8 }, (_, index) => {
        const angle = index * Math.PI / 4;
        return [node.x + Math.cos(angle) * width / 2, node.y + Math.sin(angle) * width / 2];
      }) : centeredSquare(node, width, width * .82);
      solid(faces, owner, outline, height + .009, thickness, descriptor.color);
      solid(faces, owner, centeredSquare(node, width * .39), height + .009 + thickness, .006, '#fff6da');
    }
  }
}
