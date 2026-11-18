import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findWall } from '../public/builder-engine.js';
import { makeTemplate, templates } from '../public/templates.js';
import {
  applyWallAssembly, effectiveWallHeight, getWallSpec, normalizeOpening, normalizeWallSpec,
  openingVertical, wallAppearance, wallLayers, wallMeasurements, wallSpecThickness,
} from '../public/wall-spec.js';

const wall = { id: 'wall', x1: 0, y1: 0, x2: 6, y2: 0, thickness: .20 };

test('Keep legacy wall measurements and ignore invalid imported specification keys', () => {
  assert.equal(normalizeWallSpec(undefined, .24), undefined);
  assert.equal(wallSpecThickness(getWallSpec(wall)), .20);
  assert.equal(effectiveWallHeight(wall, 2.75), 2.75);
  assert.deepEqual(wallLayers(wall).map(({ key, thickness }) => [key, thickness]), [['core', .20]]);
  const malformed = normalizeWallSpec({ assembly: { toString: null }, core: '0.40', insulation: 5, exteriorFinish: '<img>' }, .20);
  assert.equal(malformed.assembly, 'custom');
  assert.equal(malformed.core, .20);
  assert.equal(malformed.insulation, .45);
  assert.equal(malformed.exteriorFinish, 'natural');
});

test('Keep edited height and finishes when applying a wall assembly', () => {
  const spec = normalizeWallSpec({ heightMode: 'fixed', height: 2.45, baseOffset: .20, exteriorFinish: 'timber', exteriorSide: -1 }, .20);
  const configured = applyWallAssembly(spec, 'masonry');
  const mounted = { ...wall, spec: configured, thickness: wallSpecThickness(configured) };
  assert.equal(mounted.thickness, .33);
  assert.equal(effectiveWallHeight(mounted, 3), 2.45);
  assert.equal(wallAppearance(mounted).side, -1);
  assert.equal(wallAppearance(mounted).exteriorMaterial, 'timber');
  assert.deepEqual(wallLayers(mounted).map(({ key }) => key), ['exterior', 'insulation', 'brick', 'interior']);
});

test('Measurements deduct overlap once, clip to the actual wall elevation, and omit attached openings on another wall', () => {
  const raised = { ...wall, spec: normalizeWallSpec({ baseOffset: .5 }, .20) };
  const items = [
    { type: 'door', x: 2, y: 0, width: 2, opening: { sill: 0, height: 2 } },
    { type: 'window', x: 3, y: 0, width: 2, opening: { sill: 1, height: 2.5 } },
    { type: 'window', x: 3, y: 1, width: 1 },
    { type: 'table', x: 3, y: 0, width: 1 },
  ];
  const other = { id: 'other', x1: 0, y1: 1, x2: 6, y2: 1, thickness: .10 };
  const metrics = wallMeasurements(raised, { height: 3, walls: [raised, other], items }, findWall);
  assert.equal(metrics.length, 6);
  assert.equal(metrics.height, 2.5);
  assert.equal(metrics.openings.length, 2);
  assert.equal(metrics.gross, 15);
  assert.equal(metrics.voids, 6);
  assert.equal(metrics.net, 9);
  assert.equal(metrics.volume, 1.8);
});

test('Edited opening elevations retain the default behavior for existing items', () => {
  assert.deepEqual(openingVertical({ type: 'window' }), { sill: .9, top: 2.15 });
  assert.deepEqual(openingVertical({ type: 'doubleDoor' }), { sill: 0, top: 2.05 });
  const opening = normalizeOpening({ sill: 1.05, height: .8 }, 'window');
  assert.deepEqual(openingVertical({ type: 'window', opening }), { sill: 1.05, top: 1.85 });
  assert.equal(normalizeOpening({ height: .8 }, 'table'), undefined);
});

test('Library wall sections preserve their existing total thickness and use the project system assembly', () => {
  for (const { id, systemId } of templates) {
    const plan = makeTemplate(id, 'pt-PT');
    for (const level of plan.levels) {
      for (const wall of level.walls) {
        assert.ok([systemId, 'partition'].includes(wall.spec.assembly));
        assert.equal(wallSpecThickness(wall.spec), wall.thickness);
      }
    }
  }
});
