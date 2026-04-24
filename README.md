# Xenodia 0G Hackathon Demo

This repository is a sanitized, local-demo-only 0G hackathon workspace extracted from Xenodia.

It intentionally excludes production LLM API code, provider routing, API key management, internal billing implementation, real environment files, and production logs. The goal is to show the 0G integration surface clearly without exposing sensitive production code.

## Scope

- Provider-level on-chain identity and reputation skeleton.
- Capability manifest publication flow.
- 0G Storage / chain anchoring metadata fields.
- Immutable receipt and settlement-proof direction documented for later phases.
- Local demo UI for preparing provider identities and capability publications.

## Out Of Scope

- Production LLM execution.
- Real upstream model provider credentials.
- Production channel routing and provider pool logic.
- 0G Compute.
- TEE execution.
- Automatic on-chain revenue split.

## Repository Layout

- `docs/`: product memo, development plan, and hackathon phase plan.
- `backend/`: sanitized 0G-specific backend model, migration, handler, and service files.
- `frontend/`: sanitized 0G-specific admin console UI.
- `integration/`: notes describing how the local demo branch wires these modules into Xenodia without copying production internals.

## Demo Principle

The hackathon demo should use a mock or deterministic capability executor. 0G is used for identity, publication, and proof anchoring; the private Xenodia production LLM layer remains outside this repository.

