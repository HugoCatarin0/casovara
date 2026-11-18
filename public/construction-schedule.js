export const constructionLimits = Object.freeze({
  tasks: 500, crews: 36, capacity: 24, taskDays: 500, lagDays: 365, operations: 600,
  exclusions: 1500, workDays: 15000, label: 110, phase: 64, notes: 1000, id: 90,
  minDate: '1900-01-01', maxDate: '2299-12-31',
});

const oneDay = 86400000;
const standardWeek = [1, 2, 3, 4, 5];
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,90}$/.test(value);
const integer = (value, low, high) => Number.isInteger(value) && value >= low && value <= high;
const dayNumber = (date) => Date.parse(date + 'T00:00:00Z') / oneDay;
const isoDay = (day) => new Date(day * oneDay).toISOString().slice(0, 10);

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      value < constructionLimits.minDate || value > constructionLimits.maxDate) return false;
  const number = dayNumber(value);
  return Number.isInteger(number) && isoDay(number) === value;
}

function failure(code, message, details) {
  const error = new Error(message);
  error.code = code;
  if (details) error.details = details;
  throw error;
}

function string(value, limit, code, label, id, optional = false) {
  if (optional && (value == null || value === '')) return '';
  const clean = typeof value === 'string' ? value.trim() : '';
  if ((!clean && !optional) || typeof value !== 'string' || clean.length > limit) {
    failure(code, `Invalid ${label}.`, id ? { id, field: label } : { field: label });
  }
  return clean;
}

function cleanCalendar(input) {
  const { startDate, weekdays = standardWeek, exclusions = [] } = input;
  if (!validDate(startDate)) failure('invalid_calendar', 'The start date must be a valid ISO date.', { field: 'startDate' });
  if (!Array.isArray(weekdays) || !weekdays.length || weekdays.length > 7 || !weekdays.every((day) => integer(day, 1, 7))) {
    failure('invalid_calendar', 'Select at least one weekday, with Monday as 1 and Sunday as 7.', { field: 'weekdays' });
  }
  if (!Array.isArray(exclusions) || exclusions.length > constructionLimits.exclusions || !exclusions.every(validDate)) {
    failure('invalid_calendar', 'Each excluded date must be a valid ISO date.', { field: 'exclusions' });
  }
  return { startDate, weekdays: [...new Set(weekdays)].sort((a, b) => a - b), exclusions: [...new Set(exclusions)].sort() };
}

function cleanCrew(input) {
  if (!isObject(input) || !validId(input.id) || !integer(input.capacity, 1, constructionLimits.capacity)) {
    failure('invalid_crew', 'A crew needs an ID and a positive integer capacity.', { id: input?.id });
  }
  return { id: input.id, label: string(input.label, constructionLimits.label, 'invalid_crew', 'label', input.id), capacity: input.capacity };
}

function cleanTask(input, crews) {
  if (!isObject(input) || !validId(input.id) || !integer(input.days, 0, constructionLimits.taskDays)) {
    failure('invalid_task', 'A task needs an ID and a duration in whole working days.', { id: input?.id });
  }
  const { id, days, notBefore, levelId, crewId, dependencies = [] } = input;
  const label = string(input.label, constructionLimits.label, 'invalid_task', 'label', id);
  const phase = string(input.phase, constructionLimits.phase, 'invalid_task', 'phase', id);
  const notes = string(input.notes, constructionLimits.notes, 'invalid_task', 'notes', id, true);
  if (levelId != null && levelId !== '' && !validId(levelId)) failure('invalid_task', 'Invalid linked storey.', { id, field: 'levelId' });
  if (notBefore != null && notBefore !== '' && !validDate(notBefore)) failure('invalid_task', 'Invalid earliest date.', { id, field: 'notBefore' });
  const crewUnits = input.crewUnits ?? 1;
  if (crewId != null && crewId !== '') {
    if (!crews.has(crewId)) failure('unknown_crew', 'The task references a crew that does not exist.', { id, crewId });
    if (!integer(crewUnits, 1, crews.get(crewId).capacity)) failure('crew_capacity', 'The task requires more capacity than the crew provides.', { id, crewId });
  }
  if (!Array.isArray(dependencies) || dependencies.length >= constructionLimits.tasks) {
    failure('invalid_task', 'A task needs a valid list of prerequisites.', { id, field: 'dependencies' });
  }
  const previous = new Set();
  const prerequisites = dependencies.map((value) => {
    if (!isObject(value) || !validId(value.id) || !integer(value.lag ?? 0, 0, constructionLimits.lagDays) || previous.has(value.id)) {
      failure('invalid_task', 'Prerequisites must have unique task IDs and a nonnegative working-day lag.', { id, field: 'dependencies' });
    }
    previous.add(value.id);
    return { id: value.id, lag: value.lag ?? 0 };
  });
  return { id, label, phase, days, dependencies: prerequisites,
    ...(crewId ? { crewId, crewUnits } : {}), ...(levelId ? { levelId } : {}),
    ...(notBefore ? { notBefore } : {}), ...(notes ? { notes } : {}),
  };
}

function uniqueMap(entries, kind) {
  const result = new Map();
  for (const entry of entries) {
    if (result.has(entry.id)) failure('duplicate_id', `More than one ${kind} has the same ID.`, { id: entry.id });
    result.set(entry.id, entry);
  }
  return result;
}

function graphFor(tasks) {
  const byId = uniqueMap(tasks, 'task');
  const successors = new Map(tasks.map(({ id }) => [id, []]));
  const indegree = new Map(tasks.map(({ id, dependencies }) => [id, dependencies.length]));
  for (const task of tasks) {
    for (const { id, lag } of task.dependencies) {
      if (!byId.has(id)) failure('unknown_task', 'A task references a prerequisite that does not exist.', { id: task.id, dependencyId: id });
      successors.get(id).push({ id: task.id, lag });
    }
  }
  const order = tasks.filter(({ id }) => indegree.get(id) === 0).map(({ id }) => id);
  const remaining = new Map(indegree);
  for (let index = 0; index < order.length; index++) {
    for (const { id } of successors.get(order[index])) {
      const count = remaining.get(id) - 1;
      remaining.set(id, count);
      if (!count) order.push(id);
    }
  }
  if (order.length !== tasks.length) {
    failure('cyclic_dependencies', 'Some tasks depend on each other in a cycle.', { ids: tasks.filter(({ id }) => remaining.get(id)).map(({ id }) => id) });
  }
  return { byId, successors, indegree, order };
}

function readPlan(input) {
  if (!isObject(input)) failure('invalid_plan', 'Supply a construction plan.');
  const { crews: rawCrews = [], tasks: rawTasks = [] } = input;
  if (!Array.isArray(rawCrews) || rawCrews.length > constructionLimits.crews ||
      !Array.isArray(rawTasks) || rawTasks.length > constructionLimits.tasks) {
    failure('invalid_plan', 'The plan exceeds the limit for tasks or crews.');
  }
  const calendar = cleanCalendar(input);
  const crews = rawCrews.map(cleanCrew);
  const crewsById = uniqueMap(crews, 'crew');
  const tasks = rawTasks.map((entry) => cleanTask(entry, crewsById));
  return { plan: { ...calendar, crews, tasks }, crewsById, graph: graphFor(tasks) };
}

export function validateConstructionSchedule(input) {
  return readPlan(input).plan;
}

export function normalizeConstructionSchedule(input) {
  if (input == null) return null;
  try { return validateConstructionSchedule(input); }
  catch { return null; }
}

export function applyConstructionOperations(input, operations) {
  const { startDate, weekdays, exclusions, tasks, crews } = validateConstructionSchedule(input);
  const updatedCalendar = { startDate, weekdays, exclusions };
  const collections = {
    task: new Map(tasks.map((task) => [task.id, task])),
    crew: new Map(crews.map((crew) => [crew.id, crew])),
  };
  if (!Array.isArray(operations) || !operations.length || operations.length > constructionLimits.operations) {
    failure('invalid_operation', 'Supply a nonempty batch of construction plan edits.');
  }
  for (const edit of operations) {
    if (edit?.op === 'set_calendar' && isObject(edit.calendar)) {
      for (const key of ['startDate', 'weekdays', 'exclusions']) {
        if (Object.hasOwn(edit.calendar, key)) updatedCalendar[key] = edit.calendar[key];
      }
      continue;
    }
    const match = /^(upsert|delete)_(task|crew)$/.exec(String(edit?.op ?? ''));
    if (!match) failure('invalid_operation', 'Unknown construction plan edit.');
    const [, action, kind] = match;
    const collection = collections[kind];
    if (action === 'upsert') {
      const value = edit[kind];
      if (!isObject(value) || !validId(value.id)) failure('invalid_operation', 'An edit must identify an existing or new element.');
      collection.set(value.id, { ...collection.get(value.id), ...value });
    } else if (!collection.delete(edit.id)) {
      failure(`unknown_${kind}`, `The ${kind} no longer exists.`, { id: edit.id });
    }
  }
  const result = validateConstructionSchedule({ ...updatedCalendar, tasks: [...collections.task.values()], crews: [...collections.crew.values()] });
  scheduleConstruction(result);
  return result;
}

function calendarAxis(plan) {
  const workweek = new Set(plan.weekdays);
  const unavailable = new Set(plan.exclusions.map(dayNumber));
  const days = [];
  let next = dayNumber(plan.startDate);
  function add() {
    while (!workweek.has(((next + 3) % 7 + 7) % 7 + 1) || unavailable.has(next)) next++;
    days.push(next++);
  }
  function at(index) {
    if (!integer(index, 0, constructionLimits.workDays)) failure('schedule_too_long', 'The schedule exceeds the supported planning horizon.');
    while (days.length <= index) add();
    return isoDay(days[index]);
  }
  function atOrAfter(date) {
    const target = dayNumber(date);
    while ((!days.length || days.at(-1) < target) && days.length <= constructionLimits.workDays) add();
    if (days.at(-1) < target) return constructionLimits.workDays + 1;
    let low = 0, high = days.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (days[mid] < target) low = mid + 1;
      else high = mid;
    }
    return low;
  }
  return { at, atOrAfter };
}

export function constructionWorkDate(input, dayIndex) {
  return calendarAxis(cleanCalendar(input ?? {})).at(dayIndex);
}

function dependencyAnalysis(graph, axis) {
  const release = new Map(), early = new Map(), latest = new Map(), tail = new Map(), floating = new Map();
  let duration = 0;
  for (const id of graph.order) {
    const task = graph.byId.get(id);
    const calendarStart = task.notBefore ? axis.atOrAfter(task.notBefore) : 0;
    const start = Math.max(calendarStart, ...task.dependencies.map(({ id, lag }) => early.get(id) + graph.byId.get(id).days + lag));
    release.set(id, calendarStart);
    early.set(id, start);
    duration = Math.max(duration, start + task.days);
  }
  for (const id of graph.order.slice().reverse()) {
    const task = graph.byId.get(id);
    const successors = graph.successors.get(id);
    const end = Math.min(duration, ...successors.map(({ id, lag }) => latest.get(id) - lag));
    latest.set(id, end - task.days);
    floating.set(id, end - task.days - early.get(id));
    tail.set(id, task.days + Math.max(0, ...successors.map(({ id, lag }) => tail.get(id) + lag)));
  }
  const criticalChains = new Map();
  let path = [];
  for (const id of graph.order) {
    const task = graph.byId.get(id);
    if (floating.get(id) !== 0) continue;
    let prefix = [];
    for (const dependency of task.dependencies) {
      const chain = criticalChains.get(dependency.id);
      const adjacent = early.get(dependency.id) + graph.byId.get(dependency.id).days + dependency.lag === early.get(id);
      if (adjacent && chain && chain.length > prefix.length) prefix = chain;
    }
    const chain = [...prefix, id];
    criticalChains.set(id, chain);
    if (early.get(id) + task.days === duration && chain.length > path.length) path = chain;
  }
  return { release, early, floating, tail, duration, path };
}

function earliestCrewSlot(usage, earliest, days, units, capacity) {
  let first = earliest;
  for (let day = earliest; day < constructionLimits.workDays; day++) {
    if (usage[day] + units > capacity) first = day + 1;
    else if (day + 1 - first === days) return first;
  }
  return Infinity;
}

function arrange(graph, crews, releases, priority, sequential = false) {
  const remaining = new Map(graph.indegree);
  const ready = graph.order.filter((id) => !remaining.get(id));
  const assigned = new Map(), usage = new Map();
  let endDay = 0, cursor = 0, startSum = 0;
  function earliest(id) {
    return Math.max(releases.get(id), ...graph.byId.get(id).dependencies.map((dependency) => assigned.get(dependency.id).endDay + dependency.lag));
  }
  while (ready.length) {
    ready.sort((a, b) => priority(a, b, earliest));
    const id = ready.shift();
    const task = graph.byId.get(id);
    const dependencyStartDay = earliest(id);
    let startDay = dependencyStartDay;
    if (sequential && task.days) startDay = Math.max(cursor, startDay);
    if (!sequential && task.days && task.crewId) {
      if (!usage.has(task.crewId)) usage.set(task.crewId, new Uint8Array(constructionLimits.workDays));
      const crewUsage = usage.get(task.crewId);
      startDay = earliestCrewSlot(crewUsage, dependencyStartDay, task.days, task.crewUnits, crews.get(task.crewId).capacity);
      if (!Number.isFinite(startDay)) return null;
      for (let day = startDay; day < startDay + task.days; day++) crewUsage[day] += task.crewUnits;
    }
    const end = startDay + task.days;
    if (!sequential && end > constructionLimits.workDays) return null;
    if (task.days) cursor = end;
    endDay = Math.max(endDay, end);
    startSum += startDay;
    assigned.set(id, { startDay, endDay: end, dependencyStartDay });
    for (const next of graph.successors.get(id)) {
      const count = remaining.get(next.id) - 1;
      remaining.set(next.id, count);
      if (!count) ready.push(next.id);
    }
  }
  return { assigned, usage, endDay, startSum };
}

function crewBlockers(task, dates, crewTasks, usage, capacity, blockedCounts) {
  if (!crewTasks || dates.startDay === dates.dependencyStartDay) return [];
  const key = `${task.crewId}:${task.crewUnits}`;
  if (!blockedCounts.has(key)) {
    const blocked = new Uint16Array(usage.length + 1);
    for (let day = 0; day < usage.length; day++) blocked[day + 1] = blocked[day] + Number(usage[day] + task.crewUnits > capacity);
    blockedCounts.set(key, blocked);
  }
  const blocked = blockedCounts.get(key);
  // Only other allocations on blocked working days before the chosen start can
  // prevent the task from using an earlier contiguous window.
  return crewTasks.filter((other) => {
    const first = Math.max(dates.dependencyStartDay, other.startDay);
    const last = Math.min(dates.startDay, other.endDay);
    return first < last && blocked[last] > blocked[first];
  }).map(({ id }) => id);
}

export function scheduleConstruction(input) {
  const { plan, crewsById, graph } = readPlan(input);
  const axis = calendarAxis(plan);
  const dependency = dependencyAnalysis(graph, axis);
  if (dependency.duration > constructionLimits.workDays) failure('schedule_too_long', 'The schedule exceeds the supported planning horizon.');

  const natural = new Map(plan.tasks.map(({ id }, index) => [id, index]));
  const byTail = (a, b) => dependency.tail.get(b) - dependency.tail.get(a) || dependency.floating.get(a) - dependency.floating.get(b) || natural.get(a) - natural.get(b);
  const byFloat = (a, b) => dependency.floating.get(a) - dependency.floating.get(b) || byTail(a, b);
  const byStart = (a, b, earliest) => earliest(a) - earliest(b) || byTail(a, b);
  const sequential = arrange(graph, crewsById, dependency.release, byStart, true);
  const baselineOrder = new Map([...sequential.assigned.keys()].map((id, index) => [id, index]));
  const byBaseline = (a, b) => baselineOrder.get(a) - baselineOrder.get(b);
  let best;
  for (const priority of [byTail, byFloat, byStart, byBaseline]) {
    const candidate = arrange(graph, crewsById, dependency.release, priority);
    if (candidate && (!best || candidate.endDay < best.endDay ||
      (candidate.endDay === best.endDay && candidate.startSum < best.startSum))) best = candidate;
  }
  if (!best) failure('schedule_too_long', 'The schedule exceeds the supported planning horizon.');

  const assignedByCrew = new Map(plan.crews.map(({ id }) => [id, []]));
  for (const task of plan.tasks) if (task.crewId && task.days) {
    assignedByCrew.get(task.crewId).push({ id: task.id, ...best.assigned.get(task.id) });
  }
  const blockedCounts = new Map();
  let lastDateDay = -1;
  const tasks = plan.tasks.map((task) => {
    const times = best.assigned.get(task.id);
    const lastDay = task.days ? times.endDay - 1 : times.startDay;
    lastDateDay = Math.max(lastDateDay, lastDay);
    const totalFloat = dependency.floating.get(task.id);
    return { ...task, ...times, startDate: axis.at(times.startDay), endDate: axis.at(lastDay),
      critical: totalFloat === 0, totalFloat, crewDelay: times.startDay - times.dependencyStartDay,
      resourceBlockers: task.crewId && task.days ? crewBlockers(task, times, assignedByCrew.get(task.crewId),
        best.usage.get(task.crewId), crewsById.get(task.crewId).capacity, blockedCounts) : [],
    };
  });
  const changes = new Int32Array(best.endDay + 1);
  for (const task of tasks) if (task.days) { changes[task.startDay]++; changes[task.endDay]--; }
  let active = 0, peakParallel = 0;
  for (const change of changes) { active += change; peakParallel = Math.max(peakParallel, active); }
  return {
    tasks, startDate: axis.at(0), endDate: lastDateDay < 0 ? null : axis.at(lastDateDay),
    workingDays: best.endDay, dependencyDays: dependency.duration, sequentialDays: sequential.endDay,
    savedDays: Math.max(0, sequential.endDay - best.endDay), peakParallel, criticalPath: dependency.path,
    workDates: Array.from({ length: lastDateDay + 1 }, (_, day) => axis.at(day)),
  };
}
