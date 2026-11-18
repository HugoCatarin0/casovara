import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyServiceOperations, generateServices, inspectServices, normalizeBuildingServices,
  radiantCabinetPorts, resolveServiceNode, serviceNodeSymbol, serviceRunPoints, serviceSystems, snapServiceNode,
} from '../public/building-services.js';
import { makeTemplate, templates } from '../public/templates.js';

const rooms = [
  { id: 'living', type: 'living', x: 0, y: 0, w: 6, h: 4 },
  { id: 'corridor', type: 'circulation', x: 6, y: 0, w: 2, h: 4 },
  { id: 'bed', type: 'bedroom', x: 8, y: 0, w: 4, h: 4 },
  { id: 'kitchen', type: 'kitchen', x: 0, y: 4, w: 5, h: 4 },
  { id: 'bath', type: 'bath', x: 5, y: 4, w: 3, h: 3 },
  { id: 'deck', type: 'outdoor', x: 8, y: 4, w: 4, h: 3 },
];
const level = {
  rooms,
  items: [
    { id: 'entry', type: 'door', x: 7.1, y: 0 },
    { id: 'sink', type: 'sink', x: 1.24, y: 7.35 },
    { id: 'toilet', type: 'wallToilet', x: 5.65, y: 6.33 },
    { id: 'oven', type: 'oven', x: 2, y: 7.6 },
    { id: 'ac', type: 'acUnit', x: 8.35, y: 2 },
  ],
};

test('Auto generation creates each conceptual system with editable paths and lengths', () => {
  for (const [system, spec] of Object.entries(serviceSystems)) {
    const generated = generateServices(level, system);
    assert.deepEqual(generateServices(level, system), generated);
    assert.ok(generated.nodes.length > 0, system);
    assert.ok(generated.runs.length > 0, system);
    assert.ok(generated.nodes.every(({ roomId }) => roomId !== 'deck'), system);
    for (const run of generated.runs) {
      assert.ok(Object.hasOwn(spec.media, run.medium));
      assert.ok(serviceRunPoints(generated, run).length >= 2);
    }
    const checked = inspectServices({ ...level, services: { [system]: generated } }, system);
    assert.ok(Object.values(checked.lengths).every((metres) => metres > 0), system);
    assert.deepEqual(checked.warnings.map(({ code }) => code), system === 'radiantFloor' ? ['radiant_manifold_wall'] : [], system);
  }
});

test('Proposals respect drawn fixtures and differentiate plumbing, ventilation and floor-loop paths', () => {
  const plumbing = generateServices(level, 'plumbing');
  const sink = plumbing.nodes.find(({ kind }) => kind === 'sink');
  assert.deepEqual([sink.x, sink.y], [1.24, 7.35]);
  const toilet = plumbing.nodes.find(({ kind }) => kind === 'toilet');
  assert.deepEqual([toilet.x, toilet.y], [5.65, 6.33]);
  assert.deepEqual(plumbing.runs.filter(({ from, to }) => from === toilet.id || to === toilet.id)
    .map(({ medium }) => medium).sort(), ['cold', 'drain']);

  const vmc = generateServices(level, 'vmc');
  assert.deepEqual(vmc.nodes.filter(({ kind }) => kind === 'supplyVent').map(({ roomId }) => roomId), ['living', 'bed']);
  assert.deepEqual(vmc.nodes.filter(({ kind }) => kind === 'extractVent').map(({ roomId }) => roomId), ['kitchen', 'bath']);
  const ac = generateServices(level, 'airConditioning');
  assert.equal(ac.nodes.find((node) => node.kind === 'indoorUnit' && node.roomId === 'bed').x, 8.35);

  const radiant = generateServices(level, 'radiantFloor');
  const loops = radiant.runs.filter(({ medium }) => medium === 'loop');
  assert.ok(loops.length > 2);
  for (const loop of loops) {
    const start = radiant.nodes.find(({ id }) => id === loop.from);
    const end = radiant.nodes.find(({ id }) => id === loop.to);
    assert.equal(start.roomId, end.roomId);
    const room = rooms.find(({ id }) => id === start.roomId);
    assert.ok(serviceRunPoints(radiant, loop).every(({ x, y }) => x > room.x && x < room.x + room.w && y > room.y && y < room.y + room.h));
    assert.ok(loop.points.length > 4);
  }
});

test('Atomic edits preserve saved runs on moves and never accept incompatible endpoints', () => {
  const generated = applyServiceOperations(level, 'electrical', [
    { op: 'add_node', node: { id: 'main', kind: 'panel', x: 0, y: 0 } },
    { op: 'add_node', node: { id: 'outlet', kind: 'outlet', x: 2, y: 2, label: 'Mesa' } },
    { op: 'add_run', run: { id: 'circuit', medium: 'power', from: 'main', to: 'outlet', points: [{ x: 0, y: 2 }] } },
  ]);
  const configured = { ...level, services: { electrical: generated } };
  assert.throws(() => applyServiceOperations(configured, 'electrical', [{ op: 'generate' }]), /already exists/);
  assert.throws(() => applyServiceOperations(configured, 'electrical', [
    { op: 'update_node', id: 'outlet', node: { x: 3 } },
    { op: 'update_run', id: 'circuit', run: { medium: 'lighting' } },
  ]), /incompatible/);
  assert.equal(configured.services.electrical.nodes[1].x, 2);
  assert.throws(() => applyServiceOperations(configured, 'electrical', [{ op: 'update_node', id: 'outlet', node: { kind: 'switch' } }]), /incompatible/);
  const revised = applyServiceOperations(configured, 'electrical', [{ op: 'update_node', id: 'outlet', node: { x: 3 } }]);
  assert.deepEqual(serviceRunPoints(revised, revised.runs[0]), [{ x: 0, y: 0 }, { x: 0, y: 2 }, { x: 3, y: 2 }]);
  const removed = applyServiceOperations({ ...configured, services: { electrical: revised } }, 'electrical', [{ op: 'delete_node', id: 'outlet' }]);
  assert.deepEqual(removed, { nodes: [generated.nodes[0]], runs: [] });
  assert.deepEqual(applyServiceOperations(configured, 'electrical', [{ op: 'generate', replace: true }]), generateServices(level, 'electrical'));
});

test('Legacy floors and malformed imports normalize safely and replacement preserves work on an empty floor', () => {
  assert.deepEqual(normalizeBuildingServices(undefined), {});
  const services = normalizeBuildingServices({
    invalid: { nodes: [], runs: [] },
    vmc: {
      nodes: [
        { id: 'unit', kind: 'unit', x: 0.12345, y: -3 },
        { id: 'vent', kind: 'supplyVent', x: 1, y: 1, roomId: 'demolished', label: '  Test  ' },
        { id: 'vent', kind: 'extractVent', x: 2, y: 2 },
        { id: 'invalid', kind: 'prototype', x: 2, y: 2 },
      ],
      runs: [
        { id: 'good', medium: 'supply', from: 'unit', to: 'vent' },
        { id: 'bad', medium: 'extract', from: 'unit', to: 'vent' },
        { id: 'bad2', medium: 'supply', from: 'unit', to: 'absent' },
        { id: 'bad3', medium: 'supply', from: 'unit', to: 'vent', points: [{ x: Number.NaN, y: 2 }] },
      ],
    },
  });
  assert.deepEqual(Object.keys(services), ['vmc']);
  assert.deepEqual(services.vmc.nodes.map(({ id, x, label }) => ({ id, x, label })), [
    { id: 'unit', x: .123, label: undefined }, { id: 'vent', x: 1, label: 'Test' },
  ]);
  assert.deepEqual(services.vmc.runs.map(({ id }) => id), ['good']);
  assert.deepEqual(applyServiceOperations({ rooms: [], services }, 'vmc', [{ op: 'generate', replace: true }]), services.vmc);
  assert.ok(inspectServices({ rooms: [], services }, 'vmc').warnings.some(({ code }) => code === 'missing_room'));
  assert.equal(inspectServices({ rooms: [] }, 'plumbing').warnings[0].code, 'no_rooms');
});

const framedFloor = {
  rooms: [
    { id: 'living', type: 'living', x: 0, y: 0, w: 6, h: 3 },
    { id: 'kitchen', type: 'kitchen', x: 0, y: 3, w: 6, h: 3 },
  ],
  walls: [
    { id: 'north', x1: 0, y1: 0, x2: 6, y2: 0, thickness: .25 },
    { id: 'east', x1: 6, y1: 0, x2: 6, y2: 6, thickness: .25 },
    { id: 'south', x1: 6, y1: 6, x2: 0, y2: 6, thickness: .25 },
    { id: 'west', x1: 0, y1: 6, x2: 0, y2: 0, thickness: .25 },
    { id: 'partition', x1: 0, y1: 3, x2: 6, y2: 3, thickness: .20 },
  ],
  items: [{ id: 'door', type: 'door', x: 3, y: 3, width: .9 }],
};

test('Wall mounts derive the facing room and snap to solid wall beside an opening', () => {
  const southFace = snapServiceNode(framedFloor, { x: 3, y: 3.1 }, { wallId: 'partition', roomId: 'kitchen' });
  const northFace = snapServiceNode(framedFloor, { x: 3, y: 2.9 }, { wallId: 'partition', roomId: 'living' });
  assert.deepEqual([southFace.wall.side, southFace.y, southFace.angle, southFace.roomId], [1, 3.115, 90, 'kitchen']);
  assert.deepEqual([northFace.wall.side, northFace.y, northFace.angle, northFace.roomId], [-1, 2.885, -90, 'living']);
  assert.ok(Math.abs(southFace.x - 3) >= .56);
  assert.equal(snapServiceNode(framedFloor, { x: 3, y: 3.1 }, { wallId: 'partition', roomId: 'kitchen', threshold: .2 }), null);
  assert.equal(snapServiceNode(framedFloor, { x: 2, y: 3.25 }, { wallId: 'partition', exterior: true }), null);
});

test('Installation editing preserves outlet groups and supports wall, floor and ceiling placements', () => {
  const network = applyServiceOperations(framedFloor, 'electrical', [
    { op: 'add_node', node: { id: 'group', kind: 'outlet', count: 6, wall: { wallId: 'partition', fraction: .25, side: -1 } } },
    { op: 'add_node', node: { id: 'light', kind: 'light', x: 3, y: 1, mount: 'ceiling' } },
  ]);
  const floor = { ...framedFloor, services: { electrical: network } };
  const first = network.nodes[0];
  assert.deepEqual(first, {
    id: 'group', kind: 'outlet', count: 6, x: 1.5, y: 2.885, roomId: 'living', mount: 'wall',
    wall: { wallId: 'partition', fraction: .25, side: -1 },
  });
  assert.equal(serviceNodeSymbol('electrical', first), 'T 6×');
  assert.equal(network.nodes[1].mount, 'ceiling');
  const moved = applyServiceOperations(floor, 'electrical', [
    { op: 'update_node', id: 'group', node: { wall: { ...first.wall, side: 1 }, count: 3 } },
  ]);
  assert.equal(inspectServices({ ...floor, services: { electrical: moved } }, 'electrical').nodes[0].symbol, 'T 3×');
  assert.equal(moved.nodes[0].roomId, 'kitchen');
  const floorMount = applyServiceOperations({ ...floor, services: { electrical: moved } }, 'electrical', [
    { op: 'update_node', id: 'group', node: { mount: 'floor', wall: null, x: 2, y: 4 } },
  ]).nodes[0];
  assert.deepEqual([floorMount.x, floorMount.y, floorMount.mount, floorMount.wall, floorMount.count], [2, 4, 'floor', undefined, 3]);
  assert.throws(() => applyServiceOperations(floor, 'electrical', [
    { op: 'update_node', id: 'group', node: { count: 0 } },
  ]), /mounting options/);
  assert.throws(() => applyServiceOperations(floor, 'electrical', [
    { op: 'add_node', node: { kind: 'panel', wall: { wallId: 'missing', fraction: .5, side: 1 } } },
  ]), /wall .*does not exist/);
});

test('Moving a host wall updates its points and run endpoints while retaining anchor IDs and waypoints', () => {
  const network = applyServiceOperations(framedFloor, 'electrical', [
    { op: 'add_node', node: { id: 'panel', kind: 'panel', x: 2, y: .2 } },
    { op: 'add_node', node: { id: 'group', kind: 'outlet', wall: { wallId: 'partition', fraction: .25, side: -1 } } },
    { op: 'add_run', run: { id: 'power', medium: 'power', from: 'panel', to: 'group', points: [{ x: 2, y: 2 }] } },
  ]);
  const wall = framedFloor.walls.at(-1);
  const edited = {
    ...framedFloor, services: { electrical: network },
    walls: [...framedFloor.walls.slice(0, -1), { ...wall, x2: 8, y1: 3.4, y2: 3.4, thickness: .24 }],
  };
  const point = resolveServiceNode(edited, network.nodes[1]);
  assert.deepEqual([point.x, point.y, point.wall.wallId, point.wall.fraction], [2, 3.265, 'partition', .25]);
  assert.deepEqual(serviceRunPoints(network, network.runs[0], edited).slice(1), [{ x: 2, y: 2 }, { x: 2, y: 3.265 }]);
  const persisted = normalizeBuildingServices(edited.services, edited);
  const orphan = { ...edited, services: persisted, walls: edited.walls.slice(0, -1) };
  const drawing = inspectServices(orphan, 'electrical');
  assert.equal(drawing.nodes[1].y, 3.265);
  assert.ok(drawing.warnings.some(({ code, nodeId }) => code === 'missing_wall' && nodeId === 'group'));
});

test('Generation models electrical phase, specialised terminals and first-storey mains', () => {
  const electrical = generateServices(framedFloor, 'electrical', { phase: 'three' });
  const entry = electrical.nodes.find(({ kind }) => kind === 'supplyEntry');
  assert.deepEqual([entry.phase, entry.roomId, entry.mount], ['three', undefined, 'wall']);
  assert.equal(serviceNodeSymbol('electrical', entry), 'E 3~');
  const feeder = electrical.runs.find(({ medium }) => medium === 'serviceFeed');
  assert.equal(feeder.from, entry.id);
  assert.equal(electrical.nodes.find(({ id }) => id === feeder.to).kind, 'panel');
  assert.ok(electrical.nodes.filter(({ kind }) => ['panel', 'outlet', 'switch'].includes(kind)).every(({ mount, roomId }) => mount === 'wall' && roomId));
  assert.ok(electrical.nodes.some(({ kind, count }) => kind === 'outlet' && count === 3));
  assert.equal(electrical.nodes.find(({ kind }) => kind === 'light').mount, 'ceiling');
  const regenerated = applyServiceOperations({ ...framedFloor, services: { electrical } }, 'electrical', [{ op: 'generate', replace: true }]);
  assert.equal(regenerated.nodes.find(({ kind }) => kind === 'supplyEntry').phase, 'three');
  for (const system of ['electrical', 'plumbing']) {
    const upperStorey = generateServices(framedFloor, system, { includeEntry: false });
    assert.ok(upperStorey.nodes.every(({ kind }) => !['supplyEntry', 'waterEntry', 'sewerOutlet'].includes(kind)));
    assert.deepEqual(inspectServices({ ...framedFloor, services: { [system]: upperStorey } }, system, { includeEntry: false }).warnings, []);
  }
  const plumbing = generateServices(framedFloor, 'plumbing');
  assert.equal(plumbing.nodes.find(({ kind }) => kind === 'waterEntry').mount, 'wall');
  assert.equal(plumbing.nodes.find(({ kind }) => kind === 'sewerOutlet').mount, 'floor');
  const vmc = generateServices(framedFloor, 'vmc');
  assert.ok(vmc.nodes.filter(({ kind }) => ['outsideAir', 'exhaustOutlet'].includes(kind)).every(({ mount, roomId }) => mount === 'wall' && !roomId));
  assert.equal(vmc.nodes.find(({ kind }) => kind === 'supplyVent').mount, 'ceiling');
  const ac = generateServices(framedFloor, 'airConditioning');
  assert.equal(ac.nodes.find(({ kind }) => kind === 'indoorUnit').mount, 'wall');
  assert.equal(ac.nodes.find(({ kind }) => kind === 'outdoorUnit').mount, 'floor');
  const radiant = generateServices(framedFloor, 'radiantFloor');
  assert.equal(radiant.nodes.find(({ kind }) => kind === 'manifold').mount, 'wall');
  assert.equal(radiant.nodes.find(({ kind }) => kind === 'zone').mount, 'floor');
});

test('Each radiant circuit joins a clear distribution wall with separate aligned supply and return ports', () => {
  const network = generateServices(framedFloor, 'radiantFloor');
  const cabinets = network.nodes.filter(({ kind }) => kind === 'manifold');
  assert.equal(cabinets.length, 1);
  const [cabinet] = cabinets;
  const loops = network.runs.filter(({ medium }) => medium === 'loop');
  const bank = radiantCabinetPorts(network, cabinet, framedFloor);
  assert.equal(cabinet.mount, 'wall');
  assert.equal(cabinet.wall.wallId, 'partition');
  const openingClearance = .9 / 2 + bank.width / 2;
  assert.ok(Math.abs(cabinet.x - 3) > openingClearance);
  assert.equal(bank.ports.length, loops.length);
  const leadEndpoints = new Set();
  for (const loop of loops) {
    assert.equal(loop.pattern, 'spiral');
    const supply = network.runs.find(({ medium, to }) => medium === 'supply' && to === loop.from);
    const back = network.runs.find(({ medium, from }) => medium === 'return' && from === loop.to);
    assert.equal(supply.from, cabinet.id);
    assert.equal(back.to, cabinet.id);
    assert.equal(supply.port, back.port);
    const start = serviceRunPoints(network, supply, framedFloor)[0];
    const end = serviceRunPoints(network, back, framedFloor).at(-1);
    assert.notDeepEqual(start, end);
    assert.equal(start.y, cabinet.y);
    assert.equal(end.y, cabinet.y);
    leadEndpoints.add(JSON.stringify(start));
    leadEndpoints.add(JSON.stringify(end));
  }
  assert.equal(leadEndpoints.size, loops.length * 2);
  const floor = { ...framedFloor, services: { radiantFloor: network } };
  const inspected = inspectServices(floor, 'radiantFloor');
  assert.equal(inspected.radiantPattern, 'spiral');
  assert.deepEqual(inspected.warnings, []);
  assert.deepEqual(normalizeBuildingServices(JSON.parse(JSON.stringify(floor.services)), floor), floor.services);
  for (const run of inspected.runs.filter((run) => run.port)) {
    const path = serviceRunPoints(network, run, floor);
    assert.deepEqual(run.start, path[0]);
    assert.deepEqual(run.end, path.at(-1));
  }
});

test('Radiant regeneration honours explicit wall and pattern and retains a suitable hand-picked cabinet', () => {
  const requested = { wallId: 'north', fraction: .25, side: 1 };
  const network = generateServices(framedFloor, 'radiantFloor', { radiantPattern: 'serpentine', manifoldWall: requested });
  const floor = { ...framedFloor, services: { radiantFloor: network } };
  assert.deepEqual(network.nodes[0].wall, requested);
  assert.deepEqual(applyServiceOperations(floor, 'radiantFloor', [{ op: 'generate', replace: true }]), network);
  const spiral = applyServiceOperations(floor, 'radiantFloor', [{ op: 'generate', replace: true, radiantPattern: 'spiral' }]);
  assert.deepEqual(spiral.nodes[0].wall, requested);
  assert.ok(spiral.runs.some(({ pattern }) => pattern === 'spiral'));
  assert.throws(() => generateServices(floor, 'radiantFloor', { manifoldWall: {
    wallId: 'partition', fraction: .5, side: 1,
  } }), /clear wall face/);
  const loop = network.runs.find(({ medium }) => medium === 'loop');
  const legacy = normalizeBuildingServices({ radiantFloor: { ...network,
    runs: network.runs.map(({ pattern, port, ...run }) => run),
  } }, floor);
  assert.equal(inspectServices({ ...floor, services: legacy }, 'radiantFloor').radiantPattern, undefined);
  assert.deepEqual(legacy.radiantFloor.runs.find(({ id }) => id === loop.id).points, loop.points);
  const edit = { op: 'update_run', id: loop.id, run: { label: 'Suite', points: loop.points } };
  assert.equal(applyServiceOperations(floor, 'radiantFloor', [edit]).runs.find(({ id }) => id === loop.id).pattern, 'serpentine');
  edit.run.points = loop.points.slice(1);
  assert.equal(applyServiceOperations(floor, 'radiantFloor', [edit]).runs.find(({ id }) => id === loop.id).pattern, undefined);
});

test('Both radiant patterns route cabinet leads around slab-backed coils in the built-in houses', () => {
  for (const { id } of templates) {
    for (const floor of makeTemplate(id, 'pt-PT').levels) {
      for (const radiantPattern of ['spiral', 'serpentine']) {
        const radiantFloor = generateServices(floor, 'radiantFloor', { radiantPattern });
        const drawing = inspectServices({ ...floor, services: { radiantFloor } }, 'radiantFloor');
        assert.equal(drawing.nodes.filter(({ kind, mount }) => kind === 'manifold' && mount === 'wall').length, 1);
        assert.equal(drawing.radiantPattern, radiantPattern);
        assert.deepEqual(drawing.warnings, [], [id, floor.id, radiantPattern].join('/'));
      }
    }
  }
});
