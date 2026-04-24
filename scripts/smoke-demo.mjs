import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDemoServer } from '../demo/server.mjs';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xenodia-0g-demo-'));
const statePath = path.join(tmpDir, 'state.json');
const server = createDemoServer({ statePath });

function listen() {
  return new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });
}

function close() {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function request(baseURL, route, body) {
  const res = await fetch(`${baseURL}${route}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  assert.ok(res.ok, `${route} failed: ${JSON.stringify(data)}`);
  return data;
}

try {
  const port = await listen();
  const baseURL = `http://127.0.0.1:${port}`;
  const initialState = await request(baseURL, '/api/state');
  assert.equal(initialState.provider.displayName, 'Xenodia Demo Provider');
  assert.equal(initialState.invocations.length, 0);
  assert.match(initialState.judgeChecklist.chainStatus.status, /^(pending faucet funding|deployed)$/);
  assert.equal(initialState.judgeChecklist.track, 'Agentic Economy & Autonomous Applications');

  const invocation = await request(baseURL, '/api/invocations', {
    prompt: 'Find x402 payment-aware providers for an autonomous agent.'
  });
  assert.equal(invocation.state.invocations.length, 1);
  assert.equal(invocation.invocation.response.productionLLM, false);

  const anchor = await request(baseURL, '/api/anchor', { send: false });
  assert.equal(anchor.anchor.mode, 'dry-run');
  assert.equal(anchor.anchor.payload.receiptBatch.receiptCount, 1);
  assert.match(anchor.anchor.payload.capability.proofId, /^0x[0-9a-f]{64}$/i);
  assert.match(anchor.anchor.payload.settlementBatch.proofId, /^0x[0-9a-f]{64}$/i);

  const ledger = await request(baseURL, '/api/state');
  assert.equal(ledger.settlementLedger.totals.invocationCount, 1);
  assert.equal(ledger.settlementLedger.totals.providerShareMicroUSDC, 98000);
  assert.ok(ledger.judgeChecklist.checklist.some((item) => item.label === 'Offline settlement ledger'));

  const csvRes = await fetch(`${baseURL}/api/ledger.csv`);
  const csv = await csvRes.text();
  assert.ok(csvRes.ok, csv);
  assert.match(csv, /provider_share_micro_usdc/);
  assert.match(csv, /recorded_for_offline_settlement/);

  console.log('demo smoke: passed');
} finally {
  await close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
