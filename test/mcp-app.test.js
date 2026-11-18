import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createApp } from '../server.js';

const appMimeType = 'text/html;profile=mcp-app';
const baseHeaders = { accept: 'application/json, text/event-stream', 'content-type': 'application/json' };
const brief = {
  name: 'Casa do Pátio', systemId: 'masonry',
  levels: [{
    name: 'Rés do chão', rooms: [
      { type: 'living', x: 0, y: 0, width: 6, depth: 5 },
      { type: 'bedroom', x: 6, y: 0, width: 4, depth: 5 },
    ],
  }],
};

async function start(context) {
  const folder = await mkdtemp(join(tmpdir(), 'casovara-mcp-'));
  const server = createApp({ storagePath: folder });
  context.after(async () => {
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    await rm(folder, { recursive: true, force: true });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/mcp`;
  const post = (body, headers = {}) => fetch(url, {
    method: 'POST', headers: { ...baseHeaders, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { url, post, folder };
}

function envelope(id, method, params = {}) {
  return { jsonrpc: '2.0', id, method, params };
}

async function expectResult(response, id) {
  assert.equal(response.status, 200);
  const message = await response.json();
  assert.equal(message.jsonrpc, '2.0');
  assert.equal(message.id, id);
  assert.ok(message.result, JSON.stringify(message));
  return message.result;
}

test('A legacy MCP Apps client discovers the design skill and creates, inspects and edits an isolated plan', async (context) => {
  const { post, folder } = await start(context);
  const initialize = await post(envelope(1, 'initialize', {
    protocolVersion: '2025-11-25',
    capabilities: { extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: [appMimeType] } } },
    clientInfo: { name: 'test', version: '1.0.0' },
  }));
  assert.equal(initialize.headers.get('mcp-session-id'), null);
  assert.equal(initialize.headers.get('set-cookie'), null);
  const hello = await expectResult(initialize, 1);
  assert.equal(hello.protocolVersion, '2025-11-25');
  assert.deepEqual(hello.capabilities.extensions['io.modelcontextprotocol/ui'].mimeTypes, [appMimeType]);
  const headers = { 'MCP-Protocol-Version': hello.protocolVersion, cookie: `casovara_session=${'1'.repeat(48)}` };
  const ready = await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, headers);
  assert.equal(ready.status, 202);
  assert.equal(await ready.text(), '');
  let id = 1;
  const call = async (method, params) => {
    const requestId = ++id;
    return expectResult(await post(envelope(requestId, method, params), headers), requestId);
  };
  const tool = (name, args) => call('tools/call', { name, arguments: args });
  const { tools } = await call('tools/list');
  const definitions = Object.fromEntries(tools.map((definition) => [definition.name, definition]));
  const create = definitions.casovara_create_plan;
  const inspect = definitions.casovara_inspect_plan;
  assert.match(create._meta.ui.resourceUri, /^ui:\/\/casovara\//);
  assert.ok(inspect.inputSchema.required.includes('project'));
  assert.ok(definitions.casovara_edit_plan.inputSchema.required.includes('project'));
  assert.ok(definitions.casovara_design_services.inputSchema.required.includes('project'));
  assert.ok(definitions.casovara_plan_construction.inputSchema.required.includes('project'));
  assert.equal(definitions.casovara_design_services._meta.ui.resourceUri, create._meta.ui.resourceUri);
  const { resources } = await call('resources/list');
  assert.equal(resources.find(({ uri }) => uri === create._meta.ui.resourceUri).mimeType, appMimeType);
  const { contents: [preview] } = await call('resources/read', { uri: create._meta.ui.resourceUri });
  assert.equal(preview.mimeType, appMimeType);
  assert.match(preview.text, /drawConstruction/);
  assert.match(preview.text, /ui\/initialize/);
  assert.match(preview.text, /ui\/notifications\/tool-result/);
  assert.match(preview.text, /service-palette[^>]*>\{"electrical"/);
  const { contents: [guide] } = await call('resources/read', { uri: 'casovara://skills/house-planning' });
  assert.match(guide.text, /casovara_create_plan/);
  assert.equal((await tool('casovara_get_planner_skill', {})).content[0].text, guide.text);
  const { prompts } = await call('prompts/list');
  const { messages } = await call('prompts/get', { name: prompts[0].name, arguments: { brief: 'Casa com pátio.' } });
  assert.match(messages[0].content.text, /Casa com pátio\./);
  const result = await tool(create.name, brief);
  const { project, analysis } = result.structuredContent;
  assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
  assert.equal(analysis.area, 50);
  assert.equal(analysis.counts.rooms, 2);
  assert.equal(analysis.counts.openings, 4);
  assert.equal(analysis.materialEstimate.currency, 'EUR');
  assert.equal((await tool(inspect.name, { project })).structuredContent.analysis.area, 50);
  assert.equal((await tool(inspect.name, {})).isError, true);
  const edit = await tool('casovara_edit_plan', {
    project, operations: [
      { op: 'set_project', name: 'Casa do Pátio revista', systemId: 'lsf' },
      { op: 'add_furniture', furniture: { type: 'bed', x: 8, y: 2.5 } },
    ],
  });
  assert.equal(edit.structuredContent.project.systemId, 'lsf');
  assert.equal(edit.structuredContent.project.name, 'Casa do Pátio revista');
  assert.ok(edit.structuredContent.project.levels[0].items.some(({ type }) => type === 'bed'));
  assert.ok(!project.levels[0].items.some(({ type }) => type === 'bed'));
  const drawing = await tool('casovara_design_services', {
    project, operations: [{ op: 'generate', systems: ['electrical', 'vmc'], phase: 'three' }],
  });
  const electrical = drawing.structuredContent.project.levels[0].services.electrical;
  assert.ok(electrical.runs.some(({ medium }) => medium === 'serviceFeed'));
  assert.equal(electrical.nodes.find(({ kind }) => kind === 'supplyEntry').phase, 'three');
  assert.ok(drawing.structuredContent.project.levels[0].services.vmc.nodes.length);
  const socket = electrical.nodes.find(({ kind }) => kind === 'outlet');
  const revised = await tool('casovara_design_services', { project: drawing.structuredContent.project,
    operations: [{ op: 'edit', system: 'electrical', changes: [{ op: 'update_node', id: socket.id, node: { count: 5 } }] }],
  });
  const verification = await tool(inspect.name, { project: revised.structuredContent.project });
  const inspected = verification.structuredContent.analysis.levels[0].services.electrical.nodes;
  assert.equal(inspected.length, electrical.nodes.length);
  assert.equal(inspected.find(({ id }) => id === socket.id).symbol, 'T 5×');
  const construction = await tool('casovara_plan_construction', { project, operations: [{ op: 'generate', startDate: '2027-03-01' }] });
  assert.equal(construction.structuredContent.constructionChanged, true);
  assert.ok(construction.structuredContent.analysis.construction.tasks.length > 10);
  assert.ok(construction.structuredContent.analysis.construction.sequentialDays > construction.structuredContent.analysis.construction.workingDays);
  assert.deepEqual(await readdir(folder), []);
});

test('A stateless MCP client negotiates protocol 2026-07-28 and passes compatible routing headers', async (context) => {
  const { post } = await start(context);
  const protocol = '2026-07-28';
  async function request(id, method, params = {}, overrides = {}) {
    const name = params.name ?? params.uri;
    return post(envelope(id, method, {
      ...params, _meta: { 'io.modelcontextprotocol/protocolVersion': protocol },
    }), { 'MCP-Protocol-Version': protocol, 'Mcp-Method': method, ...(name ? { 'Mcp-Name': name } : {}), ...overrides });
  }
  const discovery = await expectResult(await request(1, 'server/discover'), 1);
  assert.equal(discovery.resultType, 'complete');
  assert.ok(discovery.supportedVersions.includes(protocol));
  assert.equal(discovery._meta['io.modelcontextprotocol/serverInfo'].name, 'casovara');
  const list = await expectResult(await request(2, 'tools/list'), 2);
  assert.equal(list.resultType, 'complete');
  const { structuredContent } = await expectResult(await request(3, 'tools/call', {
    name: 'casovara_create_plan', arguments: brief,
  }), 3);
  assert.equal(structuredContent.analysis.area, 50);
  const uri = 'casovara://skills/house-planning';
  const encodedUri = '=?base64?' + Buffer.from(uri).toString('base64') + '?=';
  const skill = await expectResult(await request(4, 'resources/read', { uri }, { 'Mcp-Name': encodedUri }), 4);
  assert.match(skill.contents[0].text, /planning skill/i);
  const mismatch = await request(5, 'resources/read', { uri }, { 'Mcp-Name': 'casovara://different' });
  assert.equal(mismatch.status, 400);
  assert.equal((await mismatch.json()).error.code, -32020);
  const unknown = await request(6, 'missing/method');
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.json()).error.code, -32601);
});

test('MCP returns explicit transport errors and rejects requests from an unrelated origin', async (context) => {
  const { url, post } = await start(context);
  const unsupported = await fetch(url);
  assert.equal(unsupported.status, 405);
  assert.equal(unsupported.headers.get('allow'), 'POST');
  const mismatch = await post(envelope(1, 'tools/list'), { origin: 'https://other.invalid' });
  assert.equal(mismatch.status, 403);
  const sameOrigin = await post(envelope(1, 'tools/list'), { origin: new URL(url).origin });
  assert.equal(sameOrigin.status, 200);
  const wrongType = await post(envelope(2, 'tools/list'), { 'content-type': 'text/plain' });
  assert.equal(wrongType.status, 415);
  const malformed = await post('{');
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, -32700);
  const oversized = await post(' '.repeat(4 * 1024 * 1024 + 1));
  assert.equal(oversized.status, 413);
});
