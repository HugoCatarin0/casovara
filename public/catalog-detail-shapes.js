const grandPianoFootprint = [[0, 1], [.07, .36], [.18, .09], [.34, 0], [.61, .075], [.87, .29], [.99, .56], [1, 1]];
const mowerFootprint = [[.13, 0], [.87, 0], [.97, .24], [.84, .53], [.69, .57], [.69, 1], [.31, 1], [.31, .57], [.16, .53], [.03, .24]];
const charcoal = '#546166';
const steel = '#82949a';
const pale = '#e3e1d7';
const porcelain = '#e6e9e1';
const ink = '#465356';
const glass = '#8ab1bc';
const wood = '#b9a586';

export function detailFootprint(model) {
  if (model === 'grandPiano') return grandPianoFootprint;
  if (model === 'lawnMower') return mowerFootprint;
  return undefined;
}

export function detailPlanSymbol(item, profile, { rect, ellipse, polygon, line, outer }) {
  const model = profile.model;
  const keyboard = () => rect(.05, .78, .95, .965, pale) + Array.from({ length: 13 }, (_, index) =>
    line([.10 + index * .067, .79], [.10 + index * .067, index % 3 ? .955 : .91])).join('');
  const chassis = () => rect(.05, .05, .95, .92, steel) + rect(.29, .18, .71, .78, charcoal);
  switch (model) {
    case 'piano':
      return outer() + rect(.05, .10, .95, .73, charcoal) + keyboard();
    case 'grandPiano':
      return polygon(grandPianoFootprint) + line([.13, .74], [.26, .23], [.39, .15], [.68, .36], [.79, .58], [.88, .74]) + keyboard();
    case 'treadmill':
      return outer() + rect(.12, .24, .88, .93, charcoal) + rect(.19, .05, .81, .19, steel) +
        line([.10, .17], [.10, .52]) + line([.90, .17], [.90, .52]);
    case 'exerciseBike':
      return chassis() + ellipse(.24, .14, .76, .43, pale) + rect(.28, .55, .72, .78, ink) +
        line([.11, .17], [.08, .11], [.92, .11], [.89, .17]);
    case 'rowingMachine':
      return rect(.32, .09, .68, .94, steel) + ellipse(.06, .04, .94, .29, charcoal) +
        rect(.03, .27, .27, .45, ink) + rect(.73, .27, .97, .45, ink) + rect(.14, .53, .86, .68, ink) +
        line([.12, .95], [.88, .95]);
    case 'weightBench':
      return rect(.28, .03, .72, .96, steel) + rect(.13, .10, .87, .63, charcoal) +
        rect(.13, .66, .87, .94, charcoal) + line([.08, .12], [.92, .12]) + line([.08, .87], [.92, .87]);
    case 'hammock':
      return rect(.05, .11, .95, .89, 'none') + rect(.44, 0, .56, .16, wood) + rect(.44, .84, .56, 1, wood) +
        polygon([[.5, .13], [.14, .33], [.12, .66], [.5, .87], [.88, .66], [.86, .33]], '#c6bf9e') +
        line([.5, .13], [.34, .49], [.5, .87]) + line([.5, .13], [.66, .49], [.5, .87]);
    case 'sauna':
      return outer() + rect(.09, .08, .91, .91, wood, 0) + rect(.15, .13, .84, .41, pale, 0) +
        rect(.15, .42, .36, .82, pale, 0) + rect(.63, .70, .82, .86, charcoal) +
        line([.15, .22], [.84, .22]) + line([.15, .31], [.84, .31]) + line([.253, .44], [.253, .82]) +
        line([.54, .92], [.89, .92]) + line([.54, .92], [.54, .72]);
    case 'motorcycle':
      return rect(.37, 0, .63, .28, charcoal) + rect(.34, .73, .66, 1, charcoal) +
        polygon([[.32, .26], [.71, .26], [.77, .49], [.64, .71], [.63, .83], [.36, .83], [.35, .71], [.24, .49]]) +
        ellipse(.31, .32, .69, .55, steel) + rect(.34, .55, .66, .75, ink) + line([.06, .285], [.94, .285]);
    case 'lawnMower':
      return polygon(mowerFootprint) + ellipse(.20, .09, .80, .50, charcoal) +
        rect(.05, .12, .16, .33, ink) + rect(.84, .12, .95, .33, ink) + line([.34, .95], [.66, .95]) + line([.36, .55], [.36, .94]) + line([.64, .55], [.64, .94]);
    case 'tank':
      return ellipse(0, 0, 1, 1) + ellipse(.12, .12, .88, .88, pale) +
        ellipse(.35, .35, .65, .65, steel) + line([.5, .14], [.5, .26]) + line([.74, .51], [.88, .51]);
    case 'utilityUnit':
      return outer() + rect(.08, .12, .92, .87, steel) + rect(.32, .22, .68, .40, charcoal) +
        line([.23, .54], [.77, .54]) + line([.23, .63], [.77, .63]) + line([.23, .72], [.77, .72]);
    case 'toilet':
      return rect(.13, .02, .87, .28, pale) + ellipse(.045, .13, .955, .99, pale) +
        ellipse(.18, .25, .82, .84, 'none') + ellipse(.43, .50, .57, .63, steel);
    default:
      return undefined;
  }
}

export function detailFurnitureModel(item, profile, { solid, block, legs, oval, point, face, shade, levelHeight }) {
  const { model, color } = profile;
  const height = item.height ?? profile.height;
  const plate = (corners, base, top, tone = color) => {
    const upper = corners.map(([u, v]) => point(u, v, top));
    const lower = corners.map(([u, v]) => point(u, v, base));
    lower.forEach((vertex, index) => {
      const next = (index + 1) % corners.length;
      face([vertex, lower[next], upper[next], upper[index]], shade(tone, index % 2 ? -20 : -11));
    });
    face(upper, tone);
  };
  const wheel = (middle, center, radiusY, radiusZ, width = .12) => {
    for (let segment = 0; segment < 12; segment++) {
      const id = (vertex, u, factor) => {
        const a = vertex * Math.PI / 6;
        return point(u, middle + radiusY * Math.cos(a) * factor, center + radiusZ * Math.sin(a) * factor);
      };
      for (const u of [.5 - width / 2, .5 + width / 2]) {
        const outline = [id(segment, u, 1), id(segment + 1, u, 1), id(segment + 1, u, .72), id(segment, u, .72)];
        face(u > .5 ? outline.reverse() : outline, charcoal);
      }
      face([id(segment, .5 - width / 2, 1), id(segment, .5 + width / 2, 1), id(segment + 1, .5 + width / 2, 1), id(segment + 1, .5 - width / 2, 1)], ink);
    }
  };
  const keyboard = (base) => {
    solid(.02, .730, .98, .985, base, .10, color);
    for (let index = 0; index < 16; index++) {
      const l = .048 + index * .0565;
      solid(l, .76, l + .054, .969, base + .10, .015, pale);
      if (index % 3) solid(l + .034, .759, l + .06, .88, base + .115, .014, ink);
    }
  };
  switch (model) {
    case 'piano':
      solid(.012, 0, .988, .754, 0, .98, color);
      solid(0, 0, 1, .77, .975, .025, shade(color, 12));
      keyboard(.52);
      solid(.08, .75, .14, .90, 0, .52, color);
      solid(.86, .75, .92, .90, 0, .52, color);
      break;
    case 'grandPiano':
      legs(.25, .21, .82, .89, 0, height * .70, .07, ink);
      plate(grandPianoFootprint, height * .70, height, color);
      keyboard(.60);
      break;
    case 'treadmill':
      solid(0, .02, 1, .98, 0, .105, steel);
      solid(.10, .16, .90, .96, .104, .046, ink);
      for (const u of [.04, .87]) solid(u, .10, u + .09, .22, .09, .82, steel);
      solid(.06, .12, .94, .27, .885, .115, charcoal);
      solid(.20, .15, .80, .22, .997, .003, glass);
      break;
    case 'exerciseBike':
      solid(0, .05, 1, .16, 0, .055, steel);
      solid(0, .83, 1, .95, 0, .055, steel);
      solid(.37, .12, .63, .88, .052, .075, charcoal);
      wheel(.34, height * .27, .24, height * .205, .22);
      solid(.43, .335, .57, .685, .35, .12, steel);
      solid(.435, .60, .565, .69, .126, .46, steel);
      solid(.24, .57, .76, .78, .58, .05, charcoal);
      solid(.43, .15, .57, .30, .13, .80, steel);
      solid(.08, .11, .92, .20, .92, .045, ink);
      solid(.30, .17, .70, .29, .95, .05, charcoal);
      break;
    case 'rowingMachine':
      solid(.32, .10, .68, .96, .064, .085, steel);
      solid(.06, .054, .94, .13, 0, .11, steel);
      solid(.06, .89, .94, .97, 0, .11, steel);
      oval(.05, .03, .95, .30, height * .11, height * .37, charcoal);
      solid(.14, .53, .86, .66, .151, .091, charcoal);
      solid(.09, .29, .91, .43, .142, .14, ink);
      solid(.43, .28, .57, .34, .32, .63, steel);
      solid(.25, .25, .75, .38, .94, .06, charcoal);
      break;
    case 'weightBench':
      legs(.12, .12, .88, .89, 0, height * .77, .071, steel);
      solid(.26, .13, .74, .88, .72, .09, ink);
      solid(.08, .09, .92, .61, .79, .21, charcoal);
      solid(.09, .64, .91, .96, .79, .14, charcoal);
      break;
    case 'hammock': {
      for (const v of [.07, .86]) solid(.09, v, .91, v + .07, 0, .065, steel);
      for (const v of [.089, .867]) solid(.44, v, .56, v + .046, .05, .95, steel);
      const hammock = [[.5, .13, .95], [.16, .31, .62], [.12, .52, .42], [.14, .69, .62], [.5, .89, .95], [.86, .69, .62], [.88, .52, .42], [.84, .31, .62]];
      const center = point(.5, .5, height * .34);
      hammock.forEach(([u, v, z], index) => {
        const [a, b, c] = hammock[(index + 1) % hammock.length];
        face([point(u, v, z * height), point(a, b, c * height), center], shade(color, index % 2 ? 12 : 0));
      });
      break;
    }
    case 'sauna':
      solid(0, 0, 1, 1, 0, .04, wood);
      solid(0, 0, 1, .09, .04, .96, color);
      solid(0, .09, .09, .97, .04, .96, color);
      solid(.91, .09, 1, .97, .04, .96, color);
      solid(.09, .14, .91, .39, .23, .073, wood);
      solid(.09, .14, .35, .86, .48, .067, wood);
      solid(.09, .93, .41, .99, .04, .96, color);
      solid(.42, .94, .91, .974, .04, .95, glass, .33);
      solid(.45, .966, .51, 1, .42, .07, steel);
      solid(.65, .64, .86, .85, .04, .28, charcoal);
      break;
    case 'motorcycle':
      wheel(.145, height * .31, .14, height * .31, .13);
      wheel(.85, height * .31, .15, height * .31, .19);
      solid(.36, .19, .64, .82, .275, .225, steel);
      solid(.31, .28, .69, .57, .46, .28);
      solid(.30, .57, .70, .77, .58, .085, ink);
      solid(.43, .20, .57, .31, .50, .44, steel);
      solid(.06, .25, .94, .32, .95, .05, ink);
      break;
    case 'lawnMower':
      for (const y of [.23, .48]) {
        solid(.03, y - .10, .15, y + .06, 0, .16, charcoal);
        solid(.85, y - .10, .97, y + .06, 0, .16, charcoal);
      }
      solid(.09, .04, .91, .55, .06, .17);
      solid(.24, .13, .76, .45, .23, .21, charcoal);
      for (const x of [.31, .65]) solid(x, .50, x + .04, .93, .10, .83, steel);
      solid(.31, .92, .69, .99, .93, .07, ink);
      break;
    case 'tank':
      oval(.30, .30, .70, .70, 0, height * .16, steel, 10);
      oval(0, 0, 1, 1, height * .06, height * .86, color, 12);
      oval(.08, .08, .92, .92, height * .91, height * .06, shade(color, 16), 12);
      oval(.4, .4, .6, .6, height * .97, height * .03, charcoal, 8);
      break;
    case 'utilityUnit': {
      const base = ['gasBoiler', 'electricalPanel', 'heatingManifold'].includes(item.type) ? Math.min(.94, Math.max(0, levelHeight - height)) : 0;
      block(.02, 0, .98, .93, base, height, color);
      block(.07, .92, .93, .985, base + height * .16, height * .76, shade(color, 16));
      block(.39, .984, .64, 1, base + height * .64, height * .18, charcoal);
      for (const v of [.26, .34, .42]) block(.12, .986, .67, 1, base + height * v, height * .02, steel);
      break;
    }
    case 'toilet':
      solid(.17, 0, .83, .28, .36, .64, porcelain);
      oval(.025, .13, .975, 1, height * .52, height * .48, porcelain, 12);
      oval(.17, .24, .83, .88, height, .012, '#c9d6cf', 10);
      break;
    default:
      return false;
  }
  return true;
}
