export const roofTypes = Object.freeze(['none', 'flat', 'gable', 'hipped']);
export const roofCoverings = Object.freeze(['tile', 'metal', 'membrane']);
export const structureTypes = Object.freeze(['roofWindow', 'chimney', 'gutter', 'foundation']);
export const gutterEdges = Object.freeze(['front', 'back', 'left', 'right']);
export const structureLimits = Object.freeze({
  overhang: [0, 2], offset: [-.4, 2], uv: [0, 1], count: 120,
  roofWindow: { width: [.25, 3], height: [.25, 3] },
  chimney: { width: [.10, 1.5], height: [.15, 3] },
  gutter: { width: [.08, .5], depth: [.06, .4] },
  foundation: { width: [.3, 2.5], footingHeight: [.15, 1], bottom: [-4, -.2], wallThickness: [.1, 1], top: [-.15, .8] },
});
export const roofColors = Object.freeze({ tile: '#af7259', metal: '#697784', membrane: '#a4a298' });
export const structureColors = Object.freeze({ roofWindow: '#374454', chimney: '#746a61', gutter: '#3e4650', foundation: '#a39b90' });

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const scalar = (value, fallback, limits) => Number.isFinite(value) ? clamp(value, ...limits) : fallback;
const choice = (value, fallback, options) => options.includes(value) ? value : fallback;
const colorValue = (color) => typeof color === 'string' && /^#[a-f0-9]{6}$/i.test(color) ? color.toLowerCase() : undefined;
const validId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,90}$/.test(id);

export function normalizeRoofSpec(value) {
  const color = colorValue(value?.color);
  return {
    eavesOverhang: scalar(value?.eavesOverhang, .28, structureLimits.overhang),
    gableOverhang: scalar(value?.gableOverhang, .28, structureLimits.overhang),
    offset: scalar(value?.offset, 0, structureLimits.offset),
    covering: choice(value?.covering, 'tile', roofCoverings),
    ...(color ? { color } : {}),
  };
}

export function roofSpecFor(level) {
  return normalizeRoofSpec(level?.roofSpec);
}

export function normalizeStructureElement(value, level) {
  if (!validId(value?.id) || !structureTypes.includes(value.type)) return null;
  const { id, type } = value;
  const color = colorValue(value.color);
  const record = { id, type, ...(color ? { color } : {}) };
  const limits = structureLimits[type];
  const size = (key, fallback) => scalar(value[key], fallback, limits[key]);
  const position = (key, fallback) => scalar(value[key], fallback, structureLimits.uv);
  if (type === 'foundation') {
    if (!validId(value.wallId) || (level && !level.walls?.some(({ id }) => id === value.wallId))) return null;
    const width = size('width', .8);
    const top = size('top', 0);
    const bottom = size('bottom', -.8);
    return { ...record, wallId: value.wallId, width, top, bottom,
      footingHeight: Math.min(size('footingHeight', .4), top - bottom),
      wallThickness: Math.min(size('wallThickness', .34), width) };
  }
  if (type === 'gutter') {
    const from = position('from', 0);
    const to = position('to', 1);
    const start = Math.min(from, to, .98);
    return { ...record, edge: choice(value.edge, 'front', gutterEdges), from: start, to: Math.max(start + .02, from, to),
      width: size('width', .14), depth: size('depth', .12), downspout: value.downspout !== false };
  }
  const uv = { u: position('u', type === 'roofWindow' ? .5 : .65), v: position('v', type === 'roofWindow' ? .25 : .3) };
  if (type === 'roofWindow') return { ...record, ...uv, width: size('width', .78), height: size('height', 1.18) };
  return { ...record, ...uv, width: size('width', .28), height: size('height', .6),
    kind: choice(value.kind, 'chimney', ['chimney', 'vent']), shape: choice(value.shape, 'square', ['square', 'round']),
    reference: choice(value.reference, 'surface', ['ridge', 'surface']) };
}

export function normalizeStructure(input, level) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const entries = [];
  for (const value of input.slice(0, structureLimits.count)) {
    const record = normalizeStructureElement(value, level);
    if (record && !seen.has(record.id)) {
      entries.push(record);
      seen.add(record.id);
    }
  }
  return entries;
}

export function roofFrame(level, base = 0) {
  if (!level || !roofTypes.slice(1).includes(level.roof)) return null;
  const rooms = (level.rooms ?? []).filter(({ type }) => type !== 'outdoor');
  const points = rooms.flatMap(({ x, y, w, h }) => [[x, y], [x + w, y + h]]);
  if (!points.length) points.push(...(level.walls ?? []).flatMap(({ x1, y1, x2, y2 }) => [[x1, y1], [x2, y2]]));
  if (!points.length) return null;
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const left = Math.min(...xs), top = Math.min(...ys);
  const innerWidth = Math.max(...xs) - left, innerDepth = Math.max(...ys) - top;
  const spec = roofSpecFor(level);
  const alongX = innerWidth >= innerDepth;
  const xOverhang = alongX ? spec.gableOverhang : spec.eavesOverhang;
  const yOverhang = alongX ? spec.eavesOverhang : spec.gableOverhang;
  const x = left - xOverhang, y = top - yOverhang;
  const width = innerWidth + 2 * xOverhang, depth = innerDepth + 2 * yOverhang;
  if (width < .3 || depth < .3) return null;
  const length = alongX ? width : depth, span = alongX ? depth : width;
  const pitch = level.roof === 'flat' ? 0 : scalar(level.pitch, 30, [5, 65]);
  const tangent = Math.tan(pitch * Math.PI / 180);
  const ridgeHeight = span / 2 * tangent;
  const inset = level.roof === 'hipped' ? Math.min(length * .42, span / 2) : 0;
  const eaves = base + spec.offset;
  const local = (px, py) => alongX ? [px - x, py - y] : [py - y, px - x];
  const world = (u, v, z = eaves) => alongX ? [x + u, y + v, z] : [x + v, y + u, z];
  const surface = (u, v) => {
    if (!pitch) return eaves + .18;
    const distance = Math.min(v, span - v);
    return eaves + Math.max(0, inset ? Math.min(distance, u * span / (2 * inset), (length - u) * span / (2 * inset)) : distance) * tangent;
  };
  const plates = rooms.map(({ x, y, w, h }) => {
    const [u, v] = local(x - xOverhang, y - yOverhang);
    const [right, bottom] = local(x + w + xOverhang, y + h + yOverhang);
    return { x: u, y: v, width: right - u, depth: bottom - v };
  });
  return { x, y, width, depth, alongX, length, span, pitch, eaves, ridgeHeight, inset, spec,
    xOverhang, yOverhang, inner: { x: left, y: top, width: innerWidth, depth: innerDepth }, local, world, surface,
    plates: plates.length ? plates : [{ x: 0, y: 0, width: length, depth: span }] };
}

export const structureRect = (x, y, width, depth) => [[x, y], [x + width, y], [x + width, y + depth], [x, y + depth]];

export function roofWindowBounds(frame, item) {
  const { length, span, pitch, inset } = frame;
  const margin = .075;
  if (!pitch) {
    const targetU = item.u * length, targetV = item.v * span;
    const candidates = frame.plates.flatMap((plate) => {
      const width = Math.min(item.width, plate.width - 2 * margin);
      const depth = Math.min(item.height, plate.depth - 2 * margin);
      if (width < .12 || depth < .12) return [];
      const x = clamp(targetU - width / 2, plate.x + margin, plate.x + plate.width - margin - width);
      const y = clamp(targetV - depth / 2, plate.y + margin, plate.y + plate.depth - margin - depth);
      const distance = Math.hypot(targetU - x - width / 2, targetV - y - depth / 2);
      return [{ x, y, width, depth, score: distance + item.width - width + item.height - depth }];
    });
    const best = candidates.sort((a, b) => a.score - b.score)[0];
    return best ? { x: best.x, y: best.y, width: best.width, depth: best.depth } : null;
  }
  const slopeDepth = pitch ? span / 2 : span;
  const depth = Math.min(item.height * Math.cos(pitch * Math.PI / 180), slopeDepth - 2 * margin);
  if (depth < .12) return null;
  const rear = pitch && item.v > .5;
  const centreV = clamp(span * (rear ? 1 - item.v : item.v), margin + depth / 2, slopeDepth - margin - depth / 2);
  const taper = margin + inset * (centreV + depth / 2) / slopeDepth;
  const width = Math.min(item.width, length - 2 * taper);
  if (width < .12) return null;
  const centreU = clamp(length * item.u, taper + width / 2, length - taper - width / 2);
  return { x: centreU - width / 2, y: (rear ? span - centreV : centreV) - depth / 2, width, depth };
}

export function roofChimneyCenter(frame, item) {
  const { length, span } = frame;
  if (!frame.pitch) {
    const fitted = roofWindowBounds(frame, { ...item, height: item.width });
    if (fitted) {
      const { x, y, width, depth } = fitted;
      return { u: x + width / 2, v: y + depth / 2, width: Math.min(width, depth) };
    }
  }
  const width = Math.min(item.width, length - .05, span - .05);
  const margin = width / 2 + .025;
  return { u: clamp(length * item.u, margin, length - margin), v: clamp(span * item.v, margin, span - margin), width };
}

export function gutterAxis(frame, item) {
  const along = item.edge === 'front' || item.edge === 'back';
  const near = item.edge === 'front' || item.edge === 'left';
  const length = along ? frame.length : frame.span;
  const fixed = near ? 0 : along ? frame.span : frame.length;
  const side = near ? -1 : 1;
  const at = (distance, offset = 0) => along ? [distance, fixed + side * offset] : [fixed + side * offset, distance];
  return { from: length * item.from, to: length * item.to, at, along };
}

export function foundationFootprint(level, item, width = item.width) {
  const wall = level.walls?.find(({ id }) => id === item.wallId);
  if (!wall) return [];
  const { x1, y1, x2, y2 } = wall;
  const dx = x2 - x1, dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (!length) return [];
  const i = -dy * width / (2 * length), j = dx * width / (2 * length);
  return [[x1 + i, y1 + j], [x2 + i, y2 + j], [x2 - i, y2 - j], [x1 - i, y1 - j]];
}

export function structureFootprint(level, item, frame = roofFrame(level)) {
  if (item.type === 'foundation') return foundationFootprint(level, item);
  if (!frame) return [];
  let local;
  if (item.type === 'roofWindow') {
    const bounds = roofWindowBounds(frame, item);
    if (!bounds) return [];
    local = structureRect(bounds.x, bounds.y, bounds.width, bounds.depth);
  } else if (item.type === 'chimney') {
    const { u, v, width } = roofChimneyCenter(frame, item);
    local = structureRect(u - width / 2, v - width / 2, width, width);
    if (item.shape === 'round') local = Array.from({ length: 12 }, (_, index) => {
      const angle = Math.PI * index / 6;
      return [u + Math.cos(angle) * width / 2, v + Math.sin(angle) * width / 2];
    });
  } else if (item.type === 'gutter') {
    const { from, to, at } = gutterAxis(frame, item);
    local = [at(from), at(to), at(to, item.width), at(from, item.width)];
  } else return [];
  return local.map(([u, v]) => frame.world(u, v).slice(0, 2));
}
