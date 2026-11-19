const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const quantize = (value) => Math.round(value * 1000) / 1000;
const metres = (value, fallback, min, max) => Number.isFinite(value) ? quantize(clamp(value, min, max)) : fallback;
const known = (values, key) => typeof key === 'string' && Object.hasOwn(values, key);

export const wallAssemblies = Object.freeze({
  custom: { label: ['Sem modelo', 'Unspecified'], material: 'core' },
  masonry: { label: ['Tijolo com isolamento', 'Insulated brick'], material: 'brick', layers: [0.20, 0.10, 0.018, 0.012] },
  concrete: { label: ['Betão com isolamento', 'Insulated concrete'], material: 'concrete', layers: [0.18, 0.10, 0.018, 0.012] },
  lsf: { label: ['Estrutura leve de aço', 'Light steel frame'], material: 'steel', layers: [0.12, 0.06, 0.020, 0.013] },
  edria: { label: ['Painel isolado Édria', 'Édria insulated panel'], material: 'panel', layers: [0.14, 0.08, 0.012, 0.012] },
  clickhouse: { label: ['Painel modular ClickHouse', 'ClickHouse modular panel'], material: 'panel', layers: [0.12, 0.04, 0.010, 0.013] },
  partition: { label: ['Divisória leve', 'Lightweight partition'], material: 'partition', layers: [0.075, 0, 0.013, 0.013] },
});

export const wallFinishes = Object.freeze({
  natural: { label: ['Natural', 'Natural'], color: '#ddd2be' },
  lime: { label: ['Reboco de cal', 'Lime render'], color: '#f3e9d6' },
  plaster: { label: ['Gesso branco', 'White plaster'], color: '#efede4' },
  timber: { label: ['Madeira', 'Timber'], color: '#a46f4d' },
  stone: { label: ['Pedra clara', 'Light stone'], color: '#ad9e86' },
  concrete: { label: ['Betão à vista', 'Exposed concrete'], color: '#9d9b94' },
  graphite: { label: ['Acabamento grafite', 'Graphite finish'], color: '#505859' },
  ceramic: { label: ['Cerâmica verde', 'Green ceramic'], color: '#68847b' },
});

const layers = ['core', 'insulation', 'outside', 'inside'];
const coreColors = { core: '#a99d8d', brick: '#bb7762', concrete: '#969a96', steel: '#6f8b9a', panel: '#b6a184', partition: '#a58fa5' };

export function normalizeWallSpec(raw, thickness) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const assembly = known(wallAssemblies, raw.assembly) ? raw.assembly : 'custom';
  const insulation = metres(raw.insulation, 0, 0, 0.45);
  const outside = metres(raw.outside, 0, 0, 0.1);
  const inside = metres(raw.inside, 0, 0, 0.1);
  const remaining = 1.5 - insulation - outside - inside;
  return {
    assembly,
    core: metres(raw.core, metres(thickness, .15, .05, remaining), .05, remaining),
    insulation, outside, inside,
    heightMode: raw.heightMode === 'fixed' ? 'fixed' : 'floor',
    height: metres(raw.height, 2.7, .05, 12),
    baseOffset: metres(raw.baseOffset, 0, -1, 5),
    exteriorFinish: known(wallFinishes, raw.exteriorFinish) ? raw.exteriorFinish : 'natural',
    interiorFinish: known(wallFinishes, raw.interiorFinish) ? raw.interiorFinish : 'natural',
    exteriorSide: raw.exteriorSide === -1 ? -1 : 1,
  };
}

export function getWallSpec(wall, levelHeight = 2.7) {
  return normalizeWallSpec(wall.spec ?? { height: levelHeight }, wall.thickness);
}

export function wallSpecThickness(spec) {
  return quantize(layers.reduce((total, layer) => total + spec[layer], 0));
}

export function applyWallAssembly(spec, assembly) {
  if (!known(wallAssemblies, assembly)) return spec;
  const values = wallAssemblies[assembly].layers;
  if (!values) return { ...spec, assembly };
  const [core, insulation, outside, inside] = values;
  return { ...spec, assembly, core, insulation, outside, inside };
}

export function illustrativeWallSpec(thickness, assembly, exteriorSide) {
  const spec = applyWallAssembly(normalizeWallSpec({}, thickness), assembly);
  const proportion = thickness / wallSpecThickness(spec);
  const insulation = quantize(spec.insulation * proportion);
  const outside = quantize(spec.outside * proportion);
  const inside = quantize(spec.inside * proportion);
  return normalizeWallSpec({
    ...spec, core: thickness - insulation - outside - inside, insulation, outside, inside, exteriorSide,
    exteriorFinish: assembly === 'partition' ? 'plaster' : 'lime', interiorFinish: 'plaster',
  }, thickness);
}

export function wallBaseOffset(wall) {
  return Number.isFinite(wall.spec?.baseOffset) ? wall.spec.baseOffset : 0;
}

export function effectiveWallHeight(wall, levelHeight) {
  const base = wallBaseOffset(wall);
  const fixed = wall.spec?.heightMode === 'fixed' && Number.isFinite(wall.spec.height);
  return Math.max(.05, fixed ? wall.spec.height : levelHeight - base);
}

export function wallAppearance(wall) {
  const exteriorMaterial = wall.spec?.exteriorFinish ?? 'natural';
  const interiorMaterial = wall.spec?.interiorFinish ?? 'natural';
  return {
    exterior: (known(wallFinishes, exteriorMaterial) ? wallFinishes[exteriorMaterial] : wallFinishes.natural).color,
    interior: (known(wallFinishes, interiorMaterial) ? wallFinishes[interiorMaterial] : wallFinishes.natural).color,
    side: wall.spec?.exteriorSide === -1 ? -1 : 1,
    exteriorMaterial, interiorMaterial,
  };
}

export function wallLayers(wall) {
  const spec = getWallSpec(wall);
  const appearance = wallAppearance(wall);
  const coreKey = wallAssemblies[spec.assembly].material;
  return [
    { key: 'exterior', thickness: spec.outside, color: appearance.exterior },
    { key: 'insulation', thickness: spec.insulation, color: '#d6ad60' },
    { key: coreKey, thickness: spec.core, color: coreColors[coreKey] },
    { key: 'interior', thickness: spec.inside, color: appearance.interior },
  ].filter(({ thickness }) => thickness > 0);
}

export const openingTypes = Object.freeze(['door', 'doubleDoor', 'window', 'slidingWindow']);

export function normalizeOpening(raw, type) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !openingTypes.includes(type)) return undefined;
  const sill = metres(raw.sill, type === 'window' ? .9 : 0, -.5, 4);
  const defaultHeight = type === 'window' ? 1.25 : type === 'slidingWindow' ? 2.15 : 2.05;
  return {
    sill, height: metres(raw.height, defaultHeight, .1, 5),
    ...((type === 'window' || type === 'slidingWindow') && [1, 2, 3].includes(raw.leaves) ? { leaves: raw.leaves } : {}),
    ...((type === 'door' || type === 'window') && ['left', 'right'].includes(raw.handing) ? { handing: raw.handing } : {}),
    ...(typeof raw.frameColor === 'string' && /^#[a-f\d]{6}$/i.test(raw.frameColor) ? { frameColor: raw.frameColor.toLowerCase() } : {}),
  };
}

export function openingVertical(item) {
  const { sill, height } = normalizeOpening(item.opening ?? {}, item.type) ?? { sill: 0, height: 2.05 };
  return { sill, top: sill + height };
}

function unionArea(rectangles) {
  const edges = [...new Set(rectangles.flatMap(({ left, right }) => [left, right]))].sort((a, b) => a - b);
  let area = 0;
  for (let index = 0; index < edges.length - 1; index++) {
    const left = edges[index], right = edges[index + 1];
    const spans = rectangles.filter((item) => item.left < right && item.right > left).sort((a, b) => a.sill - b.sill);
    let top = -Infinity;
    for (const span of spans) {
      area += (right - left) * Math.max(0, span.top - Math.max(top, span.sill));
      top = Math.max(top, span.top);
    }
  }
  return area;
}

export function wallMeasurements(wall, level, findWall) {
  const length = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
  const height = effectiveWallHeight(wall, level.height);
  const base = wallBaseOffset(wall);
  const openings = [];
  for (const item of level.items) {
    if (!openingTypes.includes(item.type)) continue;
    const half = item.width / 2 + .15;
    if (item.x < Math.min(wall.x1, wall.x2) - half || item.x > Math.max(wall.x1, wall.x2) + half ||
        item.y < Math.min(wall.y1, wall.y2) - half || item.y > Math.max(wall.y1, wall.y2) + half) continue;
    const nearest = findWall(item, level.walls, .15, item.width);
    if (nearest?.wall.id !== wall.id) continue;
    const vertical = openingVertical(item);
    const left = Math.max(0, nearest.ratio * length - item.width / 2);
    const right = Math.min(length, nearest.ratio * length + item.width / 2);
    const sill = Math.max(base, vertical.sill);
    const top = Math.min(base + height, vertical.top);
    if (right > left && top > sill) openings.push({ item, left, right, sill, top });
  }
  const gross = length * height;
  const voids = unionArea(openings);
  const net = Math.max(0, gross - voids);
  return { length, height, gross, voids, net, volume: net * wall.thickness, openings };
}
