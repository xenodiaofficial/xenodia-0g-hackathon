import { promises as fs } from 'fs';
import path from 'path';
import { sha256Hex } from '@/lib/zerog-live-evidence';

export type CapabilityReceiptStatus = 'success' | 'failed';

export type CapabilityReceiptInput = {
  providerId?: string;
  capabilitySlug: string;
  operation: string;
  requestId?: string;
  requestURL?: string;
  idempotencyKey?: string;
  input?: unknown;
  output?: unknown;
  status: CapabilityReceiptStatus;
  createdAt?: string;
};

export type CapabilityInvocationReceipt = ReturnType<typeof buildCapabilityInvocationReceipt>;

export const capabilityReceiptLogPath = path.resolve(process.cwd(), '..', 'tmp', '0g-capability-receipts.json');

function sanitizeRequestURL(value?: string) {
  if (!value) {
    return undefined;
  }
  try {
    const parsed = new URL(value, 'https://app.xenodia.local');
    return parsed.pathname;
  } catch {
    return value.split('?')[0];
  }
}

export function sanitizeAccountRef(account: unknown) {
  const record = account && typeof account === 'object' ? account as Record<string, unknown> : {};
  return {
    id: typeof record.id === 'number' || typeof record.id === 'string' ? String(record.id) : 'unknown',
    emailHash: typeof record.email === 'string' ? sha256Hex(record.email.toLowerCase()) : undefined,
    walletHash: typeof record.wallet_address === 'string' ? sha256Hex(record.wallet_address.toLowerCase()) : undefined,
  };
}

export function buildCapabilityInvocationReceipt(input: CapabilityReceiptInput, account: unknown) {
  const createdAt = input.createdAt || new Date().toISOString();
  const accountRef = sanitizeAccountRef(account);
  const inputHash = sha256Hex(input.input ?? {});
  const outputHash = sha256Hex(input.output ?? {});
  const providerId = input.providerId || input.capabilitySlug;
  const receiptCore = {
    accountRef,
    providerId,
    capabilitySlug: input.capabilitySlug,
    operation: input.operation,
    requestId: input.requestId,
    idempotencyKeyHash: input.idempotencyKey ? sha256Hex(input.idempotencyKey) : undefined,
    inputHash,
    outputHash,
    status: input.status,
    createdAt,
  };

  return {
    schema: 'xenodia.0g.capability-invocation-receipt.v1',
    receiptId: sha256Hex(receiptCore),
    providerId,
    capabilitySlug: input.capabilitySlug,
    operation: input.operation,
    requestId: input.requestId,
    requestURL: sanitizeRequestURL(input.requestURL),
    idempotencyKeyHash: input.idempotencyKey ? sha256Hex(input.idempotencyKey) : undefined,
    accountHash: sha256Hex(accountRef),
    inputHash,
    outputHash,
    status: input.status,
    createdAt,
  };
}

export async function readCapabilityReceiptLog(): Promise<CapabilityInvocationReceipt[]> {
  try {
    const raw = await fs.readFile(capabilityReceiptLogPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export async function writeCapabilityReceiptLog(items: CapabilityInvocationReceipt[]) {
  await fs.mkdir(path.dirname(capabilityReceiptLogPath), { recursive: true });
  await fs.writeFile(
    capabilityReceiptLogPath,
    JSON.stringify({
      schema: 'xenodia.0g.capability-receipt-log.v1',
      updatedAt: new Date().toISOString(),
      itemCount: items.length,
      items,
    }, null, 2),
  );
}

export function buildReceiptBatchPreview(items: CapabilityInvocationReceipt[]) {
  const receipts = items.map((item) => ({
    receiptId: item.receiptId,
    providerId: item.providerId,
    capabilitySlug: item.capabilitySlug,
    operation: item.operation,
    inputHash: item.inputHash,
    outputHash: item.outputHash,
    status: item.status,
    createdAt: item.createdAt,
  }));

  return {
    schema: 'xenodia.0g.capability-receipt-batch-preview.v1',
    batchId: sha256Hex({
      type: 'capability-receipts',
      count: receipts.length,
      firstReceiptId: receipts[0]?.receiptId,
      lastReceiptId: receipts[receipts.length - 1]?.receiptId,
    }),
    receiptCount: receipts.length,
    receiptRoot: sha256Hex({ receipts }),
    receipts,
    anchorStatus: 'pending_batch_upload',
  };
}
