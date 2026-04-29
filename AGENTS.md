# Xenodia 0G Hackathon Agent Notes

## Scope

This repository is the sanitized, local-demo-only 0G hackathon workspace for Xenodia.

All 0G-related development belongs here unless the user explicitly asks otherwise. Do not add 0G hackathon code back into the production Xenodia repositories (`myxeno` or `myxeno-fe`) without explicit approval.

## Non-Negotiable Boundaries

- Keep this repo safe for hackathon judges to review.
- Do not copy production LLM API code, provider routing, provider pool logic, API key handling, real billing internals, production `.env` files, or production logs into this repo.
- Do not copy the full Xenodia production repositories into this repo, even temporarily.
- If full local context is needed, run the production repositories side by side and sync only approved files into this repo.
- All imports from private development workspaces must go through `.safe-sync-manifest` and `scripts/safe-sync.sh`.
- Run `scripts/submission-guard.sh` before committing, pushing, zipping, or sharing this repo with judges.
- Keep the copied full frontend mirror local-only. The root `.gitignore` deliberately allows only 0G-specific frontend slices through Git.
- Prefer mock, deterministic, or local-demo executors for capability execution.
- 0G integration should focus on identity, capability publication, immutable receipts, settlement evidence, and proof anchoring.
- 0G Compute and TEE are out of MVP scope unless the user explicitly re-prioritizes them.
- This code is for local demo and hackathon review only, not production deployment.

## Isolation Protocol

Use a two-workspace model:

1. **Private Development Workspace**
   - The real Xenodia repositories remain outside this repo.
   - They can be used for local reference, debugging, and integration testing.
   - They are never copied wholesale into the hackathon repo.

2. **Judge-Visible Submission Workspace**
   - This repo contains only sanitized, 0G-specific demo code and documentation.
   - Any copied file must be listed in `.safe-sync-manifest`.
   - Sensitive production modules must be represented by mocks, fixtures, interfaces, or documentation.

Safe sync rules:

- Sync direction is one-way: private workspace to this repo.
- The allowlist is explicit; new source paths require editing `.safe-sync-manifest`.
- Missing source files should not block normal development because 0G work may happen entirely inside this repo.
- After every sync, run the submission guard.
- Never use `git add .` blindly after a sync. Inspect `git status --short` first.
- For GitHub upload, prefer `npm run guard` and then review `git status --short --ignored`; ignored frontend mirror files must stay ignored unless a new file is explicitly sanitized and allowlisted.

Submission guard rules:

- Treat guard failures as blockers.
- Do not bypass the guard by deleting checks. Narrow false positives with a clear comment only if the scanned content is demonstrably safe.
- Before sharing with judges, run the guard on a clean working tree and review the final file list.

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

4. **0G Global Progress Lead**
   - Owns the running picture of the hackathon goal, phase completion, remaining gaps, and next priority.
   - Reviews every meaningful development round before final summary.
   - Updates or checks `docs/0G-progress-board.md` whenever scope, evidence, completed work, or next tasks change.
   - Keeps the team honest about the submission gap between local/testnet proof and official mainnet requirements.
   - Pushes back on work that improves polish while leaving mandatory submission blockers unresolved.

Use these roles directly in reasoning and summaries. Do not spawn sub-agents unless the user explicitly asks for parallel agents or delegation.

When the user explicitly asks for a 0G progress subagent, create or consult the **0G Global Progress Lead** and include its review in the development closeout.

## Development Priorities

1. Make this repository runnable as a standalone sanitized demo.
2. Add a minimal 0G proof/registry contract and deployment scripts.
3. Wire provider identity and capability publication to the contract/storage proof flow.
4. Add immutable receipt and settlement-proof records using batched anchoring, not per-request chain writes.
5. Polish the judge-facing README, screenshots, and 3-minute demo script.

## Progress Board Protocol

After each meaningful 0G development round:

- Review `docs/0G-progress-board.md`.
- Update phase completion, shipped evidence, known gaps, and next recommended task if they changed.
- Keep the board concise and judge/submission oriented.
- Do not mark a blocker complete unless it has verifiable evidence in the repo or on-chain.
- If a task is intentionally deferred, record why it is out of MVP or lower priority.

## Verification

For each meaningful change, run the smallest useful checks. Prefer:

- Contract compile/test when touching contracts.
- API/unit tests when touching backend logic.
- Lint/build when touching frontend demo code.
- Secret scan before commits or before sharing with judges.
- `scripts/submission-guard.sh` before any commit intended for review or external sharing.
