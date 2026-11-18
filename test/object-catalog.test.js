import test from 'node:test';
import assert from 'node:assert/strict';
import { elements, makeItem, makeLevel, modelFaces, normalizeProject } from '../public/builder-engine.js';
import { objectGroups } from '../public/object-catalog.js';
import { furniturePlanSymbol, objectFootprint } from '../public/object-plan-symbol.js';
import { runDesignTool } from '../public/plan-agent.js';

function projectWith(item) {
  const level = makeLevel('Rés do chão');
  level.items.push(item);
  return { name: 'Casa', systemId: 'masonry', levelId: level.id, levels: [level] };
}

test('Every object profile belongs to a category and its original plan symbols and 3D models render', () => {
  const categories = objectGroups.flatMap(({ types }) => types);
  assert.deepEqual([...categories].sort(), Object.keys(elements).sort());
  for (const type of categories) {
    const profile = elements[type];
    assert.ok(profile.pt && profile.en && profile.width > 0 && profile.depth > 0 && profile.height > 0, type);
    if (!profile.model) continue;
    const item = makeItem(type, 1, 2, 37);
    assert.match(furniturePlanSymbol(item, profile), /<(rect|ellipse|polygon|polyline)\b/, type);
    const project = projectWith(item);
    const faces = modelFaces(project, project.levelId, false).filter(({ owner }) => owner?.id === item.id);
    if (type === 'wheelchairTurning') assert.equal(faces.length, 0);
    else assert.ok(faces.length, type);
    assert.ok(faces.every(({ points }) => points.length >= 3 && points.flat().every(Number.isFinite)), type);
  }
});

test('Rotating a corner sofa preserves its empty quadrant instead of filling its entire bounds', () => {
  const shape = elements.sectionalLeft;
  const item = makeItem('sectionalLeft', 5, 6, 53);
  assert.equal(objectFootprint(item, shape).length, 6);
  const project = projectWith(item);
  const faces = modelFaces(project, project.levelId, false).filter(({ owner }) => owner?.id === item.id);
  const radians = item.angle * Math.PI / 180;
  for (const [x, y] of faces.flatMap(({ points }) => points)) {
    const dx = x - item.x, dy = y - item.y;
    const u = (dx * Math.cos(radians) + dy * Math.sin(radians)) / item.width + .5;
    const v = (-dx * Math.sin(radians) + dy * Math.cos(radians)) / item.depth + .5;
    assert.ok(u <= .361 || v <= .481);
  }
});

test('A product placement keeps measured dimensions and its safe identity through import and editing', () => {
  const item = {
    ...makeItem('sofa', 1, 2), width: 2.39, depth: .91, height: 1.07,
    catalogRef: { providerId: 'ikea-pt', productId: '404.307.58', name: 'Exemplo', url: 'https://www.ikea.com/pt/pt/' },
  };
  const project = normalizeProject(projectWith(item), ['masonry'], true);
  assert.deepEqual(project.levels[0].items[0], item);
  const { project: changed, analysis } = runDesignTool('casovara_edit_plan', {
    operations: [{ op: 'update_furniture', id: item.id, furniture: { angle: 55 } }],
  }, { project });
  assert.deepEqual(changed.levels[0].items[0], { ...item, angle: 55 });
  assert.equal(analysis.levels[0].items[0].height, item.height);
  const faces = modelFaces(changed, changed.levelId, false).filter(({ owner }) => owner?.id === item.id);
  assert.ok(Math.abs(Math.max(...faces.flatMap(({ points }) => points.map((point) => point[2]))) - item.height) < 1e-6);

  const malicious = projectWith({ ...item, catalogRef: { ...item.catalogRef, url: 'javascript:alert(1)' } });
  assert.deepEqual(normalizeProject(malicious, ['masonry'], true).levels[0].items[0].catalogRef,
    { providerId: item.catalogRef.providerId, productId: item.catalogRef.productId, name: item.catalogRef.name });
});
