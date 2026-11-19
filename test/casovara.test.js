import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { estimateProject, formatMoney, formatNumber, systems } from '../public/core.js';
import { makeItem, modelFaces } from '../public/builder-engine.js';
import { generateServices } from '../public/building-services.js';
import { generateConstructionPlan } from '../public/construction-tasks.js';
import { detectLocale, languagePreferences } from '../public/locales.js';
import { makeTemplate, templates } from '../public/templates.js';
import { normalizeRoofSpec, normalizeStructure } from '../public/structure-elements.js';
import { createApp } from '../server.js';

test('Selects the three locales using language preference and country', () => {
  const suggestions = languagePreferences('fr;q=0.7,pt-PT;q=0.9,en-US;q=0.2,*;q=0.1');
  assert.deepEqual(suggestions, ['pt-pt', 'fr', 'en-us']);
  assert.equal(detectLocale(suggestions, 'GB'), 'pt-PT');
  assert.equal(detectLocale(['en-US'], 'PT'), 'en-PT');
  assert.equal(detectLocale(['en-PT']), 'en-PT');
  assert.equal(detectLocale(['en-GB'], 'IE'), 'en-INT');
  assert.match(formatMoney(1250.25, 'en-PT', 2), /1.?250,25\s*€/);
  assert.match(formatMoney(1250.25, 'en-INT', 2), /^€1,250\.25$/);
  assert.equal(formatNumber(42.5, 'pt-PT'), '42,5');
});

test('Each construction plugin generates a separate, auditable EUR estimate', () => {
  assert.equal(systems.length, 5);
  const totals = new Set();
  for (const system of systems) {
    const { total, quantities, lines } = estimateProject(system.id, 125);
    assert.equal(lines.length, 4);
    assert.equal(Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100), Math.round(total * 100));
    assert.equal(Math.round(quantities.reduce((sum, line) => sum + line.amount, 0) * 100), Math.round(total * 100));
    assert.ok(quantities.every((line) => line.quantity >= line.raw && line.unitPrice > 0));
    totals.add(total);
    assert.equal(system.estimate(0).total, 0);
  }
  assert.equal(totals.size, 5);
});

test('Starter plans are isolated copies and contain levels in the selected language', () => {
  assert.equal(templates.length, 6);
  for (const template of templates) {
    const project = makeTemplate(template.id, 'en-PT');
    assert.equal(project.levelId, project.levels[0].id);
    assert.equal(project.levels[0].name, 'Ground floor');
    assert.ok(project.levels[0].rooms.length > 0);
    project.levels[0].rooms.pop();
    assert.equal(makeTemplate(template.id, 'pt-PT').levels[0].rooms.length, template.levels[0].rooms.length);
  }
  assert.equal(makeTemplate('missing', 'pt-PT'), null);
});

test('Roof type, pitch, floor finishes and ceilings alter the 3D model', () => {
  const project = makeTemplate('patio', 'pt-PT');
  const level = project.levels[0];
  const full = () => modelFaces(project, level.id, false);
  const before = full();
  level.rooms[0].finish = 'ceramic';
  assert.ok(full().some((face) => face.fill === '#e4dccc'));
  level.ceiling = true;
  assert.ok(full().length > before.length);
  level.roof = 'gable';
  level.pitch = 20;
  const gable = full();
  level.pitch = 42;
  assert.notDeepEqual(full(), gable);
  level.roof = 'hipped';
  assert.ok(full().filter((face) => face.owner?.kind === 'roof').length > 4);
  assert.ok(modelFaces(project, level.id, true).every((face) => face.owner?.kind !== 'roof'));
  const withoutStairs = full().length;
  level.items.push(makeItem('stair', 2, 2), makeItem('rail', 4, 2));
  assert.ok(full().length > withoutStairs + 10);
});

let dir, app, base;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'casovara-test-'));
  app = createApp({ storagePath: dir });
  await new Promise((resolve, reject) => {
    app.once('error', reject);
    app.listen(0, '127.0.0.1', resolve);
  });
  base = 'http://127.0.0.1:' + app.address().port;
});

after(async () => {
  if (app?.listening) await new Promise((resolve) => app.close(resolve));
  if (dir) await rm(dir, { recursive: true, force: true });
});

function cookie(response) {
  return response.headers.getSetCookie()[0]?.split(';')[0];
}

function api(path, method, data, session) {
  const headers = {};
  if (session) headers.cookie = session;
  if (data) headers['content-type'] = 'application/json';
  return fetch(base + path, { method, headers, body: data && JSON.stringify(data) });
}

test('Three locale routes, preference cookie, and public pages', async () => {
  for (const [path, view] of [['/', 'landing'], ['/app', 'builder'], ['/biblioteca', 'library'],
    ['/en/calculators/paint', 'calculators'], ['/pt/guias/pintura', 'guides'], ['/privacidade', 'privacy']]) {
    const response = await fetch(base + path, { headers: { 'accept-language': 'en-GB', 'cf-ipcountry': 'PT' } });
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), new RegExp(`data-view="${view}"`));
  }
  const auto = await fetch(base, { headers: { 'accept-language': 'en-GB', 'cf-ipcountry': 'PT' } });
  assert.match(await auto.text(), /data-locale="en-PT"/);
  const explicit = await fetch(base + '/en');
  assert.match(await explicit.text(), /data-locale="en-INT" data-chosen="true"/);
  const set = await api('/api/locale', 'POST', { locale: 'pt-PT' });
  assert.equal(set.status, 200);
  assert.match(await (await fetch(base, { headers: { cookie: cookie(set) } })).text(), /data-locale="pt-PT" data-chosen="true"/);
  const clear = await api('/api/locale', 'POST', { locale: 'auto' });
  assert.match(clear.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal((await fetch(base + '/missing')).status, 404);
});

test('Projects persist as private files and survive a new server instance', async () => {
  const first = await api('/api/projects', 'GET');
  assert.deepEqual(await first.json(), []);
  const visitor = cookie(first);
  const project = makeTemplate('patio', 'pt-PT');
  project.constructionPlan = generateConstructionPlan(project, { startDate: '2027-03-01' });
  const floor = project.levels[0];
  floor.services = { plumbing: generateServices(floor, 'plumbing'), electrical: generateServices(floor, 'electrical', { phase: 'three' }) };
  const editedCable = floor.services.electrical.runs.find(({ medium }) => medium === 'power');
  editedCable.surface = 'ceiling';
  editedCable.points = [{ x: 2, y: 1 }, { x: 5, y: 1 }];
  floor.slab = { mode: 'custom', thickness: .245, footprint: { x: -.3, y: -.2, width: 9.4, depth: 6.8 } };
  floor.roofSpec = normalizeRoofSpec({ covering: 'metal', eavesOverhang: .45, color: '#414D5A' });
  floor.structure = normalizeStructure([
    { type: 'roofWindow', id: 'claraboia', width: .7, v: .29 },
    { type: 'gutter', id: 'caleira', edge: 'back', downspout: false },
    { type: 'foundation', id: 'sapata', wallId: floor.walls[0].id, width: .9 },
  ], floor);
  floor.services.radiantFloor = generateServices(floor, 'radiantFloor', { radiantPattern: 'serpentine' });
  assert.ok(floor.services.radiantFloor.runs.some(({ pattern }) => pattern === 'serpentine'));
  assert.ok(floor.services.radiantFloor.runs.some(({ port }) => port === 1));
  const invalid = await api('/api/projects', 'POST', { ...project, levelId: 'absent' }, visitor);
  assert.equal(invalid.status, 422);
  const created = await api('/api/projects', 'POST', project, visitor);
  assert.equal(created.status, 201);
  const original = await created.json();
  const path = '/api/projects/' + original.id;
  assert.equal((await api(path, 'GET')).status, 404);

  const updated = await (await api(path, 'PUT', { ...original, name: '  Casa de teste  ' }, visitor)).json();
  assert.equal(updated.id, original.id);
  assert.equal(updated.createdAt, original.createdAt);
  assert.equal(updated.name, 'Casa de teste');
  assert.deepEqual(updated.levels[0].services, floor.services);
  assert.deepEqual(updated.levels[0].slab, floor.slab);
  assert.deepEqual(updated.levels[0].roofSpec, floor.roofSpec);
  assert.deepEqual(updated.levels[0].structure, floor.structure);
  assert.deepEqual(updated.constructionPlan, project.constructionPlan);
  const stored = await readdir(join(dir, visitor.split('=')[1]));
  assert.deepEqual(stored, [original.id + '.json']);
  const restart = createApp({ storagePath: dir });
  await new Promise((resolve) => restart.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch('http://127.0.0.1:' + restart.address().port + path, { headers: { cookie: visitor } });
    assert.deepEqual(await response.json(), updated);
  } finally {
    await new Promise((resolve) => restart.close(resolve));
  }

  const crossSite = await fetch(base + path, { method: 'DELETE', headers: { cookie: visitor, 'sec-fetch-site': 'cross-site' } });
  assert.equal(crossSite.status, 403);
  assert.equal((await api(path, 'DELETE', undefined, visitor)).status, 204);
  assert.deepEqual(await (await api('/api/projects', 'GET', undefined, visitor)).json(), []);
});

test('Explicit share links expose a snapshot and can be revoked by its owner', async () => {
  const owner = cookie(await api('/api/projects', 'GET'));
  const project = makeTemplate('costa', 'pt-PT');
  const record = await (await api('/api/projects', 'POST', project, owner)).json();
  const ownerShare = '/api/projects/' + record.id + '/share';
  assert.equal(await (await api(ownerShare, 'GET', undefined, owner)).json(), null);
  const share = await (await api(ownerShare, 'POST', undefined, owner)).json();
  assert.ok(Date.parse(share.expiresAt) > Date.now());
  assert.deepEqual(await (await api(ownerShare, 'POST', undefined, owner)).json(), share);
  const shareUrl = '/api/project-shares/' + share.token;
  assert.deepEqual(await (await api(shareUrl, 'GET')).json(), project);
  assert.equal((await api(ownerShare, 'DELETE')).status, 404);
  await api('/api/projects/' + record.id, 'PUT', { ...project, name: 'Alterado' }, owner);
  assert.equal((await (await api(shareUrl, 'GET')).json()).name, project.name);
  assert.equal((await api(ownerShare, 'DELETE', undefined, owner)).status, 204);
  assert.equal((await api(shareUrl, 'GET')).status, 404);
  const newer = await (await api(ownerShare, 'POST', undefined, owner)).json();
  assert.notEqual(newer.token, share.token);
  await api('/api/projects/' + record.id, 'DELETE', undefined, owner);
  assert.equal((await api('/api/project-shares/' + newer.token, 'GET')).status, 404);
});
