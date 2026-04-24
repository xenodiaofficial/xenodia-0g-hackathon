import 'dotenv/config';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildProofPayload, makeInitialState, mockExecuteCapability } from './proof-model.mjs';
import { sendProofPayload } from './chain-anchor.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(repoRoot, 'demo', 'public');
const defaultStatePath = path.join(repoRoot, 'tmp', 'demo-state.json');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8'
};

function readJSONBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const rawPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = path.normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, {
    'content-type': mimeTypes[ext] || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  fs.createReadStream(filePath).pipe(res);
}

function loadState(statePath) {
  if (!fs.existsSync(statePath)) {
    return makeInitialState();
  }

  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function saveState(statePath, state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function publicState(state) {
  const proofPayload = buildProofPayload(state);
  return {
    provider: state.provider,
    capability: state.capability,
    invocations: state.invocations,
    anchors: state.anchors,
    proofPayload
  };
}

export function createDemoServer({ statePath = defaultStatePath } = {}) {
  let state = loadState(statePath);

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');

      if (url.pathname === '/api/state' && req.method === 'GET') {
        json(res, 200, publicState(state));
        return;
      }

      if (url.pathname === '/api/reset' && req.method === 'POST') {
        state = makeInitialState();
        saveState(statePath, state);
        json(res, 200, publicState(state));
        return;
      }

      if (url.pathname === '/api/providers' && req.method === 'POST') {
        const body = await readJSONBody(req);
        state.provider = {
          ...state.provider,
          ...Object.fromEntries(
            Object.entries(body).filter(([, value]) => value !== undefined && value !== '')
          )
        };
        saveState(statePath, state);
        json(res, 200, publicState(state));
        return;
      }

      if (url.pathname === '/api/capabilities' && req.method === 'POST') {
        const body = await readJSONBody(req);
        state.capability = {
          ...state.capability,
          ...Object.fromEntries(
            Object.entries(body).filter(([, value]) => value !== undefined && value !== '')
          )
        };
        if (typeof state.capability.operations === 'string') {
          state.capability.operations = state.capability.operations
            .split(',')
            .map((operation) => operation.trim())
            .filter(Boolean);
        }
        saveState(statePath, state);
        json(res, 200, publicState(state));
        return;
      }

      if (url.pathname === '/api/invocations' && req.method === 'POST') {
        const body = await readJSONBody(req);
        const { response, receipt } = mockExecuteCapability(state, body);
        const invocation = {
          id: receipt.receiptId,
          prompt: String(body.prompt || ''),
          response,
          receipt
        };
        state.invocations.unshift(invocation);
        saveState(statePath, state);
        json(res, 201, { invocation, state: publicState(state) });
        return;
      }

      if (url.pathname === '/api/anchor' && req.method === 'POST') {
        const body = await readJSONBody(req);
        const payload = buildProofPayload(state);
        const anchor = {
          id: payload.settlementBatch.proofId,
          mode: body.send === true ? 'sent' : 'dry-run',
          createdAt: new Date().toISOString(),
          payload,
          txs: null
        };

        if (body.send === true) {
          anchor.txs = await sendProofPayload(payload);
        }

        state.anchors.unshift(anchor);
        saveState(statePath, state);
        json(res, 201, { anchor, state: publicState(state) });
        return;
      }

      if (url.pathname.startsWith('/api/')) {
        json(res, 404, { error: 'not_found' });
        return;
      }

      serveStatic(req, res);
    } catch (error) {
      json(res, 500, { error: error.message || 'internal_error' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4040);
  const server = createDemoServer();
  server.listen(port, () => {
    console.log(`Xenodia 0G demo running at http://localhost:${port}`);
  });
}
