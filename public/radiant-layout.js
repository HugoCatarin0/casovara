const defaultSpacing = .18;
const maxSpiralTurns = 9;
const maxSerpentineRows = 38;
const epsilon = 1e-8;
const leadClearance = .02;

function entrySide({ x, y, w, h }, near) {
  // Local u runs into the zone. Local v runs along its entrance edge.
  const sides = [
    { width: h, depth: w, u: Number.isFinite(near?.y) ? y + h - near.y : 0, v: near?.x - x,
      world: (u, v) => ({ x: x + v, y: y + h - u }) },
    { width: w, depth: h, u: near?.x - x, v: near?.y - y,
      world: (u, v) => ({ x: x + u, y: y + v }) },
    { width: h, depth: w, u: near?.y - y, v: near?.x - x,
      world: (u, v) => ({ x: x + v, y: y + u }) },
    { width: w, depth: h, u: x + w - near?.x, v: near?.y - y,
      world: (u, v) => ({ x: x + w - u, y: y + v }) },
  ];
  if (!Number.isFinite(near?.x) || !Number.isFinite(near?.y)) return sides[0];
  const distance = ({ u, v, depth }) => Math.hypot(u, v - Math.min(depth, Math.max(0, v)));
  return sides.reduce((closest, side) => distance(side) < distance(closest) ? side : closest);
}

function rightNormal(from, to) {
  return { x: -Math.sign(to.y - from.y), y: Math.sign(to.x - from.x) };
}

function spiral(width, depth, margin, spacing) {
  let left = margin;
  let right = width - margin;
  let top = margin;
  let bottom = depth - margin;
  const inward = [{ x: left, y: top }];
  const step = spacing * 2;
  for (let turn = 0; turn < maxSpiralTurns && right - left >= spacing * 3 - epsilon &&
    bottom - top > spacing * 3 + epsilon; turn++) {
    inward.push({ x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }, { x: left, y: top + step });
    left += step;
    right -= step;
    top += step;
    bottom -= step;
  }
  if (right - left >= step - epsilon && bottom - top >= spacing - epsilon) {
    inward.push({ x: right, y: top });
    if (bottom - top > step + epsilon) inward.push({ x: right, y: bottom }, { x: left, y: bottom });
  }

  // Each turn of the inward pipe leaves two spaces. Shift the reverse
  // pipe one space into those gaps and join both pipes at the centre.
  const normals = inward.slice(1).map((point, index) => rightNormal(inward[index], point));
  const outward = inward.map((point, index) => {
    const before = normals[index - 1];
    const after = normals[index];
    return {
      x: point.x + spacing * ((before?.x ?? 0) + (after?.x ?? 0)),
      y: point.y + spacing * ((before?.y ?? 0) + (after?.y ?? 0)),
    };
  });
  return [...inward, ...outward.reverse()];
}

function serpentine(width, depth, margin, spacing) {
  const usefulDepth = depth - 2 * margin;
  const count = Math.min(maxSerpentineRows, Math.max(2, 2 * Math.floor((1 + usefulDepth / spacing) / 2)));
  const left = margin + spacing;
  const right = width - margin;
  const path = [{ x: margin, y: margin }, { x: right, y: margin }];
  for (let row = 1; row < count; row++) {
    const y = margin + usefulDepth * row / (count - 1);
    path.push({ x: row % 2 ? right : left, y }, { x: row % 2 ? left : right, y });
  }
  // A return lane at the entrance edge keeps both tails next to one another.
  path.push({ x: margin, y: depth - margin }, { x: margin, y: margin + spacing });
  return path;
}

export function radiantLayout(bounds, { pattern = 'spiral', near } = {}) {
  const { x, y, w, h } = bounds ?? {};
  if (![x, y, w, h, x + w, y + h].every(Number.isFinite) || w < .1 || h < .1 ||
    !['spiral', 'serpentine'].includes(pattern)) return [];
  const { width, depth, v, world } = entrySide(bounds, near);
  const shortestSide = Math.min(width, depth);
  const margin = Math.min(.22, shortestSide * .14);
  const workingSpan = shortestSide - 2 * margin;
  const spacing = Math.max(Math.min(defaultSpacing, workingSpan / 5), workingSpan / (4 * maxSpiralTurns + 1));
  const path = (pattern === 'serpentine' ? serpentine : spiral)(width, depth, margin, spacing);
  return path.map(({ x: u, y: offset }) => world(u, v > depth / 2 ? depth - offset : offset));
}

function subtractCircuit(area, circuit) {
  const right = area.x + area.width;
  const bottom = area.y + area.depth;
  const leftEdge = Math.max(area.x, circuit.left);
  const rightEdge = Math.min(right, circuit.right);
  const topEdge = Math.max(area.y, circuit.top);
  const bottomEdge = Math.min(bottom, circuit.bottom);
  if (rightEdge <= leftEdge || bottomEdge <= topEdge) return [area];
  return [
    { x: area.x, y: area.y, width: leftEdge - area.x, depth: area.depth },
    { x: rightEdge, y: area.y, width: right - rightEdge, depth: area.depth },
    { x: leftEdge, y: area.y, width: rightEdge - leftEdge, depth: topEdge - area.y },
    { x: leftEdge, y: bottomEdge, width: rightEdge - leftEdge, depth: bottom - bottomEdge },
  ].filter(({ width, depth }) => width > epsilon && depth > epsilon);
}

export function radiantLeadFootprints(footprints, circuits) {
  let areas = [...footprints];
  for (const { path } of circuits) {
    if (!path?.length) continue;
    const xs = path.map(({ x }) => x);
    const ys = path.map(({ y }) => y);
    const circuit = {
      left: Math.min(...xs) - leadClearance, right: Math.max(...xs) + leadClearance,
      top: Math.min(...ys) - leadClearance, bottom: Math.max(...ys) + leadClearance,
    };
    areas = areas.flatMap((area) => subtractCircuit(area, circuit));
  }
  return areas;
}
