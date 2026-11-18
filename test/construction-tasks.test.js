import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeTemplate, templates } from '../public/templates.js';
import { generateConstructionPlan } from '../public/construction-tasks.js';
import { scheduleConstruction } from '../public/construction-schedule.js';

const startDate = '2027-01-11';
const planById = ({ tasks }) => new Map(tasks.map((task) => [task.id, task]));

test('Every Casovara example generates a scheduled programme with its selected structural method', () => {
  const signatures = {
    edria: /Édria/, clickhouse: /ClickHouse/, lsf: /LSF/, masonry: /alvenaria/, concrete: /cofragem/,
  };
  for (const { id } of templates) {
    const project = makeTemplate(id, 'pt-PT');
    const programme = generateConstructionPlan(project, { startDate });
    const schedule = scheduleConstruction(programme);
    const tasks = planById(schedule);
    assert.match(tasks.get('structure-1-build').label, signatures[project.systemId]);
    assert.ok(schedule.savedDays > 0);
    for (const task of tasks.values()) {
      for (const { id, lag } of task.dependencies) assert.ok(task.startDay >= tasks.get(id).endDay + lag, task.id);
    }
    assert.equal(tasks.get('start-release').days, 0);
    assert.equal(tasks.get('handover').days, 0);
  }
});

test('Parallel off-site manufacture is planned around field measurements and physical release gates', () => {
  const project = makeTemplate('serra', 'en-PT');
  const schedule = scheduleConstruction(generateConstructionPlan(project, { startDate, locale: 'en-PT' }));
  const tasks = planById(schedule);
  const task = (id) => tasks.get(id);
  assert.equal(task('roof-build').startDay, task('fabricate-openings').startDay);
  assert.ok(task('measure-openings').endDay <= task('fabricate-openings').startDay);
  assert.ok(task('roof-release').endDay <= task('fit-openings').startDay);
  assert.ok(task('fabricate-openings').endDay <= task('fit-openings').startDay);
  assert.ok(task('structure-1-release').endDay <= task('structure-2-build').startDay);
  assert.ok(task('fitout-2-rough-in-check').endDay <= task('fitout-2-close').startDay);
  assert.match(task('structure-2-build').label, /First floor/);
});

test('Saved installations and explicit selections produce the matching optional work before finishes', () => {
  const project = makeTemplate('costa', 'pt-PT');
  project.levels[0].services = { vmc: { nodes: [{ id: 'unit' }], runs: [] } };
  const plan = generateConstructionPlan(project, { startDate, include: { airConditioning: true, radiantFloor: true, plumbing: false } });
  const task = (id) => planById(plan).get(id);
  assert.ok(task('fitout-1-vmc'));
  assert.ok(task('fitout-1-air-conditioning'));
  assert.equal(task('under-slab-services'), undefined);
  assert.equal(task('fitout-1-plumbing'), undefined);
  assert.deepEqual(task('fitout-1-screed').dependencies.map(({ id }) => id), ['fitout-1-radiant-check']);
  assert.equal(planById(generateConstructionPlan(project, { startDate })).get('fitout-1-radiant-floor'), undefined);
});
