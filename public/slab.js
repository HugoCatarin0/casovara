export const slabModes = Object.freeze(['auto', 'custom', 'none']);
export const slabLimits = Object.freeze({
  defaultThickness: .17, minThickness: .05, maxThickness: 1, minSpan: .1, maxSpan: 500, coordinate: 500,
});

const round = (value) => Math.round(value * 1e6) / 1e6;
const between = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;

export function normalizeSlab(source) {
  const { minThickness, maxThickness, defaultThickness, minSpan, maxSpan, coordinate } = slabLimits;
  const thickness = between(source?.thickness, minThickness, maxThickness) ? round(source.thickness) : defaultThickness;
  const { x, y, width, depth } = source?.footprint ?? {};
  const footprint = [x, y].every((value) => between(value, -coordinate, coordinate)) &&
    [width, depth].every((value) => between(value, minSpan, maxSpan))
    ? { x: round(x), y: round(y), width: round(width), depth: round(depth) } : null;
  const mode = slabModes.includes(source?.mode) && (source.mode !== 'custom' || footprint) ? source.mode : 'auto';
  return { mode, thickness, ...(footprint ? { footprint } : {}) };
}

export function slabFor(level) {
  return normalizeSlab(level?.slab);
}

export function slabFootprints(level) {
  const slab = slabFor(level);
  if (slab.mode === 'none') return [];
  if (slab.mode === 'custom') return [slab.footprint];
  const rooms = (Array.isArray(level?.rooms) ? level.rooms : []).filter((room) => room && room.type !== 'outdoor' &&
    [room.x, room.y, room.w, room.h, room.x + room.w, room.y + room.h].every(Number.isFinite) && room.w > 0 && room.h > 0)
    .map(({ x, y, w, h }) => ({ x: round(x), y: round(y), right: round(x + w), bottom: round(y + h) }))
    .filter(({ x, y, right, bottom }) => right > x && bottom > y);
  const cuts = [...new Set(rooms.flatMap(({ x, right }) => [x, right]))].sort((a, b) => a - b);
  const footprints = [];
  let previous = new Map();
  for (let index = 1; index < cuts.length; index++) {
    const x = cuts[index - 1];
    const edge = cuts[index];
    const spans = rooms.filter((room) => room.x < edge && room.right > x)
      .sort((a, b) => a.y - b.y);
    const merged = [];
    for (const { y, bottom } of spans) {
      const last = merged.at(-1);
      if (last && last.bottom >= y) last.bottom = Math.max(last.bottom, bottom);
      else merged.push({ y, bottom });
    }
    const current = new Map();
    for (const { y, bottom } of merged) {
      const key = `${y}:${bottom}`;
      const existing = previous.get(key);
      const footprint = existing ?? { x, y, width: 0, depth: round(bottom - y) };
      footprint.width = round(edge - footprint.x);
      if (!existing) footprints.push(footprint);
      current.set(key, footprint);
    }
    previous = current;
  }
  return footprints;
}

export function slabOutline(footprints) {
  const horizontal = new Map();
  const vertical = new Map();
  function addEdge(axis, position, start, end, direction) {
    if (!axis.has(position)) axis.set(position, new Map());
    const events = axis.get(position);
    events.set(start, (events.get(start) ?? 0) + direction);
    events.set(end, (events.get(end) ?? 0) - direction);
  }
  for (const { x, y, width, depth } of footprints) {
    const right = round(x + width);
    const bottom = round(y + depth);
    addEdge(horizontal, y, x, right, 1);
    addEdge(horizontal, bottom, x, right, -1);
    addEdge(vertical, x, y, bottom, -1);
    addEdge(vertical, right, y, bottom, 1);
  }
  const outline = [];
  function trace(axis, segment) {
    for (const [line, events] of axis) {
      let active = 0;
      let start;
      for (const [position, change] of [...events].sort(([a], [b]) => a - b)) {
        const direction = Math.sign(active);
        active += change;
        if (Math.sign(active) === direction) continue;
        if (direction) outline.push(direction > 0 ? segment(line, start, position) : segment(line, position, start));
        start = position;
      }
    }
  }
  trace(horizontal, (y, start, end) => [start, y, end, y]);
  trace(vertical, (x, start, end) => [x, start, x, end]);
  return outline;
}
