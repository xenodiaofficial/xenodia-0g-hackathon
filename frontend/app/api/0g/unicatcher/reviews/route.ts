import { promises as fs } from 'fs';
import path from 'path';
import type { NextRequest } from 'next/server';
import {
  buildLiveUniCatcherEvidence,
  type LiveUniCatcherReviewInput,
} from '@/lib/zerog-live-evidence';
import { resolveZeroGAuthBaseURL } from '@/lib/server/zerog-upstream';

export const dynamic = 'force-dynamic';

const evidencePath = path.resolve(process.cwd(), '..', 'tmp', '0g-live-unicatcher-evidence.json');

async function readEvidenceLog(): Promise<Array<ReturnType<typeof buildLiveUniCatcherEvidence>>> {
  try {
    const raw = await fs.readFile(evidencePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function writeEvidenceLog(items: Array<ReturnType<typeof buildLiveUniCatcherEvidence>>) {
  await fs.mkdir(path.dirname(evidencePath), { recursive: true });
  await fs.writeFile(
    evidencePath,
    JSON.stringify({
      schema: 'xenodia.0g.live-unicatcher-evidence-log.v1',
      updatedAt: new Date().toISOString(),
      items,
    }, null, 2),
  );
}

async function verifyAccount(authorization: string) {
  const response = await fetch(`${resolveZeroGAuthBaseURL()}/v1/me`, {
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

function normalizeRating(value: unknown) {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5.');
  }
  return Math.round(rating);
}

function normalizeComment(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, 500);
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

  const body = await request.json().catch(() => null) as LiveUniCatcherReviewInput | null;
  if (!body || !body.invocation || body.invocation.capabilitySlug !== 'unicatcher-query') {
    return Response.json({ error: 'bad_request', message: 'A UniCatcher invocation payload is required.' }, { status: 400 });
  }
  if (body.invocation.status !== 'success') {
    return Response.json({ error: 'bad_request', message: 'Only successful UniCatcher invocations can be reviewed for this proof.' }, { status: 400 });
  }

  let rating: number;
  try {
    rating = normalizeRating(body.rating);
  } catch (error) {
    return Response.json({ error: 'bad_request', message: error instanceof Error ? error.message : 'Invalid rating.' }, { status: 400 });
  }

  const previousItems = await readEvidenceLog();
  const previousReviews = previousItems.map((item) => ({ rating: Number(item.review?.rating || 0) })).filter((item) => item.rating > 0);
  const evidence = buildLiveUniCatcherEvidence(
    {
      ...body,
      rating,
      comment: normalizeComment(body.comment),
    },
    account.payload?.account || account.payload?.data || account.payload,
    previousReviews,
  );
  const nextItems = [evidence, ...previousItems].slice(0, 50);
  await writeEvidenceLog(nextItems);

  return Response.json({
    data: evidence,
    evidenceLog: {
      scope: 'local-rollup-buffer',
      itemCount: nextItems.length,
    },
  });
}
