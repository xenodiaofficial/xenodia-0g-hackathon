# Live UniCatcher 0G Integration

This branch upgrades UniCatcher from a static evidence story into a real capability-market flow.

## Runtime Path

1. Web users sign in through the normal Xenodia auth flow.
2. `/capabilities/unicatcher-query` loads the real capability descriptor from `https://api.xenodia.xyz`.
3. The user invokes UniCatcher through the existing gateway endpoint:
   `POST /v1/capabilities/unicatcher-query/invoke`.
4. The user submits a rating and review for the completed invocation.
5. The 0G branch builds a sanitized receipt, review, and reputation snapshot:
   raw query text, raw response text, bearer tokens, and upstream UniCatcher keys are not written on-chain.

## API Path

Developers use the same production API:

```bash
curl -X POST https://api.xenodia.xyz/v1/capabilities/unicatcher-query/invoke \
  -H "Authorization: Bearer $XENODIA_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-unicatcher-$(date +%s)" \
  -d '{
    "mode": "sync",
    "input": {
      "query": "Find recent high-signal developments about 0G AI infra",
      "responseMode": "evidence_only",
      "includeEvidence": true,
      "filters": { "sourceTypes": ["twitter", "reddit"], "limit": 5 }
    }
  }'
```

## 0G Evidence

The MVP evidence bundle contains:

- `receiptRoot`: hash of the authenticated invocation receipt.
- `reviewRoot`: hash of the authenticated user review.
- `reputationRoot`: hash of the provider-level rating snapshot.
- `storageRoot`: hash of the bundled JSON that is ready for 0G Storage upload.

The live page marks these roots as `ready_for_rollup`; the next step is batching them into 0G Storage and anchoring the roots through `ZeroGProofRegistry`.
