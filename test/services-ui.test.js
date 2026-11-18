import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServicesEditor, renderServicesPlan, servicesPrintLegend } from '../public/services-ui.js';

function createEditor(levels) {
  const commits = [];
  const confirmations = [];
  const editor = createServicesEditor({
    locale: 'pt-PT', getProject: () => ({ levels }), getLevel: () => levels[0],
    commit(updates, after) {
      commits.push(updates);
      for (const { floor, system, next } of updates) floor.services = { ...floor.services, [system]: next };
      after?.();
    },
    refresh() {}, confirmReplace(proceed) { confirmations.push(proceed); },
  });
  return { editor, commits, confirmations };
}

const emptyFloor = (id) => ({ id, name: id, height: 2.7, rooms: [], walls: [], items: [] });
const choose = (editor, key, value, checked) => editor.field({ dataset: { serviceField: key }, value, checked });
const click = (editor, x, y) => editor.click({ x, y }, { x, y }, null, .2);
const edit = (editor, fields) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  editor.submit(data);
};

test('The canvas tools place points, connect them through a bend and preserve the run when moving one endpoint', () => {
  const floor = emptyFloor('ground');
  const { editor, commits } = createEditor([floor]);
  for (const x of [0, 2]) {
    editor.modeAction('place');
    click(editor, x, 0);
  }
  editor.modeAction('link');
  click(editor, 0, 0);
  click(editor, 1, 1);
  click(editor, 2, 0);
  const network = floor.services.electrical;
  assert.equal(network.nodes.length, 2);
  assert.equal(network.runs.length, 1);
  assert.deepEqual(network.runs[0].points, [{ x: 1, y: 1 }]);
  assert.equal(commits.length, 3);

  const picked = { system: 'electrical', kind: 'node', id: network.nodes[0].id, levelId: floor.id };
  editor.select(picked);
  editor.moveNode(picked, { x: -1, y: -1 });
  const svg = renderServicesPlan(floor, { layers: editor.layers, selection: editor.selection(), locale: 'pt-PT' });
  assert.match(svg, /points="-1,-1 1,1 2,0"/);
  assert.match(svg, /Ponto de luz/);
  const legend = servicesPrintLegend(floor, editor.layers, { x: 0, y: 5, width: 15, locale: 'pt-PT' });
  assert.match(legend.markup, /Eletricidade/);
  assert.match(legend.markup, /Iluminação/);
  assert.doesNotMatch(legend.markup, /Tomadas/);
  assert.ok(legend.height > 0);
});

test('Generating all storeys requests confirmation before replacing manual work, then commits one shared history step', () => {
  const levels = ['ground', 'first'].map((id) => ({ ...emptyFloor(id), rooms: [{ id: `${id}-room`, type: 'living', x: 0, y: 0, w: 4, h: 3 }] }));
  const { editor, commits, confirmations } = createEditor(levels);
  editor.modeAction('place');
  click(editor, 1, 1);
  choose(editor, 'scope', 'all');
  editor.modeAction('generate');
  assert.equal(confirmations.length, 1);
  assert.equal(commits.length, 1);
  assert.equal(levels[1].services, undefined);
  confirmations[0]();
  assert.equal(commits.length, 2);
  assert.equal(commits[1].length, 2);
  assert.ok(levels.every((level) => level.services.electrical.runs.length > 0));
  assert.deepEqual(levels.map((level) => level.services.electrical.nodes.filter(({ kind }) => kind === 'supplyEntry').length), [1, 0]);
});

test('Changing the active installation preserves only explicitly retained layers', () => {
  const { editor } = createEditor([emptyFloor('ground')]);
  editor.reveal('electrical');
  choose(editor, 'system', 'plumbing');
  assert.deepEqual(editor.layers, ['plumbing']);
  choose(editor, 'visible', 'plumbing', true);
  choose(editor, 'system', 'vmc');
  assert.deepEqual(editor.layers, ['plumbing', 'vmc']);
  editor.reveal('radiantFloor', { keepVisible: true });
  assert.deepEqual(editor.layers, ['plumbing', 'vmc', 'radiantFloor']);
});

test('Wall marks attach on the raw-pointer face, can be moved across and carry a grouped outlet label', () => {
  const floor = { ...emptyFloor('ground'),
    rooms: [{ id: 'bath', type: 'bath', x: 0, y: -3, w: 4, h: 3 },
      { id: 'living', type: 'living', name: 'Sala principal', x: 0, y: 0, w: 4, h: 3 }],
    walls: [{ id: 'shared', x1: 0, y1: 0, x2: 4, y2: 0, thickness: .2 }],
  };
  const { editor } = createEditor([floor]);
  editor.modeAction('place');
  choose(editor, 'kind', 'outlet');
  choose(editor, 'count', '3');
  editor.click({ x: 1, y: 0 }, { x: 1, y: -.12 }, null, .2);
  let outlet = floor.services.electrical.nodes[0];
  assert.deepEqual(outlet.wall, { wallId: 'shared', fraction: .25, side: -1 });
  assert.equal(outlet.roomId, 'bath');
  assert.equal(outlet.count, 3);
  assert.match(editor.panel(), /Face 1 · S · Sala principal/);
  assert.match(editor.panel(), /Face 2 · N · Casa de banho/);
  assert.match(renderServicesPlan(floor, { layers: editor.layers, locale: 'pt-PT' }), /T 3×/);

  const target = editor.selection();
  editor.moveNode(target, { x: 3, y: .15 });
  outlet = floor.services.electrical.nodes[0];
  assert.deepEqual(outlet.wall, { wallId: 'shared', fraction: .75, side: 1 });
  assert.equal(outlet.roomId, 'living');
  floor.walls[0].y1 = floor.walls[0].y2 = .5;
  assert.match(renderServicesPlan(floor, { layers: editor.layers, locale: 'pt-PT' }), /translate\(3 0\.615\)/);
  edit(editor, { kind: 'outlet', mount: 'floor', x: 1, y: 1, count: 5 });
  outlet = floor.services.electrical.nodes[0];
  assert.equal(outlet.mount, 'floor');
  assert.equal(outlet.wall, undefined);
  assert.match(renderServicesPlan(floor, { layers: editor.layers, locale: 'pt-PT' }), /T 5×/);
});

test('The main service phase and alternate mounting surfaces are available to the editor', () => {
  const floor = { ...emptyFloor('ground'), walls: [{ id: 'front', x1: 0, y1: 0, x2: 4, y2: 0, thickness: .2 }] };
  const { editor } = createEditor([floor]);
  editor.modeAction('place');
  choose(editor, 'kind', 'supplyEntry');
  choose(editor, 'phase', 'three');
  click(editor, 2, -.15);
  const entry = floor.services.electrical.nodes[0];
  assert.equal(entry.phase, 'three');
  const render = () => renderServicesPlan(floor, { layers: editor.layers, locale: 'pt-PT' });
  assert.match(render(), /Trifásica/);
  assert.match(render(), /E 3~/);
  edit(editor, { kind: 'supplyEntry', mount: 'wall', wallId: 'front', side: '1', fraction: '40', phase: 'single' });
  assert.equal(floor.services.electrical.nodes[0].wall.fraction, .4);
  assert.match(render(), /E 1~/);

  choose(editor, 'system', 'vmc');
  editor.modeAction('place');
  choose(editor, 'kind', 'supplyVent');
  click(editor, 1, 1);
  assert.equal(floor.services.vmc.nodes[0].mount, 'ceiling');
  choose(editor, 'system', 'plumbing');
  editor.modeAction('place');
  choose(editor, 'kind', 'tap');
  choose(editor, 'mount', 'floor');
  click(editor, 2, 2);
  assert.equal(floor.services.plumbing.nodes[0].mount, 'floor');
});
