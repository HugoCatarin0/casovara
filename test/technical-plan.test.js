import test from 'node:test';
import assert from 'node:assert/strict';
import { draftingBounds, interiorPlanDimensions, openingTags, overallPlanDimensions, technicalWall } from '../public/technical-plan.js';

const format = (value) => value.toFixed(3);
const outerWall = {
  id: 'w1', x1: 0, y1: 0, x2: 4, y2: 0, thickness: .33,
  spec: { assembly: 'masonry', core: .2, insulation: .1, outside: .018, inside: .012, exteriorSide: 1 },
};

test('Drafting dimensions measure drawn wall extents and clear faces', () => {
  const room = { x: 0, y: 0, w: 4, h: 3 };
  const walls = [
    outerWall,
    { x1: 0, y1: 0, x2: 0, y2: 3, thickness: .2 },
    { x1: 0, y1: 3, x2: 4, y2: 3, thickness: .2 },
    { x1: 4, y1: 0, x2: 4, y2: 3, thickness: .2 },
  ];
  assert.deepEqual(draftingBounds([outerWall], []), { left: -.165, top: -.165, right: 4.165, bottom: .165 });
  assert.match(overallPlanDimensions(walls, [room], .022, format), /4\.330 m/);
  const inside = interiorPlanDimensions([room], walls, .02, format);
  assert.match(inside, /3\.800 m/);
  assert.match(inside, /2\.735 m/);
});

test('Wall section toggles derived material hatches and opening labels adapt to scale', () => {
  const settings = { active: true, forExport: false, layers: true, unit: .012 };
  assert.match(technicalWall(outerWall, settings), /cv-plan-thermal/);
  assert.match(technicalWall(outerWall, { ...settings, layers: false }), /cv-plan-mono/);
  const window = { id: 'window', x: 2, y: 0, width: .95, depth: .12, angle: 0, type: 'window', opening: { sill: .9, height: 1.2 } };
  assert.match(openingTags([window], [], .01, format, true).markup, /J01 · 0\.950 × 1\.200 m/);
  assert.match(openingTags([window], [], .035, format, true, { compact: true }).markup, />J01<\/text>/);
});
