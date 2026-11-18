export function shade(color, delta) {
  return `#${[1, 3, 5].map((index) => Math.max(0, Math.min(255, Number.parseInt(color.slice(index, index + 2), 16) + delta)).toString(16).padStart(2, '0')).join('')}`;
}

// Catalogue models use the same footprint, orientation and metric scale as the plan symbols.
export function furnitureModel(item, type, levelHeight, floor, prism, face) {
  const { width, depth, angle, x, y } = item;
  const sin = Math.sin(angle * Math.PI / 180);
  const cos = Math.cos(angle * Math.PI / 180);
  const point = (u, v, z) => [x + u * cos - v * sin, y + u * sin + v * cos, floor + z];
  const sx = (u) => (u - .5) * width;
  const sy = (v) => (v - .5) * depth;
  const colors = (base) => [base, shade(base, -14), shade(base, -29)];
  function block(left, top, right, bottom, z, height, color = type.color) {
    prism([point(sx(left), sy(top), 0), point(sx(right), sy(top), 0),
      point(sx(right), sy(bottom), 0), point(sx(left), sy(bottom), 0)], floor + z, height, colors(color));
  }
  function legs(left, top, right, bottom, z, height, size, color) {
    const a = Math.min(size / width, (right - left) / 3);
    const b = Math.min(size / depth, (bottom - top) / 3);
    for (const u of [left, right - a]) {
      for (const v of [top, bottom - b]) block(u, v, u + a, v + b, z, height, color);
    }
  }

  switch (item.type) {
    case 'sofa': {
      const base = shade(type.color, -13);
      const cushions = shade(type.color, 11);
      legs(.08, .06, .92, .92, 0, .10, .055, '#706351');
      block(.01, .02, .99, .98, .10, .21, base);
      block(.02, .02, .98, .22, .31, .47, base);
      block(.01, .12, .13, .97, .31, .28, base);
      block(.87, .12, .99, .97, .31, .28, base);
      const count = width > 2 ? 3 : 2;
      for (let index = 0; index < count; index++) {
        const left = .137 + index * .726 / count;
        const right = left + .716 / count;
        block(left, .25, right, .94, .31, .14, cushions);
        block(left, .13, right, .29, .43, .26, cushions);
      }
      break;
    }
    case 'table':
      legs(.08, .09, .92, .91, 0, .71, .075, shade(type.color, -22));
      block(.04, .06, .96, .94, .65, .065, shade(type.color, -15));
      block(0, 0, 1, 1, .716, .044);
      break;
    case 'bed':
    case 'singleBed': {
      legs(.065, .045, .935, .955, 0, .12, .068, '#806756');
      block(.025, .02, .975, .98, .12, .18, '#a5816c');
      block(.03, .01, .97, .085, .18, .53, '#a5816c');
      block(.045, .087, .955, .965, .30, .16, '#ece4d7');
      block(.048, .36, .952, .95, .46, .07);
      const count = item.type === 'bed' ? 2 : 1;
      for (let index = 0; index < count; index++) {
        const left = .09 + .83 * index / count;
        block(left, .12, left + .78 / count, .28, .46, .07, '#f6eee0');
      }
      break;
    }
    case 'cupboard':
    case 'kitchen': {
      const cupboard = item.type === 'cupboard';
      const baseHeight = cupboard ? 1.74 : .86;
      block(.01, .02, .99, .99, .045, baseHeight - .045);
      const count = Math.min(5, Math.max(2, Math.round(width / .56)));
      for (let index = 0; index < count; index++) {
        const left = index / count + .008;
        const right = (index + 1) / count - .008;
        block(left, .97, right, 1, .075, baseHeight - .10, shade(type.color, 12));
        block(right - .055, 1, right - .015, 1.055, cupboard ? 1.18 : .70, cupboard ? .10 : .03, '#726659');
      }
      block(-.015, 0, 1.015, 1.025, baseHeight, cupboard ? .065 : .045, cupboard ? type.color : '#e5d9c7');
      if (!cupboard && width > 1.3) {
        block(.15, .19, .41, .76, .905, .012, '#899b95');
        block(.63, .17, .86, .80, .905, .012, '#575b55');
      }
      break;
    }
    case 'bath':
    case 'shower': {
      const height = type.height;
      const rim = item.type === 'bath' ? .107 : .083;
      block(rim, rim, 1 - rim, 1 - rim, 0, height * .24, '#e1e5dc');
      block(0, 0, 1, rim, 0, height, '#eeeae1');
      block(0, 1 - rim, 1, 1, 0, height, '#eeeae1');
      block(0, rim, rim, 1 - rim, 0, height, '#eeeae1');
      block(1 - rim, rim, 1, 1 - rim, 0, height, '#eeeae1');
      break;
    }
    case 'toilet':
      block(.13, .28, .87, .91, 0, .39, '#e8e8dd');
      block(.07, .04, .93, .32, 0, .62, '#f1eee3');
      block(.14, .31, .86, .91, .39, .07, '#f1eee3');
      break;
    case 'tree': {
      block(.45, .45, .55, .55, 0, 1.35, '#8b7157');
      const top = point(0, 0, 2.30), bottom = point(0, 0, .96);
      const ring = Array.from({ length: 9 }, (_, index) => {
        const theta = index * Math.PI * 2 / 9;
        return point(width * Math.cos(theta) * .5, depth * Math.sin(theta) * .5, 1.62);
      });
      ring.forEach((vertex, index) => {
        const next = ring[(index + 1) % ring.length];
        face([top, vertex, next], shade(type.color, 8 + Math.round(Math.sin(index) * 11)));
        face([bottom, next, vertex], shade(type.color, -19 + Math.round(Math.sin(index) * 12)));
      });
      break;
    }
    case 'stair': {
      const count = Math.ceil(levelHeight / .19);
      for (let index = 0; index < count; index++) {
        block(0, index / count, 1, (index + 1) / count, 0, levelHeight * (count - index) / count);
      }
      break;
    }
    case 'rail': {
      const post = Math.min(depth, width / 10, .08);
      const count = Math.min(20, Math.ceil(width / .75) + 1);
      for (let index = 0; index < count; index++) {
        const a = index * (1 - post / width) / (count - 1);
        block(a, .5 - post / (2 * depth), a + post / width, .5 + post / (2 * depth), 0, type.height);
      }
      block(0, 0, 1, 1, type.height, .055);
      break;
    }
    default: block(0, 0, 1, 1, 0, type.height);
  }
}
