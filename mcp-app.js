import { readFile } from 'node:fs/promises';
import { detectLocale, languagePreferences } from './public/locales.js';
import { designTools, plannerGuide, runDesignTool } from './public/plan-agent.js';

const MODERN_VERSION = '2026-07-28';
const LEGACY_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];
const PROTOCOL_VERSIONS = [MODERN_VERSION, ...LEGACY_VERSIONS];
const VERSION_KEY = 'io.modelcontextprotocol/protocolVersion';
const APP_EXTENSION = 'io.modelcontextprotocol/ui';
const APP_MIME_TYPE = 'text/html;profile=mcp-app';
const REVIEW_URI = 'ui://casovara/plan-review-v1.html';
const GUIDE_URI = 'casovara://skills/house-planning';
const GUIDE_TOOL = 'casovara_get_planner_skill';
const GUIDE_PROMPT = 'casovara_plan_house';
const REVIEW_FILE = new URL('./public/mcp-planner.html', import.meta.url);
const maxBody = 4 * 1024 * 1024;
const serverInfo = { name: 'casovara', title: 'Casovara', version: '1.0.0' };
const capabilities = { tools: {}, resources: {}, prompts: {}, extensions: { [APP_EXTENSION]: { mimeTypes: [APP_MIME_TYPE] } } };
const instructions = 'Use casovara_get_planner_skill to learn the design workflow. Design tools work on draft plans and on JSON supplied with the request. Review geometry and estimates in Casovara before building.';
const resources = [
  { uri: REVIEW_URI, name: 'Casovara plan review', description: 'Explore the generated floor plan and export a project file.', mimeType: APP_MIME_TYPE, _meta: { ui: {} } },
  { uri: GUIDE_URI, name: 'Casovara house-planning skill', description: 'Planning workflow, metric coordinates, room and opening rules, and example tool calls.', mimeType: 'text/markdown' },
];
const prompt = {
  name: GUIDE_PROMPT,
  title: 'Plan a house in Casovara',
  description: 'Use the Casovara design skill to prepare and verify a floor plan from a brief.',
  arguments: [{ name: 'brief', description: 'The user’s house brief.', required: false }],
};

const projectSchema = {
  type: 'object',
  properties: { name: { type: 'string' }, systemId: { type: 'string' }, levelId: { type: 'string' }, levels: { type: 'array', items: { type: 'object' } } },
  required: ['name', 'systemId', 'levelId', 'levels'],
};
const analysisSchema = {
  type: 'object',
  properties: { area: { type: 'number' }, levels: { type: 'array', items: { type: 'object' } }, warnings: { type: 'array', items: { type: 'object' } } },
  required: ['area', 'levels', 'warnings'],
};

function descriptors() {
  const definitions = designTools.map((tool) => {
    const preview = ['casovara_create_plan', 'casovara_edit_plan'].includes(tool.name);
    let inputSchema = tool.inputSchema;
    if (tool.name === 'casovara_edit_plan' || tool.name === 'casovara_inspect_plan') {
      inputSchema = { ...inputSchema, required: [...new Set([...(inputSchema.required ?? []), 'project'])] };
    }
    return {
      ...tool,
      inputSchema,
      ...(preview ? { _meta: { ui: { resourceUri: REVIEW_URI } } } : {}),
      outputSchema: {
        type: 'object',
        properties: preview ? { project: projectSchema, analysis: analysisSchema } : { analysis: analysisSchema },
        required: preview ? ['project', 'analysis'] : ['analysis'],
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: !preview, openWorldHint: false },
    };
  });
  return [...definitions, {
    name: GUIDE_TOOL,
    title: 'Casovara house-planning skill',
    description: 'Read Casovara’s drawing instructions, constraints and examples before designing or changing a house.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }];
}

const jsonObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const contentText = (text) => [{ type: 'text', text }];
const namedMethods = new Map([['tools/call', 'name'], ['prompts/get', 'name'], ['resources/read', 'uri']]);

class RpcError extends Error {
  constructor(code, message, status = 200, data = undefined) {
    super(message);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  if (body === undefined) {
    res.writeHead(status);
    res.end();
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function allowedOrigin(req) {
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  if (typeof origin !== 'string') return false;
  try {
    const url = new URL(origin);
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) return false;
    const allowed = (process.env.CASOVARA_MCP_ORIGINS ?? '').split(',').map((value) => value.trim());
    if (allowed.includes(origin)) return true;
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    const knownSite = url.protocol === 'https:' && ['casovara.com', 'www.casovara.com', 'casovara.pt', 'www.casovara.pt'].includes(url.hostname);
    return (local || knownSite) && url.host === req.headers.host;
  } catch {
    return false;
  }
}

async function readMessage(req) {
  if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new RpcError(-32600, 'Use Content-Type: application/json.', 415);
  }
  if (Number(req.headers['content-length']) > maxBody) {
    req.resume();
    throw new RpcError(-32600, 'MCP message exceeds the size limit.', 413);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maxBody) {
      req.resume();
      throw new RpcError(-32600, 'MCP message exceeds the size limit.', 413);
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } catch {
    throw new RpcError(-32700, 'Invalid JSON.', 400);
  }
}

function decodedHeader(value) {
  const encoded = typeof value === 'string' && /^=\?base64\?([A-Za-z0-9+/]*={0,2})\?=$/.exec(value);
  if (!encoded) return value;
  try {
    const bytes = Buffer.from(encoded[1], 'base64');
    if (bytes.toString('base64').replace(/=+$/, '') !== encoded[1].replace(/=+$/, '')) return undefined;
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

function protocolEra(req, message) {
  const header = req.headers['mcp-protocol-version'];
  const declared = message.params?._meta?.[VERSION_KEY];
  const method = message.method;
  const revision = declared ?? header;
  if (method === 'initialize' && !declared && !header) return false;
  if (revision && !PROTOCOL_VERSIONS.includes(revision)) {
    throw new RpcError(-32022, 'Unsupported protocol version.', 400, { supported: PROTOCOL_VERSIONS, requested: revision });
  }
  const modern = declared !== undefined || header === MODERN_VERSION || method === 'server/discover';
  if (modern) {
    const sourceName = namedMethods.get(method);
    const routedName = sourceName ? message.params?.[sourceName] : undefined;
    if (header !== MODERN_VERSION || declared !== MODERN_VERSION || req.headers['mcp-method'] !== method ||
        (sourceName && (typeof routedName !== 'string' || decodedHeader(req.headers['mcp-name']) !== routedName))) {
      throw new RpcError(-32020, 'MCP routing headers must match the request body.', 400);
    }
  }
  return modern;
}

function callTool(params, req) {
  if (typeof params.name !== 'string' || (params.arguments !== undefined && !jsonObject(params.arguments))) {
    throw new RpcError(-32602, 'A tool name and an arguments object are required.');
  }
  if (params.name === GUIDE_TOOL) {
    if (Object.keys(params.arguments ?? {}).length) throw new RpcError(-32602, 'The planning skill takes no arguments.');
    return { content: contentText(plannerGuide) };
  }
  if (!designTools.some((tool) => tool.name === params.name)) throw new RpcError(-32602, 'Unknown Casovara tool.');

  const args = params.arguments ?? {};
  try {
    const countryHeader = req.headers['cf-ipcountry'] ?? req.headers['x-vercel-ip-country'] ?? req.headers['cloudfront-viewer-country'];
    const country = typeof countryHeader === 'string' && /^[a-z]{2}$/i.test(countryHeader) ? countryHeader : '';
    const locale = detectLocale(languagePreferences(req.headers['accept-language']), country);
    const result = runDesignTool(params.name, args, { locale });
    return { content: contentText(JSON.stringify(result)), structuredContent: result };
  } catch (error) {
    return { isError: true, content: contentText(String(error?.message || 'The design request could not be processed.').slice(0, 1000)) };
  }
}

async function dispatch(method, params, req, modern) {
  switch (method) {
    case 'server/discover':
      return { supportedVersions: PROTOCOL_VERSIONS, capabilities, instructions, _meta: { 'io.modelcontextprotocol/serverInfo': serverInfo } };
    case 'initialize':
      if (!modern) {
        if (typeof params.protocolVersion !== 'string') throw new RpcError(-32602, 'A protocol version is required.');
        const protocolVersion = LEGACY_VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : LEGACY_VERSIONS[0];
        return { protocolVersion, capabilities, serverInfo, instructions };
      }
      break;
    case 'ping':
      if (!modern) return {};
      break;
    case 'tools/list':
      return { tools: descriptors() };
    case 'tools/call':
      return callTool(params, req);
    case 'resources/list':
      return { resources };
    case 'resources/templates/list':
      return { resourceTemplates: [] };
    case 'resources/read':
      if (params.uri === GUIDE_URI) return { contents: [{ uri: GUIDE_URI, mimeType: 'text/markdown', text: plannerGuide }] };
      if (params.uri === REVIEW_URI) {
        return { contents: [{
          uri: REVIEW_URI, mimeType: APP_MIME_TYPE, text: await readFile(REVIEW_FILE, 'utf8'),
          _meta: { ui: { prefersBorder: true } },
        }] };
      }
      throw new RpcError(-32002, 'Unknown Casovara resource.');
    case 'prompts/list':
      return { prompts: [prompt] };
    case 'prompts/get':
      if (params.name !== GUIDE_PROMPT || (params.arguments !== undefined && !jsonObject(params.arguments))) {
        throw new RpcError(-32602, 'Unknown Casovara prompt or invalid arguments.');
      }
      if (params.arguments?.brief !== undefined && (typeof params.arguments.brief !== 'string' || params.arguments.brief.length > 12_000)) {
        throw new RpcError(-32602, 'The brief must be text of at most 12000 characters.');
      }
      return {
        description: prompt.description,
        messages: contentText(params.arguments?.brief ? `${plannerGuide}\n\nHouse brief supplied by the user\n\n${params.arguments.brief}` : plannerGuide)
          .map((content) => ({ role: 'user', content })),
      };
  }
  throw new RpcError(-32601, 'Method not found.', modern ? 404 : 200);
}

export async function handleMcp(req, res) {
  let id = null;
  try {
    if (!allowedOrigin(req)) throw new RpcError(-32600, 'Origin is not allowed.', 403);
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return send(res, 405);
    }
    const acceptsJson = req.headers.accept?.split(',').some((range) => ['*/*', 'application/*', 'application/json'].includes(range.split(';')[0].trim().toLowerCase()));
    if (req.headers.accept && !acceptsJson) throw new RpcError(-32600, 'This endpoint returns application/json.', 406);
    const message = await readMessage(req);
    if (!jsonObject(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' ||
        (message.params !== undefined && !jsonObject(message.params))) {
      throw new RpcError(-32600, 'Invalid JSON-RPC request.', 400);
    }

    if (!Object.hasOwn(message, 'id')) {
      // Initialization and cancellation notifications require no response body.
      if (typeof message.method === 'string' && message.method.startsWith('notifications/')) {
        protocolEra(req, message);
        return send(res, 202);
      }
      throw new RpcError(-32600, 'A request ID is required.', 400);
    }
    if (typeof message.id !== 'string' && !Number.isInteger(message.id)) throw new RpcError(-32600, 'Invalid request ID.', 400);
    id = message.id;
    const modern = protocolEra(req, message);
    const result = await dispatch(message.method, message.params ?? {}, req, modern);
    send(res, 200, { jsonrpc: '2.0', id, result: modern ? { resultType: 'complete', ...result } : result });
  } catch (error) {
    const failure = error instanceof RpcError ? error : new RpcError(-32603, 'Internal MCP server error.', 500);
    send(res, failure.status, { jsonrpc: '2.0', id, error: {
      code: failure.code, message: failure.message, ...(failure.data === undefined ? {} : { data: failure.data }),
    } });
  }
}
