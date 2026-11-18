import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeItem, makeProject, makeRoom, makeWall, modelFaces } from '../public/builder-engine.js';
import { groundShadow, normalizeSimulator, simulatorDefaults, sunVector } from '../public/simulator.js';
import { readSimulatorOption } from '../public/simulator-controls.js';

test('Sunlight projects a 45-degree shadow away from the light and clips it to the receiver', () => {
  const wall = [[2, 2, 0], [2, 4, 0], [2, 4, 1], [2, 2, 1]];
  const receiver = { x: 1.5, y: 0, width: 8, depth: 8, z: 0 };
  const east = groundShadow(wall, receiver, sunVector(90, 45));
  const west = groundShadow(wall, receiver, sunVector(270, 45));
  assert.ok(east.every(([x, y, z]) => x >= 1.5 && x <= 2 && y >= 2 && y <= 4 && z > 0));
  assert.ok(west.some(([x]) => Math.abs(x - 3) < .000001));
  assert.ok(east.some(([x]) => Math.abs(x - 1.5) < .000001));
});

test('Model environment changes material color, cuts at height and hides furniture while keeping openings', () => {
  const project = makeProject('blank', 'lsf', true);
  const { levels: [level] } = project;
  const wall = makeWall(0, 0, 5, 0, .2);
  wall.spec = { heightMode: 'fixed', height: 2.25, baseOffset: .2, exteriorFinish: 'graphite', interiorFinish: 'lime' };
  const door = makeItem('door', 2, 0);
  door.opening = { sill: .2, height: 1.7 };
  const table = makeItem('table', 3, 2);
  level.rooms.push(makeRoom('living', 0, 0, 5, 4));
  level.walls.push(wall);
  level.items.push(table, door);
  const natural = modelFaces(project, level.id, false, { simulator: { ...simulatorDefaults, site: false, furniture: false } });
  const clay = modelFaces(project, level.id, false, { simulator: { ...simulatorDefaults, site: false, materials: 'clay', furniture: false } });
  assert.ok(natural.some(({ owner }) => owner?.id === door.id));
  assert.ok(natural.every(({ owner }) => owner?.id !== table.id));
  const wallGeometry = natural.filter(({ owner }) => owner?.id === wall.id);
  assert.equal(Math.min(...wallGeometry.flatMap(({ points }) => points.map(([, , z]) => z))), .2);
  assert.equal(Math.max(...wallGeometry.flatMap(({ points }) => points.map(([, , z]) => z))), 2.45);
  assert.notDeepEqual(natural.map(({ fill }) => fill), clay.map(({ fill }) => fill));
  const section = modelFaces(project, level.id, true, { simulator: { ...simulatorDefaults, site: false, sectionHeight: .74 } });
  assert.equal(Math.max(...section.filter(({ owner }) => owner?.id === wall.id).flatMap(({ points }) => points.map(([, , z]) => z))), .74);
});

test('Lighting changes the orientation of the terrain shadow and grid has an independent visibility toggle', () => {
  const project = makeProject('studio', 'masonry', true);
  const level = project.levels[0];
  const view = changes => modelFaces(project, level.id, false, { simulator: { ...simulatorDefaults, ...changes } });
  const east = view({ sunAzimuth: 90 });
  const west = view({ sunAzimuth: 270 });
  const shadows = faces => faces.filter(({ fill }) => fill === '#303a32').map(({ points }) => points);
  assert.ok(shadows(east).length > 0);
  assert.notDeepEqual(shadows(east), shadows(west));
  assert.deepEqual(shadows(view({ shadows: false })), []);
  assert.ok(view({ groundGrid: true }).length > east.length);
});

test('Two windows on the same wall axis create distinct cuts at their own sill heights', () => {
  const project = makeProject('blank', 'masonry', true);
  const { levels: [level] } = project;
  const wall = makeWall(0, 0, 6, 0, .24);
  const lower = makeItem('window', 3, 0);
  const upper = makeItem('window', 3, 0);
  lower.opening = { sill: .62, height: .42 };
  upper.opening = { sill: 1.42, height: .41 };
  level.walls.push(wall);
  level.items.push(lower, upper);
  const faces = modelFaces(project, level.id, false);
  for (const window of [lower, upper]) {
    assert.ok(faces.some(({ owner, opacity }) => owner?.id === window.id && opacity < 1));
  }
  const wallFacesAtCenter = faces.filter(({ owner, points }) => owner?.id === wall.id &&
    Math.min(...points.map(([x]) => x)) < 3 && Math.max(...points.map(([x]) => x)) > 3);
  for (const [sill, top] of [[.62, 1.04], [1.42, 1.83]]) {
    const middle = (sill + top) / 2;
    assert.ok(wallFacesAtCenter.every(({ points }) => Math.max(...points.map(([, , z]) => z)) <= middle ||
      Math.min(...points.map(([, , z]) => z)) >= middle));
  }
});

test('Visible environment controls apply presets and sanitize numeric values', () => {
  const setting = (simulator, attributes) => readSimulatorOption(simulatorDefaults, { dataset: { simulator }, ...attributes });
  assert.deepEqual([setting('lightPreset', { value: 'noon' }).sunAzimuth, setting('lightPreset', { value: 'noon' }).sunElevation], [180, 66]);
  assert.equal(setting('sectionHeight', { value: '-42' }).sectionHeight, .3);
  assert.equal(setting('sunElevation', { value: '999' }).sunElevation, 85);
  assert.equal(setting('site', { checked: false }).site, false);
  assert.equal(setting('materials', { checked: true, value: 'technical' }).materials, 'technical');
  assert.equal(setting('materials', { checked: true, value: 'unknown' }), simulatorDefaults);
});

test('Saved views restore supported environment options and reject invalid values', () => {
  const settings = normalizeSimulator({ materials: 'clay', sunElevation: 12, groundGrid: true, site: false, sunAzimuth: 725,
    furniture: 'false', shadows: false, sectionHeight: -2, unrelated: 'ignored' });
  assert.deepEqual(settings, { materials: 'clay', site: false, furniture: true, shadows: false, groundGrid: true,
    sunAzimuth: 359, sunElevation: 12, sectionHeight: .3 });
});
