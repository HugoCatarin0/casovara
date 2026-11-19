import assert from 'node:assert/strict';
import { test } from 'node:test';
import { modelFaces } from '../public/builder-engine.js';
import { comparePlans, comparisonViewport } from '../public/builder-assistant.js';
import { normalizeStructure, normalizeStructureElement, roofFrame, roofWindowBounds, structureFootprint } from '../public/structure-elements.js';

const sample = (roof = 'gable') => ({
  id: 'storey', roof, pitch: 34, height: 2.8, name: 'Piso', items: [], measurements: [],
  rooms: [{ id: 'room', type: 'living', x: 0, y: 0, w: 9, h: 6 }],
  walls: [{ id: 'gable-wall', x1: 0, y1: 0, x2: 0, y2: 6, thickness: .25 }],
});

function containsXY(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i], [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

test('Skylight panes and frames retain their own geometry inside actual roof cutouts', () => {
  for (const style of ['gable', 'hipped', 'flat']) {
    const level = sample(style);
    const window = normalizeStructureElement({ id: 'window', type: 'roofWindow', u: .13, v: .42 }, level);
    level.structure = [window];
    const frame = roofFrame(level, 2.8);
    const { x, y, width, depth } = roofWindowBounds(frame, window);
    const [centreX, centreY] = frame.world(x + width / 2, y + depth / 2);
    const faces = modelFaces({ levels: [level] }, level.id, false, { simulator: { site: false } });
    const facesAtWindow = faces.filter(({ owner, points }) => owner && containsXY(points, centreX, centreY));
    assert.ok(facesAtWindow.some(({ owner }) => owner.id === window.id), style);
    assert.ok(facesAtWindow.every(({ owner }) => owner.kind !== 'roof'), style);
    if (style === 'gable') assert.ok(faces.some(({ owner, points }) => owner?.id === 'gable-wall' && points.some(([, , z]) => z > 3.2)));
  }
});

test('Flat roof accessories avoid courtyard voids and strips keep their plan wall anchors', () => {
  const level = sample('flat');
  level.rooms = [{ id: 'shore', type: 'living', x: 0, y: 0, w: 9, h: 2.6 }, { id: 'wing', type: 'living', x: 0, y: 2.6, w: 3, h: 4 }];
  const [footing, window] = normalizeStructure([
    { id: 'f', type: 'foundation', wallId: 'gable-wall', width: .8, footingHeight: .36, bottom: -1 },
    { id: 'w', type: 'roofWindow', u: .9, v: .9 }, { id: 'broken', type: 'foundation', wallId: 'removed' },
  ], level);
  assert.equal(footing.wallId, 'gable-wall');
  const [, y] = structureFootprint(level, window)[2];
  assert.ok(y < 2.6 + .28, 'The glazing stays on the roof over the main wing.');
  const foundationPolygon = structureFootprint(level, footing);
  assert.equal(foundationPolygon.length, 4);
  assert.ok(Math.abs(Math.abs(foundationPolygon[0][0] - foundationPolygon[3][0]) - .8) < 1e-8);
});

test('The proposal comparison reports roof edits and shares bounds around all edited components', () => {
  const before = sample();
  const after = { ...before, pitch: 47, roofSpec: { eavesOverhang: 1.8 },
    structure: [{ id: 'rain', type: 'gutter', edge: 'front' }] };
  const changes = comparePlans({ levels: [before] }, { levels: [after] });
  assert.deepEqual(changes.find(({ kind }) => kind === 'roofs').changed, [before.id]);
  assert.deepEqual(changes.find(({ kind }) => kind === 'structure').added, ['rain']);
  assert.ok(comparisonViewport(before, after, true).height > comparisonViewport(before, after).height + 3);
});
