import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyServiceOperations, generateServices, inspectServices, normalizeBuildingServices, serviceRunPoints } from '../public/building-services.js';
import { serviceRunSurface, serviceSurfaceFootprints, supportedRouteSpans } from '../public/service-routing.js';

const courtyard = {
  rooms: [
    { id: 'left', type: 'living', x: 0, y: 0, w: 3, h: 9 },
    { id: 'bridge', type: 'circulation', x: 3, y: 7, w: 3, h: 2 },
    { id: 'right', type: 'bedroom', x: 6, y: 0, w: 3, h: 9 },
  ],
};

test('The support mask distinguishes open courtyards from leads that meet exterior service terminals', () => {
  const points = [{ x: -1, y: 1 }, { x: 10, y: 1 }];
  const spans = supportedRouteSpans(points, serviceSurfaceFootprints(courtyard, 'floor'), {
    exteriorFrom: true, exteriorTo: true,
  });
  assert.deepEqual(spans.map(({ supported, exterior }) => [supported, exterior ?? false]), [
    [false, true], [true, false], [false, false], [true, false], [false, true],
  ]);
  assert.ok(Math.abs(spans[2].from.x - 3) < .001);
  assert.ok(Math.abs(spans[2].to.x - 6) < .001);
  assert.ok(spans.every(({ from, to }) => from.y === 1 && to.y === 1));
});

test('Automatic lighting detours around the open part of an indented building', () => {
  const network = generateServices(courtyard, 'electrical');
  const surface = serviceSurfaceFootprints(courtyard, 'ceiling');
  const lamp = network.nodes.find(({ kind, roomId }) => kind === 'light' && roomId === 'right');
  const run = network.runs.find(({ medium, to }) => medium === 'lighting' && to === lamp.id);
  const points = serviceRunPoints(network, run, courtyard);
  assert.ok(points.length >= 3);
  assert.ok(supportedRouteSpans(points, surface).every(({ supported }) => supported));
  assert.equal(inspectServices({ ...courtyard, services: { electrical: network } }, 'electrical')
    .runs.find(({ id }) => id === run.id).surface, 'ceiling');
});

test('An explicit routing surface round-trips and can be reset without moving manual bends', () => {
  const points = [{ x: 2, y: 7.4 }, { x: 8, y: 7.4 }];
  const network = applyServiceOperations(courtyard, 'electrical', [
    { op: 'add_node', node: { id: 'a', kind: 'panel', x: 2, y: 2, mount: 'floor' } },
    { op: 'add_node', node: { id: 'b', kind: 'outlet', x: 8, y: 2, mount: 'floor' } },
    { op: 'add_run', run: { id: 'group', from: 'a', to: 'b', medium: 'power', surface: 'ceiling', points } },
  ]);
  const floor = { ...courtyard, services: { electrical: network } };
  assert.equal(normalizeBuildingServices(floor.services, floor).electrical.runs[0].surface, 'ceiling');
  assert.throws(() => applyServiceOperations(floor, 'electrical', [{ op: 'update_run', id: 'group', run: { surface: 'air' } }]), /surface/);
  const updated = applyServiceOperations(floor, 'electrical', [{ op: 'update_run', id: 'group', run: { surface: null } }]);
  assert.equal(updated.runs[0].surface, undefined);
  assert.deepEqual(updated.runs[0].points, points);
  assert.equal(serviceRunSurface('electrical', updated.runs[0]), 'floor');

  const unsupported = applyServiceOperations(floor, 'electrical', [{ op: 'update_run', id: 'group', run: { points: [] } }]);
  const inspected = inspectServices({ ...floor, services: { electrical: unsupported } }, 'electrical');
  assert.equal(inspected.runs[0].surface, 'ceiling');
  assert.ok(inspected.warnings.some(({ code, runId }) => code === 'unsupported_surface' && runId === 'group'));
});

test('Radiant coils stay within the slab on partly covered rooms', () => {
  const slab = { mode: 'custom', thickness: .2, footprint: { x: 1, y: 2, width: 4, depth: 3 } };
  const level = { slab, rooms: [{ id: 'room', type: 'living', x: 0, y: 0, w: 6, h: 8 }] };
  const network = generateServices(level, 'radiantFloor');
  const loops = network.runs.filter(({ medium }) => medium === 'loop');
  assert.ok(loops.length);
  assert.ok(network.runs.every((run) => supportedRouteSpans(serviceRunPoints(network, run, level),
    serviceSurfaceFootprints(level, 'floor')).every(({ supported }) => supported)));
  assert.deepEqual(generateServices({ ...level, slab: { mode: 'none' } }, 'radiantFloor'), { nodes: [], runs: [] });
});
