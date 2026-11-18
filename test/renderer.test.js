import assert from 'node:assert/strict';
import { test } from 'node:test';
import { elements, makeItem, makeProject, makeRoom, makeWall, modelFaces } from '../public/builder-engine.js';
import { cameraFrame, compileScene, pickScene, projectVertex, renderScene } from '../public/model-renderer.js';

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
