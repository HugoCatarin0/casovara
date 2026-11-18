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
  assert.deepEqual(designTools.map(({ name }) => name), ['casovara_create_plan', 'casovara_edit_plan', 'casovara_inspect_plan', 'casovara_design_services', 'casovara_plan_construction']);
  assert.ok(designTools[1].inputSchema.properties.operations.items.oneOf.length >= 10);
  assert.match(plannerGuide, /metres/);
});

test('Agents can create and edit a slab on a chosen storey without changing its interior area', () => {
  const footprint = { x: -1, y: -1, width: 8, depth: 7 };
  const { project, analysis } = create({ levels: [{
    id: 'ground', name: 'Rés do chão', rooms: [{ type: 'living', x: 0, y: 0, width: 6, depth: 5 }],
    slab: { mode: 'custom', thickness: .22, footprint },
  }] });
  assert.deepEqual(analysis.levels[0].slab, { mode: 'custom', thickness: .22, footprint });
  assert.equal(analysis.area, 30);
  const revised = edit(project, [
    { op: 'add_level', level: { id: 'above', name: 'Piso 1', rooms: [], slab: { mode: 'none' } } },
    { op: 'set_level', levelId: 'ground', slab: { thickness: .25, footprint: { depth: 7.5 } } },
  ]);
  const slab = revised.project.levels[0].slab;
  assert.deepEqual(slab, { mode: 'custom', thickness: .25, footprint: { ...footprint, depth: 7.5 } });
  assert.deepEqual(revised.analysis.levels[1].slab, { mode: 'none', thickness: .17 });
  assert.equal(revised.analysis.area, 30);
  assert.equal(project.levels[0].slab.footprint.depth, 7);

  const auto = edit(revised.project, [{ op: 'set_level', slab: { mode: 'auto' } }]);
  assert.deepEqual(auto.project.levels[0].slab, { ...slab, mode: 'auto' });
  const customAgain = edit(auto.project, [{ op: 'set_level', slab: { mode: 'custom' } }]);
  assert.deepEqual(customAgain.project.levels[0].slab, slab);
  assert.throws(() => edit(project, [{ op: 'set_level', slab: { thickness: .04 } }]), /slab\.thickness/);
  assert.throws(() => edit(create().project, [{ op: 'set_level', slab: { mode: 'custom' } }]), /slab\.footprint/);
});

test('Construction tooling generates, inspects and edits an isolated, resource-constrained programme', () => {
  const { project } = create();
  const tool = (operations, current = project) => runDesignTool('casovara_plan_construction', { project: current, operations });
  const first = tool([{ op: 'generate', startDate: '2027-03-01' }]);
  assert.equal(first.constructionChanged, true);
  assert.equal(project.constructionPlan, undefined);
  assert.equal(first.project.constructionPlan.startDate, '2027-03-01');
  assert.ok(first.analysis.construction.savedDays > 0);
  assert.ok(first.analysis.construction.peakParallel > 1);
  const task = first.project.constructionPlan.tasks.find(({ id }) => id === 'earthworks');
  const adjusted = tool([{ op: 'edit', changes: [
    { op: 'set_calendar', calendar: { exclusions: ['2027-03-01'] } },
    { op: 'upsert_task', task: { id: task.id, days: task.days + 2 } },
  ] }], first.project);
  assert.equal(adjusted.analysis.construction.startDate, '2027-03-02');
  assert.equal(adjusted.analysis.construction.tasks.find(({ id }) => id === task.id).days, task.days + 2);
  assert.deepEqual(adjusted.project.levels, project.levels);
  assert.throws(() => tool([{ op: 'generate' }], first.project), /exists/i);
  assert.throws(() => tool([{ op: 'edit', changes: [{ op: 'upsert_task', task: { id: task.id, dependencies: [{ id: task.id }] } }] }], first.project));
  assert.deepEqual(runDesignTool('casovara_inspect_plan', { project: adjusted.project }).analysis.construction, adjusted.analysis.construction);
});

test('Service tool generates chosen schemes on specified floors and adjusts routes atomically', () => {
  const { project } = create({ levels: [
    { id: 'ground-services', name: 'Rés do chão', rooms: [
      { type: 'kitchen', x: 0, y: 0, width: 4, depth: 4 },
      { type: 'bath', x: 4, y: 0, width: 3, depth: 4 },
      { type: 'living', x: 0, y: 4, width: 7, depth: 3 },
    ] },
    { id: 'upper-services', name: 'Piso 1', rooms: [{ type: 'bedroom', x: 0, y: 0, width: 4, depth: 4 }] },
  ] });
  const tool = (operations, current = project) => runDesignTool('casovara_design_services', { project: current, operations });
  const systems = ['electrical', 'plumbing', 'vmc', 'airConditioning', 'radiantFloor'];
  const planned = tool([{ op: 'generate', systems, levelIds: ['ground-services'] }]);
  assert.deepEqual(planned.serviceChanges.map(({ result }) => result), systems.map(() => 'generated'));
  assert.equal(project.levels[0].services, undefined);
  assert.equal(planned.project.levels[1].services, undefined);
  assert.deepEqual(Object.keys(planned.analysis.levels[0].services).sort(), [...systems].sort());
  const current = planned.project.levels[0].services.plumbing;
  assert.deepEqual([...new Set(current.runs.map(({ medium }) => medium))].sort(), ['cold', 'drain', 'hot']);
  const run = current.runs[0];
  const adjustment = { op: 'edit', system: 'plumbing', levelId: 'ground-services', changes: [
    { op: 'update_run', id: run.id, run: { points: [{ x: 3, y: 2 }], label: 'Coordenação', surface: 'ceiling' } },
  ] };
  const adjusted = tool([adjustment], planned.project);
  const editedRun = adjusted.project.levels[0].services.plumbing.runs.find(({ id }) => id === run.id);
  assert.deepEqual(editedRun.points, [{ x: 3, y: 2 }]);
  assert.equal(editedRun.label, 'Coordenação');
  assert.equal(editedRun.surface, 'ceiling');
  const automatic = tool([{ ...adjustment, changes: [{ op: 'update_run', id: run.id, run: { surface: null } }] }], adjusted.project);
  assert.equal(Object.hasOwn(automatic.project.levels[0].services.plumbing.runs.find(({ id }) => id === run.id), 'surface'), false);
  const effective = automatic.analysis.levels[0].services.plumbing.runs.find(({ id }) => id === run.id);
  assert.equal(effective.surface, 'floor');
  assert.deepEqual(effective.points, [{ x: 3, y: 2 }]);
  assert.deepEqual(adjusted.project.levels[0].services.vmc, planned.project.levels[0].services.vmc);
  assert.throws(() => tool([adjustment, { ...adjustment, changes: [{ op: 'delete_run', id: 'missing-run' }] }], planned.project));
  assert.notEqual(planned.project.levels[0].services.plumbing.runs[0].label, 'Coordenação');
  assert.throws(() => tool([{ op: 'generate', systems: ['plumbing'] }], { ...adjusted.project, levels: [adjusted.project.levels[0]] }), /kept|preserv|match|generated/i);
});

test('Agents can add grouped outlets to opposite wall faces and set the ground-floor supply phase', () => {
  const { project } = create({ levels: [
    { id: 'ground', name: 'Rés do chão', autoOpenings: false, rooms: [
      { id: 'room-west', type: 'living', x: 0, y: 0, width: 6, depth: 5 },
      { id: 'room-east', type: 'bedroom', x: 6, y: 0, width: 4, depth: 5 },
      { id: 'room-bath', type: 'bath', x: 0, y: 5, width: 3, depth: 3 },
    ] },
    { id: 'upper', name: 'Piso 1', rooms: [{ type: 'bedroom', x: 0, y: 0, width: 4, depth: 4 }] },
  ] });
  const services = (snapshot, operations) => runDesignTool('casovara_design_services', { project: snapshot, operations });
  const generated = services(project, [{ op: 'generate', systems: ['electrical', 'plumbing'], phase: 'three' }]);
  const [ground, upper] = generated.project.levels;
  const entry = ground.services.electrical.nodes.find(({ kind }) => kind === 'supplyEntry');
  assert.equal(entry.phase, 'three');
  assert.ok(ground.services.electrical.runs.some(({ from, medium }) => from === entry.id && medium === 'serviceFeed'));
  assert.ok(!upper.services.electrical.nodes.some(({ kind }) => kind === 'supplyEntry'));
  assert.ok(ground.services.plumbing.nodes.some(({ kind }) => kind === 'waterEntry'));
  assert.ok(ground.services.plumbing.nodes.some(({ kind }) => kind === 'sewerOutlet'));
  const shared = ground.walls.find(({ x1, x2 }) => x1 === 6 && x2 === 6);
  const changes = [-1, 1].map((side, index) => ({ op: 'add_node', node: {
    id: `outlet-group-${index}`, kind: 'outlet', count: 3 + index,
    mount: 'wall', wall: { wallId: shared.id, fraction: .5, side },
  } }));
  changes.push({ op: 'update_node', id: entry.id, node: { phase: 'single' } });
  const proposal = services(generated.project, [{ op: 'edit', system: 'electrical', changes }]);
  const { nodes } = proposal.analysis.levels[0].services.electrical;
  const [a, b] = nodes.filter(({ id }) => id.startsWith('outlet-group-'));
  assert.deepEqual([a.symbol, b.symbol], ['T 3×', 'T 4×']);
  assert.deepEqual(new Set([a.roomId, b.roomId]), new Set(['room-east', 'room-west']));
  assert.equal(a.angle - b.angle === 180 || b.angle - a.angle === 180, true);
  assert.equal(nodes.find(({ id }) => id === entry.id).phase, 'single');
  const moved = edit(proposal.project, [{ op: 'move', id: shared.id, dx: .03, dy: 0 }]);
  const fixture = moved.project.levels[0].services.electrical.nodes.find(({ id }) => id === a.id);
  assert.equal(fixture.x, Math.round((a.x + .03) * 1000) / 1000);
  assert.deepEqual(fixture.wall, a.wall);
  assert.throws(() => services(proposal.project, [{ op: 'edit', system: 'electrical', changes: [
    { op: 'update_node', id: a.id, node: { count: 0 } },
  ] }]), /count/);
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
