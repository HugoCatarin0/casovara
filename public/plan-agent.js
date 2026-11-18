import { elements, findWall, projectArea, roomStyles, wallLength } from './builder-engine.js';
import { estimateProject, systemById, systems } from './core.js';
import { normalizeObjectCatalogRef } from './object-catalog.js';
import {
  applyServiceOperations, generateServices, inspectServices, normalizeBuildingServices, serviceLimits, serviceMounts, servicePhases, serviceSystems,
} from './building-services.js';
import { applyConstructionOperations, constructionLimits, normalizeConstructionSchedule, scheduleConstruction, validateConstructionSchedule } from './construction-schedule.js';
import { generateConstructionPlan } from './construction-tasks.js';
import {
  applyWallAssembly, effectiveWallHeight, getWallSpec, illustrativeWallSpec, normalizeOpening,
  normalizeWallSpec, openingTypes, openingVertical, wallAssemblies, wallBaseOffset,
  wallFinishes, wallSpecThickness,
} from './wall-spec.js';

const tolerance = .001;
const roofTypes = ['none', 'flat', 'gable', 'hipped'];
const finishes = ['natural', 'wood', 'ceramic', 'concrete', 'stone'];
const furnitureTypes = Object.keys(elements).filter((type) => !openingTypes.includes(type));

const object = (properties, required = []) => ({
  type: 'object', properties, required, additionalProperties: false,
});
const list = (items, minItems, maxItems) => ({ type: 'array', items, minItems, maxItems });
const decimal = (minimum, maximum, description) => ({ type: 'number', minimum, maximum, description });
const choice = (values) => ({ type: 'string', enum: values });
const label = { type: 'string', minLength: 1, maxLength: 95 };
const id = { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,90}$' };
const flag = { type: 'boolean' };
const integer = (minimum, maximum, description) => ({ type: 'integer', minimum, maximum, description });
const nullable = (schema) => ({ ...schema, type: [schema.type, 'null'] });
const position = decimal(-500, 500, 'Position in metres.');
const axis = { x: position, y: position };
const angle = decimal(-360, 360, 'Rotation in degrees.');
const span = decimal(.35, 100, 'Room dimension in metres.');
const clearHeight = decimal(1.5, 12, 'Floor clear height in metres.');
const thickness = decimal(.05, 1.5, 'Total wall thickness in metres.');
const roof = object({ type: choice(roofTypes), pitch: decimal(5, 65, 'Roof slope in degrees.') }, ['type']);
const room = { name: label, type: choice(Object.keys(roomStyles)), ...axis, width: span, depth: span, finish: choice(finishes) };
const furniture = {
  type: choice(furnitureTypes), ...axis, width: decimal(.1, 20, 'Object width in metres.'),
  height: decimal(.01, 12, 'Object height in metres. Defaults to the catalogue height.'),
  depth: decimal(.05, 20, 'Object depth in metres.'), angle,
};
const opening = {
  type: choice(openingTypes), wallId: id,
  offset: decimal(0, 1500, 'Distance from the wall start to the opening centre, in metres.'),
  width: decimal(.1, 20, 'Opening width in metres.'),
  height: decimal(.1, 5, 'Opening height in metres.'),
  sill: decimal(-.5, 4, 'Opening base above its storey datum in metres.'),
};
const wall = {
  x1: position, y1: position, x2: position, y2: position, thickness,
  spec: object({
    assembly: choice(Object.keys(wallAssemblies)), core: decimal(.05, 1.5, 'Core thickness in metres.'),
    insulation: decimal(0, .45, 'Insulation thickness in metres.'),
    outside: decimal(0, .1, 'Exterior lining thickness in metres.'),
    inside: decimal(0, .1, 'Interior lining thickness in metres.'),
    heightMode: choice(['floor', 'fixed']), height: decimal(.05, 12, 'Fixed height in metres.'),
    baseOffset: decimal(-1, 5, 'Base offset from storey datum in metres.'),
    exteriorFinish: choice(Object.keys(wallFinishes)), interiorFinish: choice(Object.keys(wallFinishes)),
    exteriorSide: { type: 'number', enum: [-1, 1] },
  }),
};
const levelProperties = { name: label, height: clearHeight, ceiling: flag };
const level = object({
  id, ...levelProperties,
  rooms: list(object({ id, ...room }, ['type', 'x', 'y', 'width', 'depth']), 0, 60), roof,
  furniture: list(object({ id, ...furniture }, ['type', 'x', 'y']), 0, 120),
  autoOpenings: { type: 'boolean', description: 'Generate attached doors and windows automatically. Defaults to true.' },
}, ['name', 'rooms']);
const system = choice(systems.map(({ id }) => id));
const projectInput = {
  type: 'object',
  description: 'Complete editable project object previously returned by a Casovara tool or exported from the planner. Omit only when the current editor already supplies a project.',
};

function operation(name, properties, required = []) {
  return object({ op: choice([name]), ...properties }, ['op', ...required]);
}

const operations = [
  operation('add_level', { level }, ['level']),
  operation('set_level', { levelId: id, ...levelProperties, active: flag }),
  operation('remove_level', { levelId: id }, ['levelId']),
  operation('set_project', { name: label, systemId: system }),
  operation('add_room', { levelId: id, room: object({ id, ...room }, ['type', 'x', 'y', 'width', 'depth']), buildWalls: flag }, ['room']),
  operation('update_room', { levelId: id, id, room: object(room) }, ['id', 'room']),
  operation('add_wall', { levelId: id, wall: object({ id, ...wall }, ['x1', 'y1', 'x2', 'y2']) }, ['wall']),
  operation('update_wall', { levelId: id, id, wall: object(wall) }, ['id', 'wall']),
  operation('add_opening', { levelId: id, opening: object({ id, ...opening }, ['type', 'wallId', 'offset']) }, ['opening']),
  operation('update_opening', { levelId: id, id, opening: object(opening) }, ['id', 'opening']),
  operation('add_furniture', { levelId: id, furniture: object({ id, ...furniture }, ['type', 'x', 'y']) }, ['furniture']),
  operation('update_furniture', { levelId: id, id, furniture: object(furniture) }, ['id', 'furniture']),
  operation('set_roof', { levelId: id, roof }, ['roof']),
  operation('move', { levelId: id, id, dx: position, dy: position }, ['id', 'dx', 'dy']),
  operation('delete', { levelId: id, id }, ['id']),
];

const serviceIds = Object.keys(serviceSystems);
const serviceSystem = choice(serviceIds);
const serviceKind = choice([...new Set(Object.values(serviceSystems).flatMap(({ kinds }) => Object.keys(kinds)))]);
const serviceMedium = choice([...new Set(Object.values(serviceSystems).flatMap(({ media }) => Object.keys(media)))]);
const servicePosition = decimal(-serviceLimits.coordinate, serviceLimits.coordinate, 'Position in metres.');
const serviceAxis = { x: servicePosition, y: servicePosition };
const servicePhase = { ...choice(servicePhases), description: 'Electrical supply entry only. Use single for single-phase or three for three-phase.' };
const serviceWall = object({
  wallId: id,
  fraction: decimal(0, 1, 'Proportional position along the wall, measured from its first endpoint.'),
  side: { type: 'integer', enum: [-1, 1], description: 'Choose the face toward the served room. Positive follows the plan normal (-dy, dx). Negative is the opposite face.' },
}, ['wallId', 'fraction', 'side']);
const serviceNode = {
  kind: serviceKind, ...serviceAxis, label, roomId: id,
  mount: { ...choice(serviceMounts), description: 'Mounting surface. Provide a wall anchor for wall, or plan coordinates for floor, ceiling or free.' },
  wall: serviceWall,
  count: integer(1, serviceLimits.count, 'Number of electrical outlets in this group, for outlet or dedicatedOutlet.'),
  phase: servicePhase,
};
const serviceRun = {
  medium: serviceMedium, from: id, to: id,
  points: { ...list(object(serviceAxis, ['x', 'y']), 0, serviceLimits.points), description: 'Intermediate route vertices in metres, excluding the two node positions.' },
  label,
};
const serviceChanges = [
  operation('add_node', { node: object({ id, ...serviceNode }, ['kind']) }, ['node']),
  operation('update_node', { id, node: object(serviceNode) }, ['id', 'node']),
  operation('delete_node', { id }, ['id']),
  operation('add_run', { run: object({ id, ...serviceRun }, ['medium', 'from', 'to']) }, ['run']),
  operation('update_run', { id, run: object(serviceRun) }, ['id', 'run']),
  operation('delete_run', { id }, ['id']),
  operation('clear', {}),
];
const serviceEdits = [
  operation('generate', {
    systems: list(serviceSystem, 1, 5),
    levelIds: { ...list(id, 1, 20), description: 'Storeys to generate on. Omit to process all storeys.' },
    replace: { ...flag, description: 'Replace existing schemes only when expressly requested. Defaults to preserving existing schemes.' },
    phase: { ...servicePhase, description: 'Phase for the main electrical supply entry. Defaults to the current phase when replacing an existing scheme, or single for a new scheme.' },
  }, ['systems']),
  operation('edit', { system: serviceSystem, levelId: id, changes: list({ oneOf: serviceChanges }, 1, serviceLimits.operations) }, ['system', 'changes']),
];

const scheduleDate = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Portugal civil date in YYYY-MM-DD format.' };
const scheduleLabel = { ...label, maxLength: constructionLimits.label };
const scheduleLink = object({ id, lag: integer(0, constructionLimits.lagDays, 'Whole workdays between a predecessor finishing and this task being released.') }, ['id']);
const scheduleChanges = [
  operation('set_calendar', { calendar: object({ startDate: scheduleDate, weekdays: list(integer(1, 7, '1 is Monday.'), 1, 7), exclusions: list(scheduleDate, 0, constructionLimits.exclusions) }) }, ['calendar']),
  operation('upsert_crew', { crew: object({ id, label: scheduleLabel, capacity: integer(1, constructionLimits.capacity, 'Number of crew units available per workday.') }, ['id']) }, ['crew']),
  operation('delete_crew', { id }, ['id']),
  operation('upsert_task', { task: object({ id, label: scheduleLabel, phase: { ...label, maxLength: constructionLimits.phase },
    days: integer(0, constructionLimits.taskDays, 'Duration in workdays. Zero represents a milestone.'),
    crewId: nullable(id), crewUnits: nullable(integer(1, constructionLimits.capacity)), notBefore: nullable(scheduleDate),
    levelId: nullable(id), notes: { type: ['string', 'null'], minLength: 0, maxLength: constructionLimits.notes }, dependencies: list(scheduleLink, 0, constructionLimits.tasks - 1),
  }, ['id']) }, ['task']),
  operation('delete_task', { id }, ['id']),
];
const constructionEdits = [
  operation('generate', { startDate: scheduleDate, replace: { ...flag, description: 'Set only when the user requests replacing the current construction plan.' },
    include: object({ electrical: flag, plumbing: flag, vmc: flag, airConditioning: flag, radiantFloor: flag, externalWorks: flag }),
  }),
  operation('edit', { changes: list({ oneOf: scheduleChanges }, 1, constructionLimits.operations) }, ['changes']),
  operation('clear', {}),
];

export const designTools = Object.freeze([
  {
    name: 'casovara_create_plan', title: 'Create a house plan',
    description: 'Build a new editable Casovara project from explicit storeys and rectangular rooms in metres. Generates merged walls and attached door and window openings. Returns the plan and geometric checks. Does not save to the workspace.',
    inputSchema: object({ name: label, systemId: system, levels: list(level, 1, 12) }, ['name', 'systemId', 'levels']),
  },
  {
    name: 'casovara_edit_plan', title: 'Edit a house plan',
    description: 'Apply an atomic batch of edits to a Casovara project. Supports rooms, walls, anchored openings, furniture, roof, storeys, and project settings. Inspect first for exact entity ids. Provide the full project to external tools. Returns an editable draft; does not save to the workspace.',
    inputSchema: object({ project: projectInput, operations: list({ oneOf: operations }, 1, 80) }, ['operations']),
  },
  {
    name: 'casovara_inspect_plan', title: 'Inspect a house plan',
    description: 'Read a Casovara project and return storey geometry, building-service ids, construction tasks and dependencies when defined, coverage, indicative material costs, and warnings. Provide the full project to external tools.',
    inputSchema: object({ project: projectInput }),
  },
  {
    name: 'casovara_design_services', title: 'Design building services',
    description: 'Generate or edit schematic electrical, plumbing, VMC, air conditioning and radiant-floor networks. Adjust wall face, mounting surface, outlet groups, supply phase and routes with exact ids. Returns an editable proposal for review.',
    inputSchema: object({ project: projectInput, operations: list({ oneOf: serviceEdits }, 1, 40) }, ['operations']),
  },
  {
    name: 'casovara_plan_construction', title: 'Plan the construction schedule',
    description: 'Generate or update the editable construction programme, including calendar, workday durations, milestones, predecessor links and crew capacity. Recalculates a feasible concurrent timeline, dependency critical path and one-task-at-a-time comparison. Returns a proposal for review.',
    inputSchema: object({ project: projectInput, operations: list({ oneOf: constructionEdits }, 1, 40) }, ['operations']),
  },
]);

export const plannerGuide = `# Casovara planning skill

Use Casovara to draw editable house plans. Work in metres with x and y as plan axes and supplied numbers, not strings. Storeys are ordered bottom to top; level heights use metres from their floor datum. Roof pitches and rotations use degrees.

- Create with \`casovara_create_plan\`. Lay out non-overlapping rectangular rooms; use shared edges for adjoining spaces and a circulation room for hall access. Each room needs a type, x, y, width and depth.
- Use Portuguese system IDs \`edria\`, \`lsf\`, \`clickhouse\`, \`masonry\` or \`concrete\`. Room types are \`living\`, \`kitchen\`, \`bedroom\`, \`bath\`, \`circulation\` and \`outdoor\`. Refer to tool schemas for furniture, roof types, assemblies, finishes and bounds.
- Indoor walls follow room boundaries without duplicate shared segments. Ground floors receive entrance doors and connected rooms receive passage doors when sufficient wall length is available. Attached windows are added where there is a suitable exterior segment. Use \`autoOpenings: false\` for manually designed openings. A top storey defaults to a flat roof unless specified.
- Use \`casovara_inspect_plan\` before editing. It returns stable level, room, wall and item ids and practical layout warnings. Check hall access, vertical circulation, and dimensions. Its area is the union of room rectangles excluding outdoors. Material costs are illustrative.
- Use \`casovara_edit_plan\` for atomic changes. Each operation can target a \`levelId\`; omit it to use the active storey. Use exact ids and supply opening \`wallId\` plus an \`offset\` in metres from that wall's first endpoint to the opening centre. A door or window must fit within its wall in both dimensions. If walls were created independently of a room, include explicit wall edits when moving a room boundary. Evaluate the warnings after every edit.
- Use \`casovara_design_services\` to generate or adjust building services. The supported systems are ${serviceIds.map((id) => `\`${id}\``).join(', ')}. Specify radiant floor only if the user asks for it or confirms it for relevant rooms. A schematic generation preserves existing work unless the user requests replacement. Use an \`edit\` operation with the exact system and storey ids and a batch of node or run changes. Each run joins two nodes in the same system and takes optional intermediate points, omitting its endpoints. A storey schematic leaves connections between storeys for coordination. These tools do not determine loads, sizes, slopes, equipment ratings or regulatory compliance.
- For wall-mounted fixtures, use \`mount: "wall"\` and \`wall: {wallId, fraction, side}\`. The fraction runs from the wall's first endpoint (0) to its second (1). Side 1 follows the normal (-dy, dx) in plan coordinates and side -1 faces the other way. Choose the served room's side and avoid openings. The wall anchor supplies x and y. Use \`floor\`, \`ceiling\` or \`free\` and x, y for other positions. Generated light points use the ceiling. A wall switch, board or socket normally faces its room. Apply the same mounting convention to fixtures in the other systems.
- A group of three sockets is one \`outlet\` node with \`count: 3\`, shown as T 3×. A generated electrical \`supplyEntry\` joins the ground floor's board through \`serviceFeed\`. Request \`phase: "three"\` at generation, or update the entry node's phase to \`three\` or \`single\`. The generated phase defaults to \`single\` when unspecified and is a planning assumption. The ground floor plumbing proposes a cold-water entry and wastewater outlet. Coordinate exterior terminals and floor-to-floor connections against the project.
- Building services media and compatible node kinds per system: ${Object.entries(serviceSystems).map(([id, { kinds, media }]) => `${id}: nodes ${Object.keys(kinds).join(', ')}; media ${Object.keys(media).join(', ')}`).join(' | ')}.
- Use \`casovara_plan_construction\` to generate or revise the construction programme. Dates use \`YYYY-MM-DD\`; durations, lags and crew capacity refer to working days. A zero-day task is a milestone. A predecessor must finish and its lag elapse before its successor can start. For a change, inspect the task and crew ids and preserve all known dependencies and release gates. To remove a referenced task or crew, update every dependent task in the same edit. Keep approvals, curing, safety, procurement and work-area compatibility explicit. Compare the selected programme against its one-task-at-a-time baseline, and explain any limits. Durations are editable planning assumptions and the scheduler searches feasible arrangements without claiming a global minimum.
- MCP calls work with the returned \`project\` object and do not read a browser's private workspace. Pass that object on each inspect/edit. Download or import the project into the editor to review it. When the planner itself supplies the active project you may omit it.
- These are conceptual layouts. Explain any assumption and flag requests that cannot be represented by rectangles and linear walls. Review usable dimensions, structure and compliance with a qualified professional before building.

## Example

Create a shared living/kitchen and a bedroom on one floor:

\`\`\`json
{"name":"Casa da Vila","systemId":"masonry","levels":[{"name":"Rés do chão","rooms":[{"type":"living","name":"Sala e cozinha","x":0,"y":0,"width":6,"depth":5},{"type":"bedroom","x":6,"y":0,"width":4,"depth":5}],"roof":{"type":"gable","pitch":28}}]}
\`\`\`

Inspect the returned project, then add a bed by issuing \`{"operations":[{"op":"add_furniture","furniture":{"type":"bed","x":8,"y":2.5}}]}\` with the same project.

Then generate electrical and plumbing schemes for the house with \`casovara_design_services\` and \`{"operations":[{"op":"generate","systems":["electrical","plumbing"]}]}\`. Inspect the returned service node and run identifiers before editing a scheme.

Generate an initial construction plan with \`casovara_plan_construction\` and \`{"operations":[{"op":"generate","startDate":"2027-03-01"}]}\`. To update the duration of a task, use an edit containing \`{"op":"upsert_task","task":{"id":"exact-task-id","days":5}}\`.
`;

function validate(schema, value, path) {
  if (schema.oneOf) {
    const match = schema.oneOf.find((option) => option.properties.op.enum.includes(value?.op));
    if (!match) throw new Error(`${path}.op must name an available planning operation.`);
    return validate(match, value, path);
  }
  if (Array.isArray(schema.type)) {
    if (value === null && schema.type.includes('null')) return;
    return validate({ ...schema, type: schema.type.find((kind) => kind !== 'null') }, value, path);
  }
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`${path} must be one of ${schema.enum.join(', ')}.`);
  switch (schema.type) {
    case 'object':
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be an object.`);
      for (const key of schema.required ?? []) {
        if (!Object.hasOwn(value, key)) throw new Error(`${path}.${key} is required.`);
      }
      for (const key of Object.keys(value)) {
        if (Object.hasOwn(schema.properties ?? {}, key)) validate(schema.properties[key], value[key], `${path}.${key}`);
        else if (schema.additionalProperties === false) throw new Error(`${path} has an unsupported field.`);
      }
      return;
    case 'array':
      if (!Array.isArray(value) || value.length < schema.minItems || value.length > schema.maxItems) {
        throw new Error(`${path} must have between ${schema.minItems} and ${schema.maxItems} entries.`);
      }
      value.forEach((item, index) => validate(schema.items, item, `${path}[${index}]`));
      return;
    case 'integer':
    case 'number':
      if (!Number.isFinite(value) || (schema.type === 'integer' && !Number.isInteger(value)) || value < schema.minimum || value > schema.maximum) {
        const bounds = schema.minimum === undefined ? '' : ` between ${schema.minimum} and ${schema.maximum}`;
        throw new Error(`${path} must be a finite number${bounds}.`);
      }
      return;
    case 'string':
      if (typeof value !== 'string' || value.length < schema.minLength || value.length > schema.maxLength ||
          (schema.pattern && !new RegExp(schema.pattern).test(value)) || (schema.minLength !== 0 && !value.trim())) {
        throw new Error(`${path} must be valid non-empty text.`);
      }
      return;
    case 'boolean':
      if (typeof value !== 'boolean') throw new Error(`${path} must be true or false.`);
  }
}

const rounded = (value, scale = 1000) => Math.round(value * scale) / scale;

function reserveId(used, supplied, prefix) {
  if (supplied) {
    if (used.has(supplied)) throw new Error(`The id "${supplied}" already exists in this project.`);
    used.add(supplied);
    return supplied;
  }
  let ordinal = used.size + 1;
  while (used.has(`${prefix}-${ordinal}`)) ordinal++;
  const generated = `${prefix}-${ordinal}`;
  used.add(generated);
  return generated;
}

function makeRoom(data, used) {
  const result = {
    id: reserveId(used, data.id, 'room'), type: data.type, name: data.name?.trim() ?? '',
    x: rounded(data.x), y: rounded(data.y), w: rounded(data.width), h: rounded(data.depth),
  };
  validate(position, result.x, 'room.x');
  validate(position, result.y, 'room.y');
  if (data.finish && data.finish !== 'natural') result.finish = data.finish;
  if (result.x + result.w > 500 || result.y + result.h > 500) throw new Error('Room extends beyond the editable plan bounds.');
  return result;
}

function makeFurniture(data, used) {
  const profile = elements[data.type];
  const catalogRef = normalizeObjectCatalogRef(data.catalogRef);
  return {
    id: reserveId(used, data.id, 'item'), type: data.type,
    x: rounded(data.x), y: rounded(data.y), angle: rounded(data.angle ?? 0),
    width: rounded(data.width ?? profile.width), depth: rounded(data.depth ?? profile.depth),
    ...(Number.isFinite(data.height) ? { height: rounded(Math.max(.01, Math.min(data.height, 12))) } : {}),
    ...(catalogRef ? { catalogRef } : {}),
  };
}

function collision(first, second) {
  return Math.min(first.x + first.w, second.x + second.w) - Math.max(first.x, second.x) > tolerance &&
    Math.min(first.y + first.h, second.y + second.h) - Math.max(first.y, second.y) > tolerance;
}

function requireRoomFit(candidate, rooms) {
  const conflicting = rooms.find((other) => other.id !== candidate.id && collision(candidate, other));
  if (conflicting) throw new Error(`Room "${candidate.name || candidate.id}" overlaps "${conflicting.name || conflicting.id}". Adjust its position or size.`);
}

function roomEdges(rooms) {
  const lines = new Map();
  for (const room of rooms.filter(({ type }) => type !== 'outdoor')) {
    const { x, y, w, h } = room;
    for (const [axis, fixed, from, to, side] of [
      ['x', y, x, x + w, -1], ['x', y + h, x, x + w, 1],
      ['y', x, y, y + h, 1], ['y', x + w, y, y + h, -1],
    ]) {
      const key = `${axis}:${rounded(fixed)}`;
      if (!lines.has(key)) lines.set(key, { axis, fixed: rounded(fixed), spans: [] });
      lines.get(key).spans.push({ from: rounded(from), to: rounded(to), side, room });
    }
  }
  return [...lines.values()].flatMap(({ axis, fixed, spans }) => {
    const marks = [...new Set(spans.flatMap(({ from, to }) => [from, to]))].sort((a, b) => a - b);
    return marks.slice(1).flatMap((to, index) => {
      const from = marks[index];
      const owners = spans.filter((span) => span.from <= from && span.to >= to);
      return owners.length && to - from > .015 ? [{ axis, fixed, from, to, owners }] : [];
    });
  });
}

function edgeWall(edge, systemId, used, from = edge.from, to = edge.to) {
  const { axis, fixed, owners } = edge;
  const outside = owners.length === 1;
  const thickness = outside ? systemById(systemId).defaults.wallThickness : .12;
  return {
    id: reserveId(used, undefined, 'wall'),
    x1: axis === 'x' ? from : fixed, y1: axis === 'x' ? fixed : from,
    x2: axis === 'x' ? to : fixed, y2: axis === 'x' ? fixed : to,
    thickness, spec: illustrativeWallSpec(thickness, outside ? systemId : 'partition', owners[0].side),
  };
}

function openingOffset(item, wall) {
  const distance = wallLength(wall);
  if (!distance) return 0;
  return ((item.x - wall.x1) * (wall.x2 - wall.x1) + (item.y - wall.y1) * (wall.y2 - wall.y1)) / distance;
}

function hostedOpening(item, wall, offset, storeyHeight) {
  const length = wallLength(wall);
  if (offset < item.width / 2 - tolerance || offset + item.width / 2 > length + tolerance) {
    throw new Error(`Opening "${item.id}" does not fit within wall "${wall.id}" at that offset.`);
  }
  const { sill, top } = openingVertical(item);
  const base = wallBaseOffset(wall);
  if (sill < base - tolerance || top > base + effectiveWallHeight(wall, storeyHeight) + tolerance) {
    throw new Error(`Opening "${item.id}" is outside the height of wall "${wall.id}". Adjust the sill or opening height.`);
  }
  return {
    ...item,
    x: rounded(wall.x1 + (wall.x2 - wall.x1) * offset / length),
    y: rounded(wall.y1 + (wall.y2 - wall.y1) * offset / length),
    angle: rounded(Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) * 180 / Math.PI),
  };
}

function overlapsOpenings(first, second, wall) {
  const horizontal = (first.width + second.width) / 2 - Math.abs(openingOffset(first, wall) - openingOffset(second, wall));
  const firstHeight = openingVertical(first);
  const secondHeight = openingVertical(second);
  return horizontal > tolerance && Math.min(firstHeight.top, secondHeight.top) - Math.max(firstHeight.sill, secondHeight.sill) > tolerance;
}

function hostOf(item, floor) {
  return findWall(item, floor.walls, .15, item.width)?.wall;
}

function makeOpening(data, wall, floor, used, previous) {
  const type = data.type ?? previous?.type;
  const profile = elements[type];
  const baseline = previous && type === previous.type ? previous.opening : undefined;
  const opening = normalizeOpening({ ...baseline, ...(data.sill === undefined ? {} : { sill: data.sill }),
    ...(data.height === undefined ? {} : { height: data.height }) }, type);
  const item = {
    id: previous?.id ?? reserveId(used, data.id, 'opening'), type,
    width: rounded(data.width ?? (type === previous?.type ? previous.width : profile.width)),
    depth: type === previous?.type ? previous.depth : profile.depth,
    opening,
  };
  const attached = hostedOpening(item, wall, data.offset ?? openingOffset(previous, wall), floor.height);
  const conflict = floor.items.find((other) => other.id !== attached.id && openingTypes.includes(other.type) &&
    hostOf(other, floor)?.id === wall.id && overlapsOpenings(attached, other, wall));
  if (conflict) throw new Error(`Opening "${attached.id}" overlaps "${conflict.id}" on wall "${wall.id}".`);
  return attached;
}

function autoOpenings(floor, edges, ground, used) {
  const exterior = edges.filter(({ owners, wall }) => owners.length === 1 && wallLength(wall) >= 1);
  const partitions = edges.filter(({ owners, wall }) => owners.length === 2 && wallLength(wall) >= 1);
  const withWindows = Math.min(.95, floor.height * .55);
  const add = ({ wall }, type, width, sill = 0) => {
    const defaultHeight = openingVertical({ type }).top - (type === 'window' ? .9 : 0);
    const height = Math.min(defaultHeight, floor.height - sill - .02);
    floor.items.push(makeOpening({ type, width, sill, height, offset: wallLength(wall) / 2 }, wall, floor, used));
  };

  const indoor = floor.rooms.filter(({ type }) => type !== 'outdoor');
  const reachable = new Set();
  const doorEdges = new Set();
  for (let rest = indoor.filter((room) => !reachable.has(room.id)); rest.length; rest = indoor.filter((room) => !reachable.has(room.id))) {
    const access = exterior.filter(({ owners }) => rest.includes(owners[0].room));
    const entry = access.find(({ owners }) => owners[0].room.type === 'circulation') ??
      access.find(({ owners }) => owners[0].room.type === 'living') ?? access[0];
    const start = entry?.owners[0].room ?? rest.find(({ type }) => type === 'circulation') ?? rest[0];
    if (ground && entry) { add(entry, 'door', .9); doorEdges.add(entry); }
    reachable.add(start.id);
    while (true) {
      const door = partitions.find(({ owners }) => owners.some(({ room }) => room.type === 'circulation') &&
        reachable.has(owners[0].room.id) !== reachable.has(owners[1].room.id)) ??
        partitions.find(({ owners }) => reachable.has(owners[0].room.id) !== reachable.has(owners[1].room.id));
      if (!door) break;
      add(door, 'door', .9);
      door.owners.forEach(({ room }) => reachable.add(room.id));
    }
  }

  for (const room of indoor.filter(({ type }) => type !== 'circulation')) {
    const candidates = exterior.filter((edge) => edge.owners[0].room === room && !doorEdges.has(edge))
      .sort((a, b) => wallLength(b.wall) - wallLength(a.wall));
    if (!candidates.length) continue;
    const edge = candidates[0];
    const length = wallLength(edge.wall);
    const type = room.type === 'living' && ground && length >= 3.2 ? 'slidingWindow' : 'window';
    const width = room.type === 'bath' ? .65 : Math.min(elements[type].width, length - .18);
    const sill = type === 'slidingWindow' ? 0 : room.type === 'bath' ? Math.min(1.4, floor.height - .55) : withWindows;
    add(edge, type, width, sill);
  }
}

function makeFloor(data, systemId, used, index, isTop) {
  const settings = systemById(systemId).defaults;
  const result = {
    id: reserveId(used, data.id, 'level'), name: data.name.trim(),
    height: data.height ?? settings.roomHeight, rooms: [], walls: [], items: [],
    measurements: [], annotations: [], ceiling: data.ceiling ?? false,
    roof: data.roof?.type ?? (isTop ? 'flat' : 'none'), pitch: data.roof?.pitch ?? 30,
  };
  for (const entry of data.rooms) {
    const room = makeRoom(entry, used);
    requireRoomFit(room, result.rooms);
    result.rooms.push(room);
  }
  const edges = roomEdges(result.rooms).map((edge) => ({ ...edge, wall: edgeWall(edge, systemId, used) }));
  const shared = new Set(edges.filter(({ owners }) => owners.length > 1).flatMap(({ owners }) => owners.map(({ room }) => room.id)));
  result.walls = edges.map(({ owners, wall }) => shared.has(owners[0].room.id) ? wall : { ...wall, roomId: owners[0].room.id });
  if (data.autoOpenings !== false) autoOpenings(result, edges, index === 0, used);
  result.items.push(...(data.furniture ?? []).map((entry) => makeFurniture(entry, used)));
  return result;
}

function newSnapshot(data) {
  const used = new Set();
  const levels = data.levels.map((entry, index) => makeFloor(entry, data.systemId, used, index, index === data.levels.length - 1));
  return { name: data.name.trim(), systemId: data.systemId, levelId: levels[0].id, levels, notes: '', cameras: [] };
}

function validateSnapshot(snapshot) {
  function fail(label) { throw new Error(`The project contains an invalid ${label}. Open or import it in the planner and inspect it again.`); }
  if (!snapshot || typeof snapshot !== 'object' || !systemById(snapshot.systemId) ||
      typeof snapshot.name !== 'string' || !snapshot.name.trim() || snapshot.name.length > 120 ||
      !Array.isArray(snapshot.levels) || !snapshot.levels.length || snapshot.levels.length > 20) fail('project header');
  const used = new Set();
  function seen(value) {
    if (typeof value !== 'string' || !/^[\w-]{1,90}$/.test(value) || used.has(value)) fail('entity id that is missing, repeated or malformed');
    used.add(value);
  }
  function validNumbers(shape, fields) {
    return shape && fields.every((field) => Number.isFinite(shape[field]) && Math.abs(shape[field]) <= 1000);
  }
  for (const floor of snapshot.levels) {
    if (!floor || typeof floor.name !== 'string' || floor.name.length > 120 ||
        !Number.isFinite(floor.height) || floor.height < 1.5 || floor.height > 12 ||
        ![floor.rooms, floor.walls, floor.items].every((entries) => Array.isArray(entries) && entries.length <= 1000)) fail('storey');
    seen(floor.id);
    for (const room of floor.rooms) {
      if (!validNumbers(room, ['x', 'y', 'w', 'h']) || !Object.hasOwn(roomStyles, room.type) || room.w < .35 || room.h < .35 ||
          room.w > 100 || room.h > 100 || (room.name !== undefined && typeof room.name !== 'string')) fail('room');
      seen(room.id);
    }
    for (const wall of floor.walls) {
      if (!validNumbers(wall, ['x1', 'y1', 'x2', 'y2', 'thickness']) || wallLength(wall) <= .01 ||
          wall.thickness < .05 || wall.thickness > 1.5) fail('wall');
      seen(wall.id);
    }
    for (const item of floor.items) {
      if (!validNumbers(item, ['x', 'y', 'width', 'depth', 'angle']) || !Object.hasOwn(elements, item.type) ||
          item.width < .1 || item.depth < .05 || item.width > 20 || item.depth > 20) fail('item');
      seen(item.id);
    }
  }
  if (!snapshot.levels.some(({ id }) => id === snapshot.levelId)) fail('current storey id');
  if (used.size > 6000) throw new Error('The project is too large for a single planning operation.');
  return used;
}

function makeWall(data, floor, systemId, used, previous) {
  const previousSpec = previous?.spec;
  const coordinates = ['x1', 'y1', 'x2', 'y2'];
  const wall = {
    ...previous,
    id: previous?.id ?? reserveId(used, data.id, 'wall'),
    ...Object.fromEntries(coordinates.map((key) => [key, rounded(data[key] ?? previous?.[key])])),
    thickness: rounded(data.thickness ?? previous?.thickness ?? systemById(systemId).defaults.wallThickness),
  };
  for (const key of coordinates) validate(position, wall[key], `wall.${key}`);
  if (wallLength(wall) < .05) throw new Error(`Wall "${wall.id}" must be at least 0.05 m long.`);
  if (previousSpec || data.spec) {
    let spec = getWallSpec(wall, floor.height);
    if (data.spec?.assembly && spec.assembly !== data.spec.assembly) spec = applyWallAssembly(spec, data.spec.assembly);
    spec = { ...spec, ...data.spec };
    if (data.thickness !== undefined && data.spec?.core === undefined) {
      spec.core = rounded(data.thickness - spec.insulation - spec.outside - spec.inside);
      if (spec.core < .05) throw new Error('Wall thickness must leave at least 0.05 m for the core after the other layers.');
    }
    if (wallSpecThickness(spec) > 1.5) throw new Error('The combined wall layers cannot exceed 1.5 m.');
    wall.spec = normalizeWallSpec(spec, wall.thickness);
    wall.thickness = wallSpecThickness(wall.spec);
  }
  return wall;
}

function extentOnEdge(edge, wall) {
  const axis = edge.axis;
  const coordinate = axis === 'x' ? 'y' : 'x';
  if (Math.abs(wall[coordinate + '1'] - edge.fixed) > tolerance || Math.abs(wall[coordinate + '2'] - edge.fixed) > tolerance) return null;
  const from = Math.max(edge.from, Math.min(wall[axis + '1'], wall[axis + '2']));
  const to = Math.min(edge.to, Math.max(wall[axis + '1'], wall[axis + '2']));
  return to > from + tolerance ? [from, to] : null;
}

function missingSegments(edge, walls) {
  const spans = walls.map((wall) => extentOnEdge(edge, wall)).filter(Boolean).sort((a, b) => a[0] - b[0]);
  const gaps = [];
  let cursor = edge.from;
  for (const [from, to] of spans) {
    if (from > cursor + tolerance) gaps.push([cursor, from]);
    cursor = Math.max(cursor, to);
  }
  if (cursor + tolerance < edge.to) gaps.push([cursor, edge.to]);
  return gaps;
}

function requireNoOverlappingWall(floor, candidate) {
  const length = wallLength(candidate);
  const x = (candidate.x2 - candidate.x1) / length;
  const y = (candidate.y2 - candidate.y1) / length;
  for (const wall of floor.walls) {
    if (wall.id === candidate.id) continue;
    const x1 = wall.x1 - candidate.x1;
    const y1 = wall.y1 - candidate.y1;
    const x2 = wall.x2 - candidate.x1;
    const y2 = wall.y2 - candidate.y1;
    if (Math.abs(x * y1 - y * x1) > tolerance || Math.abs(x * y2 - y * x2) > tolerance) continue;
    const first = x * x1 + y * y1;
    const last = x * x2 + y * y2;
    if (Math.min(length, Math.max(first, last)) - Math.max(0, Math.min(first, last)) > tolerance) {
      throw new Error(`Wall "${candidate.id}" overlaps wall "${wall.id}" on the same axis.`);
    }
  }
}

function matchingEntity(entries, id, kind) {
  const entity = entries.find((entry) => entry.id === id);
  if (!entity) throw new Error(`No ${kind} with id "${id}" on the chosen storey. Inspect the project for exact ids.`);
  return entity;
}

function replace(entries, original, replacement) {
  entries[entries.indexOf(original)] = replacement;
}

function updateWalls(floor, replacements) {
  const openings = new Map(floor.items.filter((item) => openingTypes.includes(item.type)).map((item) => [item.id, hostOf(item, floor)]));
  const changed = new Set();
  for (const [id, next] of replacements) {
    const previous = matchingEntity(floor.walls, id, 'wall');
    requireNoOverlappingWall(floor, next);
    replace(floor.walls, previous, next);
    for (const item of floor.items) {
      if (openings.get(item.id)?.id !== id) continue;
      const offset = openingOffset(item, previous) / wallLength(previous) * wallLength(next);
      const margin = item.width / 2;
      const adjusted = Math.max(margin, Math.min(wallLength(next) - margin, offset));
      replace(floor.items, item, hostedOpening(item, next, adjusted, floor.height));
      changed.add(item.id);
    }
  }
  for (const item of floor.items) {
    if (!changed.has(item.id)) continue;
    const wall = hostOf(item, floor);
    if (wall?.id !== openings.get(item.id).id) throw new Error(`Opening "${item.id}" would lose its attachment. Edit the wall or opening first.`);
    if (floor.items.some((other) => other.id !== item.id && openings.get(other.id)?.id === wall.id && overlapsOpenings(item, other, wall))) {
      throw new Error(`Opening "${item.id}" would overlap another opening. Increase the wall length or move the opening first.`);
    }
  }
}

function updateRoom(floor, previous, data, systemId, used) {
  const candidate = makeRoom({
    id: previous.id, type: previous.type, x: previous.x, y: previous.y,
    width: previous.w, depth: previous.h, name: previous.name, finish: previous.finish, ...data,
  }, new Set());
  const geometryChanged = ['x', 'y', 'w', 'h', 'type'].some((key) => candidate[key] !== previous[key]);
  if (geometryChanged) requireRoomFit(candidate, floor.rooms);
  if (geometryChanged && candidate.type !== 'outdoor') {
    const owned = floor.walls.filter(({ roomId }) => roomId === previous.id);
    const x = (value) => rounded(candidate.x + (value - previous.x) * candidate.w / previous.w);
    const y = (value) => rounded(candidate.y + (value - previous.y) * candidate.h / previous.h);
    updateWalls(floor, new Map(owned.map((wall) => [wall.id, makeWall({
      x1: x(wall.x1), x2: x(wall.x2), y1: y(wall.y1), y2: y(wall.y2),
    }, floor, systemId, used, wall)])));
  } else if (candidate.type === 'outdoor' && previous.type !== 'outdoor') {
    for (const wall of floor.walls.filter(({ roomId }) => roomId === previous.id)) removeWall(floor, wall);
  }
  replace(floor.rooms, previous, candidate);
}

function removeWall(floor, wall) {
  floor.items = floor.items.filter((item) => !openingTypes.includes(item.type) || hostOf(item, floor)?.id !== wall.id);
  floor.walls = floor.walls.filter(({ id }) => id !== wall.id);
}

function targetEntity(floor, id) {
  for (const kind of ['rooms', 'walls', 'items']) {
    const shape = floor[kind].find((entry) => entry.id === id);
    if (shape) return { kind, shape };
  }
  throw new Error(`No entity with id "${id}" on the chosen storey.`);
}

function ensureCounts(floor) {
  if ([floor.rooms, floor.walls, floor.items].some((entries) => entries.length > 1000)) {
    throw new Error('The selected storey exceeds the planner limit of 1000 rooms, walls or objects per category.');
  }
}

function applyEdit(project, edit, used) {
  const { op, levelId, id } = edit;
  if (op === 'set_project') {
    if (edit.name) project.name = edit.name.trim();
    if (edit.systemId) project.systemId = edit.systemId;
    return;
  }
  if (op === 'add_level') {
    if (project.levels.length >= 20) throw new Error('The planner supports up to 20 storeys.');
    project.levels.push(makeFloor(edit.level, project.systemId, used, project.levels.length, true));
    return;
  }

  const floor = matchingEntity(project.levels, levelId ?? project.levelId, 'storey');
  const wallById = (wallId) => matchingEntity(floor.walls, wallId, 'wall');
  const itemById = (itemId) => matchingEntity(floor.items, itemId, 'item');
  switch (op) {
    case 'set_level':
      if (edit.name) floor.name = edit.name.trim();
      if (edit.height !== undefined) floor.height = edit.height;
      if (edit.ceiling !== undefined) floor.ceiling = edit.ceiling;
      if (edit.active) project.levelId = floor.id;
      break;
    case 'remove_level':
      if (project.levels.length <= 1) throw new Error('A project must keep at least one storey.');
      project.levels = project.levels.filter(({ id }) => id !== floor.id);
      if (project.levelId === floor.id) project.levelId = project.levels[0].id;
      if (Array.isArray(project.cameras)) project.cameras = project.cameras.filter(({ levelId }) => levelId !== floor.id);
      break;
    case 'set_roof':
      floor.roof = edit.roof.type;
      floor.pitch = edit.roof.pitch ?? floor.pitch ?? 30;
      break;
    case 'add_room': {
      const room = makeRoom(edit.room, used);
      requireRoomFit(room, floor.rooms);
      floor.rooms.push(room);
      if (edit.buildWalls !== false && room.type !== 'outdoor') {
        for (const edge of roomEdges([room])) {
          const pieces = missingSegments(edge, floor.walls);
          floor.walls.push(...pieces.filter(([from, to]) => to - from > .015).map(([from, to]) => ({
            ...edgeWall(edge, project.systemId, used, from, to), roomId: room.id,
          })));
        }
      }
      break;
    }
    case 'update_room':
      updateRoom(floor, matchingEntity(floor.rooms, id, 'room'), edit.room, project.systemId, used);
      break;
    case 'add_wall': {
      const wall = makeWall(edit.wall, floor, project.systemId, used);
      requireNoOverlappingWall(floor, wall);
      floor.walls.push(wall);
      break;
    }
    case 'update_wall': {
      const previous = wallById(id);
      const next = makeWall(edit.wall, floor, project.systemId, used, previous);
      updateWalls(floor, new Map([[id, next]]));
      break;
    }
    case 'add_opening': {
      const wall = wallById(edit.opening.wallId);
      const item = makeOpening(edit.opening, wall, floor, used);
      if (hostOf(item, floor)?.id !== wall.id) throw new Error('That point falls on another wall junction. Shift the opening away from the junction.');
      floor.items.push(item);
      break;
    }
    case 'update_opening': {
      const item = itemById(id);
      if (!openingTypes.includes(item.type)) throw new Error('That item is not a door or window.');
      const prior = hostOf(item, floor);
      const wall = edit.opening.wallId ? wallById(edit.opening.wallId) : prior;
      if (!wall || ((!prior || prior.id !== wall.id) && edit.opening.offset === undefined)) throw new Error('Supply an attached wallId and offset to place this opening.');
      const next = makeOpening(edit.opening, wall, floor, used, item);
      if (hostOf(next, floor)?.id !== wall.id) throw new Error('That point falls on another wall junction. Shift the opening away from the junction.');
      replace(floor.items, item, next);
      break;
    }
    case 'add_furniture':
      floor.items.push(makeFurniture(edit.furniture, used));
      break;
    case 'update_furniture': {
      const item = itemById(id);
      if (openingTypes.includes(item.type)) throw new Error('Use update_opening for doors and windows.');
      replace(floor.items, item, makeFurniture({ ...item, ...edit.furniture }, new Set()));
      break;
    }
    case 'move': {
      const { kind, shape } = targetEntity(floor, id);
      if (kind === 'rooms') {
        updateRoom(floor, shape, { x: shape.x + edit.dx, y: shape.y + edit.dy }, project.systemId, used);
      } else if (kind === 'walls') {
        const next = makeWall({ x1: shape.x1 + edit.dx, y1: shape.y1 + edit.dy, x2: shape.x2 + edit.dx, y2: shape.y2 + edit.dy }, floor, project.systemId, used, shape);
        updateWalls(floor, new Map([[id, next]]));
      } else if (openingTypes.includes(shape.type)) {
        throw new Error('Use update_opening with a wallId and offset to move a door or window.');
      } else {
        const x = rounded(shape.x + edit.dx);
        const y = rounded(shape.y + edit.dy);
        validate(position, x, 'item.x');
        validate(position, y, 'item.y');
        Object.assign(shape, { x, y });
      }
      break;
    }
    case 'delete': {
      const { kind, shape } = targetEntity(floor, id);
      if (kind === 'walls') removeWall(floor, shape);
      else {
        if (kind === 'rooms') {
          for (const wall of floor.walls.filter(({ roomId }) => roomId === id)) removeWall(floor, wall);
        }
        floor[kind] = floor[kind].filter((entity) => entity.id !== id);
      }
      break;
    }
  }
  ensureCounts(floor);
}

function roomConnectivity(floor, attachments) {
  const edges = roomEdges(floor.rooms);
  const adjacent = new Map(floor.rooms.filter(({ type }) => type !== 'outdoor').map((room) => [room.id, new Set()]));
  for (const edge of edges.filter(({ owners }) => owners.length === 2)) {
    const hasDoor = attachments.some(({ item, wall }) => {
      if (!item.type.toLowerCase().includes('door') || !wall || !extentOnEdge(edge, wall)) return false;
      return item[edge.axis] > edge.from - tolerance && item[edge.axis] < edge.to + tolerance;
    });
    if (!hasDoor) continue;
    const [a, b] = edge.owners.map(({ room }) => room.id);
    adjacent.get(a).add(b);
    adjacent.get(b).add(a);
  }
  const unreached = new Set(adjacent.keys());
  let groups = 0;
  while (unreached.size) {
    groups++;
    const queue = [unreached.values().next().value];
    unreached.delete(queue[0]);
    while (queue.length) {
      for (const id of adjacent.get(queue.pop())) {
        if (unreached.delete(id)) queue.push(id);
      }
    }
  }
  return { groups, edges };
}

function analyse(project, locale) {
  const pt = locale.startsWith('pt');
  const messages = {
    overlap: ['Existem compartimentos sobrepostos neste piso.', 'Some rooms overlap on this storey.'],
    missingWall: ['O contorno deste compartimento tem um troço sem parede.', 'Part of this room boundary has no wall.'],
    unattached: ['Este vão não está alinhado com uma parede que o possa conter.', 'This opening is not attached to a wall that can contain it.'],
    openingHeight: ['A altura ou o peitoril deste vão ultrapassa os limites da parede.', 'The opening height or sill is outside the wall bounds.'],
    openingOverlap: ['Este vão sobrepõe-se a outro na mesma parede.', 'This opening overlaps another on the same wall.'],
    shortDoor: ['Esta porta tem menos de 1,95 m de altura. Confirme a altura necessária.', 'This door is shorter than 1.95 m. Check the required height.'],
    furnishing: ['Este objeto está posicionado fora dos compartimentos desenhados.', 'This object is outside the drawn rooms.'],
    disconnected: ['Existem grupos de compartimentos sem ligação entre si por portas neste piso.', 'This storey has groups of rooms without a connecting door.'],
    stairs: ['Confirme como este piso se liga ao piso acima. Ainda não tem uma escada desenhada.', 'Confirm access to the storey above. This storey has no drawn stair.'],
  };
  const warnings = [];
  const warn = (code, levelId, entityId) => {
    if (warnings.length < 60) warnings.push({ code, levelId, ...(entityId ? { entityId } : {}), message: messages[code][pt ? 0 : 1] });
  };
  const levels = project.levels.map((floor, index) => {
    const attachments = floor.items.filter(({ type }) => openingTypes.includes(type)).map((item) => ({ item, wall: hostOf(item, floor) }));
    const wallIndex = new Map();
    for (const { item, wall } of attachments) {
      if (!wall) { warn('unattached', floor.id, item.id); continue; }
      const { sill, top } = openingVertical(item);
      const base = wallBaseOffset(wall);
      if (sill < base - tolerance || top > base + effectiveWallHeight(wall, floor.height) + tolerance) warn('openingHeight', floor.id, item.id);
      if (item.type.toLowerCase().includes('door') && top - sill < 1.95) warn('shortDoor', floor.id, item.id);
      if (!wallIndex.has(wall.id)) wallIndex.set(wall.id, []);
      const earlier = wallIndex.get(wall.id);
      if (earlier.some((other) => overlapsOpenings(item, other, wall))) warn('openingOverlap', floor.id, item.id);
      earlier.push(item);
    }

    if (floor.rooms.some((room, index) => floor.rooms.slice(index + 1).some((other) => collision(room, other)))) warn('overlap', floor.id);
    const { edges, groups } = roomConnectivity(floor, attachments);
    const missing = new Set();
    for (const edge of edges) {
      if (missingSegments(edge, floor.walls).some(([from, to]) => to - from > .08)) {
        edge.owners.forEach(({ room }) => missing.add(room.id));
      }
    }
    for (const id of missing) warn('missingWall', floor.id, id);
    if (groups > 1) warn('disconnected', floor.id);
    if (index < project.levels.length - 1 && !floor.items.some(({ type }) => type === 'stair')) warn('stairs', floor.id);
    for (const item of floor.items) {
      if (floor.rooms.length && !openingTypes.includes(item.type) && item.type !== 'tree' &&
        !floor.rooms.some((room) => item.x >= room.x && item.x <= room.x + room.w && item.y >= room.y && item.y <= room.y + room.h)) {
        warn('furnishing', floor.id, item.id);
      }
    }
    const attachedById = new Map(attachments.map(({ item, wall }) => [item.id, wall]));
    const buildingServices = normalizeBuildingServices(floor.services);
    const serviceAnalysis = Object.fromEntries(Object.keys(buildingServices).map((system) => {
      const result = inspectServices(floor, system, { includeEntry: index === 0 });
      for (const warning of result.warnings) {
        if (warnings.length < 60) warnings.push({ code: warning.code, levelId: floor.id, system,
          entityId: warning.nodeId ?? warning.runId, message: pt ? warning.pt : warning.en });
      }
      return [system, result];
    }));
    return {
      id: floor.id, name: floor.name, area: rounded(projectArea({ levels: [floor] }), 100),
      height: floor.height, roof: floor.roof ?? 'none', pitch: floor.pitch ?? 30,
      ...(Object.keys(serviceAnalysis).length ? { services: serviceAnalysis } : {}),
      rooms: floor.rooms.map(({ id, type, name, x, y, w, h, finish }) => ({
        id, type, name: name || roomStyles[type][pt ? 'pt' : 'en'], x, y, width: w, depth: h, finish: finish ?? 'natural',
      })),
      walls: floor.walls.map((wall) => ({
        id: wall.id, x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2,
        length: rounded(wallLength(wall)), thickness: wall.thickness, openingIds: (wallIndex.get(wall.id) ?? []).map(({ id }) => id),
      })),
      items: floor.items.map(({ id, type, x, y, width, depth, angle, opening, height, catalogRef }) => {
        const host = attachedById.get(id);
        const geometry = { id, type, x, y, width, depth, angle };
        if (!openingTypes.includes(type)) {
          const reference = normalizeObjectCatalogRef(catalogRef);
          return {
            ...geometry, height: Number.isFinite(height) ? Math.max(.01, Math.min(height, 12)) : elements[type].height,
            ...(reference ? { name: reference.name } : {}),
          };
        }
        const { sill, top } = openingVertical({ type, opening });
        return { ...geometry, height: rounded(top - sill), sill, wallId: host?.id ?? null, offset: host ? rounded(openingOffset({ x, y }, host)) : null };
      }),
    };
  });
  const exactArea = projectArea(project);
  const estimate = estimateProject(project.systemId, exactArea);
  const constructionPlan = normalizeConstructionSchedule(project.constructionPlan);
  let construction;
  if (constructionPlan) {
    try {
      construction = { ...scheduleConstruction(constructionPlan), crews: constructionPlan.crews,
        weekdays: constructionPlan.weekdays, exclusions: constructionPlan.exclusions };
    } catch (error) {
      if (error.code !== 'schedule_too_long') throw error;
      if (warnings.length < 60) warnings.push({ code: 'schedule_too_long', message: pt
        ? 'O plano de obra ultrapassa o horizonte disponível. Revê as datas e as durações.'
        : 'The construction programme exceeds the available horizon. Review the dates and durations.' });
    }
  }
  return {
    name: project.name, systemId: project.systemId, levelId: project.levelId, area: rounded(exactArea, 100),
    counts: {
      levels: levels.length, rooms: levels.reduce((sum, floor) => sum + floor.rooms.length, 0),
      walls: levels.reduce((sum, floor) => sum + floor.walls.length, 0),
      openings: levels.reduce((sum, floor) => sum + floor.items.filter(({ type }) => openingTypes.includes(type)).length, 0),
    },
    levels, warnings,
    ...(construction ? { construction } : {}),
    materialEstimate: { currency: 'EUR', total: estimate.total, indicative: true },
  };
}

function editServices(project, operations) {
  const changes = [];
  for (const operation of operations) {
    if (operation.op === 'edit') {
      const floor = project.levels.find(({ id }) => id === (operation.levelId ?? project.levelId));
      if (!floor) throw new Error('The specified storey does not exist.');
      const network = applyServiceOperations(floor, operation.system, operation.changes);
      const services = { ...normalizeBuildingServices(floor.services, floor), [operation.system]: network };
      if (!network.nodes.length && !network.runs.length) delete services[operation.system];
      if (Object.keys(services).length) floor.services = services;
      else delete floor.services;
      changes.push({ levelId: floor.id, system: operation.system, result: 'edited' });
      continue;
    }
    const levels = operation.levelIds ? [...new Set(operation.levelIds)].map((levelId) => {
      const chosen = project.levels.find(({ id }) => id === levelId);
      if (!chosen) throw new Error('The specified storey does not exist.');
      return chosen;
    }) : project.levels;
    for (const floor of levels) {
      const services = normalizeBuildingServices(floor.services, floor);
      for (const system of new Set(operation.systems)) {
        const existing = services[system];
        if ((existing?.nodes.length || existing?.runs.length) && !operation.replace) {
          changes.push({ levelId: floor.id, system, result: 'kept' });
          continue;
        }
        if (!floor.rooms.some(({ type }) => type !== 'outdoor')) {
          changes.push({ levelId: floor.id, system, result: 'no_indoor_rooms' });
          continue;
        }
        const phase = operation.phase ?? existing?.nodes.find(({ kind }) => kind === 'supplyEntry')?.phase;
        const network = generateServices(floor, system, { includeEntry: floor === project.levels[0], phase });
        if (network.nodes.length || network.runs.length) {
          services[system] = network;
          changes.push({ levelId: floor.id, system, result: 'generated' });
        } else changes.push({ levelId: floor.id, system, result: 'no_matching_rooms' });
      }
      if (Object.keys(services).length) floor.services = services;
    }
  }
  return changes;
}

export function runDesignTool(name, args, { project = null, locale = 'pt-PT' } = {}) {
  const tool = designTools.find((entry) => entry.name === name);
  if (!tool) throw new Error('Unknown Casovara planning tool.');
  validate(tool.inputSchema, args, 'arguments');
  if (name === 'casovara_create_plan') {
    const created = newSnapshot(args);
    validateSnapshot(created);
    return { project: created, analysis: analyse(created, locale) };
  }
  const source = args.project ?? project;
  if (!source) throw new Error('Supply a project from Casovara or open a project in the planner before using this tool.');
  const used = validateSnapshot(source);
  if (name === 'casovara_inspect_plan') return { analysis: analyse(source, locale) };
  const edited = structuredClone(source);
  for (const floor of edited.levels) {
    if (Object.hasOwn(floor, 'services')) floor.services = normalizeBuildingServices(floor.services, floor);
  }
  if (name === 'casovara_design_services') {
    const serviceChanges = editServices(edited, args.operations);
    if (!serviceChanges.some(({ result }) => result === 'generated' || result === 'edited')) {
      throw new Error('No scheme was generated. Existing schemes are kept by default and automatic proposals require eligible indoor rooms.');
    }
    return { project: edited, analysis: analyse(edited, locale), serviceChanges };
  }
  if (name === 'casovara_plan_construction') {
    let constructionPlan = normalizeConstructionSchedule(edited.constructionPlan);
    for (const operation of args.operations) {
      if (operation.op === 'generate') {
        if (constructionPlan && !operation.replace) throw new Error('A construction plan already exists. Edit it or explicitly request replacement.');
        const generated = generateConstructionPlan(edited, { locale, startDate: operation.startDate ?? constructionPlan?.startDate, include: operation.include });
        if (constructionPlan) {
          generated.weekdays = constructionPlan.weekdays;
          generated.exclusions = constructionPlan.exclusions;
          const existingCrews = new Map(constructionPlan.crews.map((crew) => [crew.id, crew]));
          generated.crews = generated.crews.map((crew) => existingCrews.get(crew.id) ?? crew);
        }
        constructionPlan = validateConstructionSchedule(generated);
        scheduleConstruction(constructionPlan);
      } else if (operation.op === 'clear') constructionPlan = null;
      else {
        if (!constructionPlan) throw new Error('Generate a construction plan before editing its tasks and calendar.');
        constructionPlan = applyConstructionOperations(constructionPlan, operation.changes);
      }
    }
    if (constructionPlan) edited.constructionPlan = constructionPlan;
    else delete edited.constructionPlan;
    return { project: edited, analysis: analyse(edited, locale), constructionChanged: true };
  }
  for (const edit of args.operations) {
    const levelId = edit.levelId ?? edited.levelId;
    applyEdit(edited, edit, used);
    if (['update_wall', 'update_room', 'move', 'delete'].includes(edit.op)) {
      const floor = edited.levels.find(({ id }) => id === levelId);
      if (floor?.services) floor.services = normalizeBuildingServices(floor.services, floor);
    }
  }
  validateSnapshot(edited);
  return { project: edited, analysis: analyse(edited, locale) };
}
