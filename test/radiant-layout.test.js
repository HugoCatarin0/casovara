import assert from 'node:assert/strict';
import { test } from 'node:test';
import { radiantLayout, radiantLeadFootprints } from '../public/radiant-layout.js';

const epsilon = 1e-7;
const close = (a, b) => Math.abs(a - b) < epsilon;

function segments(path) {
  return path.slice(1).map((point, index) => [path[index], point]);
}

function overlaps(a, b, c, d) {
  return Math.max(Math.min(a, b), Math.min(c, d)) <= Math.min(Math.max(a, b), Math.max(c, d)) + epsilon;
}

function assertContinuousWithin(path, { x, y, w, h }) {
  assert.ok(path.length >= 10 && path.length <= 82);
  assert.ok(path.every((point) => point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h));
  const runs = segments(path);
  for (const [index, [from, to]] of runs.entries()) {
    assert.notEqual(close(from.x, to.x), close(from.y, to.y), 'Each run is a nonzero horizontal or vertical segment');
    for (const [start, end] of runs.slice(index + 2)) {
      assert.ok(!(overlaps(from.x, to.x, start.x, end.x) && overlaps(from.y, to.y, start.y, end.y)),
        'Nonconsecutive runs cannot cross, overlap or touch');
    }
  }
}

test('A bifilar spiral interleaves inward and return pipes, with a continuous centre turn', () => {
  const bounds = { x: 0, y: 0, w: 5, h: 4 };
  const path = radiantLayout(bounds, { near: { x: -1, y: 0 } });
  assertContinuousWithin(path, bounds);
  const half = path.length / 2;
  const inward = path.slice(0, half);
  const outward = path.slice(half);
  const centre = [inward.at(-1), outward[0]];
  assert.ok(close(Math.hypot(centre[1].x - centre[0].x, centre[1].y - centre[0].y), .18));
  const crossings = [inward, outward].flatMap((side, circuit) => segments(side)
    .filter(([a, b]) => close(a.y, b.y) && (a.x - 2.5) * (b.x - 2.5) < 0)
    .map(([a]) => ({ y: a.y, circuit })))
    .sort((a, b) => a.y - b.y);
  assert.ok(crossings.length >= 12);
  for (let index = 1; index < 8; index++) {
    assert.notEqual(crossings[index].circuit, crossings[index - 1].circuit);
    assert.ok(close(crossings[index].y - crossings[index - 1].y, .18));
  }
  assert.equal(path[0].x, path.at(-1).x);
  assert.ok(close(path.at(-1).y - path[0].y, .18));
});

test('Both patterns put adjacent pipe tails on the edge that faces the collector', () => {
  const bounds = { x: -2, y: 3, w: 6, h: 4 };
  for (const pattern of ['spiral', 'serpentine']) {
    for (const [near, axis, edge] of [
      [{ x: -5, y: 4 }, 'x', bounds.x], [{ x: 7, y: 6 }, 'x', bounds.x + bounds.w],
      [{ x: -1, y: 1 }, 'y', bounds.y], [{ x: 2, y: 9 }, 'y', bounds.y + bounds.h],
    ]) {
      const path = radiantLayout(bounds, { pattern, near });
      assertContinuousWithin(path, bounds);
      assert.equal(path[0][axis], path.at(-1)[axis]);
      assert.ok(close(Math.abs(path[0][axis] - edge), .22));
      assert.ok(close(Math.hypot(path.at(-1).x - path[0].x, path.at(-1).y - path[0].y), .18));
    }
  }
});

test('The serpentine alternates its sweeps and both patterns fit the route vertex budget', () => {
  const bounds = { x: 0, y: 0, w: 8, h: 5 };
  const path = radiantLayout(bounds, { pattern: 'serpentine', near: { x: -1, y: 0 } });
  const sweeps = segments(path).filter(([a, b]) => Math.abs(a.x - b.x) > 1);
  assert.ok(sweeps.length >= 4);
  assert.ok(sweeps.every(([a, b], index) => Math.sign(b.x - a.x) === (index % 2 ? -1 : 1)));
  for (const pattern of ['spiral', 'serpentine']) {
    for (const [w, h] of [[1.2, 6], [.1, 4], [2, 30], [30, 2], [200, 400]]) {
      const zone = { x: 0, y: 0, w, h };
      assertContinuousWithin(radiantLayout(zone, { pattern }), zone);
    }
  }
});

test('Collector lead footprints reserve circuit envelopes while retaining continuous peripheral lanes', () => {
  const slab = [{ x: 0, y: 0, width: 2, depth: 4 }, { x: 2, y: 0, width: 2, depth: 4 }];
  const circuits = [
    { path: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 3 }] },
    { path: [{ x: -1, y: 3.25 }, { x: .75, y: 3.25 }, { x: .75, y: 3.75 }] },
  ];
  const lanes = radiantLeadFootprints(slab, circuits);
  const area = lanes.reduce((sum, { width, depth }) => sum + width * depth, 0);
  const covered = (x, y) => lanes.some((rect) => x >= rect.x && x <= rect.x + rect.width &&
    y >= rect.y && y <= rect.y + rect.depth);
  assert.ok(close(area, 16 - 2.04 ** 2 - .77 * .54));
  assert.ok(!covered(2, 2) && !covered(.99, 2) && !covered(.25, 3.5));
  assert.ok(covered(.97, 2) && covered(3.9, 3.9));
  assert.ok(Array.from({ length: 41 }, (_, index) => index / 10).every((x) => covered(x, 3.1)));
});
