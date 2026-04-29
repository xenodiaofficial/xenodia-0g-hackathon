const baseURL = process.env.XENODIA_BASE_URL || 'https://api.xenodia.xyz';
const token = process.env.XENODIA_BEARER_TOKEN || process.env.XENODIA_API_KEY;

if (!token) {
  console.log('live unicatcher smoke: skipped (set XENODIA_BEARER_TOKEN or XENODIA_API_KEY)');
  process.exit(0);
}

const idempotencyKey = `0g-live-unicatcher-${Date.now()}`;
const response = await fetch(`${baseURL}/v1/capabilities/unicatcher-query/invoke`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
  },
  body: JSON.stringify({
    mode: 'sync',
    input: {
      query: 'Find recent high-signal developments about 0G AI infra for a hackathon demo.',
      responseMode: 'evidence_only',
      includeEvidence: true,
      filters: {
        sourceTypes: ['twitter', 'reddit'],
        limit: 5,
      },
    },
  }),
});

const payload = await response.json().catch(() => ({}));
if (!response.ok) {
  throw new Error(`live unicatcher smoke failed: ${response.status} ${JSON.stringify(payload).slice(0, 500)}`);
}

console.log(JSON.stringify({
  ok: true,
  status: response.status,
  idempotencyKey,
  capability: payload.capability || payload.data?.capability || 'unicatcher-query',
  mode: payload.mode || payload.data?.mode || 'sync',
}, null, 2));
