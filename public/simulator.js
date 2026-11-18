export const simulatorDefaults = Object.freeze({
  materials: 'natural', site: true, furniture: true, shadows: true, groundGrid: false,
  sunAzimuth: 135, sunElevation: 38, sectionHeight: 1.12,
});

export const materialModes = ['natural', 'clay', 'technical'];
export const lightPresets = Object.freeze({
  morning: [100, 24], noon: [180, 66], evening: [250, 19], default: [135, 38],
});

export const simulatorLimits = Object.freeze({
  sunAzimuth: [0, 359], sunElevation: [8, 85], sectionHeight: [.3, 3],
});

export function normalizeSimulator(source) {
  const result = { ...simulatorDefaults };
  if (!source || typeof source !== 'object') return result;
  if (materialModes.includes(source.materials)) result.materials = source.materials;
  for (const key of ['site', 'furniture', 'shadows', 'groundGrid']) {
    if (typeof source[key] === 'boolean') result[key] = source[key];
  }
  for (const [key, [min, max]] of Object.entries(simulatorLimits)) {
    if (Number.isFinite(source[key])) result[key] = Math.max(min, Math.min(max, source[key]));
  }
  return result;
}

export function sunVector(azimuth, elevation) {
  const heading = azimuth * Math.PI / 180;
  const height = elevation * Math.PI / 180;
  const plane = Math.cos(height);
  return [Math.sin(heading) * plane, -Math.cos(heading) * plane, Math.sin(height)];
}

function mixShade(hex, factor) {
  return '#' + [1, 3, 5].map(index => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16);
    return Math.min(255, Math.round(channel * factor)).toString(16).padStart(2, '0');
  }).join('');
}

export function lightSurface(points, fill, sun, invert = false) {
  const [first, second, third] = points;
  const ux = second[0] - first[0], uy = second[1] - first[1], uz = second[2] - first[2];
  const vx = third[0] - first[0], vy = third[1] - first[1], vz = third[2] - first[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const product = nx * sun[0] + ny * sun[1] + nz * sun[2];
  const length = Math.hypot(nx, ny, nz);
  const diffuse = length && Math.max(0, product * (invert ? -1 : 1) / length);
  const factor = .72 + .39 * diffuse;
  return mixShade(fill, factor);
}

function clipEdge(points, axis, value, keepGreater) {
  const result = [];
  if (points.length < 3) return result;
  const inBounds = point => keepGreater ? point[axis] >= value : point[axis] <= value;
  let previous = points.at(-1);
  for (const point of points) {
    if (inBounds(point) !== inBounds(previous)) {
      const step = (value - previous[axis]) / (point[axis] - previous[axis]);
      result.push(previous.map((coordinate, index) => coordinate + (point[index] - coordinate) * step));
    }
    if (inBounds(point)) result.push(point);
    previous = point;
  }
  return result;
}

export function groundShadow(points, surface, sun) {
  const { x, y, width, depth, z } = surface;
  if (points.every(point => point[2] <= z + .01)) return [];
  let projected = points.map(([px, py, pz]) => {
    const distance = Math.max(0, pz - z) / sun[2];
    return [px - sun[0] * distance, py - sun[1] * distance, z + .006];
  });
  for (const [axis, coordinate, keepGreater] of [[0, x, true], [0, x + width, false], [1, y, true], [1, y + depth, false]]) {
    projected = clipEdge(projected, axis, coordinate, keepGreater);
  }
  return projected;
}

export function sunSurfaceColor(fill, mode, owner, selected) {
  if (mode === 'natural' || selected) return fill;
  if (mode === 'technical') {
    if (!owner) return '#9fadb8';
    return { walls: '#a4bbca', rooms: '#718b9a', items: '#c1cdd2' }[owner.kind] ?? fill;
  }
  return owner?.kind === 'rooms' ? '#e8e1d6' : '#ded6c7';
}
