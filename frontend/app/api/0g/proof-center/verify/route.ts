import { promises as fs } from 'fs';
import path from 'path';
import type { NextRequest } from 'next/server';
import { sha256Hex } from '@/lib/zerog-live-evidence';
import {
  buildReceiptBatchPreview,
  readCapabilityReceiptLog,
  type CapabilityInvocationReceipt,
} from '@/lib/zerog-capability-receipts';

export const dynamic = 'force-dynamic';

const liveEvidencePath = path.resolve(process.cwd(), 'content', 'zerog-live-evidence.json');
const receiptBatchIndexPath = path.resolve(process.cwd(), 'content', 'zerog-receipt-batches.json');

type ReceiptCandidate = CapabilityInvocationReceipt & {
  source: string;
  storageURI?: string;
  chainTx?: string;
};

function parseEvidenceContent(raw: unknown) {
  if (typeof raw !== 'string') {
    return raw ?? {};
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

async function readLiveRollupReceipts(): Promise<ReceiptCandidate[]> {
  try {
    const evidence = JSON.parse(await fs.readFile(liveEvidencePath, 'utf8').catch(() => '{}'));
    const itemCount = Number(evidence.itemCount || 0);
    const rollupArtifactName = Number.isFinite(itemCount) && itemCount > 0
      ? `unicatcher-live-evidence-rollup-${itemCount}.json`
      : 'unicatcher-live-evidence-rollup-2.json';
    const liveRollupPath = path.resolve(process.cwd(), '..', 'docs', 'evidence-artifacts', rollupArtifactName);
    const rollup = JSON.parse(await fs.readFile(liveRollupPath, 'utf8'));
    const items = Array.isArray(rollup.items) ? rollup.items : [];
    return items
      .map((item: { receipt?: CapabilityInvocationReceipt }) => item.receipt)
      .filter(Boolean)
      .map((receipt: CapabilityInvocationReceipt) => ({
        ...receipt,
        source: '0g-live-rollup',
        storageURI: typeof evidence.storageURI === 'string' ? evidence.storageURI : undefined,
        chainTx: typeof evidence.receiptBatchTx === 'string' ? evidence.receiptBatchTx : undefined,
      }));
  } catch {
    return [];
  }
}

async function readAnchoredReceiptBatchReceipts(): Promise<ReceiptCandidate[]> {
  try {
    const index = JSON.parse(await fs.readFile(receiptBatchIndexPath, 'utf8'));
    const batches = Array.isArray(index.batches) ? index.batches : [];
    const receipts = await Promise.all(batches.map(async (batch: {
      artifactPath?: string;
      storageURI?: string;
      anchorTx?: string;
    }) => {
      if (!batch.artifactPath) {
        return [];
      }
      const artifactPath = path.resolve(process.cwd(), '..', batch.artifactPath);
      const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
      const items = Array.isArray(artifact.receipts) ? artifact.receipts : [];
      return items.map((receipt: CapabilityInvocationReceipt) => ({
        ...receipt,
        source: '0g-receipt-batch',
        storageURI: batch.storageURI,
        chainTx: batch.anchorTx,
      }));
    }));
    return receipts.flat();
  } catch {
    return [];
  }
}

function scoreReceipt(receipt: ReceiptCandidate, query: { receiptId?: string; requestId?: string; outputHash: string; inputHash?: string }) {
  let score = 0;
  if (query.receiptId && receipt.receiptId === query.receiptId) score += 10;
  if (query.requestId && receipt.requestId === query.requestId) score += 6;
  if (receipt.outputHash === query.outputHash) score += 4;
  if (query.inputHash && receipt.inputHash === query.inputHash) score += 2;
  return score;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    receiptId?: string;
    requestId?: string;
    output?: unknown;
    input?: unknown;
  };
  const output = parseEvidenceContent(body.output);
  const input = typeof body.input === 'undefined' ? undefined : parseEvidenceContent(body.input);
  const outputHash = sha256Hex(output);
  const inputHash = typeof body.input === 'undefined' ? undefined : sha256Hex(input);
  const localReceipts = (await readCapabilityReceiptLog()).map((receipt) => ({ ...receipt, source: 'local-receipt-buffer' }));
  const liveRollupReceipts = await readLiveRollupReceipts();
  const anchoredBatchReceipts = await readAnchoredReceiptBatchReceipts();
  const candidates = [...localReceipts, ...liveRollupReceipts, ...anchoredBatchReceipts];
  const matches = candidates
    .map((receipt) => ({ receipt, score: scoreReceipt(receipt, { receiptId: body.receiptId, requestId: body.requestId, outputHash, inputHash }) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);
  const best = matches[0]?.receipt || null;
  const outputMatches = Boolean(best && best.outputHash === outputHash);
  const inputMatches = typeof inputHash === 'undefined' ? null : Boolean(best && best.inputHash === inputHash);

  return Response.json({
    data: {
      verified: Boolean(best && outputMatches && (inputMatches !== false)),
      outputHash,
      inputHash,
      bestMatch: best,
      outputMatches,
      inputMatches,
      batchPreview: buildReceiptBatchPreview(localReceipts),
      matchCount: matches.length,
      explanation: best
        ? outputMatches
          ? 'The submitted output hashes to the receipt outputHash.'
          : 'A receipt was found, but the submitted output does not match its outputHash.'
        : 'No matching receipt was found in the local buffer or live 0G rollup artifact.',
    },
  });
}
