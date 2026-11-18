import { cameraFrame, createModelRenderer, pickScene } from './model-renderer.js';

export const initialModelCamera = Object.freeze({
  azimuth: -38, elevation: 34, zoom: 1, panX: 0, panY: 0, projection: 'perspective',
});

const limit = (value, min, max) => Math.max(min, Math.min(max, value));

function atResolution(camera, width, height) {
  return { ...camera, panX: camera.panX * width, panY: camera.panY * height };
}

export function modelImage(scene, camera, width = 1600, height = 1200) {
  const model = document.createElement('canvas');
  const renderer = createModelRenderer(model, { preferSoftware: true });
  renderer.paint(scene, atResolution(camera, width, height), width, height);
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const context = output.getContext('2d');
  const backdrop = context.createRadialGradient(width * .53, height * .42, 0, width * .53, height * .42, width * .72);
  backdrop.addColorStop(0, '#fbf9f1');
  backdrop.addColorStop(1, '#e5e2d5');
  context.fillStyle = backdrop;
  context.fillRect(0, 0, width, height);
  context.drawImage(model, 0, 0);
  return output;
}

export function createModelViewer({ canvas, signal, scene, onCamera, onEmpty, onPick }) {
  const camera = { ...initialModelCamera };
  const pointers = new Map();
  const listen = { signal };
  let renderer;
  let animation = null;
  let gesture = null;
  let tap = null;
  let last;

  function render() {
    animation = null;
    const rect = canvas.getBoundingClientRect();
    if (!canvas.isConnected || rect.width < 2 || rect.height < 2) return;
    renderer ??= createModelRenderer(canvas);
    if (!renderer) return;
    const current = scene();
    const density = Math.min(window.devicePixelRatio || 1, 1.8, Math.sqrt(1500000 / (rect.width * rect.height)));
    const width = Math.max(2, Math.round(rect.width * density));
    const height = Math.max(2, Math.round(rect.height * density));
    const key = [current, width, height, ...Object.values(camera)];
    if (last?.every((value, index) => value === key[index])) return;
    last = key;
    onEmpty(current.empty);
    renderer.paint(current, atResolution(camera, width, height), width, height);
    canvas.dataset.rendered = current.empty ? 'empty' : 'scene';
  }

  function paint() {
    if (animation === null) animation = requestAnimationFrame(render);
  }

  function set(next) {
    Object.assign(camera, next);
    camera.azimuth = ((camera.azimuth % 360) + 360) % 360;
    camera.elevation = limit(camera.elevation, 3, 90);
    camera.zoom = limit(camera.zoom, .3, 9);
    onCamera(camera);
    paint();
  }

  function fit() {
    set({ zoom: 1, panX: 0, panY: 0 });
  }

  function rotate(horizontal, vertical = 0) {
    set({ azimuth: camera.azimuth + horizontal, elevation: camera.elevation + vertical });
  }

  function zoom(factor, anchorX = 0, anchorY = 0) {
    const next = limit(camera.zoom * factor, .3, 9);
    const ratio = next / camera.zoom;
    set({ zoom: next, panX: (camera.panX - anchorX) * ratio + anchorX, panY: (camera.panY - anchorY) * ratio + anchorY });
  }

  function physicalPosition(event) {
    return { x: event.clientX, y: event.clientY, button: event.button, shift: event.shiftKey };
  }

  function pinchState() {
    const [a, b] = pointers.values();
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)) };
  }

  function startGesture() {
    if (pointers.size > 1) gesture = { mode: 'pinch', start: pinchState(), camera: { ...camera } };
    else if (pointers.size) {
      const start = pointers.values().next().value;
      gesture = { mode: start.button !== 0 || start.shift ? 'pan' : 'orbit', start, camera: { ...camera } };
    } else gesture = null;
    canvas.dataset.gesture = gesture?.mode ?? '';
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button > 2 || pointers.size >= 2) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    const position = physicalPosition(event);
    tap = !pointers.size && !position.button && !position.shift ? { ...position, id: event.pointerId } : null;
    pointers.set(event.pointerId, position);
    startGesture();
  }, listen);

  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId) || !gesture) return;
    if (tap?.id === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 5) tap = null;
    const pointer = pointers.get(event.pointerId);
    pointers.set(event.pointerId, { ...pointer, x: event.clientX, y: event.clientY });
    const rect = canvas.getBoundingClientRect();
    const start = gesture.start;
    const origin = gesture.camera;
    if (gesture.mode === 'pinch') {
      const pinch = pinchState();
      const next = limit(origin.zoom * pinch.distance / start.distance, .3, 9);
      const ratio = next / origin.zoom;
      const anchorX = (start.x - rect.left) / rect.width - .5;
      const anchorY = (start.y - rect.top) / rect.height - .5;
      set({
        zoom: next,
        panX: (origin.panX - anchorX) * ratio + anchorX + (pinch.x - start.x) / rect.width,
        panY: (origin.panY - anchorY) * ratio + anchorY + (pinch.y - start.y) / rect.height,
      });
    } else if (gesture.mode === 'pan') {
      set({ panX: origin.panX + (event.clientX - start.x) / rect.width, panY: origin.panY + (event.clientY - start.y) / rect.height });
    } else if (!tap) {
      set({
        azimuth: origin.azimuth + (event.clientX - start.x) * .45,
        elevation: origin.elevation + (event.clientY - start.y) * .31,
      });
    }
  }, listen);

  function end(event) {
    if (tap?.id === event.pointerId) {
      const click = event.type === 'pointerup' && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) <= 5;
      tap = null;
      if (click && canvas.dataset.rendered === 'scene') {
        const rect = canvas.getBoundingClientRect();
        const { width, height } = canvas;
        const current = scene();
        const frame = cameraFrame(current, atResolution(camera, width, height), width, height);
        onPick(pickScene(current, frame, (event.clientX - rect.left) * width / rect.width, (event.clientY - rect.top) * height / rect.height));
      }
    }
    if (pointers.delete(event.pointerId)) startGesture();
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, end, listen);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault(), listen);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
    zoom(Math.exp(-event.deltaY * multiplier * .0013), (event.clientX - rect.left) / rect.width - .5, (event.clientY - rect.top) / rect.height - .5);
  }, { ...listen, passive: false });
  canvas.addEventListener('dblclick', fit, listen);
  canvas.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key];
    if (direction) {
      const [x, y] = direction;
      if (event.shiftKey) set({ panX: camera.panX + x * .045, panY: camera.panY - y * .045 });
      else rotate(x * 12, y * 8);
    } else if (['+', '='].includes(event.key)) zoom(1.20);
    else if (event.key === '-') zoom(1 / 1.20);
    else if (event.key === 'Home' || event.key.toLowerCase() === 'f') fit();
    else return;
    event.preventDefault();
    event.stopPropagation();
  }, listen);

  function dispose() {
    if (animation !== null) cancelAnimationFrame(animation);
    renderer?.dispose();
  }
  return { paint, dispose, set, rotate, zoom, fit, camera: () => ({ ...camera }) };
}
