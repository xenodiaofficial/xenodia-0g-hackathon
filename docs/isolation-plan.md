# Isolation Plan

This repo is the judge-visible 0G hackathon workspace. It must stay safe to share while still letting us develop quickly with the full private Xenodia codebase nearby.

## Model

Use two workspaces:

- Private workspace: the real Xenodia repos, used for local reference, debugging, and full-system testing.
- Submission workspace: this repo, containing only sanitized 0G demo code, contracts, mock executors, proof flows, and documentation.

The private workspace can inform development, but it is not copied wholesale into this repo.

## Why Not Copy Everything

Copying the full product repo and relying on final-stage cleanup creates avoidable risk:

- A single `git add .` can expose sensitive code.
- IDEs and scripts can generate logs or caches in unexpected places.
- Git history can preserve files even after deletion.
- Last-minute hackathon work is exactly when manual review is weakest.

The safer pattern is to make accidental exposure structurally difficult.

## Safe Sync Workflow

1. Develop or inspect private Xenodia locally if needed.
2. Add only sanitized 0G-specific files to `.safe-sync-manifest`.
3. Run `PRIVATE_XENODIA_ROOT=/path/to/myxenoall ./scripts/safe-sync.sh`.
4. Inspect `git status --short`.
5. Run `./scripts/submission-guard.sh`.
6. Commit only after the guard passes.

If 0G work is developed directly inside this repo, skip the sync step and still run the guard before commit or sharing.

## Allowed Content

- 0G contracts and deployment scripts.
- Provider identity and reputation demo code.
- Capability manifest publication demo code.
- Mock capability executor code.
- Receipt, batch, and settlement proof code.
- Judge-facing docs, screenshots, and demo scripts.

## Blocked Content

- Production LLM API adapters.
- Real upstream provider routing.
- Provider pool accounts or channel failover internals.
- API key storage or credential refresh logic.
- Production billing implementation.
- Production environment files.
- Production logs, traces, database dumps, or request samples.

## Local Development Without Exposure

If a feature needs full-product context, keep the real app running from the private workspace and point the demo repo at mock or local test endpoints. Do not solve local convenience by copying the full repo into the submission workspace.

## Release Checklist

- `git status --short` reviewed.
- `./scripts/submission-guard.sh` passed.
- No `.env`, logs, database dumps, keys, or generated caches.
- README explains which components are mock/demo.
- README includes 0G evidence fields when available: contract address, transaction hash, manifest hash, storage URI, and explorer link.

