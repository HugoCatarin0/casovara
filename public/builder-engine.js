import { furnitureModel, shade } from './model-furniture.js';
import { appendModelServices } from './model-services.js';
import { normalizeBuildingServices } from './building-services.js';
import { elements, normalizeObjectCatalogRef } from './object-catalog.js';
import { groundShadow, lightSurface, simulatorDefaults, sunSurfaceColor, sunVector } from './simulator.js';
import { effectiveWallHeight, openingVertical, wallAppearance, wallBaseOffset } from './wall-spec.js';

export { elements } from './object-catalog.js';

export const roomStyles = {
  living: { fill: '#e4e8d9', floor: '#9fae8a', pt: 'Sala', en: 'Living room' },
  kitchen: { fill: '#ebdfc8', floor: '#cbb488', pt: 'Cozinha', en: 'Kitchen' },
  bedroom: { fill: '#eadad1', floor: '#c8a092', pt: 'Quarto', en: 'Bedroom' },
  bath: { fill: '#dce7e4', floor: '#98b5b1', pt: 'Casa de banho', en: 'Bathroom' },
  circulation: { fill: '#eae6dd', floor: '#b8ae99', pt: 'Circulação', en: 'Circulation' },
  outdoor: { fill: '#edede3', floor: '#b5b99c', pt: 'Exterior', en: 'Outdoor' },
};

export const templateKeys = ['courtyard', 'studio', 'blank'];
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
export const point = (x, y) => ({ x, y });
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const snapTo = (value, grid = 0.1) => Math.round(value / grid) * grid;

export function makeRoom(type, x, y, w, h) {
  return { id: uid(), type, x, y, w, h };
}

export function makeWall(x1, y1, x2, y2, thickness = 0.15) {
  return { id: uid(), x1, y1, x2, y2, thickness };
}

export function makeItem(type, x, y, angle = 0) {
  const { width, depth } = elements[type];
  return { id: uid(), type, x, y, width, depth, angle };
}

export function makeLevel(name, height = 2.7) {
  return { id: uid(), name, height, rooms: [], walls: [], items: [], measurements: [] };
}

export function makeProject(template, systemId, isPt, name) {
  const ground = makeLevel(isPt ? 'Rés do chão' : 'Ground floor');
  const names = {
    courtyard: isPt ? 'Casa do Pátio' : 'Courtyard house',
    studio: isPt ? 'Estúdio' : 'Studio',
    blank: isPt ? 'Novo projeto' : 'New project',
  };
  if (template === 'courtyard') {
    ground.rooms = [
      makeRoom('living', 0, 0, 5.4, 3.8), makeRoom('kitchen', 0, 3.8, 3.8, 2.8),
      makeRoom('circulation', 3.8, 3.8, 1.6, 2.8), makeRoom('bedroom', 5.4, 0, 3.6, 4.2),
      makeRoom('bath', 5.4, 4.2, 2.1, 2.4), makeRoom('outdoor', 7.5, 4.2, 1.5, 2.4),
    ];
    ground.walls = [
      makeWall(0, 0, 9, 0, 0.24), makeWall(9, 0, 9, 4.2, 0.24), makeWall(9, 4.2, 7.5, 4.2, 0.24),
      makeWall(7.5, 4.2, 7.5, 6.6, 0.24), makeWall(7.5, 6.6, 0, 6.6, 0.24),
      makeWall(0, 6.6, 0, 0, 0.24), makeWall(0, 3.8, 5.4, 3.8), makeWall(5.4, 0, 5.4, 6.6),
      makeWall(3.8, 3.8, 3.8, 6.6), makeWall(5.4, 4.2, 7.5, 4.2),
    ];
    ground.items = [
      makeItem('sofa', 2.53, 0.72), makeItem('table', 2.44, 2.4), makeItem('kitchen', 1.8, 6.14),
      makeItem('bed', 7.7, 1.42), makeItem('cupboard', 8.1, 3.75), makeItem('bath', 6.5, 6.08),
      makeItem('toilet', 7.06, 4.86, 180), makeItem('tree', 8.28, 5.6),
      makeItem('slidingWindow', 2.2, 0), makeItem('window', 7.12, 0), makeItem('window', 0, 5.2, 90),
      makeItem('door', 4.56, 6.6), makeItem('door', 4.54, 3.8), makeItem('door', 5.4, 3.06, 90),
      makeItem('door', 5.4, 5.02, 90), makeItem('door', 3.8, 4.72, 90),
    ];
  }
  if (template === 'studio') {
    ground.rooms = [makeRoom('living', 0, 0, 5.6, 5.5), makeRoom('bath', 5.6, 0, 2, 2.3), makeRoom('circulation', 5.6, 2.3, 2, 3.2)];
    ground.walls = [
      makeWall(0, 0, 7.6, 0, 0.24), makeWall(7.6, 0, 7.6, 5.5, 0.24), makeWall(7.6, 5.5, 0, 5.5, 0.24),
      makeWall(0, 5.5, 0, 0, 0.24), makeWall(5.6, 0, 5.6, 2.3), makeWall(5.6, 2.3, 7.6, 2.3),
    ];
    ground.items = [
      makeItem('sofa', 1.3, 1, -90), makeItem('bed', 1.27, 4.08), makeItem('kitchen', 3.6, 4.95),
      makeItem('table', 3.92, 1.65), makeItem('shower', 6.99, 0.72), makeItem('toilet', 6, 0.65),
      makeItem('door', 6.65, 5.5), makeItem('door', 6.24, 2.3), makeItem('slidingWindow', 3, 0),
    ];
  }
  return { name: name || names[template] || names.blank, systemId, levelId: ground.id, levels: [ground] };
}

function numeric(value, fallback, min = -500, max = 500) {
  const number = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(number) ? clamp(number, min, max) : fallback;
}

export function normalizeProject(input, systemIds, isPt) {
  if (!input || !Array.isArray(input.levels) || input.levels.length === 0) throw new Error('Invalid project');
  function uniqueId(value, used) {
    const valid = typeof value === 'string' && /^[a-zA-Z\d_-]{1,90}$/.test(value) && !used.has(value);
    const id = valid ? value : uid();
    used.add(id);
    return id;
  }
  const used = new Set();
  const name = (value, fallback = '') => typeof value === 'string' ? value.trim().slice(0, 95) || fallback : fallback;
  const list = (value) => Array.isArray(value) ? value.filter((entry) => entry && typeof entry === 'object').slice(0, 1000) : [];
  const levels = list(input.levels).slice(0, 20).map((level, index) => ({
    id: uniqueId(level.id, used), name: name(level.name, isPt ? `Piso ${index}` : `Level ${index}`),
    height: numeric(level.height, 2.7, 1.5, 12),
    rooms: list(level.rooms).map((room) => ({
      id: uniqueId(room.id, used), type: Object.hasOwn(roomStyles, room.type) ? room.type : 'living',
      name: name(room.name), x: numeric(room.x, 0), y: numeric(room.y, 0), w: numeric(room.w, 1, 0.35, 100), h: numeric(room.h, 1, 0.35, 100),
    })),
    walls: list(level.walls).map((wall) => ({
      id: uniqueId(wall.id, used), x1: numeric(wall.x1, 0), y1: numeric(wall.y1, 0),
      x2: numeric(wall.x2, 0), y2: numeric(wall.y2, 0), thickness: numeric(wall.thickness, 0.15, 0.05, 1.5),
    })).filter((wall) => wallLength(wall) > 0.01),
    items: list(level.items).filter((item) => Object.hasOwn(elements, item.type)).map((item) => {
      const profile = elements[item.type];
      const catalogRef = !profile.opening && normalizeObjectCatalogRef(item.catalogRef);
      return {
        id: uniqueId(item.id, used), type: item.type, x: numeric(item.x, 0), y: numeric(item.y, 0),
        width: numeric(item.width, profile.width, 0.1, 20), depth: numeric(item.depth, profile.depth, 0.05, 20),
        angle: numeric(item.angle, 0, -360, 360),
        ...(!profile.opening && Number.isFinite(item.height) ? { height: numeric(item.height, profile.height, .01, 12) } : {}),
        ...(catalogRef ? { catalogRef } : {}),
      };
    }),
    measurements: list(level.measurements).map((measure) => ({
      id: uniqueId(measure.id, used), x1: numeric(measure.x1, 0), y1: numeric(measure.y1, 0), x2: numeric(measure.x2, 0), y2: numeric(measure.y2, 0),
    })),
    ...(Object.hasOwn(level, 'services') ? { services: normalizeBuildingServices(level.services) } : {}),
  }));
  if (!levels.length) throw new Error('Invalid project');
  return {
    name: name(input.name, isPt ? 'Novo projeto' : 'New project'), systemId: systemIds.includes(input.systemId) ? input.systemId : systemIds[0],
    levelId: levels.some((level) => level.id === input.levelId) ? input.levelId : levels[0].id, levels,
  };
}

export function wallLength(wall) {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
}

export function findWall(location, walls, threshold = 0.55, openingWidth = 0) {
  let nearest = null;
  let minDist = threshold;
  for (const wall of walls) {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const length = wallLength(wall);
    if (length < Math.max(0.01, openingWidth)) continue;
    const margin = openingWidth / (2 * length);
    const ratio = clamp(((location.x - wall.x1) * dx + (location.y - wall.y1) * dy) / length ** 2, margin, 1 - margin);
    const x = wall.x1 + dx * ratio;
    const y = wall.y1 + dy * ratio;
    const dist = Math.hypot(location.x - x, location.y - y);
    if (dist < minDist) {
      minDist = dist;
      nearest = { wall, x, y, ratio, angle: Math.atan2(dy, dx) * 180 / Math.PI };
    }
  }
  return nearest;
}

export function levelBounds(level) {
  const points = [];
  for (const { x, y, w, h } of level.rooms) points.push({ x, y }, { x: x + w, y: y + h });
  for (const { x1, y1, x2, y2 } of [...level.walls, ...level.measurements]) points.push({ x: x1, y: y1 }, { x: x2, y: y2 });
  for (const { x, y, width, depth } of level.items) {
    const radius = Math.hypot(width, depth) / 2;
    points.push({ x: x - radius, y: y - radius }, { x: x + radius, y: y + radius });
  }
  for (const network of Object.values(level.services ?? {})) {
    for (const node of network?.nodes ?? []) points.push(node);
    for (const run of network?.runs ?? []) for (const vertex of run.points ?? []) points.push(vertex);
  }
  let x = Infinity, y = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const point of points) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) continue;
    x = Math.min(x, point.x);
    y = Math.min(y, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return x === Infinity ? { x: -5, y: -3.5, width: 10, height: 7 }
    : { x, y, width: Math.max(1, maxX - x), height: Math.max(1, maxY - y) };
}

function unionArea(rooms) {
  const edges = [...new Set(rooms.flatMap((room) => [room.x, room.x + room.w]))].sort((a, b) => a - b);
  let result = 0;
  for (let index = 0; index + 1 < edges.length; index++) {
    const left = edges[index];
    const right = edges[index + 1];
    const spans = rooms.filter((room) => room.x < right && room.x + room.w > left).map((room) => [room.y, room.y + room.h]).sort((a, b) => a[0] - b[0]);
    let lastEnd = -Infinity;
    for (const [start, end] of spans) {
      result += Math.max(0, end - Math.max(lastEnd, start)) * (right - left);
      lastEnd = Math.max(end, lastEnd);
    }
  }
  return result;
}

export function projectArea(project) {
  return project.levels.reduce((total, level) => total + unionArea(level.rooms.filter((room) => room.type !== 'outdoor')), 0);
}

export function modelFaces(project, levelId, cutaway, {
  scope = 'through', roof: showRoof = true, selected = null, site = false, simulator,
  services = [], selectedService = null,
} = {}) {
  const index = project.levels.findIndex((level) => level.id === levelId);
  const visibleLevels = scope === 'all' ? project.levels : scope === 'level'
    ? project.levels.slice(Math.max(0, index), index + 1) : project.levels.slice(0, index + 1);
  const topLevel = visibleLevels.at(-1);
  const settings = simulator ? { ...simulatorDefaults, ...simulator } : null;
  const sun = settings ? sunVector(settings.sunAzimuth, settings.sunElevation) : null;
  const faces = [];
  const serviceFaces = [];
  const displayedServices = new Set(services);
  let owner = null;
  const isSelected = () => owner && owner.kind === selected?.kind && owner.id === selected.id && owner.levelId === levelId;
  function face(points, fill, opacity = 1, { invert = false, preserve = false } = {}) {
    if (settings && opacity === 1) {
      const material = preserve ? fill : sunSurfaceColor(fill, settings.materials, owner, isSelected());
      fill = lightSurface(points, material, sun, invert);
    }
    faces.push({ points, fill, opacity, owner });
  }
  function prism(footprint, base, height, color, opacity = 1, preserve = false) {
    const top = footprint.map(([x, y]) => [x, y, base + height]);
    const bottom = footprint.map(([x, y]) => [x, y, base]);
    const sign = (top[1][0] - top[0][0]) * (top[2][1] - top[0][1]) - (top[1][1] - top[0][1]) * (top[2][0] - top[0][0]);
    const lighting = { invert: sign < 0, preserve };
    for (let index = 0; index < 4; index++) {
      const next = (index + 1) % 4;
      face([bottom[index], bottom[next], top[next], top[index]], color[color.length === 5 ? index + 1 : index % 2 + 1], opacity, lighting);
    }
    face(top, color[0], opacity, lighting);
  }
  const rect = (x, y, width, depth) => [[x, y], [x + width, y], [x + width, y + depth], [x, y + depth]];
  const finishes = { wood: '#c6a47c', ceramic: '#e4dccc', concrete: '#a5aaa4', stone: '#a29d91' };
  const studioFloors = { wood: '#bf9e78', ceramic: '#d8d9d1', concrete: '#a6aaa7', stone: '#baa995' };

  function surfaceRect(x, y, width, depth, z, fill, preserve = false) {
    if (width > 0 && depth > 0) face(rect(x, y, width, depth).map(([a, b]) => [a, b, z]), fill, 1, { preserve });
  }

  function floorFinish(room, z, finish, color) {
    if (!settings || settings.materials !== 'natural' || room.type === 'outdoor' || isSelected() || finish === 'concrete') return;
    const { x, y, w, h } = room;
    const plank = finish === 'wood';
    const step = Math.max(plank ? .2 : finish === 'stone' ? .62 : .5, h / 32, w / 44);
    const widthStep = plank ? Math.max(1.28, w / 16) : step;
    const joint = plank ? .014 : .016;
    const edge = .04;
    for (let i = 1; i * step < h - edge; i++) {
      surfaceRect(x + edge, y + i * step, w - 2 * edge, joint, z + .003, shade(color, plank ? -18 : -13));
    }
    if (!plank) {
      for (let j = 1; j * widthStep < w - edge; j++) {
        surfaceRect(x + j * widthStep, y + edge, joint, h - 2 * edge, z + .003, shade(color, -13));
      }
      return;
    }
    for (let row = 0; row * step < h; row++) {
      const start = y + row * step + joint;
      const depth = Math.min(step - joint, y + h - start - edge);
      const setback = (row % 3) * .43;
      const tint = Math.round(5 * Math.cos(row * 3.71));
      surfaceRect(x + edge, start, w - 2 * edge, depth, z + .002, shade(color, tint));
      for (let j = 1; j * widthStep - setback < w - edge; j++) {
        surfaceRect(x + j * widthStep - setback, start, joint, depth, z + .004, shade(color, -17 + tint));
      }
    }
  }

  function captureShadows(casters, receiver, opacity) {
    for (const surface of casters) {
      const shadow = groundShadow(surface.points, receiver, sun);
      if (shadow.length > 2) face(shadow, '#303a32', opacity);
    }
  }

  function roof(level, base) {
    const indoor = level.rooms.filter((room) => room.type !== 'outdoor');
    const footprint = indoor.flatMap(({ x, y, w, h }) => [[x, y], [x + w, y + h]]);
    if (!footprint.length) footprint.push(...level.walls.flatMap(({ x1, y1, x2, y2 }) => [[x1, y1], [x2, y2]]));
    if (!footprint.length) return;
    const xs = footprint.map(([x]) => x);
    const ys = footprint.map(([, y]) => y);
    const x = Math.min(...xs) - 0.28;
    const y = Math.min(...ys) - 0.28;
    const width = Math.max(...xs) + 0.28 - x;
    const depth = Math.max(...ys) + 0.28 - y;
    if (width < 0.9 || depth < 0.9) return;
    if (level.roof === 'flat') {
      const colors = ['#b2a390', '#a69b8d', '#c7b9a8'];
      if (!indoor.length) prism(rect(x, y, width, depth), base, .18, colors);
      const plates = indoor.map(({ x, y, w, h }) => ({ x1: x - .28, x2: x + w + .28, y1: y - .28, y2: y + h + .28 }));
      const boundaries = [...new Set(plates.flatMap(({ y1, y2 }) => [y1, y2]))].sort((a, b) => a - b);
      for (let index = 1; index < boundaries.length; index++) {
        const top = boundaries[index - 1], bottom = boundaries[index];
        const intervals = plates.filter(({ y1, y2 }) => y1 < bottom && y2 > top).sort((a, b) => a.x1 - b.x1);
        let end = -Infinity;
        for (const { x1, x2 } of intervals) {
          const start = Math.max(x1, end);
          if (x2 > start) prism(rect(start, top, x2 - start, bottom - top), base, .18, colors);
          end = Math.max(end, x2);
        }
      }
      return;
    }
    const alongX = width >= depth;
    const length = alongX ? width : depth;
    const span = alongX ? depth : width;
    const ridgeHeight = span / 2 * Math.tan(clamp(level.pitch ?? 30, 5, 65) * Math.PI / 180);
    const inset = level.roof === 'hipped' ? Math.min(length * 0.42, span / 2) : 0;
    const world = (u, v, height = 0) => alongX ? [x + u, y + v, base + height] : [x + v, y + u, base + height];
    const a = world(0, 0), b = world(length, 0), c = world(length, span), d = world(0, span);
    const left = world(inset, span / 2, ridgeHeight), right = world(length - inset, span / 2, ridgeHeight);
    prism(rect(x, y, width, depth), base - 0.12, 0.12, ['#b38165', '#b87d62', '#a4644e']);
    function slope(start, end, crestStart, crestEnd, color, length) {
      const orientation = { invert: !alongX };
      face([start, end, crestEnd, crestStart], color, 1, orientation);
      const mix = (from, to, t) => from.map((value, axis) => value + (to[axis] - value) * t);
      const course = (t, u) => {
        const point = mix(mix(start, crestStart, t), mix(end, crestEnd, t), u);
        point[2] += .011;
        return point;
      };
      const count = Math.min(28, Math.round(length / .39));
      for (let row = 1; row < count; row++) {
        const t = row / count;
        face([course(t, .005), course(t, .995), course(t + .003, .995), course(t + .003, .005)], shade(color, -17), 1, orientation);
      }
    }
    const slopeWidth = Math.hypot(span / 2, ridgeHeight);
    slope(a, b, left, right, '#af7259', slopeWidth);
    slope(c, d, right, left, '#975b48', slopeWidth);
    if (inset) {
      slope(d, a, left, left, '#a66853', slopeWidth);
      slope(b, c, right, right, '#b47c60', slopeWidth);
    } else {
      face([d, a, left], '#e2d9c9', 1, { invert: !alongX });
      face([b, c, right], '#d0c4ae', 1, { invert: !alongX });
    }
    if (settings && length - 2 * inset > .12) {
      const ridge = [world(inset, span / 2 - .055), world(length - inset, span / 2 - .055),
        world(length - inset, span / 2 + .055), world(inset, span / 2 + .055)];
      prism(ridge, base + ridgeHeight - .04, .14, ['#a66e57', '#85523d', '#98624d']);
    }
  }

  function offsetFootprint(wall, from, to, thickness = wall.thickness) {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const factor = thickness / (wallLength(wall) * 2);
    const x1 = wall.x1 + dx * from;
    const y1 = wall.y1 + dy * from;
    const x2 = wall.x1 + dx * to;
    const y2 = wall.y1 + dy * to;
    return [[x1 - dy * factor, y1 + dx * factor], [x2 - dy * factor, y2 + dx * factor], [x2 + dy * factor, y2 - dx * factor], [x1 + dy * factor, y1 - dx * factor]];
  }
  function wallColors(wall, sectioned) {
    if (isSelected()) return ['#e7af7d', '#b47c58', '#c58960'];
    if (!wall.spec) return sectioned ? ['#eee3d2', '#cbbfa8', '#dfd6c3'] : ['#f0e9da', '#d0c4ae', '#e2d9c9'];
    const { exterior, interior, side } = wallAppearance(wall);
    const edge = shade(exterior, -12);
    return ['#e6d9c4', side === 1 ? exterior : interior, edge, side === 1 ? interior : exterior, edge];
  }
  function wallSolid(wall, from, to, base, height, colors) {
    prism(offsetFootprint(wall, from, to), base, height, colors);
    if (!settings || settings.materials !== 'natural' || !wall.spec || isSelected()) return;
    const appearance = wallAppearance(wall);
    const edges = offsetFootprint(wall, from, to, wall.thickness + .009);
    const segmentLength = wallLength(wall) * (to - from);
    function lines(finish, color, index) {
      if (!['stone', 'ceramic', 'timber'].includes(finish)) return;
      const start = edges[index], end = edges[index + 1];
      const point = (u, z) => [start[0] + (end[0] - start[0]) * u, start[1] + (end[1] - start[1]) * u, base + z];
      const strip = (u0, u1, z0, z1) => face([point(u0, z0), point(u1, z0), point(u1, z1), point(u0, z1)], shade(color, -20), 1, { invert: true });
      const joint = .014;
      const columns = Math.min(52, Math.round(segmentLength / (finish === 'timber' ? .19 : .48)));
      if (finish === 'timber') {
        for (let column = 1; column < columns; column++) {
          const u = column / columns;
          strip(u, Math.min(.998, u + joint / segmentLength), .015, height - .012);
        }
      } else {
        const rows = Math.min(24, Math.round(height / (finish === 'stone' ? .26 : .38)));
        for (let row = 1; row < rows; row++) {
          const z = row * height / rows;
          strip(.005, .995, z, z + joint);
        }
        if (finish === 'ceramic') {
          for (let column = 1; column < columns; column++) {
            const u = column / columns;
            strip(u, Math.min(.998, u + joint / segmentLength), .015, height - .012);
          }
        }
      }
    }
    if (height > .10) {
      lines(appearance.exteriorMaterial, appearance.exterior, appearance.side === 1 ? 0 : 2);
      lines(appearance.interiorMaterial, appearance.interior, appearance.side === 1 ? 2 : 0);
    }
  }
  function openingDetails(wall, opening, a, base, height) {
    const { b, top, sill, glass, type } = opening;
    const upper = Math.min(top, height);
    if (upper - sill < 0.015) return;
    const jamb = Math.min(.045 / wallLength(wall), (b - a) * .18);
    const frame = isSelected() ? ['#cd9c70', '#a77550', '#b78861']
      : glass ? ['#a2aba2', '#86928b', '#788980'] : ['#b49d80', '#9d876f', '#8a745d'];
    const inset = wall.thickness * .68;
    prism(offsetFootprint(wall, a, a + jamb, inset), base + sill, upper - sill, frame);
    prism(offsetFootprint(wall, b - jamb, b, inset), base + sill, upper - sill, frame);
    if (height >= top) prism(offsetFootprint(wall, a, b, inset), base + top - .045, .045, frame);
    if (glass) {
      const bed = sill + .032;
      const head = Math.max(bed, upper - (height >= top ? .045 : 0));
      const position = (fraction, z) => [wall.x1 + (wall.x2 - wall.x1) * fraction, wall.y1 + (wall.y2 - wall.y1) * fraction, base + z];
      prism(offsetFootprint(wall, a, b, inset), base + sill, upper - sill < .04 ? .01 : .032, frame);
      if (head > bed) {
        face([position(a + jamb, bed), position(b - jamb, bed), position(b - jamb, head), position(a + jamb, head)], '#8abebc', .42);
        if (type === 'slidingWindow') {
          const mid = (a + b) / 2;
          prism(offsetFootprint(wall, mid - jamb / 2, mid + jamb / 2, inset * .8), base + bed, head - bed, frame);
        }
      }
    } else if (height >= top) {
      // A full-height view shows the door leaf. Sectioned walls leave the passage open.
      const door = ['#b48762', '#a77a58', '#956647'];
      const lower = base + sill + .026;
      const leafHeight = top - sill - .085;
      if (leafHeight <= 0) return;
      if (type === 'doubleDoor') {
        const mid = (a + b) / 2;
        prism(offsetFootprint(wall, a + jamb, mid - jamb * .17, .048), lower, leafHeight, door);
        prism(offsetFootprint(wall, mid + jamb * .17, b - jamb, .048), lower, leafHeight, door);
      } else prism(offsetFootprint(wall, a + jamb, b - jamb, .048), lower, leafHeight, door);
    }
  }
  let floorZ = 0;
  for (const level of visibleLevels) {
    const sectioned = cutaway && level === topLevel;
    const baseFaces = faces.length;
    const openings = new Map();
    for (const item of level.items) {
      const type = elements[item.type];
      if (!type) continue;
      if (type.opening) {
        const nearest = findWall(item, level.walls, 0.15, item.width);
        if (nearest) {
          const width = item.width / wallLength(nearest.wall);
          const list = openings.get(nearest.wall.id) ?? [];
          const window = item.type === 'window' || item.type === 'slidingWindow';
          list.push({ a: Math.max(0, nearest.ratio - width / 2), b: Math.min(1, nearest.ratio + width / 2), ...openingVertical(item),
            glass: window, type: item.type, id: item.id });
          openings.set(nearest.wall.id, list);
        }
        continue;
      }
      if (settings && !settings.furniture && !type.structural) continue;
      owner = { kind: 'items', id: item.id, levelId: level.id };
      const material = isSelected() ? { ...type, color: '#b67d4a' } : type;
      furnitureModel(item, material, level.height, floorZ, prism, face);
    }
    for (const room of level.rooms) {
      owner = { kind: 'rooms', id: room.id, levelId: level.id };
      const finish = room.finish ?? ({ living: 'wood', bedroom: 'wood', kitchen: 'ceramic', bath: 'ceramic', circulation: 'stone', outdoor: 'concrete' })[room.type];
      const color = isSelected() ? '#d3a77b' : (settings ? studioFloors[finish] : finishes[room.finish]) ?? (roomStyles[room.type] ?? roomStyles.living).floor;
      prism(rect(room.x, room.y, room.w, room.h), floorZ - 0.17, 0.17, [color, '#958977', '#817764']);
      floorFinish(room, floorZ, finish, color);
      if (!cutaway && showRoof && level === topLevel && level.ceiling && room.type !== 'outdoor') {
        owner = null;
        prism(rect(room.x, room.y, room.w, room.h), floorZ + level.height - 0.06, 0.06, ['#edebdf', '#dcd7c9', '#d3ccbd']);
      }
    }
    for (const wall of level.walls) {
      if (wallLength(wall) < .001) continue;
      const relativeBase = wallBaseOffset(wall);
      const wallBase = floorZ + relativeBase;
      const height = effectiveWallHeight(wall, level.height);
      const wallHeight = sectioned ? Math.min(height, (settings?.sectionHeight ?? 1.12) - relativeBase) : height;
      if (wallHeight <= 0) continue;
      const wallOwner = { kind: 'walls', id: wall.id, levelId: level.id };
      owner = wallOwner;
      const colors = wallColors(wall, sectioned);
      const cuts = (openings.get(wall.id) ?? [])
        .map((opening) => ({ ...opening, sill: Math.max(0, opening.sill - relativeBase), top: opening.top - relativeBase }))
        .filter(({ a, b, sill, top }) => b > a && top > 0 && sill < wallHeight)
        .sort((a, b) => a.sill - b.sill);
      const edges = [...new Set([0, 1, ...cuts.flatMap(({ a, b }) => [a, b])])].sort((a, b) => a - b);
      for (let index = 1; index < edges.length; index++) {
        const from = edges[index - 1], to = edges[index];
        if (to - from < .000001) continue;
        let z = 0;
        for (const cut of cuts) {
          if (cut.a >= to || cut.b <= from) continue;
          if (cut.sill > z + .000001) wallSolid(wall, from, to, wallBase + z, cut.sill - z, colors);
          z = Math.max(z, Math.min(cut.top, wallHeight));
        }
        if (wallHeight > z + .000001) wallSolid(wall, from, to, wallBase + z, wallHeight - z, colors);
      }
      for (const opening of cuts) {
        owner = { kind: 'items', id: opening.id, levelId: level.id };
        openingDetails(wall, opening, opening.a, wallBase, wallHeight);
      }
    }
    if (sectioned && settings?.shadows && level.rooms.length) {
      const casters = faces.slice(baseFaces).filter(({ owner, opacity }) => owner && owner.kind !== 'rooms' && opacity === 1);
      for (const room of level.rooms) {
        owner = { kind: 'rooms', id: room.id, levelId: level.id };
        captureShadows(casters, { x: room.x, y: room.y, width: room.w, depth: room.h, z: floorZ }, .21);
      }
    }
    if (displayedServices.size) appendModelServices(serviceFaces, level, floorZ, displayedServices, selectedService);
    floorZ += level.height;
    owner = null;
    if (level === topLevel && !cutaway && showRoof && ['flat', 'gable', 'hipped'].includes(level.roof)) roof(level, floorZ);
  }
  if ((settings?.site ?? site) && (!cutaway || settings) && scope !== 'level' && faces.length) {
    if (settings) siteSurfaces(faces.slice());
    else legacySite();
  }
  return serviceFaces.length ? faces.concat(serviceFaces) : faces;

  function siteSurfaces(casters) {
    const ground = -.188;
    let left = Infinity, right = -Infinity, front = Infinity, back = -Infinity;
    for (const { points } of casters) {
      for (const [x, y] of points) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        front = Math.min(front, y);
        back = Math.max(back, y);
      }
    }
    const pad = Math.min(2.7, Math.max(1.25, Math.min(right - left, back - front) * .14));
    const bounds = { x: left - pad, y: front - pad, width: right - left + 2 * pad, depth: back - front + 2 * pad, z: ground };
    const { x, y, width, depth } = bounds;
    const natural = settings.materials === 'natural';
    const siteColors = natural ? ['#9ba880', '#6d795b', '#788165'] : ['#84918e', '#586866', '#6d7977'];
    prism(rect(x, y, width, depth), ground - .16, .16, siteColors, 1, true);
    if (natural) {
      const spacing = Math.max(1.12, width / 18, depth / 18);
      for (let row = 0; row * spacing < depth; row++) {
        for (let column = 0; column * spacing < width; column++) {
          const stepX = column * spacing, stepY = row * spacing;
          const tint = Math.round(1.4 * Math.cos(row * 2.513 + column * 1.91) + .7 * Math.cos(row - column));
          if (tint) surfaceRect(x + stepX, y + stepY, Math.min(spacing, width - stepX), Math.min(spacing, depth - stepY), ground + .001, shade(siteColors[0], tint), true);
        }
      }
    }
    if (settings.groundGrid) {
      const step = Math.max(width, depth) > 100 ? 10 : Math.max(width, depth) > 40 ? 2 : 1;
      const ink = natural ? '#798466' : '#a8b5b0';
      for (let coordinate = Math.ceil(x / step) * step; coordinate < x + width - .04; coordinate += step) {
        surfaceRect(coordinate, y, .012, depth, ground + .003, ink, true);
      }
      for (let coordinate = Math.ceil(y / step) * step; coordinate < y + depth - .04; coordinate += step) {
        surfaceRect(x, coordinate, width, .012, ground + .003, ink, true);
      }
    }
    if (settings.shadows) captureShadows(casters.filter(({ owner, opacity }) => owner?.kind !== 'rooms' && opacity === 1), bounds, .42);
  }

  function legacySite() {
    const pad = 1.05;
    const ground = -.19;
    const shadowColor = '#53563f';
    const exposed = faces.filter(({ owner }) => !owner || owner.kind === 'walls');
    let left = Infinity, right = -Infinity, front = Infinity, back = -Infinity;
    for (const { points } of faces) {
      for (const [x, y] of points) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        front = Math.min(front, y);
        back = Math.max(back, y);
      }
    }
    const shift = Math.min(2.65, floorZ * .31);
    const perimeter = rect(left - pad, front - pad - shift, right - left + 2 * pad + shift, back - front + 2 * pad + shift);
    prism(perimeter, ground - .22, .22, ['#c3c7ab', '#aaae92', '#a3a88c']);
    for (const { points } of exposed) {
      if (points.every((point) => point[2] <= ground)) continue;
      const shadow = points.map(([x, y, z]) => {
        const offset = Math.min(shift + .12, (z - ground) * .31);
        return [x + offset, y - offset * .76, ground + .005];
      });
      face(shadow, shadowColor, .22);
    }
  }
}
