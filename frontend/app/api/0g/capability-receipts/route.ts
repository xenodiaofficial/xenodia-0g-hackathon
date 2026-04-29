import type { NextRequest } from 'next/server';
import {
  buildCapabilityInvocationReceipt,
  buildReceiptBatchPreview,
  readCapabilityReceiptLog,
  writeCapabilityReceiptLog,
  type CapabilityReceiptInput,
} from '@/lib/zerog-capability-receipts';
import { resolveAuthBaseURL } from '@/lib/server/api-proxy';

export const dynamic = 'force-dynamic';

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

function normalizeReceiptInput(body: unknown): CapabilityReceiptInput {
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const invocation = record.invocation && typeof record.invocation === 'object'
    ? record.invocation as Record<string, unknown>
    : {};
  const capabilitySlug = typeof invocation.capabilitySlug === 'string' ? invocation.capabilitySlug : '';
  const operation = typeof invocation.operation === 'string' ? invocation.operation : '';
  const status = invocation.status === 'failed' ? 'failed' : 'success';

  if (!capabilitySlug || !operation) {
    throw new Error('capabilitySlug and operation are required.');
  }

  return {
    providerId: typeof invocation.providerId === 'string' ? invocation.providerId : capabilitySlug,
    capabilitySlug,
    operation,
    requestId: typeof invocation.requestId === 'string' ? invocation.requestId : undefined,
    requestURL: typeof invocation.requestURL === 'string' ? invocation.requestURL : undefined,
    idempotencyKey: typeof invocation.idempotencyKey === 'string' ? invocation.idempotencyKey : undefined,
    input: invocation.input,
    output: invocation.output,
    status,
    createdAt: typeof invocation.createdAt === 'string' ? invocation.createdAt : undefined,
  };
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
  const internalKey = process.env.ZERO_G_INTERNAL_RECEIPT_KEY;
  if (!internalKey || request.headers.get('x-xenodia-0g-internal') !== internalKey) {
    return Response.json({ error: 'forbidden', message: 'Direct receipt recording is internal-only. Use /api/0g/capability-invoke for faithful invocation receipts.' }, { status: 403 });
  }

  let normalized: CapabilityReceiptInput;
  try {
    normalized = normalizeReceiptInput(await request.json());
  } catch (error) {
    return Response.json({ error: 'bad_request', message: error instanceof Error ? error.message : 'Invalid receipt payload.' }, { status: 400 });
  }

  const receipt = buildCapabilityInvocationReceipt(normalized, account.payload?.account || account.payload?.data || account.payload);
  const previousItems = await readCapabilityReceiptLog();
  const dedupedItems = previousItems.filter((item) => item.receiptId !== receipt.receiptId);
  const nextItems = [receipt, ...dedupedItems].slice(0, 500);
  await writeCapabilityReceiptLog(nextItems);

  return Response.json({
    data: {
      receipt,
      batchPreview: buildReceiptBatchPreview(nextItems),
    },
  });
}
