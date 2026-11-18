import { slabFootprints } from './slab.js';

export const serviceRouteSurfaces = Object.freeze(['floor', 'ceiling']);

const tolerance = .000501;
const parameterTolerance = 1e-9;
const ceilingMedia = new Set(['lighting', 'control', 'refrigerant']);
const externalKinds = new Set(['supplyEntry', 'waterEntry', 'sewerOutlet', 'outsideAir', 'exhaustOutlet', 'outdoorUnit', 'condensateDrain']);

export function serviceRunSurface(systemId, run) {
  if (serviceRouteSurfaces.includes(run.surface)) return run.surface;
  return systemId === 'vmc' || ceilingMedia.has(run.medium) ? 'ceiling' : 'floor';
}

export function isServiceExteriorNode(node) {
  return externalKinds.has(node?.kind);
}

export function serviceSurfaceFootprints(level, surface) {
  if (surface === 'ceiling') return slabFootprints({ ...level, slab: { mode: 'auto' } });
  const terraces = (Array.isArray(level?.rooms) ? level.rooms : []).filter((room) => room?.type === 'outdoor' &&
    [room.x, room.y, room.w, room.h].every(Number.isFinite) && room.w > 0 && room.h > 0);
  return [...slabFootprints(level), ...terraces.map(({ x, y, w, h }) => ({ x, y, width: w, depth: h }))];
}

function intervalInRectangle(from, to, { x, y, width, depth }) {
  let start = 0;
  let end = 1;
  for (const [axis, minimum, maximum] of [['x', x, x + width], ['y', y, y + depth]]) {
    const low = minimum - tolerance;
    const high = maximum + tolerance;
    const delta = to[axis] - from[axis];
    if (Math.abs(delta) < parameterTolerance) {
      if (from[axis] < low || from[axis] > high) return null;
      continue;
    }
    const a = (low - from[axis]) / delta;
    const b = (high - from[axis]) / delta;
    start = Math.max(start, Math.min(a, b));
    end = Math.min(end, Math.max(a, b));
    if (end - start <= parameterTolerance) return null;
  }
  return [start, end];
}

function supportedIntervals(from, to, footprints) {
  const ranges = [];
  for (const area of footprints) {
    const interval = intervalInRectangle(from, to, area);
    if (!interval) continue;
    if (interval[0] === 0 && interval[1] === 1) return [interval];
    ranges.push(interval);
  }
  ranges.sort(([a], [b]) => a - b);
  const merged = [];
  for (const [start, end] of ranges) {
    const last = merged.at(-1);
    if (last && start <= last[1] + parameterTolerance) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

const pointAt = (from, to, t) => t === 0 ? { x: from.x, y: from.y } : t === 1 ? { x: to.x, y: to.y }
  : { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
const pointDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const samePoint = (a, b) => pointDistance(a, b) < parameterTolerance;

export function supportedRouteSpans(points, footprints, { exteriorFrom = false, exteriorTo = false } = {}) {
  const spans = [];
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    if (samePoint(from, to)) continue;
    const append = (start, end, supported) => {
      if (end - start > parameterTolerance) spans.push({ from: pointAt(from, to, start), to: pointAt(from, to, end), supported });
    };
    let position = 0;
    for (const [start, end] of supportedIntervals(from, to, footprints)) {
      append(position, start, false);
      append(start, end, true);
      position = end;
    }
    append(position, 1, false);
  }
  const first = spans.findIndex(({ supported }) => supported);
  if (first < 0 || (!exteriorFrom && !exteriorTo)) return spans;
  const last = spans.findLastIndex(({ supported }) => supported);
  return spans.map((span, index) => (exteriorFrom && index < first) || (exteriorTo && index > last) ? { ...span, exterior: true } : span);
}

function permitsSpan(from, to, footprints) {
  const intervals = supportedIntervals(from, to, footprints);
  return intervals.length === 1 && intervals[0][0] === 0 && intervals[0][1] === 1;
}

function nearestOnFootprint(point, footprints) {
  let best = null;
  let shortest = Infinity;
  for (const { x, y, width, depth } of footprints) {
    const candidate = { x: Math.max(x, Math.min(x + width, point.x)), y: Math.max(y, Math.min(y + depth, point.y)) };
    const distance = pointDistance(point, candidate);
    if (distance < shortest) {
      best = candidate;
      shortest = distance;
    }
  }
  return best;
}

function visibilityGraph(footprints) {
  const vertices = new Map();
  for (const { x, y, width, depth } of footprints) {
    for (const [a, b] of [[x, y], [x + width, y], [x, y + depth], [x + width, y + depth]]) {
      vertices.set(`${a}:${b}`, { x: a, y: b });
    }
    // Limit proposal work for very large imported drawings. Partial paths can still
    // be drawn and edited, and unsupported spans remain visible in the plan.
    if (vertices.size > 160) return null;
  }
  const points = [...vertices.values()];
  const edges = points.map(() => []);
  for (let from = 0; from < points.length; from++) {
    for (let to = from + 1; to < points.length; to++) {
      if (!permitsSpan(points[from], points[to], footprints)) continue;
      const length = pointDistance(points[from], points[to]);
      edges[from].push([to, length]);
      edges[to].push([from, length]);
    }
  }
  return { points, edges };
}

function shortestPath(graph, from, to, footprints) {
  if (permitsSpan(from, to, footprints)) return [from, to];
  if (!graph) return null;
  const points = [...graph.points, from, to];
  const start = points.length - 2;
  const end = points.length - 1;
  const edges = graph.edges.map((list, index) => {
    const point = points[index];
    return permitsSpan(point, to, footprints) ? [...list, [end, pointDistance(point, to)]] : list;
  });
  edges.push(graph.points.flatMap((point, index) => permitsSpan(from, point, footprints) ? [[index, pointDistance(from, point)]] : []), []);
  const distances = points.map(() => Infinity);
  const previous = points.map(() => -1);
  const open = new Set(points.keys());
  distances[start] = 0;
  while (open.size) {
    let current = -1;
    let shortest = Infinity;
    for (const index of open) {
      if (distances[index] >= shortest) continue;
      current = index;
      shortest = distances[index];
    }
    if (current < 0) return null;
    if (current === end) {
      const path = [];
      for (let index = end; index >= 0; index = previous[index]) path.push(points[index]);
      return path.reverse();
    }
    open.delete(current);
    for (const [destination, distance] of edges[current]) {
      if (shortest + distance >= distances[destination]) continue;
      distances[destination] = shortest + distance;
      previous[destination] = current;
    }
  }
  return null;
}

export function createServiceSurfaceRouter(footprints) {
  let graph;
  return (points, exterior = {}) => {
    const spans = supportedRouteSpans(points, footprints, exterior);
    if (!spans.some((span) => !span.supported && !span.exterior)) return points;
    const from = points[0];
    const to = points.at(-1);
    const a = nearestOnFootprint(from, footprints);
    const b = nearestOnFootprint(to, footprints);
    if (!a || !b || (!exterior.exteriorFrom && pointDistance(from, a) > tolerance) ||
      (!exterior.exteriorTo && pointDistance(to, b) > tolerance)) return points;
    if (graph === undefined) graph = visibilityGraph(footprints);
    const path = shortestPath(graph, a, b, footprints);
    return path ? [from, ...path, to].filter((point, index, chain) => index === 0 || !samePoint(chain[index - 1], point)) : points;
  };
}
