import 'dotenv/config';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildProofPayload,
  buildSettlementLedger,
  makeInitialState,
  mockExecuteCapability
} from './proof-model.mjs';
import { sendProofPayload } from './chain-anchor.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(repoRoot, 'demo', 'public');
const docsDir = path.join(repoRoot, 'docs');
const defaultStatePath = path.join(repoRoot, 'tmp', 'demo-state.json');
const evidencePath = path.join(repoRoot, 'docs', 'mainnet-evidence.md');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
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

function csvEscape(value) {
  const text = String(value ?? '');
  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function csv(res, filename, rows) {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  res.writeHead(200, {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="${filename}"`,
    'cache-control': 'no-store'
  });
  res.end(`${content}\n`);
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/docs/')) {
    const safeDocPath = path.normalize(url.pathname.replace(/^\/docs\//, '')).replace(/^(\.\.[/\\])+/, '');
    const docPath = path.join(docsDir, safeDocPath);

    if (!docPath.startsWith(docsDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(docPath) || !fs.statSync(docPath).isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(docPath);
    res.writeHead(200, {
      'content-type': mimeTypes[ext] || 'text/plain; charset=utf-8',
      'cache-control': 'no-store'
    });
    fs.createReadStream(docPath).pipe(res);
    return;
  }

  const rawPath = url.pathname === '/'
    ? '/index.html'
    : url.pathname === '/0g-hackathon'
      ? '/0g-hackathon.html'
      : url.pathname;
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

function loadEvidenceStatus() {
  if (!fs.existsSync(evidencePath)) {
    return {
      status: 'missing',
      contractAddress: null,
      explorerUrl: 'https://chainscan.0g.ai'
    };
  }

  const evidence = fs.readFileSync(evidencePath, 'utf8');
  const status = evidence.match(/^Status:\s*(.+)$/m)?.[1]?.trim() || 'unknown';
  const contractAddress =
    evidence.match(/- Registry contract:\s*\[([^\]]+)\]/)?.[1] ||
    evidence.match(/- Contract:\s*`([^`]+)`/)?.[1] ||
    null;
  const deployTransaction =
    evidence.match(/- Deploy tx:\s*\[([^\]]+)\]/)?.[1] ||
    evidence.match(/- Deploy transaction:\s*\[([^\]]+)\]/)?.[1] ||
    null;

  return {
    status,
    contractAddress,
    deployTransaction,
    explorerUrl: 'https://chainscan.0g.ai',
    evidenceFile: 'docs/mainnet-evidence.md'
  };
}

function saveState(statePath, state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function buildJudgeChecklist(state) {
  const proofPayload = buildProofPayload(state);
  const ledger = buildSettlementLedger(state);
  const evidence = loadEvidenceStatus();

  return {
    headline: 'Xenodia is a verifiable capability layer on 0G.',
    track: 'Agentic Economy & Autonomous Applications',
    chainStatus: evidence,
    runbook: [
      'Start the local demo with npm run demo:start.',
      'Create or review the provider-level identity.',
      'Publish a versioned capability manifest and inspect its hash.',
      'Invoke the mock executor to create receipts without exposing LLM API code.',
      'Inspect receipt and settlement roots, then export the settlement accounting ledger.',
      'Review docs/mainnet-evidence.md for mainnet contract, Storage roots, and anchor transactions.'
    ],
    checklist: [
      {
        label: 'Production LLM layer excluded',
        status: 'complete',
        detail: 'The executor is deterministic and marked productionLLM=false.'
      },
      {
        label: 'Provider identity and rank',
        status: proofPayload.profile.profileHash ? 'complete' : 'missing',
        detail: `${state.provider.displayName} (${state.provider.providerKind}) rank ${state.provider.rank}`
      },
      {
        label: 'Capability manifest proof',
        status: proofPayload.capability.proofId ? 'complete' : 'missing',
        detail: proofPayload.capability.proofId
      },
      {
        label: 'Receipt batch proof',
        status: proofPayload.receiptBatch.receiptCount > 0 ? 'complete' : 'needs_invocation',
        detail: `${proofPayload.receiptBatch.receiptCount} receipt(s), root ${proofPayload.receiptBatch.receiptRoot}`
      },
      {
        label: 'Settlement accounting ledger',
        status: ledger.totals.invocationCount > 0 ? 'complete' : 'needs_invocation',
        detail: `${ledger.totals.invocationCount} record(s), provider share ${ledger.totals.providerShareMicroUSDC} microUSDC`
      },
      {
        label: '0G chain evidence',
        status: ['anchored', 'deployed'].includes(evidence.status) ? 'complete' : 'missing',
        detail: evidence.contractAddress || 'Waiting for mainnet evidence.'
      }
    ]
  };
}

function publicState(state) {
  const proofPayload = buildProofPayload(state);
  return {
    provider: state.provider,
    capability: state.capability,
    invocations: state.invocations,
    anchors: state.anchors,
    proofPayload,
    settlementLedger: buildSettlementLedger(state),
    judgeChecklist: buildJudgeChecklist(state)
  };
}

function ledgerCsvRows(state) {
  const ledger = buildSettlementLedger(state);
  return [
    [
      'invocation_id',
      'receipt_id',
      'provider',
      'capability_slug',
      'capability_version',
      'gross_amount_micro_usdc',
      'provider_share_micro_usdc',
      'platform_share_micro_usdc',
      'status',
      'created_at'
    ],
    ...ledger.rows.map((row) => [
      row.invocationId,
      row.receiptId,
      row.provider,
      row.capabilitySlug,
      row.capabilityVersion,
      row.grossAmountMicroUSDC,
      row.providerShareMicroUSDC,
      row.platformShareMicroUSDC,
      row.status,
      row.createdAt
    ])
  ];
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

      if (url.pathname === '/api/ledger.csv' && req.method === 'GET') {
        csv(res, 'xenodia-0g-settlement-ledger.csv', ledgerCsvRows(state));
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
