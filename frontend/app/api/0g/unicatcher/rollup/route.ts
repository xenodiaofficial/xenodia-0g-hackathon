import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { NextRequest } from 'next/server';
import { ZERO_G_EVIDENCE_CONTRACT, ZERO_G_EXPLORER_BASE } from '@/lib/zerog-live-evidence';
import { resolveAuthBaseURL } from '@/lib/server/api-proxy';

export const dynamic = 'force-dynamic';

const frontendRoot = process.cwd();
const repoRoot = path.resolve(frontendRoot, '..');
const evidenceLogPath = path.join(repoRoot, 'tmp', '0g-live-unicatcher-evidence.json');
const frontendEvidencePath = path.join(frontendRoot, 'content', 'zerog-live-evidence.json');

type AnchorResult = {
  status?: string;
  itemCount?: number;
  rollupRoot?: string;
  storageURI?: string;
  storageTx?: string;
  receiptBatchProofId?: string;
  receiptBatchTx?: string;
  liveEvidenceDocPath?: string;
  publicLiveEvidenceDocPath?: string;
  frontendEvidencePath?: string;
};

async function readJSON(filePath: string, fallback: unknown) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readLocalEvidenceCount() {
  const payload = await readJSON(evidenceLogPath, { items: [] });
  return Array.isArray((payload as { items?: unknown[] }).items) ? (payload as { items: unknown[] }).items.length : 0;
}

async function readAnchoredEvidence() {
  const payload = await readJSON(frontendEvidencePath, null);
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  return payload as Record<string, unknown>;
}

async function buildStatus(anchorResult?: AnchorResult) {
  const localEvidenceCount = await readLocalEvidenceCount();
  const anchoredEvidence = await readAnchoredEvidence();
  const anchoredItemCount = Number(anchoredEvidence?.itemCount || 0);
  const pendingItemCount = Math.max(localEvidenceCount - anchoredItemCount, 0);
  const explorerBase = typeof anchoredEvidence?.explorerBase === 'string' ? anchoredEvidence.explorerBase : ZERO_G_EXPLORER_BASE;
  const contractAddress = typeof anchoredEvidence?.contractAddress === 'string'
    ? anchoredEvidence.contractAddress
    : ZERO_G_EVIDENCE_CONTRACT;

  return {
    localEvidenceCount,
    anchoredItemCount,
    pendingItemCount,
    contractAddress,
    explorerBase,
    contractURL: `${explorerBase}/address/${contractAddress}`,
    anchoredEvidence,
    anchorResult,
  };
}

async function verifyAccount(authorization: string) {
  const response = await fetch(`${resolveAuthBaseURL()}/v1/me`, {
    cache: 'no-store',
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: response.status, payload };
  }
  return { ok: true, status: response.status, payload };
}

function parseAnchorOutput(stdout: string): AnchorResult {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!line.startsWith('{') || !line.endsWith('}')) {
      continue;
    }
    try {
      return JSON.parse(line) as AnchorResult;
    } catch {
      // Keep scanning earlier lines; script output may contain build logs first.
    }
  }
  throw new Error('0G anchoring finished without a parseable JSON result.');
}

async function runAnchorScript() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const env = {
    ...process.env,
    PROOF_REGISTRY_ADDRESS: process.env.PROOF_REGISTRY_ADDRESS || ZERO_G_EVIDENCE_CONTRACT,
    ZERO_G_RPC_URL: process.env.ZERO_G_RPC_URL || 'https://evmrpc.0g.ai',
    ZERO_G_CHAIN_ID: process.env.ZERO_G_CHAIN_ID || '16661',
    ZERO_G_NETWORK_NAME: process.env.ZERO_G_NETWORK_NAME || '0G Mainnet',
    ZERO_G_EXPLORER_BASE: process.env.ZERO_G_EXPLORER_BASE || ZERO_G_EXPLORER_BASE,
    ZERO_G_STORAGE_INDEXER_RPC: process.env.ZERO_G_STORAGE_INDEXER_RPC || 'https://indexer-storage-turbo.0g.ai',
  };

  await new Promise<void>((resolve, reject) => {
    const child = spawn('npm', ['run', 'live:upload:0g-mainnet'], {
      cwd: repoRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => stdout.push(String(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(String(chunk)));
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.join('').trim() || `0G anchor script exited with ${signal || code}.`));
    });
  });

  return parseAnchorOutput(stdout.join(''));
}

export async function GET() {
  return Response.json({ data: await buildStatus() });
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    return Response.json({ error: 'unauthorized', message: 'Bearer token is required.' }, { status: 401 });
  }

  const account = await verifyAccount(authorization);
  if (!account.ok) {
    return Response.json({ error: 'unauthorized', message: 'Xenodia account verification failed.', details: account.payload }, { status: 401 });
  }

  const localEvidenceCount = await readLocalEvidenceCount();
  if (localEvidenceCount === 0) {
    return Response.json({ error: 'empty_rollup', message: 'No local UniCatcher evidence is ready for 0G rollup.' }, { status: 400 });
  }

  try {
    const anchorResult = await runAnchorScript();
    return Response.json({ data: await buildStatus(anchorResult) });
  } catch (error) {
    return Response.json(
      {
        error: 'anchor_failed',
        message: error instanceof Error ? error.message : '0G anchoring failed.',
        data: await buildStatus(),
      },
      { status: 500 },
    );
  }
}
