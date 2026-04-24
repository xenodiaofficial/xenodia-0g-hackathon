# Phase 1 Integration Notes

This repo is intentionally not a full copy of the Xenodia monorepo. It contains only the 0G hackathon modules that are safe to show reviewers.

## Backend Wiring

In the local demo branch, the 0G admin handler is mounted under `/v1/admin/zerog/*`.

Expected routes:

- `GET /v1/admin/zerog/provider-identities`
- `POST /v1/admin/zerog/provider-identities`
- `GET /v1/admin/zerog/provider-identities/:id`
- `PUT /v1/admin/zerog/provider-identities/:id`
- `GET /v1/admin/zerog/capability-publications`
- `POST /v1/admin/zerog/capability-publications`

The production gateway entrypoint is not copied here because it contains unrelated production routing and provider infrastructure.

## Frontend Wiring

In the local demo branch, `ZeroGTab` is mounted as a console tab named `0G`.

The production console shell is not copied here because it contains unrelated admin product surface area. The reviewer-facing demo should instead mount `ZeroGTab` inside a minimal local shell or a sanitized console frame.

## Data Model

Phase 1 creates two tables:

- `zerog_provider_identities`
- `zerog_capability_publications`

Provider reputation is intentionally provider-level, not capability-level. Capability records carry publication and proof metadata, but trust/rank belongs to the provider identity.

## Security Boundary

Do not copy these production components into this repository:

- LLM provider adapters.
- API key storage and credential refresh code.
- Provider pool accounts.
- Channel routing and model failover logic.
- Real billing ledger implementation.
- Production `.env` files.
- Production logs or request traces.

