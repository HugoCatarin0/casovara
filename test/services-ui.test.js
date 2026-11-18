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
