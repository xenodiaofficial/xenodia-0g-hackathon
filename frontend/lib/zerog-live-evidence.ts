import { createHash } from 'crypto';

export const ZERO_G_EVIDENCE_CONTRACT = '0x808a9B90862ad495b0Ee97335f55D4c114A5EE7C';
export const ZERO_G_EXPLORER_BASE = 'https://chainscan.0g.ai';

export type LiveUniCatcherInvocation = {
  capabilitySlug: 'unicatcher-query';
  operation: string;
  receiptId?: string;
  inputHash?: string;
  outputHash?: string;
  requestId?: string;
  idempotencyKey?: string;
  requestURL?: string;
  input?: unknown;
  result?: unknown;
  status: 'success' | 'failed';
  createdAt?: string;
};

export type LiveUniCatcherReviewInput = {
  invocation: LiveUniCatcherInvocation;
  rating: number;
  comment?: string;
};

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

export function sha256Hex(value: unknown) {
  return `0x${createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

export function shortHash(value?: string | null) {
  if (!value) return 'pending';
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

export function sanitizeAccount(account: unknown) {
  const record = account && typeof account === 'object' ? account as Record<string, unknown> : {};
  return {
    id: typeof record.id === 'number' || typeof record.id === 'string' ? String(record.id) : 'unknown',
    emailHash: typeof record.email === 'string' ? sha256Hex(record.email.toLowerCase()) : undefined,
    walletHash: typeof record.wallet_address === 'string' ? sha256Hex(record.wallet_address.toLowerCase()) : undefined,
  };
}

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

export function buildLiveUniCatcherEvidence(input: LiveUniCatcherReviewInput, account: unknown, previousReviews: Array<{ rating: number }> = []) {
  const createdAt = new Date().toISOString();
  const invocation = {
    ...input.invocation,
    createdAt: input.invocation.createdAt || createdAt,
  };
  const accountRef = sanitizeAccount(account);
  const inputHash = invocation.inputHash || sha256Hex(invocation.input ?? {});
  const outputHash = invocation.outputHash || sha256Hex(invocation.result ?? {});
  const receipt = {
    schema: 'xenodia.0g.live-unicatcher-receipt.v1',
    receiptId: invocation.receiptId || sha256Hex({
      accountRef,
      capabilitySlug: invocation.capabilitySlug,
      operation: invocation.operation,
      idempotencyKey: invocation.idempotencyKey,
      inputHash,
      resultHash: outputHash,
      createdAt: invocation.createdAt,
    }),
    providerId: 'unicatcher',
    capabilitySlug: invocation.capabilitySlug,
    operation: invocation.operation,
    requestId: invocation.requestId,
    requestURL: sanitizeRequestURL(invocation.requestURL),
    idempotencyKeyHash: invocation.idempotencyKey ? sha256Hex(invocation.idempotencyKey) : undefined,
    accountHash: sha256Hex(accountRef),
    inputHash,
    outputHash,
    status: invocation.status,
    createdAt: invocation.createdAt,
  };
  const review = {
    schema: 'xenodia.0g.capability-review.v1',
    reviewId: sha256Hex({
      accountRef,
      receiptId: receipt.receiptId,
      rating: input.rating,
      commentHash: sha256Hex(input.comment || ''),
      createdAt,
    }),
    receiptId: receipt.receiptId,
    providerId: 'unicatcher',
    capabilitySlug: invocation.capabilitySlug,
    accountHash: receipt.accountHash,
    rating: input.rating,
    commentHash: sha256Hex(input.comment || ''),
    commentPreview: input.comment ? input.comment.slice(0, 160) : '',
    createdAt,
  };
  const reviewRatings = [...previousReviews.map((item) => item.rating), input.rating];
  const averageRating = reviewRatings.length
    ? Math.round((reviewRatings.reduce((sum, rating) => sum + rating, 0) / reviewRatings.length) * 100) / 100
    : input.rating;
  const reputation = {
    schema: 'xenodia.0g.provider-reputation-snapshot.v1',
    providerId: 'unicatcher',
    capabilitySlug: invocation.capabilitySlug,
    reviewCount: reviewRatings.length,
    averageRating,
    lastReceiptId: receipt.receiptId,
    lastReviewId: review.reviewId,
    updatedAt: createdAt,
  };
  const storagePayload = {
    schema: 'xenodia.0g.live-unicatcher-evidence-bundle.v1',
    generatedAt: createdAt,
    receipt,
    review,
    reputation,
  };
  const roots = {
    receiptRoot: sha256Hex(receipt),
    reviewRoot: sha256Hex(review),
    reputationRoot: sha256Hex(reputation),
    storageRoot: sha256Hex(storagePayload),
  };

  return {
    ...storagePayload,
    roots,
    chain: {
      network: '0g-mainnet',
      contractAddress: ZERO_G_EVIDENCE_CONTRACT,
      explorerContractURL: `${ZERO_G_EXPLORER_BASE}/address/${ZERO_G_EVIDENCE_CONTRACT}`,
      anchorStatus: 'ready_for_rollup',
      note: 'MVP batches live receipts and reviews before sending a root to 0G Storage and 0G Chain.',
    },
  };
}
