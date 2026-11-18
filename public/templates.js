import { systemById } from './core.js';
import { elements } from './builder-engine.js';
import { bilingual as label } from './systems/plugin.js';
import { translation } from './locales.js';
import { illustrativeWallSpec } from './wall-spec.js';

const floorName = [
  label('Rés do chão', 'Ground floor'),
  label('Piso 1', 'First floor'),
];

const roomTypes = { bathroom: 'bath', hall: 'circulation', office: 'living' };
const officeName = label('Escritório', 'Office');
const modelRoofs = {
  patio: ['flat', 10], costa: ['gable', 24], pinhal: ['gable', 29],
  serra: ['gable', 32], olival: ['hipped', 26], urbano: ['flat', 10],
};

function makeLevel(outline, index, { roomHeight, wallThickness }, systemId, detailedFacade) {
  const rooms = outline.map(([type, x, y, w, h], i) => ({
    id: `r${index}-${i + 1}`, type: roomTypes[type] ?? type, x, y, w, h,
    ...(type === 'office' ? { name: officeName } : {}),
  }));
  const edges = roomEdges(rooms);
  const walls = edges.map(({ axis, fixed, from, to, owners }, i) => {
    const outer = owners.length === 1;
    const thickness = outer ? wallThickness : .12;
    const side = axis === 'x' ? (owners[0].y >= fixed ? -1 : 1) : (owners[0].x >= fixed ? 1 : -1);
    return {
      id: `w${index}-${i + 1}`,
      x1: axis === 'x' ? from : fixed,
      y1: axis === 'x' ? fixed : from,
      x2: axis === 'x' ? to : fixed,
      y2: axis === 'x' ? fixed : to,
      thickness,
      spec: illustrativeWallSpec(thickness, outer ? systemId : 'partition', side),
    };
  });
  const items = [...openings(rooms, edges, index === 0, detailedFacade), ...rooms.flatMap(furnish)]
    .map((item, i) => ({ ...item, id: `i${index}-${i + 1}` }));
  return { id: 'piso-' + (index + 1), name: floorName[index], height: roomHeight, rooms, walls, items, measurements: [] };
}

function roomEdges(rooms) {
  const lines = new Map();
  for (const room of rooms) {
    const { x, y, w, h } = room;
    for (const [axis, fixed, from, to] of [
      ['x', y, x, x + w], ['x', y + h, x, x + w], ['y', x, y, y + h], ['y', x + w, y, y + h],
    ]) {
      const key = axis + ':' + fixed;
      if (!lines.has(key)) lines.set(key, { axis, fixed, spans: [] });
      lines.get(key).spans.push({ from, to, room });
    }
  }
  const result = [];
  for (const { axis, fixed, spans } of lines.values()) {
    const stops = [...new Set(spans.flatMap(({ from, to }) => [from, to]))].sort((a, b) => a - b);
    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i];
      const to = stops[i + 1];
      const owners = spans.filter(span => span.from <= from && span.to >= to).map(span => span.room);
      if (owners.length) result.push({ axis, fixed, from, to, owners });
    }
  }
  return result;
}

function object(type, x, y, angle = 0) {
  const { width, depth } = elements[type];
  return { type, x, y, angle, width, depth };
}

function onEdge(edge, type) {
  const midpoint = (edge.from + edge.to) / 2;
  return edge.axis === 'x' ? object(type, midpoint, edge.fixed) : object(type, edge.fixed, midpoint, 90);
}

function openings(rooms, edges, groundFloor, detailedFacade) {
  const result = [];
  const exterior = edges.filter(edge => edge.owners.length === 1 && edge.to - edge.from >= 1.5);
  const interior = edges.filter(edge => edge.owners.length === 2 && edge.to - edge.from >= 1.2);
  const entry = groundFloor ? exterior.find(edge => edge.owners[0].type === 'circulation')
    ?? exterior.find(edge => edge.owners[0].type === 'living') ?? exterior[0] : null;
  if (entry) result.push(onEdge(entry, 'door'));

  const reached = new Set([entry?.owners[0] ?? rooms.find((room) => room.type === 'circulation') ?? rooms[0]]);
  interior.sort((a, b) => Number(b.owners.some(room => room.type === 'circulation')) - Number(a.owners.some(room => room.type === 'circulation')));
  let passage;
  while ((passage = interior.find(edge => reached.has(edge.owners[0]) !== reached.has(edge.owners[1])))) {
    const types = passage.owners.map(room => room.type);
    const double = types.includes('living') && types.includes('kitchen') && passage.to - passage.from >= 2;
    result.push(onEdge(passage, double ? 'doubleDoor' : 'door'));
    passage.owners.forEach(room => reached.add(room));
  }

  for (const room of rooms) {
    const candidates = exterior.filter(edge => edge !== entry && edge.owners[0] === room)
      .sort((a, b) => (b.to - b.from) - (a.to - a.from));
    const edge = candidates[0];
    if (!edge) continue;
    if (['bath', 'circulation'].includes(room.type)) {
      if (detailedFacade) result.push({ ...onEdge(edge, 'window'), width: .72, opening: { sill: 1.36, height: .64 } });
      continue;
    }
    result.push(onEdge(edge, room.type === 'living' && edge.to - edge.from >= 3 ? 'slidingWindow' : 'window'));
    const alternative = detailedFacade && candidates.find((candidate) => candidate.axis !== edge.axis && candidate.to - candidate.from >= 2.2);
    if (alternative) {
      result.push({ ...onEdge(alternative, 'window'), width: room.type === 'living' ? 1.65 : 1.02,
        opening: { sill: room.type === 'kitchen' ? 1.1 : .94, height: 1.15 } });
    }
  }
  return result;
}

function furnish({ type, x, y, w, h, name }) {
  if (name === officeName) {
    return [object('table', x + w / 2, y + 0.68)];
  }
  switch (type) {
    case 'living':
      return [object('sofa', x + w * 0.34, y + 0.75), object('table', x + w * 0.72, y + h * 0.66)];
    case 'kitchen':
      return [object('kitchen', x + w * 0.58, y + 0.51)];
    case 'bedroom':
      return [object('bed', x + w * 0.46, y + 1.37), object('cupboard', x + w - 0.42, y + h - 1.15, 90)];
    case 'bath':
      return [object('shower', x + 0.65, y + 0.65), object('toilet', x + w - 0.51, y + h - 0.78)];
    default:
      return [];
  }
}

function template(id, name, description, systemId, outlines) {
  const levels = outlines.map((outline, i) => makeLevel(outline, i, systemById(systemId).defaults, systemId, outlines.length > 1));
  const [roof, pitch] = modelRoofs[id];
  Object.assign(levels.at(-1), { roof, pitch });
  const area = levels.reduce((total, floor) => total + floor.rooms.reduce((sum, room) => sum + room.w * room.h, 0), 0);
  return { id, name, description, systemId, levels, area };
}

export const templates = [
  template('patio', 'Casa Pátio', label('Habitação térrea em L, com uma zona exterior abrigada.', 'A single-storey L-shaped home with a sheltered outdoor area.'), 'edria', [[
    ['living', 0, 0, 6, 4], ['kitchen', 6, 0, 4, 4], ['bedroom', 0, 4, 4, 4],
    ['bathroom', 4, 4, 2, 4], ['bedroom', 0, 8, 4, 4], ['hall', 4, 8, 2, 4],
  ]]),
  template('costa', 'Casa da Costa', label('Planta compacta com dois quartos e zona social aberta.', 'A compact two-bedroom plan with an open living area.'), 'clickhouse', [[
    ['living', 0, 0, 6, 4], ['kitchen', 6, 0, 4, 4], ['bedroom', 0, 4, 4, 4],
    ['bathroom', 4, 4, 2, 4], ['bedroom', 6, 4, 4, 4],
  ]]),
  template('pinhal', 'Casa Pinhal', label('Casa térrea com plantas generosas e um espaço de trabalho.', 'A single-storey home with generous rooms and a workspace.'), 'lsf', [[
    ['living', 0, 0, 7, 5], ['kitchen', 7, 0, 5, 5], ['bedroom', 0, 5, 4, 4],
    ['bedroom', 4, 5, 4, 4], ['bathroom', 8, 5, 2, 4], ['office', 10, 5, 2, 4],
  ]]),
  template('serra', 'Casa da Serra', label('Dois pisos com zona social no rés do chão e quartos no piso superior.', 'Two storeys, with living spaces below and bedrooms upstairs.'), 'concrete', [[
    ['living', 0, 0, 8, 5], ['kitchen', 0, 5, 5, 4], ['hall', 5, 5, 3, 4],
  ], [
    ['bedroom', 0, 0, 4, 5], ['bedroom', 4, 0, 4, 5], ['bathroom', 0, 5, 3, 4],
    ['hall', 3, 5, 5, 4],
  ]]),
  template('olival', 'Casa do Olival', label('Três quartos dispostos ao longo de uma planta térrea.', 'Three bedrooms along a single-storey floor plan.'), 'masonry', [[
    ['living', 0, 0, 8, 5], ['kitchen', 8, 0, 6, 5], ['bedroom', 0, 5, 4, 4],
    ['bedroom', 4, 5, 4, 4], ['bedroom', 8, 5, 4, 4], ['bathroom', 12, 5, 2, 4],
  ]]),
  template('urbano', 'Casa Urbana', label('Casa de dois pisos para um lote urbano estreito.', 'A two-storey home for a narrow urban plot.'), 'lsf', [[
    ['living', 0, 0, 6, 5], ['kitchen', 0, 5, 4, 4], ['hall', 4, 5, 2, 4], ['office', 0, 9, 6, 3],
  ], [
    ['bedroom', 0, 0, 6, 4], ['bathroom', 0, 4, 3, 3], ['hall', 3, 4, 3, 3],
    ['bedroom', 0, 7, 6, 4],
  ]]),
];

export function makeTemplate(id, locale) {
  const source = templates.find((item) => item.id === id);
  if (!source) return null;
  const levels = structuredClone(source.levels);
  for (const level of levels) {
    level.name = translation(level.name, locale);
    for (const room of level.rooms) {
      if (room.name) room.name = translation(room.name, locale);
    }
  }
  return { name: source.name, systemId: source.systemId, levels, levelId: levels[0].id };
}
