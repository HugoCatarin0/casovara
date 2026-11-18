import assert from 'node:assert/strict';
import { test } from 'node:test';
import { elements, makeItem, makeLevel, makeProject, makeRoom, makeWall, modelFaces } from '../public/builder-engine.js';
import { serviceSystems } from '../public/building-services.js';
import { cameraFrame, compileScene, pickScene, projectVertex, renderScene } from '../public/model-renderer.js';
import { createModelViewer } from '../public/model-viewer.js';

const width = 256;
const height = 192;
const camera = { azimuth: 0, elevation: 33, zoom: 1, panX: 0, panY: 0 };

function buffers() {
  const size = width * height;
  return {
    pixels: new Uint32Array(size), depth: new Float32Array(size),
    glassDepth: new Float32Array(size), glassColors: new Uint32Array(size),
  };
}

function pixelAt(frame, pixels, vertex) {
  const [x, y] = projectVertex(frame, ...vertex).map(Math.floor);
  assert.ok(x >= 0 && x < width && y >= 0 && y < height, 'Reference point is inside the viewport');
  return pixels[y * width + x];
}

function opaqueColor(color) {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return (0xff000000 | blue << 16 | green << 8 | red) >>> 0;
}

function horizontal(fill, z, opacity = 1) {
  return { points: [[-2, -4, z], [2, -4, z], [2, 4, z], [-2, 4, z]], fill, opacity };
}

test('Intersecting faces resolve visibility at each pixel independently of draw order', () => {
  const red = horizontal('#bc211a', 1);
  const blue = { ...horizontal('#1837c1', 1), points: [[-2, -4, 0], [2, -4, 2], [2, 4, 2], [-2, 4, 0]] };
  for (const faces of [[red, blue], [blue, red]]) {
    const scene = compileScene(faces);
    const frame = cameraFrame(scene, camera, width, height);
    const memory = buffers();
    renderScene(scene, frame, memory);
    assert.equal(pixelAt(frame, memory.pixels, [-1.25, 0, 1]), opaqueColor(red.fill));
    assert.equal(pixelAt(frame, memory.pixels, [1.25, 0, 1]), opaqueColor(blue.fill));
  }
});

test('The tabletop stays visible through a full orbit in an unobstructed room', () => {
  const project = makeProject('blank', 'lsf', true);
  const level = project.levels[0];
  const table = makeItem('table', 1.3, 2);
  level.rooms.push(makeRoom('living', 0, 0, 12, 8));
  level.items.push(table);

  const scene = compileScene(modelFaces(project, level.id, true));
  const referencePoint = [table.x, table.y, elements.table.height];
  const memory = buffers();
  for (const projection of ['perspective', 'orthographic']) {
    for (let azimuth = 0; azimuth < 360; azimuth += 15) {
      const frame = cameraFrame(scene, { ...camera, azimuth, projection }, width, height);
      renderScene(scene, frame, memory);
      assert.equal(pixelAt(frame, memory.pixels, referencePoint), opaqueColor(elements.table.color), `${projection} tabletop at ${azimuth} degrees`);
    }
  }
});

test('An angled wall hides a table only from the obstructed side', () => {
  const project = makeProject('blank', 'lsf', true);
  const level = project.levels[0];
  const table = makeItem('table', 1.3, 2);
  level.rooms.push(makeRoom('living', 0, 0, 12, 8));
  const wall = makeWall(0, 3, 8, 3.55, 0.2);
  level.walls.push(wall);
  level.items.push(table);

  const referencePoint = [table.x, table.y, elements.table.height];
  const scene = compileScene(modelFaces(project, level.id, false));
  const memory = buffers();
  const blocked = cameraFrame(scene, camera, width, height);
  renderScene(scene, blocked, memory);
  const blockedColor = pixelAt(blocked, memory.pixels, referencePoint);
  assert.notEqual(blockedColor, 0);
  assert.notEqual(blockedColor, opaqueColor(elements.table.color));
  assert.deepEqual(pickScene(scene, blocked, ...projectVertex(blocked, ...referencePoint)), { kind: 'walls', id: wall.id, levelId: level.id });

  const clear = cameraFrame(scene, { ...camera, azimuth: 180 }, width, height);
  renderScene(scene, clear, memory);
  assert.equal(pixelAt(clear, memory.pixels, referencePoint), opaqueColor(elements.table.color));
  assert.deepEqual(pickScene(scene, clear, ...projectVertex(clear, ...referencePoint)), { kind: 'items', id: table.id, levelId: level.id });
  assert.equal(pickScene(scene, clear, 0, 0), null);
});

test('Translucent surfaces tint geometry in front of the opaque depth and respect opaque occlusion', () => {
  const solid = horizontal('#2070b0', 1);
  const render = (glass) => {
    const scene = compileScene([glass, solid]);
    const frame = cameraFrame(scene, camera, width, height);
    const memory = buffers();
    renderScene(scene, frame, memory);
    return pixelAt(frame, memory.pixels, [0, 0, 1]);
  };
  const front = render(horizontal('#d07030', 2, 0.5));
  assert.notEqual(front, opaqueColor('#d07030'));
  assert.notEqual(front, opaqueColor(solid.fill));
  assert.equal(front >>> 24, 255);
  assert.equal(render(horizontal('#d07030', 0, 0.5)), opaqueColor(solid.fill));
});

test('The same frame buffers can render a smaller scene without leaving pixels behind', () => {
  const floor = compileScene([horizontal('#2070b0', 1)]);
  const tiny = compileScene([{ ...horizontal('#d07030', 1), points: [[-.2, -.2, 1], [.2, -.2, 1], [.2, .2, 1], [-.2, .2, 1]] }]);
  const frame = cameraFrame(floor, camera, width, height);
  const memory = buffers();
  renderScene(floor, frame, memory);
  assert.equal(pixelAt(frame, memory.pixels, [1, 1, 1]), opaqueColor('#2070b0'));
  renderScene(tiny, frame, memory);
  assert.equal(pixelAt(frame, memory.pixels, [0, 0, 1]), opaqueColor('#d07030'));
  assert.equal(pixelAt(frame, memory.pixels, [1, 1, 1]), 0);
});

test('Orbit keeps the model fitted and panning and zoom use consistent screen distances', () => {
  const scene = compileScene([horizontal('#2070b0', 1), horizontal('#1837c1', 3)]);
  const baseline = cameraFrame(scene, camera, width, height);
  const baselineHeight = projectVertex(baseline, 0, 0, 1)[1] - projectVertex(baseline, 0, 0, 2)[1];

  const orbited = cameraFrame(scene, { ...camera, azimuth: 55, panX: 18, panY: -12, zoom: 1.5 }, width, height);
  const center = projectVertex(orbited, 0, 0, 2);
  assert.ok(Math.abs(center[0] - (width / 2 + 18)) < 1e-6);
  assert.ok(Math.abs(center[1] - (height / 2 - 12)) < 1e-6);
  assert.ok(Math.abs(projectVertex(orbited, 0, 0, 1)[1] - center[1] - baselineHeight * 1.5) < 1e-6);
});

test('Dragging the 3D model moves its near side in the same horizontal direction', (t) => {
  const before = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame');
  globalThis.requestAnimationFrame = () => 1;
  const controller = new AbortController();
  t.after(() => {
    controller.abort();
    if (before) Object.defineProperty(globalThis, 'requestAnimationFrame', before);
    else delete globalThis.requestAnimationFrame;
  });
  const canvas = Object.assign(new EventTarget(), {
    dataset: {}, focus() {}, setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
  });
  const scene = compileScene([horizontal('#2070b0', 1)]);
  const viewer = createModelViewer({ canvas, signal: controller.signal, scene: () => scene, onCamera() {} });
  const nearX = () => projectVertex(cameraFrame(scene, viewer.camera(), width, height), 0, 2, 1)[0];
  const pointer = (type, x, y, extra) => canvas.dispatchEvent(Object.assign(new Event(type), {
    pointerId: 1, button: 0, shiftKey: false, clientX: x, clientY: y, ...extra,
  }));

  viewer.set({ azimuth: 0, elevation: 33 });
  const baseline = nearX();
  pointer('pointerdown', 120, 80);
  pointer('pointermove', 160, 90);
  assert.ok(nearX() > baseline);
  assert.equal(viewer.camera().elevation, 36.1);
  pointer('pointermove', 80, 80);
  assert.ok(nearX() < baseline);
  pointer('pointerup', 80, 80);

  viewer.set({ azimuth: 0, panX: 0, panY: 0 });
  pointer('pointerdown', 120, 80, { shiftKey: true });
  pointer('pointermove', 160, 90, { shiftKey: true });
  assert.equal(viewer.camera().azimuth, 0);
  assert.equal(viewer.camera().panX, 40 / width);
  assert.equal(viewer.camera().panY, 10 / height);
});

test('The 3D installation layer uses chosen systems, storey heights, and pickable typed owners', () => {
  const project = makeProject('blank', 'lsf', true);
  const ground = project.levels[0];
  ground.rooms.push(makeRoom('living', 0, 0, 7, 6));
  const upper = makeLevel('First floor');
  upper.rooms.push(makeRoom('living', 0, 0, 7, 6));
  project.levels.push(upper);
  const node = (id, kind, x, y) => ({ id, kind, x, y });
  const network = (a, b, medium) => ({ nodes: [a, b], runs: [{ id: `${a.id}-${b.id}`, medium, from: a.id, to: b.id, points: [{ x: a.x, y: b.y }] }] });
  ground.services = { electrical: network(node('panel', 'panel', 1, 1), node('lamp', 'light', 4, 4), 'lighting') };
  upper.services = { plumbing: network(node('cold-valve', 'coldManifold', 1, 1), node('sink', 'sink', 4, 2), 'cold') };
  const inLayer = (faces) => faces.filter(({ owner }) => owner?.kind.startsWith('service-'));
  const enabled = (services, extra) => modelFaces(project, upper.id, true, { services, ...extra });

  assert.deepEqual(inLayer(modelFaces(project, upper.id, true)), []);
  const plumbing = inLayer(enabled(['plumbing']));
  assert.ok(plumbing.length > 0);
  assert.ok(plumbing.every(({ owner, points }) => owner.system === 'plumbing' && owner.levelId === upper.id && points.every((point) => point[2] > ground.height)));
  assert.ok(plumbing.some(({ fill, owner }) => owner.kind === 'service-run' && fill === serviceSystems.plumbing.media.cold.color));
  const upperOnly = inLayer(enabled(['electrical', 'plumbing'], { scope: 'level' }));
  assert.ok(upperOnly.every(({ owner }) => owner.levelId === upper.id));
  const selectedService = { system: 'plumbing', kind: 'node', id: 'sink', levelId: upper.id };
  const full = inLayer(enabled(['electrical', 'plumbing'], { selectedService }));
  const selected = full.filter(({ owner }) => owner.kind === 'service-node' && owner.id === 'sink');
  assert.ok(selected.length > 0);
  assert.ok(Math.min(...selected.flatMap(({ points }) => points.map(([x]) => x))) < 3.89, 'Selection outline is wider than the node');

  const scene = compileScene(modelFaces(project, upper.id, true, { services: ['plumbing'], selectedService }));
  const frame = cameraFrame(scene, { ...camera, elevation: 90 }, width, height);
  const elevation = Math.max(...selected.flatMap(({ points }) => points.map((point) => point[2])));
  assert.deepEqual(pickScene(scene, frame, ...projectVertex(frame, 4, 2, elevation)), {
    kind: 'service-node', system: 'plumbing', id: 'sink', levelId: upper.id,
  });
});

test('3D service fixtures and their runs follow both faces of a moved diagonal wall', () => {
  const project = makeProject('blank', 'lsf', true);
  const level = project.levels[0];
  const wall = makeWall(2, 1, 6, 4, .20);
  level.rooms.push(makeRoom('living', 0, 0, 10, 6));
  level.walls.push(wall);
  const mounted = (id, kind, side, extra) => ({ id, kind, x: 0, y: 0, mount: 'wall',
    wall: { wallId: wall.id, fraction: .5, side }, ...extra });
  level.services = { electrical: {
    nodes: [mounted('outlets', 'outlet', 1, { count: 3 }), mounted('board', 'panel', -1)],
    runs: [{ id: 'power-run', medium: 'power', from: 'board', to: 'outlets', points: [] }],
  } };
  const faces = () => modelFaces(project, level.id, true, { services: ['electrical'], simulator: { sectionHeight: 1.75, site: false } });
  const outletFaces = (allFaces) => allFaces.filter(({ owner }) => owner?.id === 'outlets');
  const boardFaces = (allFaces) => allFaces.filter(({ owner }) => owner?.id === 'board');
  const signedDistance = ([x, y]) => (x - (wall.x1 + wall.x2) / 2) * -.6 + (y - (wall.y1 + wall.y2) / 2) * .8;
  for (const displacement of [0, 1.5]) {
    wall.x1 += displacement;
    wall.x2 += displacement;
    const scene = faces();
    const outlets = outletFaces(scene);
    const board = boardFaces(scene);
    assert.ok(outlets.length > 3);
    assert.ok(board.length > 0);
    assert.ok(outlets.every(({ points }) => points.every((point) => signedDistance(point) > .098)));
    const plates = outlets.filter(({ fill }) => fill === '#fff6da');
    assert.equal(plates.length, 3);
    for (const { points } of plates) {
      assert.ok(points.every((point) => Math.abs(signedDistance(point) - signedDistance(points[0])) < 1e-6), 'Socket plates align with the diagonal face');
      assert.ok(points.every((point) => point[2] > .35 && point[2] < .53));
    }
    assert.ok(board.every(({ points }) => points.every((point) => signedDistance(point) < -.098)));
    const reachesOutlets = scene.some(({ owner, points }) => owner?.id === 'power-run' &&
      points.some((point) => Math.abs(signedDistance(point) - .104) < 1e-8 && Math.abs(point[2] - level.height * .16) < 1e-9));
    assert.ok(reachesOutlets);
    const compiled = compileScene(scene);
    const azimuth = Math.atan2(-.6, .8) * 180 / Math.PI;
    for (const [owner, plate, angle] of [['outlets', plates[1], azimuth], ['board', board.find(({ fill }) => fill === '#fff6da'), azimuth + 180]]) {
      const frame = cameraFrame(compiled, { ...camera, azimuth: angle, elevation: 0 }, width, height);
      const center = plate.points[0].map((coordinate, axis) => (coordinate + plate.points[2][axis]) / 2);
      assert.equal(pickScene(compiled, frame, ...projectVertex(frame, ...center))?.id, owner);
    }
  }
});

test('3D ceiling and floor fixtures stay in their storey and service entries show their phases', () => {
  const project = makeProject('blank', 'lsf', true);
  const upper = makeLevel('First floor');
  upper.rooms.push(makeRoom('living', 0, 0, 6, 4));
  upper.ceiling = true;
  project.levels.push(upper);
  upper.services = { electrical: {
    nodes: [
      { id: 'light', kind: 'light', x: 1, y: 1, mount: 'ceiling' },
      { id: 'floor-outlet', kind: 'outlet', x: 2, y: 1, mount: 'floor' },
      { id: 'single', kind: 'supplyEntry', x: 3, y: 1, mount: 'free', phase: 'single' },
      { id: 'three', kind: 'supplyEntry', x: 4, y: 1, mount: 'free', phase: 'three' },
    ], runs: [],
  } };
  const groundHeight = project.levels[0].height;
  const display = (cutaway) => modelFaces(project, upper.id, cutaway, { services: ['electrical'] });
  for (const cutaway of [false, true]) {
    const allFaces = display(cutaway);
    const owned = (id) => allFaces.filter(({ owner }) => owner?.id === id);
    const z = (id) => owned(id).flatMap(({ points }) => points.map((point) => point[2]));
    assert.ok(Math.min(...z('floor-outlet')) > groundHeight);
    assert.ok(Math.max(...z('floor-outlet')) < groundHeight + .075);
    if (cutaway) assert.deepEqual(z('light'), []);
    else {
      assert.ok(Math.min(...z('light')) > groundHeight + upper.height - .13);
      assert.ok(Math.max(...z('light')) < groundHeight + upper.height - .06);
    }
    assert.equal(owned('single').filter(({ fill }) => fill === '#fff6da').length, 1);
    assert.equal(owned('three').filter(({ fill }) => fill === '#fff6da').length, 3);
  }
});

test('3D ceiling fixtures hang under rendered supports and disappear when the support is hidden', () => {
  const project = makeProject('blank', 'lsf', true);
  const ground = project.levels[0];
  ground.rooms.push(makeRoom('living', 0, 0, 6, 4));
  ground.services = { electrical: { nodes: [
    { id: 'covered-light', kind: 'light', x: 1, y: 1, mount: 'ceiling' },
    { id: 'open-light', kind: 'light', x: 4, y: 1, mount: 'ceiling' },
  ], runs: [] } };
  const upper = makeLevel('First floor');
  upper.rooms.push(makeRoom('living', 0, 0, 3, 3));
  project.levels.push(upper);
  const options = { services: ['electrical'], roof: false };
  const ceilingHeight = (faces, id) => Math.max(...faces.filter(({ owner }) => owner?.id === id)
    .flatMap(({ points }) => points.map((point) => point[2])));
  const allFloors = modelFaces(project, ground.id, false, { ...options, scope: 'all' });
  const slabUnderside = Math.min(...allFloors.filter(({ owner }) => owner?.kind === 'slab' && owner.levelId === upper.id)
    .flatMap(({ points }) => points.map((point) => point[2])));
  const mountedHeight = ceilingHeight(allFloors, 'covered-light');
  assert.ok(mountedHeight < slabUnderside);
  assert.ok(mountedHeight > slabUnderside - .01);
  assert.equal(ceilingHeight(allFloors, 'open-light'), -Infinity);

  const visibleGround = modelFaces(project, ground.id, false, options);
  assert.ok(visibleGround.every(({ owner }) => owner?.kind !== 'service-node'));

  upper.slab = { mode: 'custom', thickness: .3, footprint: { x: 3, y: 0, width: 2, depth: 3 } };
  const changed = modelFaces(project, ground.id, false, { ...options, scope: 'all' });
  assert.ok(Math.abs(ceilingHeight(changed, 'open-light') - (ground.height - .3 - .006)) < 1e-9);
  assert.equal(ceilingHeight(changed, 'covered-light'), -Infinity);
  upper.slab.thickness = .05;
  const thinner = modelFaces(project, ground.id, false, { ...options, scope: 'all' });
  assert.ok(Math.abs(ceilingHeight(thinner, 'open-light') - (ground.height - .05 - .006)) < 1e-9);
});

test('3D floor circuits stay in the slab and do not bridge uncovered gaps', () => {
  const project = makeProject('blank', 'lsf', true);
  const level = project.levels[0];
  level.rooms.push(makeRoom('living', 0, 0, 2, 3), makeRoom('bedroom', 4, 0, 2, 3));
  level.services = { electrical: {
    nodes: [
      { id: 'first', kind: 'outlet', x: .5, y: 1.5, mount: 'floor' },
      { id: 'last', kind: 'outlet', x: 5.5, y: 1.5, mount: 'floor' },
    ],
    runs: [{ id: 'split-run', medium: 'power', from: 'first', to: 'last', points: [] }],
  } };
  const route = (cutaway) => modelFaces(project, level.id, cutaway, { services: ['electrical'] })
    .filter(({ owner }) => owner?.id === 'split-run');
  const cut = route(true);
  const west = cut.filter(({ points }) => points.every(([x]) => x <= 2.001));
  const east = cut.filter(({ points }) => points.every(([x]) => x >= 3.999));
  assert.ok(west.length && east.length);
  assert.equal(cut.length, west.length + east.length);
  assert.ok(cut.every(({ points }) => points.every(([, , z]) => z >= 0 && z < .02)));
  const closed = route(false);
  assert.equal(closed.length, cut.length);
  assert.ok(closed.every(({ points }) => points.every(([, , z]) => z < 0 && z > -.05)));
});

test('3D wall chases stop at the cut and do not pass through openings', () => {
  const project = makeProject('blank', 'lsf', true);
  const level = project.levels[0];
  level.rooms.push(makeRoom('living', 0, 0, 6, 4));
  const wall = makeWall(0, 0, 6, 0, .24);
  level.walls.push(wall);
  const opening = makeItem('window', 3, 0);
  opening.opening = { sill: .35, height: .65 };
  level.items.push(opening);
  const wallNode = (id, kind, fraction) => ({ id, kind, x: 0, y: 0, mount: 'wall', wall: { wallId: wall.id, side: 1, fraction } });
  level.services = { electrical: {
    nodes: [wallNode('board', 'panel', .2), wallNode('board-over-opening', 'panel', .5),
      wallNode('socket', 'outlet', .85)],
    runs: [
      { id: 'clear-drop', medium: 'power', from: 'board', to: 'socket', points: [] },
      { id: 'opening-drop', medium: 'power', from: 'board-over-opening', to: 'socket', points: [] },
    ],
  } };
  const faces = modelFaces(project, level.id, true, { services: ['electrical'], simulator: { sectionHeight: .8, site: false } });
  assert.ok(!faces.some(({ owner }) => owner?.id.startsWith('board')));
  assert.ok(faces.some(({ owner }) => owner?.id === 'socket'));
  const clear = faces.filter(({ owner, points }) => owner?.id === 'clear-drop' &&
    points.every(([x]) => Math.abs(x - 1.2) < .03) && points.some(([, , height]) => height > .02));
  assert.ok(clear.some(({ points }) => points.some(([, , height]) => Math.abs(height - .8) < 1e-6)));
  assert.ok(clear.flatMap(({ points }) => points).every(([, y, height]) => Math.abs(y - .12) < .007 && height <= .8));
  assert.ok(!faces.some(({ owner, points }) => owner?.id === 'opening-drop' &&
    points.every(([x]) => Math.abs(x - 3) < .03) && points.some(([, , height]) => height > .02)));
});

test('3D ceiling runs split at changes in the actual underside and remain hidden across voids', () => {
  const project = makeProject('blank', 'lsf', true);
  const level = project.levels[0];
  level.rooms.push(makeRoom('living', 0, 0, 8, 2));
  level.services = { vmc: {
    nodes: [
      { id: 'unit', kind: 'unit', x: .5, y: 1, mount: 'ceiling' },
      { id: 'vent', kind: 'supplyVent', x: 7.5, y: 1, mount: 'ceiling' },
    ],
    runs: [{ id: 'ceiling-run', medium: 'supply', from: 'unit', to: 'vent', points: [] }],
  } };
  const upper = makeLevel('Terrace');
  upper.slab = { mode: 'custom', thickness: .30, footprint: { x: 0, y: 0, width: 2, depth: 2 } };
  upper.rooms.push(makeRoom('outdoor', 4, 0, 2, 2));
  project.levels.push(upper);
  const options = { services: ['vmc'], roof: false, simulator: { materials: 'technical', site: false } };
  const runFaces = modelFaces(project, upper.id, false, options).filter(({ owner }) => owner?.id === 'ceiling-run');
  const west = runFaces.filter(({ points }) => points.every(([x]) => x <= 2.001));
  const east = runFaces.filter(({ points }) => points.every(([x]) => x >= 3.999 && x <= 6.001));
  assert.ok(west.length);
  assert.ok(east.length);
  assert.equal(runFaces.length, west.length + east.length);
  assert.ok(west.flatMap(({ points }) => points).every(([, , z]) => Math.abs(z - (level.height - .30)) < .01));
  assert.ok(east.flatMap(({ points }) => points).every(([, , z]) => Math.abs(z - (level.height - .17)) < .01));
  assert.ok(modelFaces(project, level.id, true, options).every(({ owner }) => owner?.system !== 'vmc'));

  level.ceiling = true;
  const roofless = modelFaces(project, level.id, false, { ...options, roof: true });
  const ownCeiling = roofless.filter(({ owner }) => owner?.id === 'ceiling-run');
  assert.ok(ownCeiling.length);
  assert.ok(ownCeiling.flatMap(({ points }) => points).every(([, , z]) => Math.abs(z - (level.height - .06)) < .01));
});

test('3D outdoor units rest on terrain and buried leads are not shown crossing exterior air', () => {
  const project = makeProject('blank', 'lsf', true);
  const level = project.levels[0];
  level.rooms.push(makeRoom('living', 0, 0, 4, 4));
  level.services = { airConditioning: {
    nodes: [
      { id: 'outdoor', kind: 'outdoorUnit', x: -.42, y: 1, mount: 'floor' },
      { id: 'indoor', kind: 'indoorUnit', x: 1.5, y: 1, mount: 'floor' },
    ],
    runs: [{ id: 'outside-lead', medium: 'refrigerant', surface: 'floor', from: 'outdoor', to: 'indoor', points: [] }],
  } };
  const model = (site) => modelFaces(project, level.id, true, { services: ['airConditioning'], simulator: { site } });
  const exposed = model(true);
  const fixture = exposed.filter(({ owner }) => owner?.id === 'outdoor');
  assert.ok(fixture.length);
  assert.ok(Math.abs(Math.min(...fixture.flatMap(({ points }) => points.map(([, , z]) => z))) + .182) < 1e-8);
  const leads = exposed.filter(({ owner }) => owner?.id === 'outside-lead');
  assert.ok(leads.length);
  assert.ok(leads.flatMap(({ points }) => points).every(([x, , z]) => x >= -.001 && z >= 0 && z < .02));
  assert.ok(!model(false).some(({ owner }) => owner?.id === 'outdoor'));
});

test('A custom slab extends past the rooms and removes flooring over uncovered areas', () => {
  const project = makeProject('blank', 'lsf', true);
  const ground = project.levels[0];
  ground.rooms.push(makeRoom('living', 0, 0, 4, 4), makeRoom('outdoor', 0, 4, 2, 1));
  ground.slab = { mode: 'custom', thickness: .32, footprint: { x: -1, y: -1, width: 4, depth: 5 } };

  const faces = modelFaces(project, ground.id, false);
  const slab = faces.filter(({ owner }) => owner?.kind === 'slab');
  const vertices = slab.flatMap(({ points }) => points);
  assert.equal(slab.length, 6);
  assert.equal(Math.min(...vertices.map(([x]) => x)), -1);
  assert.equal(Math.min(...vertices.map(([, , z]) => z)), -.32);
  assert.equal(Math.max(...vertices.map(([, , z]) => z)), 0);
  const finishedFloor = faces.filter(({ owner }) => owner?.id === ground.rooms[0].id);
  assert.equal(finishedFloor.length, 1);
  assert.equal(Math.max(...finishedFloor[0].points.map(([x]) => x)), 3);

  const scene = compileScene(faces);
  const frame = cameraFrame(scene, { ...camera, elevation: 90 }, width, height);
  assert.deepEqual(pickScene(scene, frame, ...projectVertex(frame, -.5, 2, 0)), {
    kind: 'slab', id: ground.id, levelId: ground.id,
  });
  ground.slab.mode = 'none';
  const withoutSlab = modelFaces(project, ground.id, false);
  assert.ok(withoutSlab.every(({ owner }) => owner?.id === ground.rooms[1].id));
  assert.equal(withoutSlab.length, 5);
});
