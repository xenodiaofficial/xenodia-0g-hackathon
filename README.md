# Xenodia x 0G

Xenodia turns 0G into a verifiable evidence layer for agent capabilities.

The demo focuses on a real capability-market flow: a signed-in Xenodia user invokes UniCatcher, records a sanitized service receipt, optionally submits a review, batches the evidence, stores the batch on 0G Storage, and anchors the batch root on 0G Chain.

Production LLM routing, upstream provider credentials, private billing internals, production environment files, and operational logs are intentionally excluded.

## What 0G Adds

- Provider-level evidence: capability providers can build a public trail of service activity and reputation.
- Tamper-evident receipts: each invocation records input/output hashes, status, and request metadata without exposing raw user data.
- Batched anchoring: many local receipts and reviews are aggregated into one rollup root before writing to 0G.
- Decentralized evidence storage: the full sanitized batch JSON is uploaded to 0G Storage.
- On-chain proof registry: the batch root, storage URI, item count, and proof ID are anchored on 0G Chain.

## Mainnet Evidence

- 0G Registry contract: [`0x808a9B90862ad495b0Ee97335f55D4c114A5EE7C`](https://chainscan.0g.ai/address/0x808a9B90862ad495b0Ee97335f55D4c114A5EE7C)
- Contract deploy tx: [`0xf108ae9d41a3b8e9b3909a7ba54dc1f3e89f0c98bb2af4a91f4a5cba062e3828`](https://chainscan.0g.ai/tx/0xf108ae9d41a3b8e9b3909a7ba54dc1f3e89f0c98bb2af4a91f4a5cba062e3828)
- Latest UniCatcher rollup items: `6`
- Latest rollup root: `0x8954f1f62f2432b758b532788903199f073df5303b86a431aaae9fbbb6b4f97c`
- Latest 0G Storage root: `0xae8b2bfbc9ca4a7489de66590322e3d76ddaaebe1d4e3c944dc67b2d5653723f`
- Latest 0G Storage URI: `0g://storage/0xae8b2bfbc9ca4a7489de66590322e3d76ddaaebe1d4e3c944dc67b2d5653723f`
- Latest 0G Storage tx: [`0x5c721f5b8d0d7d5dd9df5c276c3f655d83235abf732549a57d36c557a8e2734f`](https://chainscan.0g.ai/tx/0x5c721f5b8d0d7d5dd9df5c276c3f655d83235abf732549a57d36c557a8e2734f)
- Latest proof ID: `0xef6a763f74aef5d063d07692f377c583f6a44570478123186be10c9ec0053d88`
- Latest 0G Chain anchor tx: [`0xdc94d946c992ec9e48fc440af224ddf504b31078245b6c62cf65579d8d69229a`](https://chainscan.0g.ai/tx/0xdc94d946c992ec9e48fc440af224ddf504b31078245b6c62cf65579d8d69229a)

## User Flow

1. Open the capability market and sign in.
2. Invoke UniCatcher through Xenodia with normal user-side authentication.
3. Xenodia records a local receipt hash for the invocation.
4. The user submits a rating/review for that invocation.
5. The local evidence batch shows pending and anchored item counts.
6. The operator uploads the batch to 0G Storage and anchors the batch root on 0G Chain.
7. The page displays the storage transaction, storage URI, storage root, rollup root, proof ID, and chain anchor transaction.

## Review Scope

This public repository is intentionally review-focused. It contains the 0G integration code, sanitized frontend slices, the proof registry contract, and the current mainnet evidence artifacts.

The complete Xenodia product shell, private runtime configuration, production API services, and local demo wallet are not included.

## Repository Contents

- `contracts/ZeroGProofRegistry.sol`: minimal proof registry used for 0G anchoring.
- `frontend/`: sanitized 0G pages, proof center, UniCatcher proof panel, and 0G API routes.
- `backend/`: sanitized 0G-specific backend models and migration slices.
- `docs/evidence-artifacts/`: sanitized JSON evidence artifacts used by the proof center.
- `scripts/upload-live-unicatcher-evidence.mjs`: uploads the live UniCatcher rollup to 0G Storage and anchors it on 0G Chain.
- `scripts/upload-capability-receipt-batch.mjs`: uploads default capability receipt batches.

## What Is Not Included

- Production LLM provider routing.
- Production upstream API keys.
- Private billing internals.
- Production environment files.
- Internal development notes, agent rules, sync scripts, test scripts, and local operational logs.
