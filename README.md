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

- `contracts/`: minimal 0G proof registry contract.
- `docs/`: product memo, development plan, and hackathon phase plan.
- `backend/`: sanitized 0G-specific backend model, migration, handler, and service files.
- `frontend/`: sanitized 0G-specific admin console UI.
- `scripts/`: local safety checks plus contract compile/deploy/read helpers.
- `integration/`: notes describing how the local demo branch wires these modules into Xenodia without copying production internals.

## Demo Principle

The hackathon demo should use a mock or deterministic capability executor. 0G is used for identity, publication, and proof anchoring; the private Xenodia production LLM layer remains outside this repository.

## Contract Workflow

Install dependencies:

```bash
npm install
```

Compile and test locally:

```bash
npm run contracts:compile
npm test
npm run guard
```

Deploy to 0G testnet:

```bash
export DEPLOYER_PRIVATE_KEY=<local-demo-wallet-private-key>
npm run contracts:deploy:0g-testnet
```

Deploy to 0G mainnet:

```bash
export DEPLOYER_PRIVATE_KEY=<local-demo-wallet-private-key>
npm run contracts:deploy:0g-mainnet
```

Read a proof record:

```bash
export ZERO_G_RPC_URL=https://evmrpc-testnet.0g.ai
export PROOF_REGISTRY_ADDRESS=<deployed-contract-address>
export PROOF_ID=<bytes32-proof-id>
npm run proof:read
```

Generate deterministic demo proof payloads without sending transactions:

```bash
npm run proof:demo
```

Send the demo provider, capability, receipt batch, and settlement batch proofs to a deployed registry:

```bash
export ZERO_G_RPC_URL=https://evmrpc-testnet.0g.ai
export DEPLOYER_PRIVATE_KEY=<local-demo-wallet-private-key>
export PROOF_REGISTRY_ADDRESS=<deployed-contract-address>
npm run proof:demo -- --send
```
