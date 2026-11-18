const metal = '#899ca0';
const darkMetal = '#53676e';
const paleWood = '#c8b395';
const darkWood = '#887258';
const glass = '#81acbb';
const porcelain = '#edf1ee';

const corner = [[0, 0], [1, 0], [1, .52], [.52, 1], [0, 1]];
const basinCorner = [[0, 0], [1, 0], ...Array.from({ length: 11 }, (_, index) => {
  const theta = (index + 1) * Math.PI / 24;
  return [Math.cos(theta), Math.sin(theta)];
}), [0, 1]];
const ellipsePoints = Array.from({ length: 20 }, (_, index) => {
  const angle = index * Math.PI / 10;
  return [.5 + .5 * Math.cos(angle), .5 + .5 * Math.sin(angle)];
});
const inset = (points, factor, center = .5) => points.map(([x, y]) => [center + (x - center) * factor, center + (y - center) * factor]);
const footprints = { cornerCabinet: corner, cornerBath: basinCorner, quadrantShower: basinCorner, firePit: ellipsePoints, beanBag: ellipsePoints };

export function extraFootprint(model) {
  return Object.hasOwn(footprints, model) ? footprints[model] : undefined;
}

export function extraPlanSymbol(item, profile, { rect, ellipse, polygon, line, outer, circular }) {
  const { model, color } = profile;
  switch (model) {
    case 'cornerCabinet':
      return polygon(corner) + polygon(inset(corner, .88), 'none') + line([.749, .749], [.66, .66]) +
        line([.82, .63], [.88, .575]) + line([.63, .82], [.575, .88]);
    case 'quadrantShower':
    case 'cornerBath': {
      const bath = model === 'cornerBath';
      const lip = bath ? .76 : .91;
      return polygon(basinCorner, porcelain) + polygon(inset(basinCorner, lip, .36), '#c5dee0') +
        ellipse(.40, .40, .46, .46, metal) + line([.17, .09], [.17, bath ? .19 : .125]);
    }
    case 'kitchenRun':
      return outer() + rect(.025, .05, .975, .51, paleWood, 0) +
        line([.36, .05], [.36, .51]) + line([.68, .05], [.68, .51]) +
        rect(.10, .56, .34, .90, '#bcd1d0', .018) + ellipse(.19, .68, .23, .76, metal) +
        line([.41, .54], [.41, 1]) + line([.68, .54], [.68, 1]);
    case 'bridgeWardrobe': {
      const side = item.type === 'washerCabinet' ? .085 : .245;
      return outer() + rect(.025, .05, side, .96, paleWood) + rect(1 - side, .05, .975, .96, paleWood) +
        rect(side, .045, 1 - side, .49, 'none') + line([side, .12], [1 - side, .12]);
    }
    case 'underStairs':
      return outer() + [ .25, .50, .75 ].map((x) => line([x, .035], [x, .94])).join('') +
        [ .12, .37, .62, .87 ].map((x) => line([x - .04, .85], [x + .04, .85])).join('');
    case 'ladderShelf':
      return polygon([[.09, 0], [.91, 0], [1, 1], [0, 1]]) + rect(.10, .12, .90, .93, 'none') +
        [.24, .47, .71].map((y) => line([.10, y], [.90, y])).join('');
    case 'laundryTower':
      return outer() + rect(.07, .08, .93, .78, porcelain) +
        rect(.10, .80, .90, .93, metal, .012) + ellipse(.15, .825, .22, .905, porcelain) +
        line([.78, .835], [.86, .835]) + line([.78, .886], [.86, .886]);
    case 'dryingRack':
      return rect(.02, .055, .98, .945, 'none') + [.24, .50, .76].map((x) => line([x, .055], [x, .945])).join('') +
        [.19, .32, .45, .58, .71, .84].map((y) => line([.02, y], [.98, y])).join('');
    case 'ironingBoard':
      return polygon([[0, .12], [.70, .12], [.88, .25], [1, .50], [.88, .75], [.70, .88], [0, .88]]) +
        line([.13, .22], [.13, .78]) + ellipse(.17, .26, .91, .74, 'none');
    case 'picnicTable':
      return rect(.025, .025, .975, .21, paleWood, .016) + rect(.025, .79, .975, .975, paleWood, .016) + rect(0, .30, 1, .70, color, .025) +
        [.395, .50, .605].map((y) => line([.025, y], [.975, y])).join('');
    case 'gardenSwing':
      return rect(.08, .14, .92, .84, 'none') + rect(.13, .31, .87, .71, paleWood, .035) +
        rect(.16, .29, .84, .395, color) + line([.07, .50], [.93, .50]) +
        [.085, .915].flatMap((x) => [.17, .84].map((y) => ellipse(x - .035, y - .048, x + .035, y + .048, metal))).join('');
    case 'firePit':
      return circular() + ellipse(.11, .11, .89, .89, darkMetal) + ellipse(.20, .20, .80, .80, '#9f7864') +
        polygon([[.35, .69], [.35, .54], [.47, .49], [.44, .32], [.59, .44], [.67, .60], [.62, .72]], '#d39a75');
    case 'mediaUnit':
      return outer() + rect(.04, .08, .28, .94, paleWood) + rect(.72, .08, .96, .94, paleWood) +
        rect(.30, .09, .70, .35, darkMetal, .015) + rect(.45, .35, .55, .48, metal, .01) + line([.30, .70], [.70, .70]);
    case 'aquarium':
      return outer() + rect(.035, .07, .965, .91, '#a8d2da', .018) + polygon([[.24, .28], [.38, .40], [.48, .34], [.48, .53], [.37, .47], [.24, .59]], '#ab957b') +
        ellipse(.66, .38, .80, .69, '#81967a') + ellipse(.78, .17, .86, .29, 'none');
    case 'canopyBed':
      return outer() + rect(.10, .08, .90, .96, paleWood) + rect(.12, .32, .88, .94, '#c1b5aa') +
        rect(.13, .12, .45, .29, porcelain) + (item.width >= 1.25 ? rect(.55, .12, .87, .29, porcelain) : '') +
        [ .02, .90 ].flatMap((x) => [ .02, .90 ].map((y) => rect(x, y, x + .08, y + .08, darkWood, .008))).join('');
    case 'playpen':
      return outer() + rect(.09, .09, .91, .91, '#e3ded0') +
        [.22, .41, .60, .79].map((x) => line([x, 0], [x, .09]) + line([x, .91], [x, 1]) + line([0, x], [.09, x]) + line([.91, x], [1, x])).join('');
    case 'hallTree':
      return outer() + rect(.045, .14, .955, .91, paleWood) + rect(.075, .035, .925, .19, metal) +
        [.25, .42, .58, .75].map((x) => line([x, .15], [x, .28])).join('');
    case 'arcLamp':
      return ellipse(.13, .02, .87, .21, metal) + line([.50, .12], [.50, .80]) + ellipse(.02, .72, .98, 1, '#d9c9a8');
    case 'poolTable':
      return rect(0, 0, 1, 1, paleWood, .07) + rect(.065, .11, .935, .89, '#85a387', .04) +
        [ .065, .50, .935 ].flatMap((x) => [ .11, .89 ].map((y) => ellipse(x - .019, y - .027, x + .019, y + .027, darkMetal))).join('');
    case 'catTree':
      return outer() + rect(.07, .19, .48, .83, paleWood) + ellipse(.37, .05, .94, .60, color) + ellipse(.64, .72, .81, .92, darkWood);
    case 'beanBag':
      return circular() + ellipse(.10, .12, .90, .89, 'none') + line([.34, .23], [.64, .23]);
    case 'nestingTables':
      return ellipse(0, 0, .68, .96, color) + ellipse(.48, .26, 1, 1, paleWood);
    case 'hangingChair':
      return ellipse(.08, .02, .92, .61, 'none') + ellipse(.14, .25, .86, .97, paleWood) + ellipse(.26, .37, .74, .84, color) + line([.5, .08], [.5, .25]);
    default:
      return undefined;
  }
}

export function extraFurnitureModel(item, profile, { solid, block, legs, oval, point, face, shade, levelHeight }) {
  const { model, color } = profile;
  const height = item.height ?? profile.height;
  const ring = (l, t, r, b, z, size, material = color) => oval(l, t, r, b, z * height, size * height, material);
  const panel = (coordinates, z, paint, opacity = 1) => face(coordinates.map(([x, y]) => point(x, y, z)), paint, opacity);
  function outlineWalls(points, bottom, top, paint) {
    for (let index = 0; index < points.length; index++) {
      const [u, v] = points[index];
      const [x, y] = points[(index + 1) % points.length];
      face([point(u, v, bottom), point(x, y, bottom), point(x, y, top), point(u, v, top)], shade(paint, index % 2 ? -16 : -24));
    }
  }
  function beam(start, end, paint = darkWood, thickness = .025) {
    const [u, v, z] = start;
    const [x, y, top] = end;
    const a = Math.min(.12, thickness / item.width / 2);
    const b = Math.min(.12, thickness / item.depth / 2);
    const low = [[u - a, v - b], [u + a, v - b], [u + a, v + b], [u - a, v + b]];
    const high = [[x - a, y - b], [x + a, y - b], [x + a, y + b], [x - a, y + b]];
    for (let index = 0; index < 4; index++) {
      const next = (index + 1) % 4;
      face([point(...low[index], z), point(...low[next], z), point(...high[next], top), point(...high[index], top)], shade(paint, index % 2 ? -16 : 0));
    }
    panel(high, top, paint);
  }

  switch (model) {
    case 'cornerCabinet': {
      const lift = item.type === 'cornerWallCabinet' ? Math.max(.25, Math.min(1.48, levelHeight - height - .10)) : 0;
      if (item.type === 'cornerShelf') {
        block(0, 0, .055, 1, lift, height);
        block(.055, 0, 1, .055, lift, height);
        for (const fraction of [.06, .25, .47, .70, .975]) {
          const base = lift + fraction * height;
          outlineWalls(corner, base - Math.min(.025, height * .035), base, color);
          panel(corner, base, shade(color, 14));
        }
      } else {
        outlineWalls(corner, lift, lift + height, color);
        panel(corner, lift + height, shade(color, 13));
        block(.778, .749, .799, .778, lift + height * .58, height * .17, darkMetal);
      }
      break;
    }
    case 'quadrantShower':
    case 'cornerBath': {
      const bath = model === 'cornerBath';
      const base = height * (bath ? .27 : .49);
      const rim = height - (bath ? Math.min(.045, height * .08) : 0);
      const inner = inset(basinCorner, bath ? .76 : .91, .36);
      outlineWalls(basinCorner, 0, rim, porcelain);
      outlineWalls(inner, base, rim, '#d0dddd');
      panel(inner, base, '#dce9e8');
      basinCorner.forEach(([u, v], index) => {
        const next = (index + 1) % basinCorner.length;
        panel([[u, v], basinCorner[next], inner[next], inner[index]], rim, porcelain);
      });
      oval(.402, .403, .458, .457, base + .001, .003, darkMetal, 10);
      if (bath) block(.14, .045, .20, .15, rim, height - rim, metal);
      break;
    }
    case 'kitchenRun': {
      const worktop = Math.min(.91, height * .44);
      const upper = height * .63;
      const kick = Math.min(.04, worktop * .08);
      const slab = Math.min(.03, worktop * .08);
      const sink = Math.min(.009, height * .008);
      block(0, .04, 1, .975, kick, worktop - slab - kick, color);
      block(0, 0, 1, 1, worktop - slab, slab, '#d5c7b6');
      block(.12, .18, .35, .68, worktop, sink, '#91adb0');
      block(.155, .20, .318, .64, worktop + sink, sink * .45, '#637f85');
      block(.223, .10, .246, .23, worktop, Math.min(.11, height * .10), darkMetal);
      for (const [l, r] of [[.013, .331], [.341, .662], [.674, .985]]) {
        block(l, .978, r, 1, kick * 2, worktop - slab * 2 - kick * 2, shade(color, 9));
        block(l, .02, r, .54, upper, height - upper, shade(color, 12));
        block(l + .03, .54, l + .10, .57, upper + Math.min(.06, height * .07), Math.min(.018, height * .024), darkMetal);
      }
      break;
    }
    case 'bridgeWardrobe': {
      const narrow = item.type === 'washerCabinet';
      const size = narrow ? .08 : .25;
      const upper = narrow ? .64 : .76;
      for (const left of [0, 1 - size]) solid(left, 0, left + size, 1, 0, 1);
      solid(size, 0, 1 - size, .97, upper, 1 - upper, shade(color, 8));
      solid(.03, .98, .13, 1, .70, .062, darkMetal);
      if (!narrow) solid(.86, .98, .96, 1, .70, .062, darkMetal);
      break;
    }
    case 'underStairs':
      for (let index = 0; index < 4; index++) {
        const left = index / 4;
        const rise = 1 - index * .20;
        solid(left, 0, left + .245, 1, 0, rise, shade(color, index * 4));
        solid(left + .145, .978, left + .212, 1, rise * .78, .04, darkMetal);
      }
      break;
    case 'ladderShelf':
      for (const u of [.06, .94]) beam([u, .92, 0], [u, .06, height], darkWood, .055);
      for (let row = 0; row < 5; row++) {
        solid(.02, .04, .98, .97 - row * .132, .08 + row * .218, .045, shade(color, 11));
      }
      break;
    case 'laundryTower': {
      for (const z of [0, .506]) {
        solid(.03, .03, .97, .972, z, .49, porcelain);
        solid(.055, .972, .945, 1, z + .398, .085, metal);
        for (const [radius, paint] of [[.29, darkMetal], [.234, glass]]) {
          const door = ellipsePoints.map(([u, v]) => point(.50 + (u - .5) * radius * 2, paint === glass ? 1 : .999, (z + .205 + (v - .5) * radius * .65) * height));
          face(door, paint);
        }
      }
      break;
    }
    case 'dryingRack':
      for (const u of [.25, .75]) {
        beam([u, .16, 0], [u, .92, height * .96], metal, .026);
        beam([u, .84, 0], [u, .08, height * .96], darkMetal, .026);
      }
      for (let index = 0; index < 7; index++) {
        const v = .08 + index * .14;
        solid(.015, v, .985, v + .021, .963, .026, metal);
      }
      for (const u of [.02, .96]) solid(u, .075, u + .02, .95, .963, .035, darkMetal);
      break;
    case 'ironingBoard': {
      const top = [[0, .12], [.70, .12], [.88, .25], [1, .50], [.88, .75], [.70, .88], [0, .88]];
      for (const v of [.24, .76]) {
        beam([.25, v, 0], [.76, v, height * .95], metal, .037);
        beam([.70, v, 0], [.27, v, height * .95], metal, .037);
      }
      outlineWalls(top, height * .955, height, color);
      panel(top, height, color);
      break;
    }
    case 'picnicTable':
      for (const u of [.18, .82]) {
        beam([u, .11, 0], [u, .65, height * .94], darkWood, .066);
        beam([u, .89, 0], [u, .35, height * .94], darkWood, .066);
        solid(u - .03, .06, u + .03, .94, .51, .071, shade(paleWood, -13));
      }
      for (const v of [.025, .795]) solid(.02, v, .98, v + .18, .586, .06, shade(color, 5));
      for (let index = 0; index < 4; index++) solid(0, .30 + index * .102, 1, .392 + index * .102, .935, .065, shade(color, index * 4));
      break;
    case 'gardenSwing':
      for (const u of [.10, .90]) {
        beam([u, .10, 0], [u, .50, height * .97], darkWood, .068);
        beam([u, .90, 0], [u, .50, height * .97], darkWood, .068);
      }
      solid(.035, .465, .965, .54, .945, .055, darkWood);
      for (const u of [.15, .85]) beam([u, .52, height * .94], [u, .54, height * .28], metal, .018);
      solid(.12, .31, .88, .72, .265, .065, paleWood);
      solid(.12, .30, .88, .38, .33, .21, shade(color, 14));
      break;
    case 'firePit': {
      const inside = inset(ellipsePoints, .79);
      ring(.17, .17, .83, .83, 0, .27, darkMetal);
      ring(.05, .05, .95, .95, .27, .28, color);
      outlineWalls(ellipsePoints, height * .55, height, color);
      outlineWalls(inside, height * .55, height, darkMetal);
      ellipsePoints.forEach((pointAtEdge, index) => {
        const next = (index + 1) % ellipsePoints.length;
        panel([pointAtEdge, ellipsePoints[next], inside[next], inside[index]], height, shade(color, 10));
      });
      solid(.30, .35, .69, .49, .56, .11, darkWood);
      solid(.38, .43, .51, .71, .62, .10, shade(darkWood, 9));
      break;
    }
    case 'mediaUnit':
      solid(0, 0, 1, .99, 0, .22, color);
      for (const [l, r] of [[.02, .275], [.725, .98]]) {
        solid(l, 0, r, .09, .22, .78, shade(color, -25));
        solid(l, .08, l + .025, .88, .22, .78, color);
        solid(r - .025, .08, r, .88, .22, .78, color);
        for (const z of [.44, .66, .855, .97]) solid(l, .075, r, .87, z, .03, shade(color, 12));
      }
      solid(.275, .08, .725, .18, .25, .71, shade(color, -17));
      solid(.315, .19, .685, .28, .38, .44, darkMetal);
      break;
    case 'aquarium':
      solid(.025, .035, .975, .975, 0, .52, paleWood);
      solid(.035, .075, .965, .935, .52, .08, '#b7aa90');
      solid(.065, .10, .935, .90, .59, .29, glass, .34);
      for (const x of [.045, .931]) solid(x, .085, x + .024, .914, .56, .425, '#a4bec0', .42);
      solid(.04, .085, .96, .105, .56, .42, glass, .42);
      solid(.04, .897, .96, .917, .56, .42, glass, .42);
      solid(.025, .06, .975, .94, .97, .03, darkMetal);
      break;
    case 'canopyBed': {
      const wall = item.type === 'houseBed' ? .66 : .964;
      legs(.015, .015, .985, .985, 0, height * wall, .061, darkWood);
      solid(.07, .07, .93, .95, .14, .075, color);
      solid(.105, .10, .895, .935, .215, .085, porcelain);
      solid(.11, .35, .89, .93, .30, .018, shade(color, 20));
      ring(.15, .14, item.width >= 1.25 ? .48 : .85, .34, .301, .027, '#f6f2e5');
      if (item.width >= 1.25) ring(.52, .14, .85, .34, .301, .027, '#f6f2e5');
      for (const u of [.02, .936]) solid(u, .02, u + .044, .98, wall - .035, .035, darkWood);
      for (const v of [.02, .936]) solid(.065, v, .935, v + .044, wall - .035, .035, darkWood);
      if (item.type === 'houseBed') {
        for (const v of [.055, .945]) {
          beam([.043, v, height * wall], [.50, v, height], color, .054);
          beam([.957, v, height * wall], [.50, v, height], color, .054);
        }
        solid(.48, .055, .52, .945, .979, .021, darkWood);
      }
      break;
    }
    case 'playpen':
      solid(.05, .05, .95, .95, .06, .075, '#e4dcca');
      legs(.013, .013, .987, .987, 0, height, .069, darkWood);
      for (const u of [.02, .93]) {
        solid(u, .02, u + .05, .98, .90, .08, color);
        for (const v of [.18, .34, .50, .66, .82]) solid(u, v, u + .04, v + .028, .14, .78, paleWood);
      }
      for (const v of [.02, .93]) {
        solid(.04, v, .96, v + .05, .90, .08, color);
        for (const u of [.18, .34, .50, .66, .82]) solid(u, v, u + .028, v + .04, .14, .78, paleWood);
      }
      break;
    case 'hallTree':
      solid(.03, .09, .97, .99, .04, .20, color);
      solid(.04, .105, .96, .97, .235, .027, paleWood);
      solid(.05, .03, .95, .13, .24, .76, shade(color, -8));
      for (const u of [.24, .42, .58, .76]) solid(u, .13, u + .03, .32, .76, .03, darkMetal);
      break;
    case 'arcLamp': {
      const arc = [[.5, .09, 0], [.5, .09, .64], [.5, .15, .83], [.5, .30, .93], [.5, .52, .982], [.5, .80, .94]];
      ring(.15, .015, .85, .20, 0, .027, darkMetal);
      for (let index = 1; index < arc.length; index++) {
        const toWorld = ([u, v, z]) => [u, v, z * height];
        beam(toWorld(arc[index - 1]), toWorld(arc[index]), metal, .032);
      }
      ring(.065, .72, .935, .98, .81, .13, '#dbcfb9');
      break;
    }
    case 'poolTable':
      legs(.095, .17, .905, .83, 0, height * .81, .115, darkWood);
      solid(.015, .03, .985, .97, .72, .18, color);
      solid(.055, .095, .945, .905, .897, .035, '#6d9275');
      for (const v of [.02, .894]) solid(.012, v, .988, v + .086, .898, .102, paleWood);
      for (const u of [.012, .933]) solid(u, .106, u + .055, .894, .898, .102, paleWood);
      for (const u of [.055, .50, .945]) {
        for (const v of [.064, .936]) ring(u - .021, v - .044, u + .021, v + .044, 1, .002, darkMetal);
      }
      for (const [u, v] of [[.42, .55], [.46, .52], [.48, .60]]) ring(u, v, u + .028, v + .045, .937, .037, porcelain);
      break;
    case 'catTree':
      solid(0, 0, 1, 1, 0, .037, shade(color, -16));
      ring(.58, .69, .82, .92, .037, .89, darkWood);
      ring(.14, .15, .37, .41, .037, .55, darkWood);
      solid(.05, .12, .53, .62, .56, .06, paleWood);
      ring(.34, .06, .94, .64, .88, .12, color);
      break;
    case 'beanBag':
      ring(.02, .02, .98, .98, 0, .28, shade(color, -13));
      ring(.065, .10, .94, .93, .28, .30, color);
      ring(.17, .11, .83, .64, .58, .27, shade(color, 11));
      ring(.28, .13, .72, .55, .85, .15, shade(color, 15));
      break;
    case 'nestingTables':
      for (const [l, t, r, b, z] of [[0, 0, .68, .96, .95], [.48, .26, 1, 1, .71]]) {
        legs(l + .08, t + .09, r - .08, b - .09, 0, height * z, .04, darkWood);
        ring(l, t, r, b, z, .05, z > .8 ? color : paleWood);
      }
      break;
    case 'hangingChair':
      ring(.07, .03, .93, .88, 0, .035, darkMetal);
      beam([.49, .10, 0], [.49, .10, height * .73], darkMetal, .055);
      beam([.49, .10, height * .73], [.49, .36, height * .95], darkMetal, .055);
      beam([.49, .36, height * .95], [.49, .60, height], darkMetal, .049);
      beam([.49, .60, height], [.49, .60, height * .80], metal, .018);
      ring(.15, .27, .85, .97, .25, .082, paleWood);
      ring(.22, .33, .78, .89, .33, .086, color);
      for (const u of [.20, .35, .50, .65, .80]) beam([u, .37, height * .37], [.49, .60, height * .82], darkWood, .021);
      break;
    default:
      return false;
  }
  return true;
}
