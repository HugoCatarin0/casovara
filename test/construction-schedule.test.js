import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyConstructionOperations, constructionLimits, constructionWorkDate, normalizeConstructionSchedule,
  scheduleConstruction, validateConstructionSchedule,
} from '../public/construction-schedule.js';

const task = (id, days, options = {}) => ({ id, label: `Task ${id}`, phase: 'Work', days, ...options });
const crew = (id, capacity = 1) => ({ id, label: `Trade ${id}`, capacity });
const plan = (tasks, options = {}) => ({ startDate: '2026-11-20', tasks, ...options });

test('The calendar applies workdays, holidays and finish-to-start lag without counting milestones as work', () => {
  const input = plan([
    task('ground', 2), task('survey', 2),
    task('fit', 1, { dependencies: [{ id: 'ground', lag: 1 }] }),
    task('handover', 0, { dependencies: [{ id: 'fit' }] }),
  ], { exclusions: ['2026-11-23'] });
  const schedule = scheduleConstruction(input);
  const scheduled = Object.fromEntries(schedule.tasks.map((entry) => [entry.id, entry]));
  assert.deepEqual(schedule.workDates, ['2026-11-20', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27']);
  assert.equal(scheduled.ground.endDate, '2026-11-24');
  assert.equal(scheduled.fit.startDate, '2026-11-26');
  assert.equal(scheduled.handover.startDate, scheduled.handover.endDate);
  assert.equal(schedule.endDate, '2026-11-27');
  assert.equal(schedule.workingDays, 4);
  assert.equal(schedule.dependencyDays, 4);
  assert.ok(schedule.sequentialDays >= schedule.workingDays);
  assert.equal(schedule.peakParallel, 2);
  assert.equal(scheduled.survey.totalFloat, 2);
  assert.deepEqual(schedule.criticalPath, ['ground', 'fit', 'handover']);
  assert.equal(constructionWorkDate(input, 3), '2026-11-26');
});

test('The optimizer overlaps independent trades and never exceeds the shared crew capacity', () => {
  const input = plan([
    task('foundation', 3, { crewId: 'structure' }),
    task('wall', 5, { crewId: 'structure', crewUnits: 2, dependencies: [{ id: 'foundation' }] }),
    task('delivery', 4, { crewId: 'structure' }),
    task('utilities', 2, { crewId: 'services', dependencies: [{ id: 'wall' }] }),
    task('windows', 5, { crewId: 'envelope' }),
  ], { crews: [crew('structure', 2), crew('services'), crew('envelope')] });
  const result = scheduleConstruction(input);
  assert.deepEqual(scheduleConstruction(input), result);
  const assigned = Object.fromEntries(result.tasks.map((entry) => [entry.id, entry]));
  assert.equal(assigned.foundation.startDay, 0);
  assert.equal(assigned.delivery.startDay, 0);
  assert.equal(assigned.wall.dependencyStartDay, 3);
  assert.equal(assigned.wall.startDay, 4);
  assert.equal(assigned.wall.crewDelay, 1);
  assert.deepEqual(assigned.wall.resourceBlockers, ['delivery']);
  assert.equal(assigned.utilities.startDay, assigned.wall.endDay);
  assert.equal(result.peakParallel, 3);
  assert.equal(result.workingDays, 11);
  assert.equal(result.dependencyDays, 10);
  assert.equal(result.sequentialDays, 19);
  assert.equal(result.savedDays, 8);
  for (let day = 0; day < result.workingDays; day++) {
    for (const { id, capacity } of input.crews) {
      const used = result.tasks.filter((entry) => entry.crewId === id && entry.startDay <= day && day < entry.endDay)
        .reduce((sum, entry) => sum + entry.crewUnits, 0);
      assert.ok(used <= capacity);
    }
  }
});

test('A not-before date rounds forward to an available day and shifts work through dependencies', () => {
  const input = plan([
    task('supplier', 2, { notBefore: '2026-11-29' }),
    task('fitting', 1, { dependencies: [{ id: 'supplier' }] }),
  ], { startDate: '2026-11-21', weekdays: [2, 4], exclusions: ['2026-12-01'] });
  const result = scheduleConstruction(input);
  assert.equal(result.startDate, '2026-11-24');
  assert.equal(result.tasks[0].startDate, '2026-12-03');
  assert.equal(result.tasks[0].endDate, '2026-12-08');
  assert.equal(result.tasks[1].startDate, '2026-12-10');
  assert.equal(result.workingDays, 5);
  assert.equal(result.sequentialDays, 5);
  assert.deepEqual(result.criticalPath, ['supplier', 'fitting']);
});

test('Construction edits are atomic, preserve incomplete task fields and validate the final graph', () => {
  const input = plan([
    task('ground', 2, { crewId: 'masons', notBefore: '2026-11-27', notes: 'Keep until layout is confirmed.' }),
    task('wall', 4, { dependencies: [{ id: 'ground' }] }),
  ], { crews: [crew('masons')] });
  const original = structuredClone(input);
  assert.throws(() => applyConstructionOperations(input, [{ op: 'upsert_task', task: { id: 'ground', dependencies: [{ id: 'wall' }] } }]), { code: 'cyclic_dependencies' });
  assert.throws(() => applyConstructionOperations(input, [{ op: 'delete_task', id: 'ground' }]), { code: 'unknown_task' });
  assert.throws(() => applyConstructionOperations(input, [{ op: 'upsert_task', task: { id: 'ground', crewUnits: 2 } }]), { code: 'crew_capacity' });
  assert.throws(() => applyConstructionOperations(input, [{ op: 'set_calendar', calendar: { weekdays: [] } }]), { code: 'invalid_calendar' });
  assert.deepEqual(input, original);
  const edited = applyConstructionOperations(input, [
    { op: 'upsert_task', task: { id: 'wall', days: 5, dependencies: [{ id: 'delivery', lag: 2 }] } },
    { op: 'upsert_task', task: task('delivery', 1) },
    { op: 'upsert_task', task: { id: 'ground', crewId: null, notBefore: null, notes: '' } },
    { op: 'delete_crew', id: 'masons' },
  ]);
  assert.deepEqual(edited.tasks[0], task('ground', 2, { dependencies: [] }));
  assert.equal(edited.tasks[1].phase, 'Work');
  assert.equal(edited.tasks[1].days, 5);
  assert.deepEqual(edited.tasks[1].dependencies, [{ id: 'delivery', lag: 2 }]);
  assert.deepEqual(edited.crews, []);
});

test('Missing plans, invalid dates and the configured work span fail without creating a partial schedule', () => {
  assert.equal(normalizeConstructionSchedule(undefined), null);
  assert.equal(normalizeConstructionSchedule({ startDate: '2027-02-29' }), null);
  assert.throws(() => validateConstructionSchedule({ startDate: '2027-02-29' }), { code: 'invalid_calendar' });
  const empty = scheduleConstruction(plan([]));
  assert.equal(empty.endDate, null);
  assert.equal(empty.peakParallel, 0);
  assert.deepEqual(empty.workDates, []);
  const long = Array.from({ length: Math.floor(constructionLimits.workDays / constructionLimits.taskDays) + 1 }, (_, index) =>
    task(`part-${index}`, constructionLimits.taskDays, { dependencies: index ? [{ id: `part-${index - 1}` }] : [] }));
  assert.throws(() => scheduleConstruction(plan(long)), { code: 'schedule_too_long' });
});
