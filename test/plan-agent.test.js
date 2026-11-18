import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findWall, modelFaces } from '../public/builder-engine.js';
import { designTools, plannerGuide, runDesignTool } from '../public/plan-agent.js';
import { makeTemplate } from '../public/templates.js';

const create = (overrides = {}) => runDesignTool('casovara_create_plan', {
  name: 'Casa de teste', systemId: 'masonry',
  levels: [{
    id: 'ground', name: 'Rés do chão', rooms: [
      { id: 'living', type: 'living', x: 0, y: 0, width: 6, depth: 5 },
      { id: 'bedroom', type: 'bedroom', x: 6, y: 0, width: 4, depth: 5 },
      { id: 'terrace', type: 'outdoor', x: 0, y: 5, width: 6, depth: 2 },
    ],
    roof: { type: 'gable', pitch: 28 },
  }],
  ...overrides,
});
const edit = (project, operations) => runDesignTool('casovara_edit_plan', { operations }, { project });

test('Planning tools describe creation, atomic editing and inspection', () => {
  assert.deepEqual(designTools.map(({ name }) => name), ['casovara_create_plan', 'casovara_edit_plan', 'casovara_inspect_plan']);
  assert.ok(designTools[1].inputSchema.properties.operations.items.oneOf.length >= 10);
  assert.match(plannerGuide, /metres/);
});

test('Create draws a house with one shared wall, attached openings and renderable geometry', () => {
  const { project, analysis } = create();
  const [floor] = project.levels;
  assert.equal(project.levelId, 'ground');
  assert.equal(floor.roof, 'gable');
  assert.equal(floor.pitch, 28);
  assert.equal(analysis.area, 50);
  assert.equal(analysis.materialEstimate.currency, 'EUR');
  assert.equal(floor.walls.filter(({ x1, x2, y1, y2 }) => x1 === 6 && x2 === 6 && y1 === 0 && y2 === 5).length, 1);
  assert.equal(floor.walls.length, 7);
  assert.deepEqual(analysis.warnings, []);
  assert.ok(floor.items.some(({ type }) => type === 'door'));
  assert.ok(analysis.levels[0].items.some(({ type }) => type === 'window'));
  for (const item of floor.items) assert.ok(findWall(item, floor.walls, .15, item.width));
  assert.ok(modelFaces(project, project.levelId, false).length > 0);
});

test('Edit preserves a detailed wall and its openings when translating it, without altering the source', () => {
  const { project } = create();
  const [floor] = project.levels;
  const item = floor.items[0];
  const host = findWall(item, floor.walls, .15, item.width).wall;
  const before = structuredClone(project);
  const updated = edit(project, [{ op: 'move', levelId: 'ground', id: host.id, dx: -12, dy: -8 }]);
  const nextWall = updated.project.levels[0].walls.find(({ id }) => id === host.id);
  const nextOpening = updated.project.levels[0].items.find(({ id }) => id === item.id);
  assert.deepEqual(nextWall.spec, host.spec);
  assert.equal(nextOpening.x, item.x - 12);
  assert.equal(nextOpening.y, item.y - 8);
  assert.equal(findWall(nextOpening, updated.project.levels[0].walls, .15, nextOpening.width).wall.id, host.id);
  assert.deepEqual(project, before);
  assert.ok(updated.analysis.warnings.some(({ code }) => code === 'missingWall'));
});

test('Invalid operation prevents earlier edits from mutating the supplied plan', () => {
  const { project } = create();
  const baseline = structuredClone(project);
  assert.throws(() => edit(project, [
    { op: 'set_project', name: 'Nome provisório' },
    { op: 'add_opening', opening: { type: 'door', wallId: project.levels[0].walls[0].id, width: 6, offset: .04 } },
  ]), /does not fit within wall/);
  assert.deepEqual(project, baseline);
  assert.throws(() => create({ levels: [{ name: 'Ground floor', rooms: [
    { type: 'living', x: 0, y: 0, width: 3, depth: 3 },
    { type: 'bath', x: 1, y: 1, width: 2, depth: 2 },
  ] }] }), /overlaps/);
});

test('Edit and inspect accept standalone project JSON and preserve notes and manual drafting data', () => {
  const project = makeTemplate('serra', 'pt-PT');
  project.notes = 'Preservar o muro existente';
  project.levels[0].annotations = [{ id: 'note', x: 1, y: 2, text: 'Manter' }];
  const { analysis } = runDesignTool('casovara_inspect_plan', { project }, { locale: 'en-INT' });
  assert.deepEqual(analysis.levels.map(({ area }) => area), [72, 72]);
  assert.ok(analysis.warnings.some(({ code, message }) => code === 'stairs' && message.includes('stair')));
  const updated = runDesignTool('casovara_edit_plan', { project, operations: [
    { op: 'add_furniture', furniture: { id: 'new_sofa', type: 'sofa', x: 2, y: 2, angle: 90 } },
    { op: 'set_roof', levelId: project.levels[1].id, roof: { type: 'hipped', pitch: 35 } },
  ] });
  assert.equal(updated.project.levels[0].items.at(-1).id, 'new_sofa');
  assert.equal(updated.project.levels[1].roof, 'hipped');
  assert.equal(updated.project.notes, project.notes);
  assert.deepEqual(updated.project.levels[0].annotations, project.levels[0].annotations);
});
