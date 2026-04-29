# 0G Progress Board

Last updated: 2026-04-29

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
| Phase 1: Provider identity and manifest | Complete for MVP | Demo state model, real 0G Storage root, `ZeroGProofRegistry`, testnet capability manifest proof |
| Phase 2: Batched receipts and verifiable proof | Complete for MVP | Receipt batch proof and settlement readback in `docs/testnet-evidence.md` |
| Phase 3: Settlement accounting ledger | Complete for MVP | Demo ledger UI and `/api/ledger.csv` |
| Phase 4: Submission polish | In progress | Product frontend copy, `/0g-hackathon`, live UniCatcher review proof, README, runbook, judge console, mainnet evidence |

## Completed Evidence

- Standalone sanitized repo exists and is safe for judge review.
- Production LLM API, provider routing, real billing internals, secrets, and production logs are excluded.
- `ZeroGProofRegistry` compiles and supports provider identity, capability manifest, receipt batch, and settlement batch records.
- 0G Galileo testnet contract deployed with real Storage pointers: `0xCa858281D7BdDABC46BbB36C7ABB016bE2724879`.
- 0G Storage testnet uploads exist for provider profile, capability manifest, receipt batch, and settlement batch JSON.
- Judge-visible copies of uploaded JSON evidence exist in `docs/evidence-artifacts/`.
- Explorer evidence and readback verification are recorded in `docs/testnet-evidence.md`.
- Local demo supports provider identity, capability manifest, mock invocation, proof generation, settlement ledger, CSV export, and judge console.
- A product-native copy of the Xenodia frontend now exists under `frontend/` in the isolated hackathon repo.
- The formal Xenodia home page now links to a dedicated 0G Hackathon Evidence page at `/0g-hackathon`.
- The formal nav includes `0G LAB`, and the previous home-page team contact float is removed in the 0G branch.
- The evidence page shows 0G Explorer links, Storage upload proofs, Chain proof transactions, and readback verification inside the Xenodia product shell.
- The `0G LAB` page now links to the live UniCatcher capability-market detail page.
- `npm run frontend:dev` now starts the product frontend against production Xenodia APIs and configures Google sign-in without committing Firebase values into the hackathon repository.
- Signed-in users can invoke real UniCatcher through the production Xenodia gateway from `/capabilities/unicatcher-query`.
- After a successful UniCatcher invocation, users can submit a rating that generates receipt, review, reputation, and storage roots for 0G rollup.
- 0G mainnet `ZeroGProofRegistry` deployed: `0x808a9B90862ad495b0Ee97335f55D4c114A5EE7C`.
- Live UniCatcher evidence has been uploaded to 0G Storage and anchored on 0G mainnet.
- Generic server-observed capability receipt batch has been uploaded to 0G Storage and anchored on 0G mainnet.
- Capability invocations now create default local receipts independent of optional user reviews.
- Capability playground invokes through `/api/0g/capability-invoke`, so receipts are created from the server-observed upstream response rather than a browser-submitted claim.
- Product Proof Center exists at `/0g-proof-center` for recomputing output hashes and checking receipt evidence.
- `npm run receipts:upload:0g-testnet` can upload the generic local receipt buffer to 0G Storage and anchor it on Galileo testnet.
- API callers can use `npm run unicatcher:live-smoke` with `XENODIA_BEARER_TOKEN` or `XENODIA_API_KEY` to call the same production capability endpoint.
- Guard and smoke workflows exist: `npm run guard`, `npm run demo:smoke`, `npm run frontend:smoke`, `npm run contracts:compile`, `npm test`, `npm run proof:demo`.

## Known Gaps

1. Generic capability receipt batch upload is manual; scheduled upload/anchor automation is still deferred.
2. README needs final submission-grade structure with architecture diagram, exact 0G modules used, and judge reproduction steps.
3. Demo video under 3 minutes is not recorded.
4. Public X post is drafted but not published.
5. Public judge repository/share strategy is not finalized.
6. Copied frontend submission scope must be reviewed before publishing, especially `frontend/lib/`, `frontend/components/console/`, and environment examples.

## Next Recommended Task

Prepare the final submission package: mainnet-first README, concise architecture diagram, demo video script, public X post, and judge-safe repository scope review.

Reason: the product path now creates default invocation receipts, optional reviews, a Proof Center, and mainnet-visible 0G evidence. The next strongest step is packaging the proof clearly for judges without exposing production LLM API or routing code.

## Deferred By Design

- 0G Compute: out of MVP because execution path is heavier and less stable for this product branch.
- TEE / sealed inference: useful for provider IP protection later, but too heavy for current MVP.
- Automatic on-chain revenue split: out of MVP; current goal is verifiable settlement accounting evidence.
- Per-request chain writes: out of MVP; current design uses batched roots.
