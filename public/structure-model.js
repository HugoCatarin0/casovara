import { shade } from './model-furniture.js';
import { wallAppearance } from './wall-spec.js';
import {
  foundationFootprint, gutterAxis, normalizeStructure, roofChimneyCenter, roofColors, roofFrame,
  roofWindowBounds, structureColors, structureRect,
} from './structure-elements.js';

function clipAt(polygon, axis, threshold, above) {
  const inside = (point) => above ? point[axis] >= threshold : point[axis] <= threshold;
  const result = [];
  let previous = polygon.at(-1);
  for (const point of polygon) {
    if (inside(point) !== inside(previous)) {
      const t = (threshold - previous[axis]) / (point[axis] - previous[axis]);
      result.push(previous.map((value, index) => value + (point[index] - value) * t));
    }
    if (inside(point)) result.push(point);
    previous = point;
  }
  return result;
}

function polygonArea(polygon) {
  return Math.abs(polygon.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = polygon[(index + 1) % polygon.length];
    return sum + x * nextY - y * nextX;
  }, 0)) / 2;
}

function subtractOpening(polygon, { x, y, width, depth }) {
  if (polygon.every(([u]) => u <= x) || polygon.every(([u]) => u >= x + width) ||
      polygon.every(([, v]) => v <= y) || polygon.every(([, v]) => v >= y + depth)) return [polygon];
  const centre = clipAt(clipAt(polygon, 0, x, true), 0, x + width, false);
  return [clipAt(polygon, 0, x, false), clipAt(polygon, 0, x + width, true),
    clipAt(centre, 1, y, false), clipAt(centre, 1, y + depth, true)]
    .filter((part) => polygonArea(part) > .000001);
}

function insetRect({ x, y, width, depth }, inset) {
  return { x: x + inset, y: y + inset, width: width - inset * 2, depth: depth - inset * 2 };
}

function frameOwner(level, item) {
  return item ? { kind: 'structure', id: item.id, levelId: level.id } : { kind: 'roof', id: level.id, levelId: level.id };
}

function verticalPrism(face, outline, bottom, top, color) {
  for (let index = 0; index < outline.length; index++) {
    const a = outline[index], b = outline[(index + 1) % outline.length];
    face([[...a, bottom], [...b, bottom], [...b, top], [...a, top]], shade(color, index % 2 ? -12 : 3));
  }
  face(outline.map((point) => [...point, top]), shade(color, 10));
}

function drawWindow(frame, item, bounds, face, topFace) {
  const trim = Math.min(.075, bounds.width * .2, bounds.depth * .2);
  const inset = insetRect(bounds, trim);
  const outline = structureRect(bounds.x, bounds.y, bounds.width, bounds.depth);
  const inside = structureRect(inset.x, inset.y, inset.width, inset.depth);
  const color = item.color ?? structureColors.roofWindow;
  const at = ([u, v], offset) => frame.world(u, v, frame.surface(u, v) + offset);
  for (let index = 0; index < outline.length; index++) {
    const next = (index + 1) % outline.length;
    face([at(outline[index], -.022), at(outline[next], -.022), at(outline[next], .064), at(outline[index], .064)], shade(color, -12));
    topFace([outline[index], outline[next], inside[next], inside[index]], color, .064);
  }
  topFace(inside, '#467386', .046);
  const shine = Math.min(.045, inset.width * .12);
  topFace(structureRect(inset.x + .014, inset.y + .02, shine, inset.depth - .04), '#689bad', .048);
}

function drawChimney(frame, item, face) {
  const { u, v, width } = roofChimneyCenter(frame, item);
  const color = item.color ?? (item.kind === 'vent' ? '#525961' : structureColors.chimney);
  const radius = width / 2;
  const corners = (r) => item.shape === 'round'
    ? Array.from({ length: 14 }, (_, index) => {
      const angle = Math.PI * index / 7;
      return frame.world(u + r * Math.cos(angle), v + r * Math.sin(angle)).slice(0, 2);
    })
    : structureRect(u - r, v - r, 2 * r, 2 * r).map(([a, b]) => frame.world(a, b).slice(0, 2));
  const base = Math.min(...corners(radius).map(([x, y]) => frame.surface(...frame.local(x, y))));
  const roofHeight = frame.surface(u, v);
  const ridge = Math.max(frame.eaves + frame.ridgeHeight, roofHeight);
  const top = (item.reference === 'ridge' ? ridge : roofHeight) + item.height;
  verticalPrism(face, corners(radius), base - .04, top - .025, color);
  verticalPrism(face, corners(radius + .035), top - .036, top, shade(color, -18));
  const inner = corners(Math.max(.02, radius - .028));
  face(inner.map((point) => [...point, top + .001]), '#2d3237');
}

function drawGutter(frame, item, bottom, face, prism) {
  const { at, from, to, along } = gutterAxis(frame, item);
  const color = item.color ?? structureColors.gutter;
  const wallOffset = along
    ? (frame.alongX ? frame.yOverhang : frame.xOverhang)
    : (frame.alongX ? frame.xOverhang : frame.yOverhang);
  const stations = !along && frame.pitch && from < frame.span / 2 && to > frame.span / 2
    ? [from, frame.span / 2, to] : [from, to];
  const lip = Math.min(item.width * .18, .018);
  const levelAt = (station) => frame.surface(...at(station)) - .02 - (station - from) / Math.max(.01, to - from) * .027;
  const section = [[0, 0], [0, -item.depth], [item.width, -item.depth], [item.width, 0],
    [item.width - lip, 0], [item.width - lip, -item.depth + lip], [lip, -item.depth + lip], [lip, 0]];
  const profile = (station) => section.map(([side, z]) => frame.world(...at(station, side), z + levelAt(station)));
  for (let index = 1; index < stations.length; index++) {
    const a = profile(stations[index - 1]), b = profile(stations[index]);
    for (let side = 0; side < a.length; side++) {
      const next = (side + 1) % a.length;
      face([a[side], b[side], b[next], a[next]], shade(color, side > 3 ? -11 : 2));
    }
    if (index === 1) face(a.slice(0, 4).reverse(), color);
    if (index === stations.length - 1) face(b.slice(0, 4), color);
  }
  if (item.downspout) {
    const location = Math.max(from + (to - from) * .5, to - .18);
    const pipeWidth = Math.min(.092, item.width * .66);
    const a = frame.world(...at(location, item.width * .51));
    const b = frame.world(...at(location, -Math.max(0, wallOffset - pipeWidth)));
    const sleeveBottom = levelAt(location) - item.depth - .16;
    const pipeHeight = sleeveBottom - bottom;
    const tube = ([x, y]) => structureRect(x - pipeWidth / 2, y - pipeWidth / 2, pipeWidth, pipeWidth);
    const palette = [shade(color, 8), color, shade(color, -12)];
    prism(tube(a), sleeveBottom, .17, palette);
    prism(structureRect(Math.min(a[0], b[0]) - pipeWidth / 2, Math.min(a[1], b[1]) - pipeWidth / 2,
      Math.abs(a[0] - b[0]) + pipeWidth, Math.abs(a[1] - b[1]) + pipeWidth), sleeveBottom, pipeWidth, palette);
    if (pipeHeight > .04) prism(tube(b), bottom, pipeHeight, palette);
  }
}

function flatPlates(frame) {
  const plates = frame.plates.map(({ x, y, width, depth }) => ({ u1: x, v1: y, u2: x + width, v2: y + depth }));
  const boundaries = [...new Set(plates.flatMap(({ v1, v2 }) => [v1, v2]))].sort((a, b) => a - b);
  const merged = [];
  for (let index = 1; index < boundaries.length; index++) {
    const start = boundaries[index - 1], end = boundaries[index];
    const spans = plates.filter(({ v1, v2 }) => v1 < end && v2 > start).sort((a, b) => a.u1 - b.u1);
    let range;
    for (const { u1, u2 } of spans) {
      if (range && u1 <= range.end) range.end = Math.max(range.end, u2);
      else {
        range = { start: u1, end: u2 };
        merged.push({ start, end, range });
      }
    }
  }
  return merged.map(({ start, end, range }) => structureRect(range.start, start, range.end - range.start, end - start));
}

function coveredInTiles(polygon, windows) {
  return windows.reduce((pieces, { bounds }) => pieces.flatMap((part) => subtractOpening(part, bounds)), [polygon]);
}

function gableWall(level, frame, side, face, setOwner) {
  const { length, span, world, local, surface, alongX, spec, eaves } = frame;
  const front = side === 0;
  const end = front ? spec.gableOverhang : length - spec.gableOverhang;
  const { exterior, range } = (level.walls ?? []).map((wall) => {
    const [u1, v1] = local(wall.x1, wall.y1), [u2, v2] = local(wall.x2, wall.y2);
    const start = Math.min(v1, v2), stop = Math.max(v1, v2);
    const fit = Math.max(Math.abs(u1 - end), Math.abs(u2 - end));
    return { wall, u: (u1 + u2) / 2, start, stop, length: stop - start, fit };
  }).filter(({ fit, length }) => fit < .2 && length > (span - 2 * spec.eavesOverhang) * .56)
    .sort((a, b) => a.fit - b.fit || b.length - a.length)
    .map((range) => ({ range, exterior: range.wall.spec ? wallAppearance(range.wall).exterior : (front ? '#e2d9c9' : '#d0c4ae') }))[0] ??
    { exterior: front ? '#e2d9c9' : '#d0c4ae' };
  const u = range ? range.u + (front ? -1 : 1) * range.wall.thickness / 2 : end;
  const intervals = range ? [range.start, range.stop] : [0, span];
  if (intervals[0] < span / 2 && intervals[1] > span / 2) intervals.splice(1, 0, span / 2);
  setOwner(range ? { kind: 'walls', id: range.wall.id, levelId: level.id } : frameOwner(level));
  const upper = intervals.toReversed().filter((v) => surface(u, v) > eaves + 1e-8).map((v) => world(u, v, surface(u, v)));
  const points = [world(u, intervals[0], eaves), world(u, intervals.at(-1), eaves), ...upper];
  if (points.length < 3) return;
  if (front) points.reverse();
  face(points, exterior, 1, { invert: !alongX });
}

export function appendStructureRoof(level, base, { face, prism, setOwner, settings }) {
  const frame = roofFrame(level, base);
  if (!frame) return;
  const { length, span, inset, pitch, eaves, spec, alongX, surface, world } = frame;
  const structure = normalizeStructure(level.structure, level);
  const plates = pitch ? [] : flatPlates(frame);
  const windows = structure.filter(({ type }) => type === 'roofWindow').map((item) => ({ item, bounds: roofWindowBounds(frame, item) }))
    .filter(({ bounds }) => bounds);
  const material = spec.color ?? (pitch ? roofColors[spec.covering] : spec.covering === 'tile' ? '#b2a390' : roofColors[spec.covering]);
  const orientation = { invert: !alongX };
  const onRoof = ([u, v], offset = 0) => world(u, v, surface(u, v) + offset);
  const topFace = (polygon, color, offset = 0) => face(polygon.map((local) => onRoof(local, offset)), color, 1, orientation);
  const tiledFace = (polygon, color, offset = 0) => {
    if (polygonArea(polygon) <= .000001) return;
    for (const tile of coveredInTiles(polygon, windows)) topFace(tile, color, offset);
  };
  setOwner(frameOwner(level));
  if (!pitch) {
    for (const polygon of plates) {
      tiledFace(polygon, material);
      tiledFace(polygon, shade(material, -9), -.18);
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i], b = polygon[(i + 1) % polygon.length];
        face([onRoof(a, -.18), onRoof(b, -.18), onRoof(b), onRoof(a)], shade(material, -15), 1, orientation);
      }
    }
  } else {
    const a = [0, 0], b = [length, 0], c = [length, span], d = [0, span];
    const left = [inset, span / 2], right = [length - inset, span / 2];
    const planes = [[[a, b, right, left], 0], [[c, d, left, right], -12]];
    if (inset) planes.push([[d, a, left], -6], [[b, c, right], 8]);
    else {
      gableWall(level, frame, 0, face, setOwner);
      gableWall(level, frame, 1, face, setOwner);
      setOwner(frameOwner(level));
    }
    for (const [polygon, tone] of planes) {
      const color = shade(material, tone);
      tiledFace(polygon, color);
      if (settings?.materials && settings.materials !== 'natural') continue;
      if (spec.covering === 'membrane') continue;
      const axis = spec.covering === 'metal' ? 0 : 1;
      const [low, high] = [Math.min(...polygon.map((p) => p[axis])), Math.max(...polygon.map((p) => p[axis]))];
      const count = Math.min(35, Math.ceil((high - low) / (axis ? .34 : .45)));
      for (let index = 1; index < count; index++) {
        const t = low + (high - low) * index / count;
        const stripe = clipAt(clipAt(polygon, axis, t, true), axis, t + (axis ? .025 : .016), false);
        tiledFace(stripe, shade(color, axis ? -16 : 18), .008);
      }
    }
    const corners = [a, b, c, d];
    for (let i = 0; i < 4; i++) {
      const p = corners[i], q = corners[(i + 1) % 4];
      const edge = !inset && i % 2 ? [p, i === 1 ? right : left, q] : [p, q];
      for (let j = 1; j < edge.length; j++) {
        const u = edge[j - 1], v = edge[j];
        face([onRoof(u, -.108), onRoof(v, -.108), onRoof(v), onRoof(u)], shade(material, -23), 1, orientation);
      }
    }
    if (length - 2 * inset > .12) {
      const ridge = structureRect(inset, span / 2 - .055, length - 2 * inset, .11).map((point) => world(...point).slice(0, 2));
      prism(ridge, eaves + frame.ridgeHeight - .037, .075, [shade(material, 5), shade(material, -7), shade(material, -14)]);
    }
  }
  if (spec.offset > .02) {
    const { x, y, width, depth } = frame.inner;
    const structureColors = ['#e2d9c9', '#d0c4ae', '#ded6ca'];
    const corners = structureRect(x, y, width, depth);
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i], b = corners[(i + 1) % corners.length];
      face([[...a, base], [...b, base], [...b, eaves], [...a, eaves]], structureColors[i % 2 + 1]);
    }
  }
  for (const { item, bounds } of windows) {
    setOwner(frameOwner(level, item));
    drawWindow(frame, item, bounds, face, topFace);
  }
  for (const item of structure) {
    if (item.type === 'chimney') {
      setOwner(frameOwner(level, item));
      drawChimney(frame, item, face);
    } else if (item.type === 'gutter') {
      setOwner(frameOwner(level, item));
      drawGutter(frame, item, base - level.height + .08, face, prism);
    }
  }
}

export function appendFoundations(level, datum, { prism, setOwner }) {
  for (const item of normalizeStructure(level.structure, level)) {
    if (item.type !== 'foundation') continue;
    const footprint = foundationFootprint(level, item);
    if (!footprint.length) continue;
    const color = item.color ?? structureColors.foundation;
    setOwner(frameOwner(level, item));
    prism(footprint, datum + item.bottom, item.footingHeight, [shade(color, 11), shade(color, -9), shade(color, -15)]);
    const wallHeight = item.top - item.bottom - item.footingHeight;
    if (wallHeight > .001) {
      const wall = foundationFootprint(level, item, item.wallThickness);
      prism(wall, datum + item.bottom + item.footingHeight, wallHeight, [shade(color, 5), color, shade(color, -8)]);
    }
  }
}
