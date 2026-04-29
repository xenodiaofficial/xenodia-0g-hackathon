# Xenodia 0G Demo Runbook

This runbook is for judges and reviewers. It describes the shortest path through the local-only demo without exposing production LLM API code.

## One-Liner

Xenodia is a verifiable capability layer on 0G: providers publish versioned capabilities, executions generate tamper-resistant receipts, and settlement evidence can be audited transparently.

## Local Flow

1. Run `npm run frontend:dev`.
2. Open `http://localhost:4041`.
3. Confirm the normal Xenodia product home page is shown, with the floating team contact entry removed. The dev launcher connects production Xenodia APIs and injects the local public Firebase config when the sibling `myxeno-fe` checkout is available.
4. Open the `0G LAB` nav item or the `View 0G Evidence` home-page entry.
5. Review `http://localhost:4041/0g-hackathon` for the live UniCatcher 0G Explorer links, Storage roots, proof transactions, and product narrative.
6. Click `Run Live UniCatcher`, sign in, open the debug playground, and invoke `unicatcher-query` against the production Xenodia gateway.
7. Confirm the debug panel shows `0G receipt recorded`; this receipt is generated even before any review.
8. Submit a rating in the `0G Verified UniCatcher Review` panel to generate review and reputation roots linked to the receipt.
9. Open `http://localhost:4041/0g-proof-center` and paste the original API output to recompute `outputHash` and verify the receipt trail.
10. Open `http://localhost:4041/docs/live-unicatcher-evidence.md` for the live UniCatcher chain evidence notes.
11. Run `npm run frontend:smoke` before recording or sharing a local demo.
12. Use `npm run demo:start` only as the legacy low-level evidence console if you need to inspect `/api/state` or `/api/ledger.csv`.
13. Use the mainnet evidence links in `/0g-hackathon` and `docs/live-unicatcher-evidence.md` for judge review.

## What Is Real

- Provider identity hash generation.
- Capability manifest hash and proof ID generation.
- Receipt batch root generation.
- Settlement batch root generation.
- Settlement accounting ledger and CSV export.
- 0G-compatible proof registry contract and deployment scripts.
- Product-native Xenodia frontend copy with `/0g-hackathon` evidence route.
- Home page and nav entry for 0G judge review.
- Authenticated live UniCatcher invocation through the production Xenodia gateway.
- Default invocation receipt generation for capability calls.
- Authenticated UniCatcher review proof generation with receipt, review, and reputation roots.
- Product Proof Center for after-the-fact receipt verification.
- Live UniCatcher evidence uploaded to 0G Storage and anchored on 0G mainnet.
- Default server-observed capability receipt batch uploaded to 0G Storage and anchored on 0G mainnet.

## What Is Intentionally Excluded

- Production LLM API implementation.
- Production provider routing.
- Production billing ledger internals.
- Raw UniCatcher query/response data on-chain.
- UniCatcher upstream API keys in the frontend or judge repo.
- 0G Compute.
- TEE execution.
- Automatic on-chain revenue split.

## Current Chain Status

See `docs/mainnet-evidence.md` and `docs/live-unicatcher-evidence.md` for the current mainnet evidence. `docs/testnet-evidence.md` remains as earlier provider/manifest/settlement reference evidence.
