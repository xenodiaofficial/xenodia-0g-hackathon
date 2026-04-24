# Xenodia 0G Hackathon Agent Notes

## Scope

This repository is the sanitized, local-demo-only 0G hackathon workspace for Xenodia.

All 0G-related development belongs here unless the user explicitly asks otherwise. Do not add 0G hackathon code back into the production Xenodia repositories (`myxeno` or `myxeno-fe`) without explicit approval.

## Non-Negotiable Boundaries

- Keep this repo safe for hackathon judges to review.
- Do not copy production LLM API code, provider routing, provider pool logic, API key handling, real billing internals, production `.env` files, or production logs into this repo.
- Prefer mock, deterministic, or local-demo executors for capability execution.
- 0G integration should focus on identity, capability publication, immutable receipts, settlement evidence, and proof anchoring.
- 0G Compute and TEE are out of MVP scope unless the user explicitly re-prioritizes them.
- This code is for local demo and hackathon review only, not production deployment.

## Global 0G Consultant Team

Before proposing architecture, starting a phase, or making meaningful code changes, apply these advisor roles as a standing review lens:

1. **0G Chain And Hackathon Expert**
   - Checks whether the work creates real 0G integration that judges can verify.
   - Favors simple, demoable chain/storage proof over broad infrastructure.
   - Keeps the project aligned with the Agentic Economy / Autonomous Applications track.
   - Pushes for clear README evidence: contract address, transaction hash, manifest hash, storage URI, and demo flow.

2. **Xenodia Core Product Expert**
   - Protects the current Xenodia product from over-expansion in the hackathon branch.
   - Keeps MVP scope narrow: provider identity/reputation, capability publication, receipt proof, settlement records.
   - Avoids changes that require production LLM routing, production billing rewrites, or formal provider marketplace operations.
   - Prefers additive local-demo modules over invasive platform refactors.

3. **Submission Boundary Reviewer**
   - Reviews whether code can safely be shown to hackathon judges.
   - Blocks accidental inclusion of secrets, real provider code, internal routing, production logs, and private operational details.
   - Encourages standalone mock/demo implementations when production code would be sensitive.

Use these roles directly in reasoning and summaries. Do not spawn sub-agents unless the user explicitly asks for parallel agents or delegation.

## Development Priorities

1. Make this repository runnable as a standalone sanitized demo.
2. Add a minimal 0G proof/registry contract and deployment scripts.
3. Wire provider identity and capability publication to the contract/storage proof flow.
4. Add immutable receipt and settlement-proof records using batched anchoring, not per-request chain writes.
5. Polish the judge-facing README, screenshots, and 3-minute demo script.

## Verification

For each meaningful change, run the smallest useful checks. Prefer:

- Contract compile/test when touching contracts.
- API/unit tests when touching backend logic.
- Lint/build when touching frontend demo code.
- Secret scan before commits or before sharing with judges.

