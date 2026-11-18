import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createApp } from '../server.js';

test('The IKEA Portugal plugin lists paged products and finds localized names and article codes', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'casovara-catalog-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const app = createApp({ catalogDir: directory });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(() => new Promise((resolve) => app.close(resolve)));
  const origin = `http://127.0.0.1:${app.address().port}`;
  const catalog = (query = '') => fetch(`${origin}/api/catalogs/ikea-pt${query}`).then((response) => response.json());

  const first = await catalog();
  assert.equal(first.coverage, 'selection');
  assert.ok(first.items.length >= 20);
  const last = await catalog(`?cursor=${first.nextCursor}`);
  const ids = [...first.items, ...last.items].map(({ productId }) => productId);
  assert.equal(new Set(ids).size, first.total);
  assert.equal(last.nextCursor, undefined);

  const { items } = await catalog('?locale=en-PT&query=poang%20armchair&category=living');
  assert.equal(items.length, 1);
  assert.equal(items[0].name, 'POÄNG · Armchair');
  assert.equal(items[0].type, 'armchair');
  assert.equal(items[0].depth, .82);
  assert.ok(items[0].url.startsWith('https://www.ikea.com/pt/pt/p/'));
  assert.equal((await catalog('?query=392.407.87')).items[0].productId, items[0].productId);
  assert.equal((await fetch(`${origin}/api/catalogs/unknown`)).status, 404);

  const feed = { version: 1, coverage: 'full', items: [{
    productId: 'sample', name: { pt: 'Cadeirão de teste', en: 'Test chaise' },
    type: 'armchair', category: 'living', width: .98, depth: 1.03,
  }] };
  const filename = join(directory, 'ikea-pt.json');
  await writeFile(filename, JSON.stringify(feed));
  const configured = await catalog();
  assert.equal(configured.coverage, 'full');
  assert.equal(configured.total, 1);
  assert.equal(configured.items[0].width, .98);
  assert.equal(configured.items[0].name, 'Cadeirão de teste');

  feed.items[0].url = 'https://catalog.example.invalid/product';
  await writeFile(filename, JSON.stringify(feed));
  assert.equal((await fetch(`${origin}/api/catalogs/ikea-pt`)).status, 503);
  await rm(filename);
  assert.equal((await catalog()).total, first.total);
});
