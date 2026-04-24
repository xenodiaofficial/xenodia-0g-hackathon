# Xenodia 0G Demo Runbook

This runbook is for judges and reviewers. It describes the shortest path through the local-only demo without exposing production LLM API code.

## One-Liner

Xenodia is a verifiable capability layer on 0G: providers publish versioned capabilities, executions generate tamper-resistant receipts, and settlement evidence can be audited transparently.

## Local Flow

1. Run `npm run demo:start`.
2. Open `http://localhost:4040`.
3. Review the Judge Submission Console at the top of the page.
4. Review or edit the provider identity.
5. Review or edit the capability manifest.
6. Invoke the mock capability executor.
7. Inspect the receipt root, settlement root, and proof IDs.
8. Export `/api/ledger.csv` to review offline provider settlement data.
9. After faucet funding arrives, run `npm run deploy:wait:0g-testnet`.

## What Is Real

- Provider identity hash generation.
- Capability manifest hash and proof ID generation.
- Receipt batch root generation.
- Settlement batch root generation.
- Offline provider-share ledger and CSV export.
- 0G-compatible proof registry contract and deployment scripts.

## What Is Intentionally Excluded

- Production LLM API implementation.
- Production provider routing.
- Production billing ledger internals.
- 0G Compute.
- TEE execution.
- Automatic on-chain revenue split.

## Current Chain Status

See `docs/testnet-evidence.md`. If it says `pending faucet funding`, the local demo can still be reviewed fully, but explorer links will be added only after the demo wallet receives 0G testnet funds.
