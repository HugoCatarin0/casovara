const toRadians = Math.PI / 180;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function packedColor(fill, opacity) {
  const rgb = Number.parseInt(fill.slice(1), 16);
  return ((Math.round(opacity * 255) << 24) | ((rgb & 255) << 16) | (rgb & 0xff00) | ((rgb >>> 16) & 255)) >>> 0;
}

export function compileScene(faces) {
  const opaque = [];
  const translucent = [];
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (const { points, fill, opacity = 1, owner = null, pickThrough = false } of faces) {
    if (points.length < 3 || opacity <= 0) continue;
    const target = opacity >= 1 ? opaque : translucent;
    const color = packedColor(fill, Math.min(opacity, 1));
    for (const vertex of points) {
      for (let axis = 0; axis < 3; axis++) {
        low[axis] = Math.min(low[axis], vertex[axis]);
        high[axis] = Math.max(high[axis], vertex[axis]);
      }
    }
    for (let index = 1; index < points.length - 1; index++) {
      target.push({ points: [points[0], points[index], points[index + 1]], color, owner, pickThrough });
    }
  }
  const empty = !opaque.length && !translucent.length;
  const center = empty ? [0, 0, 0] : low.map((value, axis) => (value + high[axis]) / 2);
  const halfSize = empty ? [1, 1, 1] : high.map((value, axis) => (value - low[axis]) / 2);
  return {
    opaque, translucent, empty, center,
    horizontalRadius: Math.max(.65, Math.hypot(halfSize[0], halfSize[1])),
    radius: Math.max(.65, Math.hypot(...halfSize)),
  };
}

export function cameraFrame(scene, camera, width, height) {
  const { azimuth = -38, elevation = 32, zoom = 1, panX = 0, panY = 0, projection = 'orthographic' } = camera;
  const angle = azimuth * toRadians;
  const tilt = elevation * toRadians;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const rise = Math.sin(tilt);
  const run = Math.cos(tilt);
  const right = [cos, -sin, 0];
  const down = [sin * rise, cos * rise, -run];
  const near = [sin * run, cos * run, rise];
  const scale = Math.min(width / (2.36 * scene.horizontalRadius), height / (2.36 * scene.radius)) * zoom;
  return {
    width, height, scale, right, down, near, center: scene.center, radius: scene.radius,
    originX: width / 2 + panX, originY: height / 2 + panY,
    offsetX: -dot(scene.center, right) * scale,
    offsetY: -dot(scene.center, down) * scale,
    offsetZ: -dot(scene.center, near),
    perspective: projection === 'perspective' ? 1 / (3.7 * scene.radius) : 0,
  };
}

export function projectVertex(frame, x, y, z) {
  const { right, down, near, scale, originX, originY, offsetX, offsetY, offsetZ, perspective } = frame;
  const depth = near[0] * x + near[1] * y + near[2] * z + offsetZ;
  const weight = 1 / (1 - depth * perspective);
  return [
    ((right[0] * x + right[1] * y) * scale + offsetX) * weight + originX,
    ((down[0] * x + down[1] * y + down[2] * z) * scale + offsetY) * weight + originY,
    depth * weight,
  ];
}

export function pickScene(scene, frame, x, y) {
  if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) return null;
  let depth = -Infinity;
  let owner = null;
  for (const layer of [scene.opaque, scene.translucent]) {
    for (const triangle of layer) {
      if (triangle.pickThrough) continue;
      const [a, b, c] = triangle.points;
      const [ax, ay, az] = projectVertex(frame, ...a);
      const [bx, by, bz] = projectVertex(frame, ...b);
      const [cx, cy, cz] = projectVertex(frame, ...c);
      const abx = bx - ax, aby = by - ay;
      const acx = cx - ax, acy = cy - ay;
      const area = abx * acy - aby * acx;
      if (Math.abs(area) < .000001) continue;
      const u = ((x - ax) * acy - (y - ay) * acx) / area;
      const v = ((y - ay) * abx - (x - ax) * aby) / area;
      if (u < -.000001 || v < -.000001 || u + v > 1.000001) continue;
      const z = az + (bz - az) * u + (cz - az) * v;
      if (z > depth + .000001) {
        depth = z;
        owner = triangle.owner;
      }
    }
  }
  return owner;
}

function rasterize(triangle, frame, depth, targetDepth, target) {
  const [[ax, ay, az], [bx, by, bz], [cx, cy, cz]] = triangle.points.map(([x, y, z]) => projectVertex(frame, x, y, z));
  const abx = bx - ax, aby = by - ay;
  const acx = cx - ax, acy = cy - ay;
  const area = abx * acy - aby * acx;
  if (Math.abs(area) < 0.000001) return;
  const left = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - 0.5));
  const right = Math.min(frame.width - 1, Math.floor(Math.max(ax, bx, cx) - 0.5));
  const top = Math.max(0, Math.ceil(Math.min(ay, by, cy) - 0.5));
  const bottom = Math.min(frame.height - 1, Math.floor(Math.max(ay, by, cy) - 0.5));
  if (left > right || top > bottom) return;

  // Increment barycentric weights and depth from one pixel centre to the next.
  const dux = acy / area, duy = -acx / area;
  const dvx = -aby / area, dvy = abx / area;
  const startU = (left + 0.5 - ax) * dux + (top + 0.5 - ay) * duy;
  const startV = (left + 0.5 - ax) * dvx + (top + 0.5 - ay) * dvy;
  const dzx = (bz - az) * dux + (cz - az) * dvx;
  const dzy = (bz - az) * duy + (cz - az) * dvy;
  const startZ = az + (bz - az) * startU + (cz - az) * startV;
  const color = triangle.color;
  for (let y = top; y <= bottom; y++) {
    let u = startU + (y - top) * duy;
    let v = startV + (y - top) * dvy;
    let z = startZ + (y - top) * dzy;
    let pixel = y * frame.width + left;
    for (let x = left; x <= right; x++, pixel++, u += dux, v += dvx, z += dzx) {
      if (u >= -.000001 && v >= -.000001 && u + v <= 1.000001 &&
          z > depth[pixel] + .000001 && z > targetDepth[pixel] + .000001) {
        targetDepth[pixel] = z;
        target[pixel] = color;
      }
    }
  }
}

function blend(front, back) {
  const alpha = front >>> 24;
  if (!back) return front;
  const inverseAlpha = 255 - alpha;
  const r = Math.round(((front & 255) * alpha + (back & 255) * inverseAlpha) / 255);
  const g = Math.round((((front >>> 8) & 255) * alpha + ((back >>> 8) & 255) * inverseAlpha) / 255);
  const b = Math.round((((front >>> 16) & 255) * alpha + ((back >>> 16) & 255) * inverseAlpha) / 255);
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
}

export function renderScene(scene, frame, { pixels, depth, glassDepth, glassColors }) {
  pixels.fill(0);
  depth.fill(-Infinity);
  for (const triangle of scene.opaque) rasterize(triangle, frame, depth, depth, pixels);
  if (!scene.translucent.length) return;
  glassDepth.fill(-Infinity);
  glassColors.fill(0);
  for (const triangle of scene.translucent) rasterize(triangle, frame, depth, glassDepth, glassColors);
  for (let index = 0; index < pixels.length; index++) {
    if (glassColors[index]) pixels[index] = blend(glassColors[index], pixels[index]);
  }
}

const vertexShader = `attribute vec3 position;
attribute vec4 color;
uniform vec3 centre;
uniform vec3 right;
uniform vec3 down;
uniform vec3 nearAxis;
uniform vec2 scale;
uniform vec2 shift;
uniform float depthScale;
uniform float perspective;
varying lowp vec4 paint;
void main() {
  vec3 point = position - centre;
  float depth = dot(nearAxis, point);
  float weight = 1.0 - depth * perspective;
  gl_Position = vec4(vec2(dot(right, point), -dot(down, point)) * scale + shift * weight,
    -depth * depthScale, weight);
  paint = color;
}`;

const fragmentShader = `precision mediump float;
varying lowp vec4 paint;
void main() {
  gl_FragColor = paint;
}`;

function createGPU() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true, stencil: true, premultipliedAlpha: true });
  if (!gl?.getContextAttributes()?.stencil) return null;
  const program = gl.createProgram();
  for (const [type, code] of [[gl.VERTEX_SHADER, vertexShader], [gl.FRAGMENT_SHADER, fragmentShader]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const uniforms = Object.fromEntries(['centre', 'right', 'down', 'nearAxis', 'scale', 'shift', 'depthScale', 'perspective']
    .map((name) => [name, gl.getUniformLocation(program, name)]));
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  for (const [name, size, offset] of [['position', 3, 0], ['color', 4, 12]]) {
    const attribute = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, size, gl.FLOAT, false, 28, offset);
  }
  gl.enable(gl.DEPTH_TEST);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  let previous;

  function paint(scene, frame, context) {
    if (gl.isContextLost()) return false;
    const { width, height } = frame;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    if (scene !== previous) {
      const vertices = new Float32Array((scene.opaque.length + scene.translucent.length) * 21);
      let index = 0;
      for (const { points, color } of [...scene.opaque, ...scene.translucent]) {
        const r = (color & 255) / 255;
        const g = ((color >>> 8) & 255) / 255;
        const b = ((color >>> 16) & 255) / 255;
        const a = (color >>> 24) / 255;
        for (const [x, y, z] of points) {
          vertices.set([x, y, z, r, g, b, a], index);
          index += 7;
        }
      }
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      previous = scene;
    }
    gl.uniform3fv(uniforms.centre, frame.center);
    gl.uniform3fv(uniforms.right, frame.right);
    gl.uniform3fv(uniforms.down, frame.down);
    gl.uniform3fv(uniforms.nearAxis, frame.near);
    gl.uniform2f(uniforms.scale, 2 * frame.scale / width, 2 * frame.scale / height);
    gl.uniform2f(uniforms.shift, 2 * frame.originX / width - 1, 1 - 2 * frame.originY / height);
    gl.uniform1f(uniforms.depthScale, .68 / frame.radius);
    gl.uniform1f(uniforms.perspective, frame.perspective);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    const opaque = scene.opaque.length * 3;
    const translucent = scene.translucent.length * 3;
    gl.drawArrays(gl.TRIANGLES, 0, opaque);
    if (translucent) {
      // Record the foremost pane per pixel against the opaque scene, then blend only that pane.
      gl.colorMask(false, false, false, false);
      gl.drawArrays(gl.TRIANGLES, opaque, translucent);
      gl.colorMask(true, true, true, true);
      gl.depthFunc(gl.EQUAL);
      gl.depthMask(false);
      gl.enable(gl.STENCIL_TEST);
      gl.stencilFunc(gl.EQUAL, 0, 0xff);
      // Coplanar shadow fragments can overlap. Composite one visible fragment per sample.
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      gl.enable(gl.BLEND);
      gl.drawArrays(gl.TRIANGLES, opaque, translucent);
      gl.disable(gl.BLEND);
      gl.disable(gl.STENCIL_TEST);
      gl.depthMask(true);
      gl.depthFunc(gl.LESS);
    }
    context.clearRect(0, 0, width, height);
    context.drawImage(canvas, 0, 0);
    return true;
  }

  return { paint, dispose: () => gl.getExtension('WEBGL_lose_context')?.loseContext() };
}

export function createModelRenderer(canvas, { preferSoftware = false } = {}) {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const gpu = preferSoftware ? null : createGPU();
  let image, buffers;

  function paint(scene, camera, width, height) {
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const frame = cameraFrame(scene, camera, width, height);
    if (gpu?.paint(scene, frame, context)) return frame;
    if (image?.width !== width || image?.height !== height) {
      image = context.createImageData(width, height);
      const size = width * height;
      buffers = {
        pixels: new Uint32Array(image.data.buffer), depth: new Float32Array(size),
        glassDepth: new Float32Array(size), glassColors: new Uint32Array(size),
      };
    }
    renderScene(scene, frame, buffers);
    context.putImageData(image, 0, 0);
    return frame;
  }

  return { paint, dispose: () => gpu?.dispose() };
}
