# 0G Call Receipts and Proof Center

## Goal

Every capability invocation should leave verifiable evidence, without sending one chain transaction per request.

## Target Flow

1. A user or agent invokes a Xenodia capability.
2. The 0G branch sends the invocation through a server-side wrapper, so the receipt is created from the actual upstream response instead of a client-submitted claim.
3. Xenodia immediately creates a local invocation receipt.
4. The receipt stores hashes and metadata, not raw prompts or raw provider output.
5. Many receipts are rolled into a batch.
6. The batch JSON is uploaded to 0G Storage.
7. The batch root and 0G Storage URI are anchored to 0G Chain.
8. If a dispute happens later, the user or platform can recompute hashes from the original input/output and prove whether they match the anchored receipt.

## Receipt Fields

- `receiptId`
- `providerId`
- `capabilitySlug`
- `operation`
- `requestId`
- `requestURL`
- `accountHash`
- `inputHash`
- `outputHash`
- `status`
- `createdAt`

## Review Relationship

Reviews are optional. Receipts are mandatory.

A review points to a specific invocation through `receiptId`. Provider rank should aggregate confirmed receipts, optional reviews, dispute signals, success rate, and recent performance.

## Default Rating Policy

There should be no automatic 24-hour default good review.

Silence is a neutral usage signal, not a positive rating. The system should count:

- Invocation count.
- Success rate.
- Active ratings.
- Dispute rate.
- Recent behavior.

## Proof Center

The product needs a Proof Center so users and operators can verify evidence after the fact.

Minimum tools:

- Search by `receiptId` or `requestId`.
- Paste original API response content.
- Recompute `outputHash`.
- Check whether it matches the receipt.
- Show 0G Storage URI and chain anchor when the receipt batch has been uploaded.
- Generate a dispute evidence report when mismatched, malicious, or low-quality output is reported.

## MVP Boundary

For the 0G hackathon branch, the implementation records local receipts for capability invocations, supports UniCatcher reviews as optional evidence, and adds a local Proof Center for hash verification.

Implemented paths:

- `/api/0g/capability-invoke`: server-side invoke wrapper that forwards the capability call and records the receipt from the actual response.
- `/api/0g/capability-receipts`: internal-only receipt writer for controlled ingestion.
- `/0g-proof-center`: product verifier for recomputing hashes and matching receipts.
- `npm run receipts:upload:0g-testnet`: uploads the local receipt buffer as a 0G Storage batch and anchors it with `ZeroGProofRegistry.anchorReceiptBatch`.
