import { detailFootprint, detailPlanSymbol } from './catalog-detail-shapes.js';
import { extraFootprint, extraPlanSymbol } from './object-extra-shapes.js';

const rectangle = [[0, 0], [1, 0], [1, 1], [0, 1]];
const corner = [[0, 0], [1, 0], [1, .48], [.36, .48], [.36, 1], [0, 1]];
const deskCorner = [[0, 0], [1, 0], [1, .48], [.45, .48], [.45, 1], [0, 1]];
const stairsCorner = [[0, 0], [.42, 0], [.42, .61], [1, .61], [1, 1], [0, 1]];

const circle = Array.from({ length: 24 }, (_, index) => {
  const angle = index * Math.PI / 12;
  return [.5 + .5 * Math.cos(angle), .5 + .5 * Math.sin(angle)];
});

const roundModels = new Set(['roundTable', 'roundRug', 'roundColumn', 'lamp', 'pendant', 'plant', 'parasol', 'spiralStair', 'turningCircle', 'tank', 'ovalBath', 'shrub', 'stool']);

function pointsFor(model) {
  if (model === 'sectionalLeft') return corner;
  if (model === 'sectionalRight') return corner.map(([x, y]) => [1 - x, y]).reverse();
  if (model === 'cornerDesk') return deskCorner;
  if (model === 'turningStair') return stairsCorner;
  return roundModels.has(model) ? circle : detailFootprint(model) ?? extraFootprint(model) ?? rectangle;
}

export function objectFootprint({ width, depth }, { model }) {
  return pointsFor(model).map(([x, y]) => [(x - .5) * width, (y - .5) * depth]);
}

const light = '#e9e1d2';
const frame = '#7b6957';
const fabric = '#b6c2b0';
const metal = '#8598a4';
const glass = '#c4dde4';
const porcelain = '#e4eeeb';
const soil = '#9c8970';
const leaf = '#8ea480';

// All drawing coordinates describe the measured object envelope. Renderers apply its rotation and placement.
export function furniturePlanSymbol(item, profile, { stroke = '#526676', technical = true } = {}) {
  const { width, depth, type } = item;
  const { model, color } = profile;
  const x = (relative) => (relative - .5) * width;
  const y = (relative) => (relative - .5) * depth;
  const fill = (paint) => technical && paint[0] === '#' ? paint + '76' : paint;
  const outline = `stroke="${stroke}" stroke-width=".023" stroke-linejoin="round"`;
  const rect = (l, t, r, b, paint = color, rounding = .03) =>
    `<rect x="${x(l)}" y="${y(t)}" width="${(r - l) * width}" height="${(b - t) * depth}" rx="${rounding}" fill="${fill(paint)}" ${outline}/>`;
  const ellipse = (l, t, r, b, paint = color) =>
    `<ellipse cx="${x((l + r) / 2)}" cy="${y((t + b) / 2)}" rx="${(r - l) * width / 2}" ry="${(b - t) * depth / 2}" fill="${fill(paint)}" ${outline}/>`;
  const positions = (points) => points.map(([u, v]) => `${x(u)},${y(v)}`).join(' ');
  const polygon = (points, paint = color) => `<polygon points="${positions(points)}" fill="${fill(paint)}" ${outline}/>`;
  const line = (...points) => `<polyline points="${positions(points)}" fill="none" ${outline}/>`;
  const outer = () => rect(0, 0, 1, 1);
  const circular = () => ellipse(0, 0, 1, 1);
  const slats = (count, across = false) => Array.from({ length: count }, (_, index) => {
    const ratio = (index + 1) / (count + 1);
    return across ? line([.065, ratio], [.935, ratio]) : line([ratio, .065], [ratio, .935]);
  }).join('');
  const basin = (l, r, t = .21, b = .83) => (
    ellipse(l, t, r, b, porcelain) +
    ellipse(l + (r - l) * .44, t + (b - t) * .48, r - (r - l) * .44, t + (b - t) * .64, metal) +
    line([(l + r) / 2, t - .07], [(l + r) / 2, t + .09])
  );
  const burners = () => [[.27, .28], [.71, .28], [.27, .70], [.71, .70]].map(([u, v]) =>
    ellipse(u - .14, v - .14, u + .14, v + .14, 'none')).join('');
  switch (model) {
    case 'sectionalLeft':
    case 'sectionalRight': {
      const front = model === 'sectionalLeft' ? .36 : .64;
      const origin = model === 'sectionalLeft' ? .055 : .695;
      const seat = model === 'sectionalLeft' ? .055 : .655;
      return polygon(pointsFor(model)) + rect(.055, .05, .945, .152, frame) +
        rect(seat, .158, model === 'sectionalLeft' ? .345 : .945, .945, fabric) +
        rect(model === 'sectionalLeft' ? .375 : .055, .163, model === 'sectionalLeft' ? .945 : .625, .435, fabric) +
        line([(origin + front) / 2, .164], [(origin + front) / 2, .435]) +
        line([model === 'sectionalLeft' ? .64 : .35, .163], [model === 'sectionalLeft' ? .64 : .35, .435]);
    }
    case 'sofa':
    case 'chaise':
      return outer() + rect(.055, .055, .945, .235, frame) +
        rect(.12, .25, .88, .94, fabric, .07) + (model === 'sofa' ? line([.5, .25], [.5, .94]) : rect(.06, .28, .22, .89, fabric, .075));
    case 'chair':
    case 'recliner':
    case 'officeChair':
    case 'wheelchair':
    case 'highChair': {
      const rugged = ['wheelchair', 'officeChair', 'highChair'].includes(model);
      return rect(.12, .05, .88, .92, color, .08) + rect(.14, .03, .86, .20, frame, .055) +
        rect(.17, .26, .83, model === 'recliner' ? .67 : .86, rugged ? metal : light, .06) +
        (rugged ? rect(0, .22, .11, .77, color) + rect(.89, .22, 1, .77, color) : '') +
        (model === 'recliner' || model === 'wheelchair' ? rect(.18, .74, .82, .99, light) : '');
    }
    case 'ottoman':
      return rect(0, 0, 1, 1, color, .13) + rect(.13, .13, .87, .87, 'none', .10);
    case 'stool':
      return circular() + ellipse(.11, .11, .89, .89, light);
    case 'roundTable':
      return circular() + ellipse(.055, .055, .945, .945, 'none');
    case 'extendTable':
      return outer() + line([.34, 0], [.34, 1]) + line([.66, 0], [.66, 1]);
    case 'slatTable':
    case 'bench':
      return outer() + slats(5, true);
    case 'table':
      return outer() + rect(.035, .09, .965, .91, 'none');
    case 'bed':
    case 'bunk': {
      const main = outer() + rect(.04, .025, .96, .14, frame) + rect(.06, .36, .94, .95, fabric) +
        (width >= 1.3 ? rect(.10, .17, .46, .32, light) + rect(.54, .17, .90, .32, light) : rect(.12, .17, .88, .32, light));
      return main + (model === 'bunk' ? rect(.77, .54, .96, .96, 'none') + line([.79, .69], [.95, .69]) + line([.79, .81], [.95, .81]) : '');
    }
    case 'crib':
      return outer() + rect(.12, .08, .88, .92, light) +
        [ .24, .39, .54, .69, .84 ].map((v) => line([0, v], [.12, v]) + line([.88, v], [1, v])).join('');
    case 'wardrobe':
    case 'dresser':
    case 'kitchenCabinet':
    case 'displayCabinet':
    case 'wallCabinet':
    case 'shelf':
    case 'cubes':
    case 'wallShelf': {
      const glazed = model === 'displayCabinet';
      const open = ['cubes', 'shelf', 'wallShelf'].includes(model);
      const count = Math.min(4, Math.max(1, Math.round(width / .52)));
      let symbol = outer() + rect(.035, .07, .965, .85, glazed ? glass : open ? 'none' : light);
      for (let index = 1; index < count; index++) symbol += line([index / count, .07], [index / count, .85]);
      if (!open) {
        for (let index = 0; index < count; index++) symbol += line([(index + .43) / count, .93], [(index + .57) / count, .93]);
      }
      return symbol;
    }
    case 'stand':
      return ellipse(.1, .1, .9, .9, 'none') + ellipse(.44, .44, .56, .56, frame) + line([.21, .18], [.79, .82]) + line([.79, .18], [.21, .82]);
    case 'garmentRack':
      return rect(.02, .05, .98, .95, 'none') + line([.05, .5], [.95, .5]) + slats(4);
    case 'desk':
    case 'cornerDesk':
      return polygon(pointsFor(model)) + rect(.25, .12, .74, .23, metal) + rect(.35, .28, .65, .41, light, .02);
    case 'screen':
      return rect(.02, .07, .98, .23, metal) + rect(.39, .24, .61, .91, color);
    case 'laptop':
      return rect(.03, .04, .97, .18, metal) + rect(.03, .18, .97, .96, light) + rect(.12, .24, .88, .60, color) + rect(.39, .66, .63, .87, 'none');
    case 'fridge':
    case 'appliance':
    case 'oven':
    case 'washer':
      return outer() + rect(.06, .09, .94, .80, light) + line([.10, .87], [.90, .87]) +
        (model === 'washer' ? ellipse(.23, .25, .77, .69, metal) : rect(.66, .86, .93, .96, metal));
    case 'hood':
      return polygon([[.08, 0], [.92, 0], [1, 1], [0, 1]]) + rect(.24, .12, .76, .29, light) + line([.12, .83], [.88, .83]);
    case 'cooktop':
    case 'cooker':
      return outer() + burners();
    case 'sink':
    case 'basin':
    case 'vanity':
      return outer() + (type === 'doubleVanity' ? basin(.06, .45) + basin(.55, .94) : basin(.09, .91));
    case 'ovalBath':
      return circular() + ellipse(.065, .14, .935, .86, porcelain) + ellipse(.75, .46, .82, .54, metal);
    case 'walkInShower':
      return rect(0, 0, 1, 1, porcelain) + rect(.04, .04, .96, .94, 'none') +
        rect(0, 0, 1, .055, glass) + rect(0, 0, .04, .71, glass) + ellipse(.69, .45, .78, .55, metal);
    case 'towelRail':
    case 'grabBar':
      return rect(.06, .27, .94, .73, metal, .026) + ellipse(.02, .13, .13, .87, light) + ellipse(.87, .13, .98, .87, light);
    case 'trolley':
      return outer() + rect(.09, .12, .91, .88, 'none') + ellipse(.04, .075, .17, .21, metal) + ellipse(.83, .79, .96, .925, metal);
    case 'basket':
      return rect(0, 0, 1, 1, soil, .11) + rect(.12, .12, .88, .88, 'none', .08) + slats(6);
    case 'divider':
      return polygon([[0, .27], [.33, .06], [.65, .61], [.98, .35], [1, .65], [.65, .94], [.33, .39], [.02, .61]]);
    case 'shrub':
      return circular() + ellipse(.08, .39, .55, .92, leaf) + ellipse(.39, .1, .88, .69, leaf) + ellipse(.47, .51, .94, .93, leaf);
    case 'plant':
      return circular() + ellipse(.16, .38, .62, .87, leaf) + ellipse(.31, .08, .74, .58, leaf) + ellipse(.47, .40, .87, .81, leaf);
    case 'planter':
      return outer() + rect(.073, .16, .927, .84, soil) +
        [ .21, .50, .79 ].map((u) => ellipse(u - .115, .23, u + .115, .77, leaf)).join('');
    case 'lounger':
      return outer() + rect(.09, .06, .91, .93, light) + line([.09, .40], [.91, .40]);
    case 'parasol':
    case 'spiralStair':
      return circular() + circle.filter((_, index) => index % (model === 'spiralStair' ? 2 : 3) === 0)
        .map((endpoint) => line([.50, .50], endpoint)).join('') + ellipse(.43, .43, .57, .57, frame);
    case 'pergola':
      return rect(0, 0, 1, 1, 'none') + slats(7) + rect(0, 0, .07, .07, frame) + rect(.93, 0, 1, .07, frame) + rect(0, .93, .07, 1, frame) + rect(.93, .93, 1, 1, frame);
    case 'pool':
      return rect(0, 0, 1, 1, light, .10) + rect(.028, .056, .972, .944, glass, .08) + rect(.03, .06, .22, .44, 'none') +
        line([.07, .06], [.07, .44]) + line([.12, .06], [.12, .44]) + line([.17, .06], [.17, .44]);
    case 'bbq':
      return outer() + rect(.10, .14, .90, .85, metal) + slats(6, true);
    case 'bicycle':
      return rect(.37, .02, .63, .26, metal) + rect(.37, .75, .63, .98, metal) + line([.5, .14], [.5, .86]) +
        rect(.24, .22, .76, .27, frame) + rect(.30, .46, .70, .55, frame);
    case 'car':
      return rect(.07, 0, .93, 1, color, .2) + polygon([[.24, .25], [.76, .25], [.86, .68], [.14, .68]], glass) +
        rect(.22, .39, .78, .61, color) + rect(.17, .06, .35, .11, porcelain) + rect(.65, .06, .83, .11, porcelain);
    case 'rug':
      return outer() + rect(.06, .044, .94, .956, 'none') + rect(.10, .075, .90, .925, 'none');
    case 'roundRug':
      return circular() + ellipse(.075, .075, .925, .925, 'none');
    case 'lamp':
    case 'pendant':
      return circular() + ellipse(.18, .18, .82, .82, light) + ellipse(.42, .42, .58, .58, frame);
    case 'mirror':
    case 'painting':
      return rect(0, 0, 1, 1, model === 'mirror' ? glass : light) + line([.08, .50], [.92, .50]);
    case 'turningStair':
      return polygon(pointsFor(model)) +
        [.12, .24, .36, .48].map((v) => line([0, v], [.42, v])).join('') +
        [.52, .64, .76, .88].map((u) => line([u, .61], [u, 1])).join('') +
        line([.21, .12], [.21, .81], [.88, .81], [.79, .72], [.88, .81], [.79, .90]);
    case 'glassRail':
      return rect(0, .26, 1, .74, glass) + [ .04, .50, .96 ].map((u) => ellipse(u - .038, .17, u + .038, .83, metal)).join('');
    case 'roundColumn':
      return circular();
    case 'column':
      return outer() + line([.14, .14], [.86, .86]) + line([.86, .14], [.14, .86]);
    case 'fireplace':
      return outer() + rect(.10, .22, .90, .87, frame) + rect(.19, .29, .81, .78, soil);
    case 'ramp':
      return outer() + line([.5, .89], [.5, .13], [.37, .28], [.5, .13], [.63, .28]);
    case 'turningCircle':
      return `<ellipse cx="0" cy="0" rx="${width * .5}" ry="${depth * .5}" fill="none" ${outline} stroke-dasharray=".06 .06"/>` +
        line([.43, .50], [.57, .50]) + line([.50, .43], [.50, .57]);
    default: {
      const drawing = { rect, ellipse, polygon, line, outer, circular, slats };
      return detailPlanSymbol(item, profile, drawing) ?? extraPlanSymbol(item, profile, drawing) ?? outer();
    }
  }
}
