import type { NextRequest } from 'next/server';
import {
  buildCapabilityInvocationReceipt,
  readCapabilityReceiptLog,
  writeCapabilityReceiptLog,
} from '@/lib/zerog-capability-receipts';
import { resolveAuthBaseURL, resolveGatewayBaseURL } from '@/lib/server/api-proxy';

export const dynamic = 'force-dynamic';

type InvokeBody = {
  capabilitySlug?: string;
  providerId?: string;
  operation?: string;
  method?: string;
  requestURL?: string;
  idempotencyKey?: string;
  mode?: string;
  input?: Record<string, unknown>;
};

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

function normalizeMethod(value: unknown) {
  const method = typeof value === 'string' ? value.toUpperCase() : 'POST';
  return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? method : 'POST';
}

function normalizeInvokeBody(body: unknown): Required<Pick<InvokeBody, 'capabilitySlug' | 'operation' | 'requestURL'>> & InvokeBody {
  const record = body && typeof body === 'object' ? body as InvokeBody : {};
  const capabilitySlug = typeof record.capabilitySlug === 'string' ? record.capabilitySlug.trim() : '';
  const operation = typeof record.operation === 'string' ? record.operation.trim() : '';
  const requestURL = typeof record.requestURL === 'string' ? record.requestURL.trim() : '';
  if (!capabilitySlug || !operation || !requestURL) {
    throw new Error('capabilitySlug, operation, and requestURL are required.');
  }

  const parsed = new URL(requestURL, 'https://app.xenodia.local');
  const expectedPrefix = `/v1/capabilities/${capabilitySlug}/`;
  if (!parsed.pathname.startsWith(expectedPrefix)) {
    throw new Error(`requestURL must target ${expectedPrefix}.`);
  }

  return {
    ...record,
    capabilitySlug,
    operation,
    requestURL: `${parsed.pathname}${parsed.search}`,
    method: normalizeMethod(record.method),
    input: record.input && typeof record.input === 'object' && !Array.isArray(record.input) ? record.input : {},
  };
}

async function readUpstreamResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function persistReceipt(receipt: ReturnType<typeof buildCapabilityInvocationReceipt>) {
  const previousItems = await readCapabilityReceiptLog();
  const dedupedItems = previousItems.filter((item) => item.receiptId !== receipt.receiptId);
  const nextItems = [receipt, ...dedupedItems].slice(0, 500);
  await writeCapabilityReceiptLog(nextItems);
  return nextItems.length;
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

  let body: ReturnType<typeof normalizeInvokeBody>;
  try {
    body = normalizeInvokeBody(await request.json());
  } catch (error) {
    return Response.json({ error: 'bad_request', message: error instanceof Error ? error.message : 'Invalid invoke payload.' }, { status: 400 });
  }

  const method = normalizeMethod(body.method);
  const upstreamURL = new URL(body.requestURL, resolveGatewayBaseURL());
  const idempotencyKey = body.idempotencyKey || `cap-${body.capabilitySlug}-${Date.now()}`;
  const createdAt = new Date().toISOString();
  let upstreamStatus = 502;
  let output: unknown = {};

  try {
    const upstream = await fetch(upstreamURL, {
      method,
      cache: 'no-store',
      headers: {
        Authorization: authorization,
        ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
        'Idempotency-Key': idempotencyKey,
      },
      ...(method !== 'GET'
        ? {
            body: JSON.stringify({
              mode: body.mode || undefined,
              input: body.input || {},
            }),
          }
        : {}),
    });
    upstreamStatus = upstream.status;
    output = await readUpstreamResponse(upstream);
  } catch (error) {
    output = { error: error instanceof Error ? error.message : 'Upstream invoke failed.' };
  }

  const receipt = buildCapabilityInvocationReceipt(
    {
      providerId: body.providerId || body.capabilitySlug,
      capabilitySlug: body.capabilitySlug,
      operation: body.operation,
      requestId: output && typeof output === 'object' && 'request_id' in output && typeof output.request_id === 'string'
        ? output.request_id
        : output && typeof output === 'object' && 'requestId' in output && typeof output.requestId === 'string'
          ? output.requestId
          : undefined,
      requestURL: body.requestURL,
      idempotencyKey,
      input: body.input || {},
      output,
      status: upstreamStatus >= 200 && upstreamStatus < 300 ? 'success' : 'failed',
      createdAt,
    },
    account.payload?.account || account.payload?.data || account.payload,
  );
  const receiptCount = await persistReceipt(receipt);

  return Response.json(
    {
      data: {
        output,
        receipt,
        receiptLog: {
          scope: 'local-rollup-buffer',
          itemCount: receiptCount,
        },
        upstreamStatus,
      },
    },
    { status: upstreamStatus >= 200 && upstreamStatus < 300 ? 200 : upstreamStatus },
  );
}
