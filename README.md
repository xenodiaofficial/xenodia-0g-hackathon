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
- `demo/`: standalone local server, mock executor, proof model, and static UI.
- `docs/`: product memo, development plan, and hackathon phase plan.
- `backend/`: sanitized 0G-specific backend model, migration, handler, and service files.
- `frontend/`: sanitized 0G-specific admin console UI.
- `scripts/`: local safety checks plus contract compile/deploy/read helpers.
- `integration/`: notes describing how the local demo branch wires these modules into Xenodia without copying production internals.

## Demo Principle

The hackathon demo should use a mock or deterministic capability executor. 0G is used for identity, publication, and proof anchoring; the private Xenodia production LLM layer remains outside this repository.

## Local Demo

Start the judge-visible local demo:

```bash
npm run demo:start
```

Then open `http://localhost:4040`.

The demo flow is:

1. Review or edit the provider identity.
2. Review or edit the capability manifest.
3. Invoke the mock capability executor.
4. Generate dry-run 0G proof IDs.
5. Review the offline provider settlement ledger and CSV export.
6. Optionally send proofs to a deployed `ZeroGProofRegistry` contract.

Run the smoke test:

```bash
npm run demo:smoke
```

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

Deploy with the local demo wallet and write judge evidence:

```bash
npm run deploy:evidence:0g-testnet
```

This command reads the local demo wallet from `~/.config/xenodia-0g-hackathon/demo-wallet.json`, deploys `ZeroGProofRegistry`, anchors demo proofs, and updates `docs/testnet-evidence.md`. It will stop safely if the wallet has not been funded by the 0G faucet yet.

If faucet funding has been requested but has not arrived yet, leave this watcher running:

```bash
npm run deploy:wait:0g-testnet
```

It polls the local demo wallet balance, then reuses the evidence deployment command once funds arrive. Optional controls: `FUNDING_POLL_INTERVAL_MS`, `FUNDING_TIMEOUT_MS`, and `MIN_FUNDING_WEI`. The default minimum funding threshold is `0.005 0G` to avoid deploying on dust balances.

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
