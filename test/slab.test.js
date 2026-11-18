import assert from 'node:assert/strict';
import { test } from 'node:test';
import { levelBounds, makeProject, normalizeProject } from '../public/builder-engine.js';
import { normalizeSlab, slabFor, slabFootprints, slabOutline } from '../public/slab.js';

test('Automatic slabs merge adjoining rooms and retain an uncovered courtyard', () => {
  const rooms = [
    { x: 0, y: 0, w: 6, h: 1 }, { x: 0, y: 5, w: 6, h: 1 },
    { x: 0, y: 1, w: 1, h: 4 }, { x: 5, y: 1, w: 1, h: 4 },
    { x: 1, y: 1, w: 4, h: 4, type: 'outdoor' },
  ];
  const footprints = slabFootprints({ rooms });
  assert.equal(footprints.reduce((area, { width, depth }) => area + width * depth, 0), 20);
  const edges = slabOutline(footprints);
  assert.equal(edges.length, 8);
  assert.equal(edges.reduce((length, [x1, y1, x2, y2]) => length + Math.hypot(x2 - x1, y2 - y1), 0), 40);
  assert.ok(edges.some((edge) => edge.join(',') === '5,1,1,1'), 'Courtyard boundary faces the open space');
});

test('Projects keep handwritten footprints and open legacy levels as automatic slabs', () => {
  const project = makeProject('blank', 'lsf', true);
  const [ground] = project.levels;
  const read = () => normalizeProject(project, ['lsf'], true).levels[0];
  assert.equal(read().slab, undefined);
  assert.deepEqual(slabFor(read()), { mode: 'auto', thickness: .17 });

  const footprint = { x: -2, y: 3, width: 10, depth: 8 };
  ground.slab = { mode: 'custom', thickness: .22, footprint };
  assert.deepEqual(read().slab, ground.slab);
  assert.deepEqual(levelBounds(read()), { x: -2, y: 3, width: 10, height: 8 });
  ground.slab.mode = 'none';
  assert.deepEqual(read().slab.footprint, footprint);
  assert.deepEqual(slabFootprints(read()), []);
  assert.deepEqual(normalizeSlab({ mode: 'custom', thickness: .23 }), { mode: 'auto', thickness: .23 });
  assert.deepEqual(normalizeSlab({ mode: 'auto', thickness: 22, footprint: { ...footprint, width: -1 } }), { mode: 'auto', thickness: .17 });
});
