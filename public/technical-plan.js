import { elements, escapeHtml, wallLength } from './builder-engine.js';
import { openingVertical, wallAppearance, wallLayers } from './wall-spec.js';

export const draftingInk = {
  background: '#edf3f6',
  text: '#203848',
  ink: '#273f52',
  line: '#496477',
  accent: '#a64530',
  halo: '#f1f6f8',
};

const roomTints = {
  living: '#e6eef1', bedroom: '#e8ecf2', kitchen: '#e5eef0',
  bath: '#e2edf2', circulation: '#eef2f3', outdoor: '#e1ebe4',
};
const finishTints = {
  wood: '#ece9e0', concrete: '#e5e9eb', ceramic: '#e5eef2', stone: '#eaeae3',
};
const clean = (value) => +value.toFixed(4);
const openingCodes = {
  pt: { door: 'P', doubleDoor: 'P', window: 'J', slidingWindow: 'J' },
  en: { door: 'D', doubleDoor: 'D', window: 'W', slidingWindow: 'W' },
};

export function planRoomFill(room) {
  return finishTints[room.finish] ?? roomTints[room.type] ?? '#e9eff2';
}

export function planPatterns() {
  return `<defs>
    <pattern id="cv-plan-core" width=".13" height=".13" patternUnits="userSpaceOnUse" patternTransform="rotate(42)"><path d="M.01 0V.13" stroke="#284659" stroke-opacity=".63" stroke-width=".016"/></pattern>
    <pattern id="cv-plan-concrete" width=".14" height=".12" patternUnits="userSpaceOnUse"><path d="M.03 .04l.015-.018.013.022zM.105 .085l.019-.01-.006.021z" fill="#334b55" fill-opacity=".77"/><circle cx=".08" cy=".02" r=".009" fill="#334b55"/></pattern>
    <pattern id="cv-plan-steel" width=".14" height=".10" patternUnits="userSpaceOnUse"><path d="M.01 0V.10M.035 0V.10" stroke="#223f57" stroke-width=".012" stroke-opacity=".73"/></pattern>
    <pattern id="cv-plan-panel" width=".18" height=".10" patternUnits="userSpaceOnUse" patternTransform="rotate(-31)"><path d="M.03 0V.10M.095 0V.05" stroke="#4c554e" stroke-width=".013" stroke-opacity=".75"/></pattern>
    <pattern id="cv-plan-thermal" width=".10" height=".10" patternUnits="userSpaceOnUse"><circle cx=".05" cy=".05" r=".016" fill="#3f6377" fill-opacity=".79"/></pattern>
    <pattern id="cv-plan-mono" width=".14" height=".14" patternUnits="userSpaceOnUse" patternTransform="rotate(42)"><path d="M.01 0V.14" stroke="#37566a" stroke-opacity=".72" stroke-width=".02"/></pattern>
    <pattern id="cv-plan-outdoor" width=".36" height=".36" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><path d="M 0 0 H .36 M 0 .045 H .36" stroke="#688576" stroke-opacity=".43" stroke-width=".012"/></pattern>
  </defs>`;
}

export function technicalWall(wall, { active, forExport, layers, unit }) {
  const length = wallLength(wall);
  if (!length) return '';
  const half = wall.thickness / 2;
  const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) * 180 / Math.PI;
  const line = active ? draftingInk.accent : draftingInk.ink;
  const edge = Math.min(unit * 1.05, .022, wall.thickness * .19);
  const detailed = layers && wall.spec ? wallLayers(wall) : [];
  if (detailed.length && wallAppearance(wall).side > 0) detailed.reverse();

  let offset = -half;
  const strips = detailed.map(({ key, thickness, color }, index) => {
    const start = offset;
    const depth = index === detailed.length - 1 ? half - offset : thickness;
    offset += depth;
    if (depth <= 0) return '';
    const role = ({ exterior: '', interior: '', insulation: 'thermal', concrete: 'concrete', steel: 'steel', panel: 'panel' })[key] ?? 'core';
    const hatch = role && depth > unit * 1.5 ? `<rect width="${length}" y="${clean(start)}" height="${clean(depth)}" fill="url(#cv-plan-${role})"/>` : '';
    return `<rect width="${length}" y="${clean(start)}" height="${clean(depth)}" fill="${color}"/>${hatch}
      ${index ? `<path d="M 0 ${clean(start)} H ${length}" stroke="${line}" stroke-width="${edge * .76}"/>` : ''}`;
  }).join('');
  return `<g class="cv-plan-wall cv-technical-wall${active ? ' cv-plan-wall-active' : ''}" data-shape="walls" data-id="${escapeHtml(wall.id)}"
            transform="translate(${wall.x1} ${wall.y1}) rotate(${angle})">
    ${forExport ? '' : `<line x1="0" y1="0" x2="${length}" y2="0" stroke="transparent" stroke-width="12" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`}
    <rect class="cv-plan-wall-line" x="${-half}" y="${-half}" width="${length + wall.thickness}" height="${wall.thickness}" fill="${active ? '#f0baaa' : '#b6c8d1'}"/>
    ${strips || `<rect x="${-half}" y="${-half}" width="${length + wall.thickness}" height="${wall.thickness}" fill="url(#cv-plan-mono)"/>`}
    <path d="M ${-half} ${-half} H ${length + half} M ${-half} ${half} H ${length + half}" stroke="${line}" stroke-width="${edge}" fill="none" pointer-events="none"/>
    ${active ? `<path d="M 0 0 H ${length}" stroke="${line}" stroke-width="${Math.min(.018, unit * .85)}" stroke-dasharray=".11 .085" pointer-events="none"/>` : ''}
  </g>`;
}

export function openingSymbol(item, thickness, { active, technical }) {
  const { width, type } = item;
  const half = width / 2;
  const depth = Math.max(item.depth, thickness) + .022;
  const left = -half;
  const top = -depth / 2;
  const window = type === 'window' || type === 'slidingWindow';
  const jamb = active ? draftingInk.accent : technical ? '#2b5164' : '#426257';
  const frame = window ? technical ? '#215a75' : '#34716e' : technical ? '#385162' : '#946044';
  const paper = technical ? '#f4f8f9' : '#fcf8ec';
  const glass = technical ? '#c9e1eb' : '#c7e1da';
  const cut = `<rect data-opening-cut x="${left}" y="${top}" width="${width}" height="${depth}" fill="${window ? glass : paper}" stroke="none"/>
    <path d="M${left} ${top}v${depth}M${half} ${top}v${depth}" stroke="${jamb}" stroke-width=".024"/>`;
  if (window) {
    const offset = Math.min(depth * .30, .071);
    const reveal = Math.abs(top) * .66;
    return `${cut}<path d="M${left} ${-reveal}H${half}M${left} ${reveal}H${half}" stroke="${jamb}" stroke-width=".013" opacity=".8"/>
      <path d="M${left} ${-offset}H${half}M${left} ${offset}H${half}"
        stroke="${frame}" stroke-width=".02"/>
      ${type === 'slidingWindow' ? `<path d="M 0 ${-offset} V ${offset} M ${left} 0 H .05 M -.05 ${offset * .55} H ${half}"
                              stroke="${frame}" stroke-width=".023"/>` : ''}`;
  }

  const pair = type === 'doubleDoor';
  const swing = pair ? half : width;
  return `${cut}<path d="M${left} 0H${half}" stroke="${frame}" stroke-width=".016" stroke-dasharray=".06 .052"/>
    <path d="M${left} 0V${-swing}${pair ? `M${half} 0V${-swing}` : ''}" stroke="${frame}" stroke-width=".032"/>
    <path d="M${left} ${-swing}a${swing} ${swing} 0 0 1 ${swing} ${swing}${pair ? `M${half} ${-swing}a${swing} ${swing} 0 0 0 ${-swing} ${swing}` : ''}"
      fill="none" stroke="${frame}" stroke-width=".016" stroke-opacity=".88"/>
    <circle cx="${left}" r=".034" fill="${frame}"/>${pair ? `<circle cx="${half}" r=".034" fill="${frame}"/>` : ''}`;
}

export function openingsIndex(items, isPortuguese) {
  const prefixes = openingCodes[isPortuguese ? 'pt' : 'en'];
  const totals = new Map();
  const entries = new Map();
  for (const item of items) {
    const prefix = prefixes[item.type];
    if (!prefix || !elements[item.type]?.opening) continue;
    const ordinal = (totals.get(prefix) ?? 0) + 1;
    totals.set(prefix, ordinal);
    entries.set(item.id, prefix + String(ordinal).padStart(2, '0'));
  }
  return entries;
}

export function openingTags(items, rooms, unit, number, isPortuguese, { compact = false, limit = null } = {}) {
  const index = openingsIndex(items, isPortuguese);
  const paper = draftingInk.halo;
  const labels = [];
  const placed = [];
  for (const item of items) {
    const code = index.get(item.id);
    const size = item.width / unit;
    if (!code || size < 16) continue;
    const rad = item.angle * Math.PI / 180;
    const axis = [-Math.sin(rad), Math.cos(rad)];
    const offset = Math.max(.29, unit * 19);
    const { sill, top } = openingVertical(item);
    const sizeLabel = size >= 64 ? `${number(item.width)} × ${number(top - sill)} m` : `${number(item.width)} m`;
    const label = size >= (compact ? 40 : 26) ? `${code} · ${sizeLabel}` : code;
    const font = unit * 10;
    const width = (label.length * .61 + .9) * font;
    const height = font * 1.5;
    const options = [-1, 1, -1.75, 1.75].map((side) => {
      const x = item.x + axis[0] * offset * side, y = item.y + axis[1] * offset * side;
      const exterior = !rooms.some((room) => x > room.x && x < room.x + room.w && y > room.y && y < room.y + room.h);
      return { x, y, exterior, side };
    }).sort((a, b) => Number(b.exterior) - Number(a.exterior) || Math.abs(a.side) - Math.abs(b.side));
    const point = options.find(({ x, y }) => {
      const left = x - width / 2, top = y - height / 2, right = x + width / 2, bottom = y + height / 2;
      if (limit && (left < limit.left - unit * 3 || top < limit.top - unit * 3)) return false;
      if (compact && limit && (right > limit.right + unit * 5 || bottom > limit.bottom + unit * 5)) return false;
      if (rooms.some((room) => Math.abs(x - room.x - room.w / 2) < width / 2 + Math.min(room.w * .32, unit * 37) &&
          Math.abs(y - room.y - room.h / 2) < height / 2 + Math.min(room.h * .26, unit * 16))) return false;
      return placed.every((other) => Math.abs(x - other.x) > (width + other.width) / 2 + font * .45 || Math.abs(y - other.y) > height * 1.25);
    });
    if (!point) continue;
    const { x, y } = point;
    placed.push({ x, y, width, halfW: width / 2 + font * .35, halfH: height / 2 + font * .3 });
    labels.push(`<g pointer-events="none" data-plan-opening-tag="${code}" font-family="monospace" font-variant-numeric="tabular-nums">
       <path d="M ${item.x} ${item.y} L ${clean(x)} ${clean(y)}" stroke="#58768a" stroke-width="${unit * .8}"/>
       <rect x="${clean(x - width / 2)}" y="${clean(y - height / 2)}" width="${clean(width)}" height="${clean(height)}" rx="${font * .19}" fill="${paper}" stroke="#8aa4b7" stroke-width="${unit * .72}"/>
       <text x="${clean(x)}" y="${clean(y)}" text-anchor="middle" dominant-baseline="central" font-size="${font}" font-weight="630" fill="#243f52">${escapeHtml(label)}</text>
     </g>`);
  }
  return { markup: labels.join(''), obstacles: placed };
}

function wallCorners(wall) {
  const length = wallLength(wall);
  if (length < .001) return [];
  const half = wall.thickness / 2;
  const x = (wall.x2 - wall.x1) * half / length;
  const y = (wall.y2 - wall.y1) * half / length;
  return [[wall.x1 - x - y, wall.y1 - y + x], [wall.x1 - x + y, wall.y1 - y - x],
    [wall.x2 + x - y, wall.y2 + y + x], [wall.x2 + x + y, wall.y2 + y - x]];
}

export function draftingBounds(walls, rooms) {
  const points = [...walls.flatMap(wallCorners), ...rooms.flatMap(({ x, y, w, h }) => [[x, y], [x + w, y + h]])];
  const limits = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of points) {
    limits[0] = Math.min(limits[0], x);
    limits[1] = Math.min(limits[1], y);
    limits[2] = Math.max(limits[2], x);
    limits[3] = Math.max(limits[3], y);
  }
  return points.length ? { left: limits[0], top: limits[1], right: limits[2], bottom: limits[3] } : null;
}

export function dimensionLine(measure, unit, number, { active = false, automatic = false, onLine = false } = {}) {
  const { x1, y1, x2, y2 } = measure;
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length < .025) return '';
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const dx = (x2 - x1) / length;
  const dy = (y2 - y1) / length;
  const radius = unit * 3.65;
  const tx = radius * (dx + dy);
  const ty = radius * (dy - dx);
  const tick = (x, y) => `M${clean(x - tx)} ${clean(y - ty)}l${clean(tx * 2)} ${clean(ty * 2)}`;
  const color = active ? draftingInk.accent : draftingInk.line;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const rotation = angle > 91 ? angle - 180 : angle < -91 ? angle + 180 : angle;
  const labelSize = unit * (active ? 12 : 10.8);
  return `<g ${automatic ? 'pointer-events="none"' : `data-shape="measurements" data-id="${escapeHtml(measure.id)}"`}>
    ${automatic ? '' : `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="transparent" stroke-width="13" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`}
    <path d="M${x1} ${y1}L${x2} ${y2}${tick(x1, y1)}${tick(x2, y2)}" fill="none" stroke="${color}" stroke-width="${unit * (active ? 1.35 : .88)}"/>
    <text x="${cx}" y="${cy}" dy="${onLine ? '.36em' : '-.38em'}" transform="rotate(${rotation} ${cx} ${cy})" text-anchor="middle" font-size="${labelSize}" font-family="monospace" font-weight="${active ? 730 : 610}" fill="${color}" stroke="${draftingInk.halo}" stroke-width="${labelSize * (onLine ? .44 : .26)}" stroke-linejoin="round" paint-order="stroke">${escapeHtml(number(length))} m</text>
  </g>`;
}

function breaksForSide(axis, edge, lo, hi, walls, unit) {
  const within = Math.max(.38, unit * 11);
  const coordinates = new Set();
  for (const { x1, y1, x2, y2 } of walls) {
    const [first, second] = axis === 'x' ? [[y1, x1], [y2, x2]] : [[x1, y1], [x2, y2]];
    for (const [side, position] of [first, second]) {
      if (side - edge <= within && position - lo > unit * 40 && hi - position > unit * 40) coordinates.add(clean(position));
    }
  }
  const result = [lo];
  for (const entry of [...coordinates].sort((a, b) => a - b)) {
    if (entry - result.at(-1) > unit * 42) result.push(entry);
  }
  result.push(hi);
  return result.length > 2 && result.length < 9 ? result : [];
}

export function overallPlanDimensions(walls, rooms, unit, number) {
  const bounds = draftingBounds(walls, rooms);
  if (!bounds) return '';
  const { left, top, right, bottom } = bounds;
  const offset = Math.max(.35, unit * 22);
  const near = Math.max(.04, unit * 4);
  const extra = Math.max(.05, unit * 4);
  const dimensions = (axis, edge, start, end) => {
    if ((end - start) / unit < 32) return '';
    const chain = breaksForSide(axis, edge, start, end, walls, unit);
    const line = edge - offset * (chain.length ? 2 : 1);
    const paths = [];
    const project = (position, elevation) => axis === 'x' ? [position, elevation] : [elevation, position];
    const draw = ([from, to], elevation) => {
      const [x1, y1] = project(from, elevation);
      const [x2, y2] = project(to, elevation);
      return dimensionLine({ x1, y1, x2, y2 }, unit, number, { automatic: true });
    };
    for (const position of chain.length ? chain : [start, end]) {
      const [x1, y1] = project(position, edge - near);
      const [x2, y2] = project(position, (position === start || position === end ? line : edge - offset) - extra);
      paths.push(`M${x1} ${y1} L${x2} ${y2}`);
    }
    return `<g pointer-events="none" data-plan-dimensions="${axis}"><path d="${paths.join(' ')}" stroke="#7892a5" stroke-width="${unit * .76}" fill="none"/>${draw([start, end], line)}${chain.slice(1).map((value, i) => draw([chain[i], value], edge - offset)).join('')}</g>`;
  };
  return dimensions('x', top, left, right) + dimensions('y', left, top, bottom);
}

function roomFace(walls, axis, edge, position, towardsRoom) {
  const tolerance = .024;
  let result = edge;
  for (const wall of walls) {
    const [a, b, start, end] = axis === 'x' ? [wall.x1, wall.x2, wall.y1, wall.y2] : [wall.y1, wall.y2, wall.x1, wall.x2];
    if (Math.abs(a - edge) > tolerance || Math.abs(b - edge) > tolerance) continue;
    if (position < Math.min(start, end) || position > Math.max(start, end)) continue;
    const inner = (a + b) / 2 + towardsRoom * wall.thickness / 2;
    result = towardsRoom > 0 ? Math.max(inner, result) : Math.min(inner, result);
  }
  return result;
}

export function interiorPlanDimensions(rooms, walls, unit, number) {
  const clearance = unit * 10;
  const options = { automatic: true, onLine: true };
  return rooms.filter(({ w, h }) => w / unit >= 95 && h / unit >= 88).map(({ x, y, w, h }) => {
    const horizontal = Math.max(y + h * .55, roomFace(walls, 'y', y + h, x + w / 2, -1) - clearance);
    const vertical = Math.min(x + w * .45, roomFace(walls, 'x', x, y + h / 2, 1) + clearance);
    const left = roomFace(walls, 'x', x, horizontal, 1), right = roomFace(walls, 'x', x + w, horizontal, -1);
    const top = roomFace(walls, 'y', y, vertical, 1), bottom = roomFace(walls, 'y', y + h, vertical, -1);
    return `<g data-plan-room-dimensions pointer-events="none">
      ${right > left ? dimensionLine({ x1: left, y1: horizontal, x2: right, y2: horizontal }, unit, number, options) : ''}
      ${bottom > top ? dimensionLine({ x1: vertical, y1: top, x2: vertical, y2: bottom }, unit, number, options) : ''}
    </g>`;
  }).join('');
}

export function selectedWallDimension(wall, unit, number) {
  const length = wallLength(wall);
  if (length / unit < 27) return '';
  const offset = Math.max(.26, unit * 18) + wall.thickness / 2;
  const dx = (wall.y2 - wall.y1) * offset / length;
  const dy = (wall.x1 - wall.x2) * offset / length;
  return `<g data-plan-selected-dimension pointer-events="none"><path d="M${wall.x1} ${wall.y1}l${dx * 1.15} ${dy * 1.15}M${wall.x2} ${wall.y2}l${dx * 1.15} ${dy * 1.15}" stroke="#ae735c" stroke-width="${unit * .86}" stroke-dasharray="${unit * 3.1} ${unit * 2.1}"/>${
    dimensionLine({ x1: wall.x1 + dx, y1: wall.y1 + dy, x2: wall.x2 + dx, y2: wall.y2 + dy }, unit, number, { active: true, automatic: true, onLine: true })
  }</g>`;
}

export function lowerFloorReference(level, unit) {
  if (!level) return '';
  const walls = level.walls.map(({ x1, y1, x2, y2 }) => `M${x1} ${y1}L${x2} ${y2}`).join(' ');
  const rooms = level.rooms.map(({ x, y, w, h }) => `M${x} ${y}h${w}v${h}h${-w}z`).join(' ');
  return `<g data-plan-lower-floor aria-hidden="true" pointer-events="none" fill="none" stroke="#507f9a" stroke-dasharray="${unit * 8} ${unit * 4}">
      <path d="${rooms}" stroke-opacity=".46" stroke-width="${unit}"/>
      <path d="${walls}" stroke-opacity=".66" stroke-width="${unit * 1.5}"/>
    </g>`;
}
