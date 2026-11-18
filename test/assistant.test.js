import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDesignAssistant } from '../design-assistant.js';
import { comparisonLevelPairs, comparisonViewport } from '../public/builder-assistant.js';
import { registerBuilderTools } from '../public/builder-webmcp.js';
import { makeTemplate } from '../public/templates.js';
import { generateConstructionPlan } from '../public/construction-tasks.js';

const browser = { socket: { remoteAddress: '127.0.0.1' }, headers: { host: '127.0.0.1:3000' } };
function exampleInput() {
  return {
    name: 'Study house', systemId: 'lsf',
    levels: [{ name: 'Ground floor', rooms: [{ type: 'living', x: 0, y: 0, width: 4, depth: 5 }] }],
  };
}

function reply(output) {
  return new Response(JSON.stringify({ output }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

test('The comparison pairs retained floors by ID and keeps added and removed floors available', () => {
  const base = { levels: [{ id: 'ground' }, { id: 'removed' }, { id: 'retained' }] };
  const proposed = { levels: [{ id: 'ground' }, { id: 'retained' }, { id: 'added' }] };
  const pairs = comparisonLevelPairs(base, proposed);
  assert.deepEqual(pairs.map(({ before, after }) => [before?.id, after?.id]), [
    ['ground', 'ground'], ['retained', 'retained'], [undefined, 'added'], ['removed', undefined],
  ]);
  const [replacement] = comparisonLevelPairs(base, { levels: [{ id: 'new-ground' }] });
  assert.equal(replacement.before.id, 'ground');
  assert.equal(replacement.after.id, 'new-ground');
});

test('Both drawings share the same bounds across moved geometry and a standalone slab', () => {
  const before = { rooms: [{ x: -4, y: 1, w: 4, h: 5 }], walls: [], items: [] };
  const after = { rooms: [], items: [], walls: [], slab: { mode: 'custom', thickness: .22,
    footprint: { x: 2, y: -2, width: 6, depth: 3 },
  } };
  const viewport = comparisonViewport(before, after);
  assert.equal(viewport.width, 12);
  assert.equal(viewport.height, 8);
  assert.deepEqual(comparisonViewport(after, before), viewport);
  assert.deepEqual(comparisonViewport(null, after), comparisonViewport({ rooms: [], walls: [], items: [] }, after));
});

test('Local T3 example uses the same drawing tools and is available without a model key', async () => {
  const assistant = createDesignAssistant({ apiKey: '', allowRemote: false });
  assert.deepEqual(assistant.status(browser), { available: false, guided: true });
  const proposal = await assistant.run(browser, { preset: 't3', locale: 'pt-PT', systemId: 'concrete' });
  assert.equal(proposal.project.systemId, 'concrete');
  assert.equal(proposal.project.levels.length, 1);
  assert.equal(proposal.project.levels[0].rooms.filter(({ type }) => type === 'bedroom').length, 3);
  assert.equal(proposal.project.levels[0].rooms.filter(({ type }) => type === 'bath').length, 2);
  assert.ok(proposal.project.levels[0].walls.length);
  assert.ok(proposal.project.levels[0].items.some(({ type }) => type === 'door'));
  await assert.rejects(assistant.run(browser, { prompt: 'Draw a house' }), { status: 503, message: 'assistant_unavailable' });
});

test('Responses tool loop builds an editable proposal and excludes notes and reference images', async () => {
  const project = makeTemplate('costa', 'en-INT');
  project.notes = 'NOTE_SHOULD_STAY_LOCAL_42';
  project.levels[0].image = { src: 'data:image/png;base64,LOCAL_PRIVATE_IMAGE_39' };
  const calls = [];
  const assistant = createDesignAssistant({
    apiKey: 'test-key', model: 'test-configured-model', allowRemote: false,
    fetchImpl: async (url, request) => {
      assert.equal(url, 'https://api.openai.com/v1/responses');
      const body = JSON.parse(request.body);
      calls.push(body);
      assert.equal(body.model, 'test-configured-model');
      assert.equal(body.store, false);
      assert.equal(body.tools.some(({ name }) => name === 'casovara_edit_plan'), true);
      assert.equal(request.body.includes('NOTE_SHOULD_STAY_LOCAL_42'), false);
      assert.equal(request.body.includes('LOCAL_PRIVATE_IMAGE_39'), false);
      if (calls.length === 1) {
        return reply([{
          type: 'function_call', name: 'casovara_edit_plan', call_id: 'call_edit',
          arguments: JSON.stringify({ project: { name: 'Not the open project' }, operations: [{ op: 'set_project', name: 'Casa revista' }] }),
        }]);
      }
      const result = body.input.find((item) => item.type === 'function_call_output');
      assert.equal(result.call_id, 'call_edit');
      assert.equal(JSON.parse(result.output).ok, true);
      return reply([{ type: 'message', content: [{ type: 'output_text', text: 'A proposta está pronta.' }] }]);
    },
  });

  const result = await assistant.run(browser, { prompt: 'Muda o nome para Casa revista.', locale: 'pt-PT', project,
    history: [null, { role: 'system', content: 'DO_NOT_FORWARD_AS_SYSTEM' }] });
  assert.equal(calls.length, 2);
  assert.ok(calls[0].input.every((entry) => entry.role !== 'system' && !entry.content.includes('DO_NOT_FORWARD_AS_SYSTEM')));
  assert.equal(result.project.name, 'Casa revista');
  assert.equal(result.project.notes, project.notes);
  assert.deepEqual(result.project.levels[0].image, project.levels[0].image);
  assert.equal(project.name, 'Casa da Costa');
  assert.equal(result.text, 'A proposta está pronta.');
});

test('Paid assistant rejects remote requests by default and reports provider failures without leaking details', async () => {
  const assistant = createDesignAssistant({
    apiKey: 'test-key', allowRemote: false,
    fetchImpl: async () => new Response('sensitive upstream details', { status: 401 }),
  });
  assert.equal(assistant.status(browser).available, true);
  const remote = { socket: { remoteAddress: '203.0.113.10' }, headers: { host: 'casovara.pt' } };
  assert.equal(assistant.status(remote).available, false);
  await assert.rejects(assistant.run(remote, { prompt: 'Draw a house' }), { status: 503, message: 'assistant_unavailable' });
  await assert.rejects(assistant.run(browser, { prompt: 'Draw a house' }), { status: 502, message: 'assistant_provider' });
});

test('Browser agent tools expose the skill and stage a drawing for review', () => {
  const registered = new Map();
  const controller = new AbortController();
  let proposal;
  registerBuilderTools({
    registry: { registerTool(tool, { signal }) {
      assert.equal(signal, controller.signal);
      registered.set(tool.name, tool);
    } },
    locale: 'en-INT', getProject: () => makeTemplate('costa', 'en-INT'),
    stage(project) { proposal = project; return true; }, signal: controller.signal,
  });
  assert.match(registered.get('casovara_get_planner_skill').execute({}).guide, /Casovara/);
  const create = registered.get('casovara_create_plan');
  assert.equal(create.execute(exampleInput()).staged, true);
  assert.equal(proposal.name, 'Study house');
  const services = registered.get('casovara_design_services');
  assert.equal(services.execute({ operations: [{ op: 'generate', systems: ['electrical'] }] }).staged, true);
  assert.ok(proposal.levels[0].services.electrical.nodes.length);
  const lookup = registered.get('casovara_inspect_plan');
  assert.equal(lookup.annotations.readOnlyHint, true);
  assert.ok(lookup.execute({}).analysis);
  controller.abort();
  assert.equal(create.execute(exampleInput()).error, 'Cancelled.');
});

test('The assistant can propose building services without applying them to the editor snapshot', async () => {
  const project = makeTemplate('costa', 'pt-PT');
  let first = true;
  const assistant = createDesignAssistant({ apiKey: 'test-key', allowRemote: false, fetchImpl: async (url, { body }) => {
    const request = JSON.parse(body);
    const tool = request.tools.find(({ name }) => name === 'casovara_design_services');
    assert.ok(tool);
    assert.equal(Object.hasOwn(tool.parameters.properties, 'project'), false);
    if (first) {
      first = false;
      return reply([{ type: 'function_call', name: tool.name, call_id: 'services', arguments: JSON.stringify({
        operations: [{ op: 'generate', systems: ['electrical', 'plumbing', 'vmc', 'airConditioning', 'radiantFloor'] }],
      }) }]);
    }
    const output = JSON.parse(request.input.find(({ type, call_id }) => type === 'function_call_output' && call_id === 'services').output);
    assert.equal(output.ok, true);
    assert.equal(output.serviceChanges.length, 5);
    return reply([{ type: 'message', content: [{ type: 'output_text', text: 'Proposta para cinco especialidades.' }] }]);
  } });
  const result = await assistant.run(browser, { project, locale: 'pt-PT', prompt: 'Gera as cinco redes e inclui piso radiante.' });
  assert.equal(project.levels[0].services, undefined);
  assert.equal(Object.keys(result.project.levels[0].services).length, 5);
  assert.ok(result.analysis.levels[0].services.radiantFloor.runs.length);
});

test('The assistant recalculates an editable construction timetable while keeping task notes local', async () => {
  const project = makeTemplate('costa', 'pt-PT');
  project.constructionPlan = generateConstructionPlan(project, { startDate: '2027-03-01' });
  project.constructionPlan.tasks[0].notes = 'PRIVATE_CONSTRUCTION_NOTES';
  let first = true;
  const assistant = createDesignAssistant({ apiKey: 'test-key', fetchImpl: async (url, { body }) => {
    const request = JSON.parse(body);
    assert.equal(body.includes('PRIVATE_CONSTRUCTION_NOTES'), false);
    const tool = request.tools.find(({ name }) => name === 'casovara_plan_construction');
    assert.ok(tool);
    if (first) {
      first = false;
      return reply([{ type: 'function_call', name: tool.name, call_id: 'construction', arguments: JSON.stringify({ operations: [
        { op: 'edit', changes: [{ op: 'set_calendar', calendar: { startDate: '2027-03-08' } }] },
      ] }) }]);
    }
    const output = JSON.parse(request.input.find(({ type }) => type === 'function_call_output').output);
    assert.equal(output.constructionChanged, true);
    assert.equal(output.analysis.construction.startDate, '2027-03-08');
    return reply([{ type: 'message', content: [{ type: 'output_text', text: 'Calendário atualizado na proposta.' }] }]);
  } });
  const result = await assistant.run(browser, { project, prompt: 'Adia a data de início do plano uma semana.' });
  assert.equal(result.project.constructionPlan.startDate, '2027-03-08');
  assert.equal(result.project.constructionPlan.tasks[0].notes, 'PRIVATE_CONSTRUCTION_NOTES');
  assert.equal(project.constructionPlan.startDate, '2027-03-01');
});
