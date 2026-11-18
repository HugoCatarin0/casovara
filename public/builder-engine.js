export const roomStyles = {
  living: { fill: '#e4e8d9', floor: '#9fae8a', pt: 'Sala', en: 'Living room' },
  kitchen: { fill: '#ebdfc8', floor: '#cbb488', pt: 'Cozinha', en: 'Kitchen' },
  bedroom: { fill: '#eadad1', floor: '#c8a092', pt: 'Quarto', en: 'Bedroom' },
  bath: { fill: '#dce7e4', floor: '#98b5b1', pt: 'Casa de banho', en: 'Bathroom' },
  circulation: { fill: '#eae6dd', floor: '#b8ae99', pt: 'Circulação', en: 'Circulation' },
  outdoor: { fill: '#edede3', floor: '#b5b99c', pt: 'Exterior', en: 'Outdoor' },
};

export const elements = {
  door: { pt: 'Porta', en: 'Door', width: 0.9, depth: 0.12, color: '#a76c4b', opening: true },
  doubleDoor: { pt: 'Porta dupla', en: 'Double door', width: 1.6, depth: 0.12, color: '#a76c4b', opening: true },
  window: { pt: 'Janela', en: 'Window', width: 1.2, depth: 0.14, color: '#508d89', opening: true },
  slidingWindow: { pt: 'Janela de correr', en: 'Sliding window', width: 2.2, depth: 0.14, color: '#508d89', opening: true },
  sofa: { pt: 'Sofá', en: 'Sofa', width: 2.3, depth: 0.89, height: 0.78, color: '#879879' },
  table: { pt: 'Mesa', en: 'Dining table', width: 1.55, depth: 0.88, height: 0.76, color: '#a98a64' },
  bed: { pt: 'Cama de casal', en: 'Double bed', width: 1.65, depth: 2, height: 0.53, color: '#b88979' },
  singleBed: { pt: 'Cama individual', en: 'Single bed', width: 0.95, depth: 2, height: 0.53, color: '#b88979' },
  cupboard: { pt: 'Armário', en: 'Cupboard', width: 1.5, depth: 0.56, height: 1.82, color: '#9b7a58' },
  kitchen: { pt: 'Bancada', en: 'Kitchen unit', width: 2.35, depth: 0.64, height: 0.9, color: '#a78c6f' },
  bath: { pt: 'Banheira', en: 'Bathtub', width: 1.65, depth: 0.75, height: 0.58, color: '#91aaa6' },
  shower: { pt: 'Duche', en: 'Shower', width: 0.9, depth: 0.9, height: 0.15, color: '#91aaa6' },
  toilet: { pt: 'Sanita', en: 'Toilet', width: 0.39, depth: 0.68, height: 0.46, color: '#91aaa6' },
  tree: { pt: 'Árvore', en: 'Tree', width: 1.4, depth: 1.4, height: 2.1, color: '#78906c' },
  stair: { pt: 'Escadas', en: 'Stairs', width: 1.0, depth: 3.5, height: 2.7, color: '#c1a37d' },
  rail: { pt: 'Guarda', en: 'Railing', width: 2.4, depth: 0.12, height: 1.05, color: '#8c7d6d' },
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
    items: list(level.items).filter((item) => Object.hasOwn(elements, item.type)).map((item) => ({
      id: uniqueId(item.id, used), type: item.type, x: numeric(item.x, 0), y: numeric(item.y, 0),
      width: numeric(item.width, elements[item.type].width, 0.1, 20), depth: numeric(item.depth, elements[item.type].depth, 0.05, 20),
      angle: numeric(item.angle, 0, -360, 360),
    })),
    measurements: list(level.measurements).map((measure) => ({
      id: uniqueId(measure.id, used), x1: numeric(measure.x1, 0), y1: numeric(measure.y1, 0), x2: numeric(measure.x2, 0), y2: numeric(measure.y2, 0),
    })),
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
  if (!points.length) return { x: -5, y: -3.5, width: 10, height: 7 };
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(1, Math.max(...xs) - x), height: Math.max(1, Math.max(...ys) - y) };
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

export function polygons3D(project, levelId, orbit, cutaway) {
  const visibleLevels = project.levels.slice(0, project.levels.findIndex((level) => level.id === levelId) + 1);
  const azimuth = orbit * Math.PI / 180;
  const sin = Math.sin(azimuth);
  const cos = Math.cos(azimuth);
  const projection = (x, y, z) => [cos * x - sin * y, (sin * x + cos * y) * 0.49 - z * 0.88, (sin * x + cos * y) * 0.88 + z * 0.49];
  const faces = [];
  function face(points, fill, opacity = 1) {
    const projected = points.map((position) => projection(...position));
    const depth = projected.reduce((sum, position) => sum + position[2], 0) / projected.length;
    faces.push({ points: projected, fill, depth, opacity });
  }
  function prism(footprint, base, height, color, opacity = 1) {
    const top = footprint.map(([x, y]) => [x, y, base + height]);
    const bottom = footprint.map(([x, y]) => [x, y, base]);
    for (let index = 0; index < 4; index++) {
      const next = (index + 1) % 4;
      face([bottom[index], bottom[next], top[next], top[index]], color[index % 2 + 1], opacity);
    }
    face(top, color[0], opacity);
  }
  const rect = (x, y, width, depth) => [[x, y], [x + width, y], [x + width, y + depth], [x, y + depth]];
  const finishes = { wood: '#c6a47c', ceramic: '#e4dccc', concrete: '#a5aaa4', stone: '#a29d91' };

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
      prism(rect(x, y, width, depth), base, 0.18, ['#a69786', '#a69b8d', '#c7b9a8']);
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
    face([a, b, right, left], '#af7259');
    face([c, d, left, right], '#975b48');
    face([d, a, left], inset ? '#a66853' : '#e2d9c9');
    face([b, c, right], inset ? '#b47c60' : '#d0c4ae');
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
  let floorZ = 0;
  for (const level of visibleLevels) {
    const wallHeight = cutaway && level.id === levelId ? Math.min(level.height, 1.12) : level.height;
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
          list.push({ a: nearest.ratio - width / 2, b: nearest.ratio + width / 2, sill: window && item.type !== 'slidingWindow' ? 0.9 : 0, top: window ? 2.15 : 2.05, glass: window });
          openings.set(nearest.wall.id, list);
        }
        continue;
      }
      const angle = item.angle * Math.PI / 180;
      const shape = (x, y, width, depth) => rect(x, y, width, depth)
        .map(([u, v]) => [item.x + u * Math.cos(angle) - v * Math.sin(angle), item.y + u * Math.sin(angle) + v * Math.cos(angle)]);
      const colors = [type.color, shade(type.color, -16), shade(type.color, -29)];
      if (item.type === 'stair') {
        const count = Math.ceil(level.height / 0.19);
        const tread = item.depth / count;
        for (let index = 0; index < count; index++) {
          prism(shape(-item.width / 2, -item.depth / 2 + index * tread, item.width, tread), floorZ,
            level.height * (count - index) / count, colors);
        }
      } else if (item.type === 'rail') {
        const postSize = Math.min(item.depth, item.width / 10, 0.08);
        const postCount = Math.min(20, Math.ceil(item.width / 0.75) + 1);
        for (let index = 0; index < postCount; index++) {
          const x = -item.width / 2 + index * (item.width - postSize) / (postCount - 1);
          prism(shape(x, -postSize / 2, postSize, postSize), floorZ, type.height, colors);
        }
        prism(shape(-item.width / 2, -item.depth / 2, item.width, item.depth), floorZ + type.height, 0.055, colors);
      } else prism(shape(-item.width / 2, -item.depth / 2, item.width, item.depth), floorZ, type.height, colors);
    }
    for (const room of level.rooms) {
      const color = finishes[room.finish] ?? (roomStyles[room.type] ?? roomStyles.living).floor;
      prism(rect(room.x, room.y, room.w, room.h), floorZ - 0.17, 0.17, [color, '#958977', '#817764']);
      if (level.id === levelId && !cutaway && level.ceiling && room.type !== 'outdoor') {
        prism(rect(room.x, room.y, room.w, room.h), floorZ + level.height - 0.06, 0.06, ['#edebdf', '#dcd7c9', '#d3ccbd']);
      }
    }
    for (const wall of level.walls) {
      const colors = ['#f0e9da', '#d0c4ae', '#e2d9c9'];
      let last = 0;
      for (const opening of (openings.get(wall.id) ?? []).sort((a, b) => a.a - b.a)) {
        const a = Math.max(last, opening.a);
        if (a >= opening.b) continue;
        if (a > last) prism(offsetFootprint(wall, last, a), floorZ, wallHeight, colors);
        if (opening.sill > 0) prism(offsetFootprint(wall, a, opening.b), floorZ, Math.min(opening.sill, wallHeight), colors);
        if (opening.top < wallHeight) prism(offsetFootprint(wall, a, opening.b), floorZ + opening.top, wallHeight - opening.top, colors);
        if (opening.glass && wallHeight > opening.sill) prism(offsetFootprint(wall, a, opening.b, 0.02), floorZ + opening.sill, Math.min(wallHeight, opening.top) - opening.sill, ['#a4bfba', '#91aaa6', '#77958f'], 0.58);
        last = opening.b;
      }
      if (last < 1) prism(offsetFootprint(wall, last, 1), floorZ, wallHeight, colors);
    }
    floorZ += level.height;
    if (level.id === levelId && !cutaway && ['flat', 'gable', 'hipped'].includes(level.roof)) roof(level, floorZ);
  }
  return faces.sort((a, b) => a.depth - b.depth);
}

function shade(color, delta) {
  return `#${[1, 3, 5].map((index) => clamp(Number.parseInt(color.slice(index, index + 2), 16) + delta, 0, 255).toString(16).padStart(2, '0')).join('')}`;
}
