import { detailFurnitureModel } from './catalog-detail-shapes.js';
import { extraFurnitureModel } from './object-extra-shapes.js';

const wood = '#8f7a65';
const metal = '#879ba4';
const darkMetal = '#54636b';
const porcelain = '#e9e9df';
const glass = '#90b0ba';
const leaf = '#7a9665';
const fabric = '#d5c9b7';

// These models are spatial proxies. Their envelopes follow the instance dimensions; no vendor mesh is used.
export function catalogFurnitureModel(item, profile, { block, legs, oval, point, face, shade, levelHeight }) {
  const { model, color } = profile;
  const { type, width } = item;
  const height = item.height ?? profile.height;
  const solid = (l, t, r, b, base, size, paint = color, opacity = 1) =>
    block(l, t, r, b, base * height, size * height, paint, opacity);
  const tint = (amount) => shade(color, amount);
  const tray = (l, t, r, b, base, size, circular = false, paint = color) => {
    if (circular) oval(l, t, r, b, base * height, size * height, paint);
    else solid(l, t, r, b, base, size, paint);
  };
  const table = (circular = false) => {
    if (circular) oval(.43, .43, .57, .57, .06 * height, .91 * height, wood);
    else legs(.07, .10, .93, .90, 0, .94 * height, .06, tint(-20));
    tray(0, 0, 1, 1, .94, .06, circular);
  };
  const chest = (columns, shelves, opened = false, bottom = 0) => {
    const top = 1 - .045;
    solid(0, 0, .045, .98, bottom, top - bottom);
    solid(.955, 0, 1, .98, bottom, top - bottom);
    solid(.045, 0, .955, .10, bottom, top - bottom, tint(-20));
    solid(0, 0, 1, .98, top, .045, tint(12));
    for (let row = 0; row < shelves; row++) {
      const z = bottom + (top - bottom) * row / shelves;
      if (opened) {
        solid(.046, .10, .954, .97, z, (top - bottom) * .045, tint(12));
        continue;
      }
      for (let col = 0; col < columns; col++) {
        const left = .049 + col * .902 / columns;
        const right = .951 - (columns - 1 - col) * .902 / columns;
        const panelHeight = (top - bottom) / shelves;
        solid(left, .10, right - .007, .97, z + .011, panelHeight - .020, tint(5));
        const middle = (left + right) / 2;
        solid(middle - .052, .97, middle + .052, 1, z + panelHeight * .77, .025, darkMetal);
      }
    }
    if (model === 'cubes') {
      for (let col = 1; col < columns; col++) {
        const x = col / columns;
        solid(x - .018, .10, x + .018, .97, bottom, top - bottom, tint(10));
      }
    }
  };
  const bed = (base, available, lower = false) => {
    const colorOffset = tint(-15);
    solid(.025, .02, .975, .98, base, available * .22, colorOffset);
    solid(.025, .02, .975, .105, base, available, colorOffset);
    solid(.045, .10, .955, .97, base + available * .22, available * .44, porcelain);
    solid(.05, .37, .95, .96, base + available * .66, available * .15);
    const pillows = width >= 1.3 && !lower ? 2 : 1;
    for (let count = 0; count < pillows; count++) {
      const l = .09 + .84 * count / pillows;
      solid(l, .16, l + .79 / pillows, .34, base + available * .66, available * .17, fabric);
    }
  };
  switch (model) {
    case 'sofa':
    case 'sectionalLeft':
    case 'sectionalRight':
    case 'chaise': {
      const lShape = model.startsWith('sectional');
      const right = model === 'sectionalRight';
      const end = lShape ? .48 : 1;
      const seatStart = right ? .64 : 0;
      const seatEnd = right ? 1 : .36;
      legs(.065, .055, .935, end - .06, 0, height * .13, .06, wood);
      solid(0, 0, 1, end, .13, .29);
      solid(0, 0, 1, end * .19, .42, .58, tint(-14));
      solid(.12, end * .21, .88, end * .92, .42, .14, tint(20));
      solid(.01, end * .15, .115, end, .42, .28);
      solid(.885, end * .15, .99, end, .42, .28);
      if (lShape) {
        legs(seatStart + .055, end + .05, seatEnd - .055, .985, 0, height * .13, .06, wood);
        solid(seatStart, end, seatEnd, 1, .13, .29);
        solid(seatStart + .045, end, seatEnd - .045, .96, .42, .14, tint(20));
      }
      break;
    }
    case 'chair':
    case 'officeChair':
    case 'recliner':
    case 'highChair':
    case 'wheelchair': {
      const isOffice = model === 'officeChair';
      const wheelchair = model === 'wheelchair';
      const backed = model === 'recliner';
      const high = model === 'highChair';
      const seat = backed ? .44 : high ? .67 : .49;
      if (isOffice) {
        oval(.43, .42, .57, .58, height * .07, height * (seat - .07), darkMetal);
        solid(.055, .45, .945, .55, .035, .06, darkMetal);
        solid(.45, .055, .55, .945, .035, .06, darkMetal);
      } else {
        legs(.15, .15, .85, backed ? .62 : .86, 0, height * seat, .054, tint(-25));
      }
      solid(.10, .13, .90, backed ? .68 : .92, seat, .095, tint(12));
      solid(.12, .055, .88, .20, seat, 1 - seat);
      if (high) solid(.04, .70, .96, 1, .87, .055, porcelain);
      if (wheelchair || model === 'recliner') {
        solid(.15, .78, .85, .985, wheelchair ? .16 : .38, .055, tint(-8));
        if (wheelchair) {
          for (const u of [.02, .90]) solid(u, .18, u + .08, .84, .04, .63, darkMetal);
        }
      }
      if (width > .62 || isOffice) {
        for (const u of [.03, .86]) solid(u, .20, u + .11, .73, seat + .09, .17, tint(-8));
      }
      break;
    }
    case 'ottoman':
    case 'bench':
      legs(.12, .12, .88, .88, 0, height * .68, .055, wood);
      solid(0, 0, 1, 1, .68, .32);
      break;
    case 'stool':
      legs(.18, .18, .82, .82, 0, height * .90, .05, wood);
      oval(0, 0, 1, 1, height * .90, height * .10, color);
      break;
    case 'table':
    case 'roundTable':
    case 'extendTable':
    case 'slatTable':
    case 'desk':
      table(model === 'roundTable');
      break;
    case 'cornerDesk':
      legs(.06, .08, .95, .43, 0, height * .94, .06, wood);
      legs(.06, .53, .39, .95, 0, height * .94, .055, wood);
      solid(0, 0, 1, .48, .94, .06);
      solid(0, .48, .45, 1, .94, .06);
      break;
    case 'bed':
      legs(.10, .10, .90, .90, 0, height * .16, .06, wood);
      bed(.16, .84);
      break;
    case 'bunk':
      legs(.02, .01, .98, .98, 0, height, .075, wood);
      if (type !== 'loftBed') bed(.12, .30, true);
      bed(.66, .34, true);
      solid(.94, .11, .985, .66, .89, .055, wood);
      for (const u of [.76, .90]) solid(u, .90, u + .045, .985, 0, .76, wood);
      for (let step = 1; step < 6; step++) solid(.76, .92, .945, .975, step * .118, .025, wood);
      break;
    case 'crib':
      legs(.015, .015, .985, .985, 0, height, .05, wood);
      solid(.06, .07, .94, .93, .30, .14, porcelain);
      for (let index = 0; index < 9; index++) {
        const v = .045 + index * .108;
        solid(.02, v, .08, v + .035, .40, .55);
        solid(.92, v, .98, v + .035, .40, .55);
      }
      for (const l of [.02, .92]) solid(l, .04, l + .06, .96, .95, .05);
      break;
    case 'kitchenCabinet':
    case 'dresser':
    case 'wardrobe':
    case 'cubes':
    case 'shelf':
    case 'displayCabinet': {
      const opened = ['cubes', 'shelf', 'displayCabinet'].includes(model);
      const columns = model === 'dresser' ? 1 : Math.min(5, Math.max(1, Math.round(width / .50)));
      const rows = model === 'dresser' ? 4 : opened ? Math.max(2, Math.round(height / .42)) : 1;
      chest(columns, rows, opened);
      if (model === 'displayCabinet') solid(.06, .94, .94, .99, .09, .85, glass, .38);
      break;
    }
    case 'wallShelf':
    case 'wallCabinet':
    case 'mirror':
    case 'painting': {
      const bottom = Math.max(.25, Math.min(1.48, levelHeight - height - .1));
      block(0, 0, 1, 1, bottom, height, model === 'mirror' ? glass : color);
      if (model === 'wallCabinet') block(.16, .94, .84, 1, bottom + height * .13, height * .035, darkMetal);
      break;
    }
    case 'trolley':
      legs(.07, .07, .93, .93, 0, height, .052, darkMetal);
      for (const base of [.15, .52, .89]) solid(0, 0, 1, 1, base, .11);
      break;
    case 'laptop': {
      const bottom = .76;
      block(0, .19, 1, 1, bottom, height * .15, color);
      block(0, .12, 1, .22, bottom + height * .14, height * .86, darkMetal);
      break;
    }
    case 'screen': {
      const bottom = type === 'monitor' ? .76 : .55;
      block(.33, .28, .67, 1, bottom, height * .08, metal);
      block(.45, .20, .55, .31, bottom + height * .08, height * .20, darkMetal);
      block(0, .05, 1, .19, bottom + height * .18, height * .82, darkMetal);
      break;
    }
    case 'appliance':
    case 'fridge':
    case 'washer':
    case 'oven':
    case 'cooker': {
      solid(0, 0, 1, .96, 0, 1);
      if (model === 'fridge') {
        const side = type === 'americanFridge';
        if (side) {
          solid(.012, .96, .491, 1, .025, .975, tint(16));
          solid(.509, .96, .988, 1, .025, .975, tint(12));
        } else {
          solid(.02, .96, .98, 1, .017, .301, tint(11));
          solid(.02, .96, .98, 1, .329, .671, tint(14));
        }
      } else if (model === 'washer') {
        const rim = Array.from({ length: 12 }, (_, index) => {
          const a = index * Math.PI / 6;
          return point(.5 + .29 * Math.cos(a), 1, height * (.45 + .27 * Math.sin(a)));
        });
        face(rim.reverse(), darkMetal);
        solid(.08, .96, .92, 1, .81, .095, tint(18));
      } else {
        solid(.1, .96, .90, 1, .18, .55, model === 'appliance' ? tint(16) : darkMetal);
      }
      solid(.17, .958, .83, 1, .765, .035, metal);
      break;
    }
    case 'cooktop':
      block(0, 0, 1, 1, .845, height, darkMetal);
      for (const [u, v] of [[.25, .25], [.75, .25], [.25, .75], [.75, .75]]) oval(u - .13, v - .13, u + .13, v + .13, .845 + height, .008, color);
      break;
    case 'hood': {
      const bottom = Math.max(.28, Math.min(1.70, levelHeight - height - .12));
      block(0, 0, 1, 1, bottom, height * .35, color);
      block(.30, 0, .70, .52, bottom + height * .35, height * .65, tint(12));
      break;
    }
    case 'sink':
    case 'basin':
    case 'vanity': {
      const fixedSink = model === 'sink';
      const lift = fixedSink ? Math.max(.35, .88 - height) : 0;
      const rise = model === 'basin' ? .28 : 0;
      if (model === 'vanity') chest(Math.max(1, Math.round(width / .5)), 2);
      if (rise) solid(.40, .33, .60, .66, 0, .72, tint(-15));
      const base = lift + height * (fixedSink ? .19 : .78);
      const edging = height * (fixedSink ? .19 : .11);
      block(.04, .04, .96, .96, base, edging, porcelain);
      block(.045, .04, .955, .16, base + edging, edging, porcelain);
      block(.045, .84, .955, .96, base + edging, edging, porcelain);
      block(.045, .16, .14, .84, base + edging, edging, porcelain);
      block(.86, .16, .955, .84, base + edging, edging, porcelain);
      block(.47, .10, .53, .19, base + edging * 2, Math.min(.14, edging * 1.6), metal);
      break;
    }
    case 'ovalBath': {
      oval(.04, .08, .96, .92, 0, height * .38, porcelain);
      const points = Array.from({ length: 16 }, (_, index) => {
        const a = index * Math.PI / 8;
        return [.5 + Math.cos(a) * .5, .5 + Math.sin(a) * .5];
      });
      points.forEach(([u, v], index) => {
        const [a, b] = points[(index + 1) % points.length];
        const inner = (x) => .5 + (x - .5) * .84;
        face([point(u, v, height), point(a, b, height), point(inner(a), inner(b), height), point(inner(u), inner(v), height)], porcelain);
        face([point(u, v, height * .19), point(a, b, height * .19), point(a, b, height), point(u, v, height)], shade(porcelain, index % 2 ? -12 : -22));
        face([point(inner(a), inner(b), height * .38), point(inner(u), inner(v), height * .38), point(inner(u), inner(v), height), point(inner(a), inner(b), height)], shade(porcelain, -17));
      });
      break;
    }
    case 'walkInShower':
      solid(0, 0, 1, 1, 0, .045, porcelain);
      solid(0, 0, .045, .84, .045, .955, glass, .31);
      solid(0, 0, 1, .035, .045, .955, glass, .31);
      solid(.43, .04, .49, .075, .07, .86, metal);
      solid(.40, .07, .52, .18, .915, .043, metal);
      break;
    case 'grabBar':
    case 'towelRail': {
      const lift = Math.min(.83, levelHeight - height);
      for (const u of [.055, .89]) block(u, .08, u + .055, .89, lift, height, metal);
      const rails = model === 'grabBar' ? 1 : 6;
      for (let index = 0; index < rails; index++) {
        block(.10, .38, .90, .66, lift + height * (.12 + .75 * index / rails), Math.min(.04, height * .24), metal);
      }
      break;
    }
    case 'plant':
      oval(.18, .18, .82, .82, 0, height * .34, '#a0866e');
      oval(.45, .45, .55, .55, height * .34, height * .55, wood, 8);
      oval(.06, .12, .64, .67, height * .52, height * .27, leaf, 8);
      oval(.40, .33, .97, .87, height * .71, height * .21, shade(leaf, 10), 8);
      oval(.27, .19, .71, .64, height * .84, height * .16, shade(leaf, 18), 8);
      break;
    case 'basket':
      oval(.06, .06, .94, .94, 0, height, color);
      oval(.11, .11, .89, .89, height, .014, tint(-19));
      break;
    case 'shrub':
      oval(.02, .04, .59, .79, 0, height * .68, color, 9);
      oval(.31, .13, .90, .83, height * .23, height * .77, tint(11), 9);
      oval(.62, .24, .98, .93, 0, height * .74, tint(-18), 9);
      break;
    case 'planter':
      solid(0, 0, 1, 1, 0, .52);
      solid(.04, .08, .96, .92, .52, .03, '#826e5d');
      for (const u of [.18, .5, .82]) oval(u - .13, .17, u + .13, .83, height * .55, height * .42, leaf, 8);
      break;
    case 'lounger':
      legs(.08, .12, .92, .95, 0, height * .44, .062, wood);
      solid(.03, .38, .97, .98, .44, .16);
      solid(.045, .03, .955, .38, .67, .31, tint(15));
      break;
    case 'lamp':
    case 'pendant': {
      const base = model === 'pendant' ? Math.max(0, levelHeight - height - .07) : type === 'tableLamp' ? .74 : 0;
      oval(.19, .19, .81, .81, base, height * .06, metal, 10);
      oval(.46, .46, .54, .54, base + height * .06, height * .82, darkMetal, 8);
      oval(.02, .02, .98, .98, base + height * (model === 'pendant' ? .12 : .78), height * .22, color, 10);
      break;
    }
    case 'parasol': {
      oval(.44, .44, .56, .56, 0, height * .045, darkMetal, 8);
      oval(.487, .487, .513, .513, height * .045, height * .94, wood, 8);
      const ring = Array.from({ length: 8 }, (_, index) => {
        const a = index * Math.PI / 4;
        return point(.5 + .5 * Math.cos(a), .5 + .5 * Math.sin(a), height * .87);
      });
      const apex = point(.5, .5, height);
      ring.forEach((vertex, index) => face([vertex, ring[(index + 1) % ring.length], apex], tint(index % 2 ? -9 : 8)));
      break;
    }
    case 'pergola':
      legs(.01, .01, .99, .99, 0, height * .97, .17, wood);
      solid(0, 0, 1, .075, .88, .09);
      solid(0, .925, 1, 1, .88, .09);
      for (let index = 0; index < 8; index++) solid(index * .136, 0, index * .136 + .048, 1, .945, .055, tint(12));
      break;
    case 'pool':
      solid(0, 0, 1, 1, 0, .24, porcelain);
      solid(.028, .056, .972, .944, .24, .14, '#91bdc5');
      solid(0, 0, 1, .055, .24, .76, porcelain);
      solid(0, .945, 1, 1, .24, .76, porcelain);
      solid(0, .055, .027, .945, .24, .76, porcelain);
      solid(.973, .055, 1, .945, .24, .76, porcelain);
      break;
    case 'bicycle':
      for (const middle of [.20, .80]) {
        const ring = Array.from({ length: 12 }, (_, index) => {
          const a = index * Math.PI / 6;
          return point(.5, middle + .18 * Math.cos(a), height * (.30 + .29 * Math.sin(a)));
        });
        face(ring, darkMetal);
      }
      solid(.42, .16, .58, .81, .27, .074, color);
      solid(.43, .22, .57, .26, .32, .63, metal);
      solid(.24, .21, .76, .27, .93, .07, darkMetal);
      solid(.41, .60, .59, .65, .32, .48, color);
      solid(.32, .52, .68, .67, .81, .045, darkMetal);
      break;
    case 'car':
      for (const left of [.025, .83]) {
        for (const top of [.12, .70]) solid(left, top, left + .145, top + .18, 0, .40, darkMetal);
      }
      solid(.06, 0, .94, 1, .20, .40);
      solid(.18, .25, .82, .71, .60, .33, glass);
      solid(.19, .34, .81, .63, .93, .07, color);
      solid(.15, 0, .35, .035, .48, .078, porcelain);
      solid(.65, 0, .85, .035, .48, .078, porcelain);
      break;
    case 'bbq':
      legs(.10, .12, .90, .92, 0, height * .72, .055, darkMetal);
      solid(.03, .10, .97, .96, .71, .20, metal);
      solid(.20, .19, .80, .85, .91, .09);
      break;
    case 'stand':
    case 'garmentRack':
      if (model === 'stand') {
        oval(.05, .05, .95, .95, 0, .04, darkMetal, 10);
        oval(.44, .44, .56, .56, .04, height - .04, color, 8);
        solid(.12, .45, .88, .55, .81, .045, metal);
        solid(.45, .12, .55, .88, .92, .045, metal);
      } else {
        for (const u of [.07, .88]) {
          solid(u, .04, u + .05, .96, 0, .055, darkMetal);
          solid(u, .43, u + .05, .57, .055, .945, metal);
        }
        solid(.07, .43, .93, .57, .961, .039, color);
      }
      break;
    case 'divider':
      for (let panel = 0; panel < 3; panel++) {
        const left = panel / 3 + .012;
        const top = panel % 2 ? .37 : .15;
        solid(left, top, left + .309, top + .41, 0, 1);
      }
      break;
    case 'rug':
    case 'roundRug':
      tray(0, 0, 1, 1, .08, .92, model === 'roundRug');
      tray(.08, .08, .92, .92, .99, .05, model === 'roundRug', tint(13));
      break;
    case 'turningStair': {
      const stairHeight = item.height ?? levelHeight;
      const count = Math.ceil(stairHeight / .20);
      const split = Math.floor(count / 2);
      for (let index = 0; index < split; index++) {
        block(0, index * .61 / split, .42, (index + 1) * .61 / split, 0, stairHeight * (index + 1) / count);
      }
      block(0, .61, .42, 1, 0, stairHeight * split / count);
      for (let index = split; index < count; index++) {
        block(.42 + (index - split) * .58 / (count - split), .61,
          .42 + (index - split + 1) * .58 / (count - split), 1, 0, stairHeight * (index + 1) / count);
      }
      break;
    }
    case 'spiralStair': {
      const stairHeight = item.height ?? levelHeight;
      const count = Math.ceil(stairHeight / .20);
      oval(.455, .455, .545, .545, 0, stairHeight, metal, 9);
      for (let step = 1; step <= count; step++) {
        const a = step * Math.PI * 2 / count;
        const b = a + Math.PI * 2 / count;
        const z = step * stairHeight / count;
        const radial = (angle, radius, elevation) => point(.5 + Math.cos(angle) * radius, .5 + Math.sin(angle) * radius, elevation);
        face([radial(a, .065, z), radial(a, .49, z), radial(b, .49, z), radial(b, .065, z)], color);
        face([radial(a, .49, z - .06), radial(b, .49, z - .06), radial(b, .49, z), radial(a, .49, z)], tint(-18));
      }
      break;
    }
    case 'glassRail':
      solid(0, .36, 1, .64, .08, .86, glass, .32);
      solid(0, .24, 1, .76, .94, .06, metal);
      for (const x of [.01, .485, .961]) solid(x, .23, x + .028, .77, 0, .97, darkMetal);
      break;
    case 'roundColumn':
    case 'column': {
      const extent = item.height ?? (type === 'outdoorStep' ? profile.height : levelHeight);
      if (model === 'roundColumn') oval(0, 0, 1, 1, 0, extent, color);
      else block(0, 0, 1, 1, 0, extent, color);
      break;
    }
    case 'fireplace':
      solid(0, 0, 1, 1, 0, .18, tint(8));
      solid(.06, 0, .94, .23, .18, .65, darkMetal);
      solid(0, .21, .16, .90, .18, .64);
      solid(.84, .21, 1, .90, .18, .64);
      solid(0, 0, 1, .97, .82, .18);
      break;
    case 'ramp': {
      const a = point(0, 0, height);
      const b = point(1, 0, height);
      const c = point(1, 1, .015);
      const d = point(0, 1, .015);
      face([a, b, c, d], color);
      face([point(0, 0, 0), point(1, 0, 0), b, a], tint(-15));
      face([point(1, 0, 0), point(1, 1, 0), c, b], tint(-24));
      face([point(0, 1, 0), point(0, 0, 0), a, d], tint(-24));
      break;
    }
    case 'turningCircle':
      break;
    default: {
      const geometry = { solid, block, legs, oval, point, face, shade, levelHeight };
      if (!detailFurnitureModel(item, profile, geometry) && !extraFurnitureModel(item, profile, geometry)) solid(0, 0, 1, 1, 0, 1);
    }
  }
}
