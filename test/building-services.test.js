import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyServiceOperations, generateServices, inspectServices, normalizeBuildingServices, serviceRunPoints, serviceSystems,
} from '../public/building-services.js';

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
    assert.deepEqual(checked.warnings, [], system);
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
