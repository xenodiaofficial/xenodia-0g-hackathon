# 0G Progress Board

Last updated: 2026-04-28

## Project Goal

Build a sanitized Xenodia 0G hackathon demo for the Agentic Economy / Autonomous Applications track:

`Xenodia is a verifiable capability layer on 0G: providers publish versioned capabilities, executions generate tamper-resistant receipts, and settlement evidence can be audited transparently.`

## Standing Progress Reviewer

The **0G Global Progress Lead** reviews each meaningful development round and keeps this board current.

Review checklist:

- Is the work still aligned with provider identity, capability publication, receipt proof, and settlement records?
- Did it improve a mandatory submission requirement or only polish?
- Is the 0G integration verifiable by judges?
- Did we avoid production LLM API, routing, billing, secrets, and logs?
- What is now the single highest-priority next task?

## Phase Status

| Phase | Status | Evidence |
| --- | --- | --- |
| Phase 0: Scope freeze | Complete | `docs/0G-product-goals-and-phase-plan.md` |
| Phase 1: Provider identity and manifest | Mostly complete | Demo state model, `ZeroGProofRegistry`, testnet capability manifest proof |
| Phase 2: Batched receipts and verifiable proof | Complete for MVP | Receipt batch proof and settlement readback in `docs/testnet-evidence.md` |
| Phase 3: Offline settlement ledger | Complete for MVP | Demo ledger UI and `/api/ledger.csv` |
| Phase 4: Submission polish | In progress | README, runbook, judge console, testnet evidence |

## Completed Evidence

- Standalone sanitized repo exists and is safe for judge review.
- Production LLM API, provider routing, real billing internals, secrets, and production logs are excluded.
- `ZeroGProofRegistry` compiles and supports provider identity, capability manifest, receipt batch, and settlement batch records.
- 0G Galileo testnet contract deployed: `0x808a9B90862ad495b0Ee97335f55D4c114A5EE7C`.
- Explorer evidence and readback verification are recorded in `docs/testnet-evidence.md`.
- Local demo supports provider identity, capability manifest, mock invocation, proof generation, settlement ledger, CSV export, and judge console.
- Guard and smoke workflows exist: `npm run guard`, `npm run demo:smoke`, `npm run contracts:compile`, `npm test`, `npm run proof:demo`.

## Known Gaps

1. Official submission currently asks for a 0G mainnet contract address and Explorer link; current chain evidence is testnet only.
2. 0G Storage is represented by `0g://storage/...` pointers, but manifest / receipt / settlement JSON are not yet uploaded to real 0G Storage.
3. README needs final submission-grade structure with architecture diagram, exact 0G modules used, and judge reproduction steps.
4. Demo video under 3 minutes is not recorded.
5. Public X post is not prepared or published.
6. Public judge repository/share strategy is not finalized.

## Next Recommended Task

Implement real 0G Storage upload for the provider profile, capability manifest, receipt batch, and settlement batch JSON, then anchor the resulting real storage pointers.

Reason: this increases 0G integration depth and closes the largest product/evidence gap before mainnet deployment.

## Deferred By Design

- 0G Compute: out of MVP because execution path is heavier and less stable for this product branch.
- TEE / sealed inference: useful for provider IP protection later, but too heavy for current MVP.
- Automatic on-chain revenue split: out of MVP; current goal is offline settlement evidence.
- Per-request chain writes: out of MVP; current design uses batched roots.
