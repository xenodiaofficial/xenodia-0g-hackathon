# 0G Testnet Evidence

Status: deployed

## Network

- Network: 0G Galileo Testnet
- RPC: https://evmrpc-testnet.0g.ai
- Chain ID: 16602
- Explorer: https://chainscan-galileo.0g.ai

## Deployed Contract

- Contract: `0x808a9B90862ad495b0Ee97335f55D4c114A5EE7C`
- Deploy transaction: [0xb7c607a589ede07d8e3800a288b51e53a8d32e0b2130cb67535eff368350c5a1](https://chainscan-galileo.0g.ai/tx/0xb7c607a589ede07d8e3800a288b51e53a8d32e0b2130cb67535eff368350c5a1)
- Contract address page: [0x808a9B90862ad495b0Ee97335f55D4c114A5EE7C](https://chainscan-galileo.0g.ai/address/0x808a9B90862ad495b0Ee97335f55D4c114A5EE7C)
- Block number: `30249309`
- Deployer: `0xfBec82FCbe4816004B8A459f62754b3e2aD8f963`
- Balance before deployment: `2.0 0G`

## Anchored Proofs

- Provider profile hash: `0xe9f647aa1b9b2f8e01b7475cdae9e575459b2d5a5945258bf91c9d8f31f27fb1`
- Capability manifest proofId: `0xeda2067ac6a3206fb4e69982b44c4735c372c731039bd28a7d60e73e125c1b7b`
- Capability manifest hash: `0xb32c0991acf8f60d265aff0c247e9cc174dc2831a3f0ac0df108ee813c7a15e0`
- Receipt batch proofId: `0x1957a3ec398125b6fb60c79272591ebe4f8eab67f021272eb7a8283df861cf60`
- Receipt root: `0x695e498e1de5bfba8ee4f55699af3c203be6cba9ff973d8130180f1a0850f20f`
- Settlement batch proofId: `0x4559698deeb53d92ebbb9283be33b608d588320b16e463b16d073a2ae484c4bb`
- Settlement root: `0x993006b1bd029fdd2ff89c949f023bbf1900c16ccd184813b4e0a8dfc9e9f771`

## Proof Transactions

- Provider identity tx: [0x60c4897379d5b454ffe86466754e1f055c40b69db0645af29bf16f4bf41cf465](https://chainscan-galileo.0g.ai/tx/0x60c4897379d5b454ffe86466754e1f055c40b69db0645af29bf16f4bf41cf465)
- Capability manifest tx: [0x969cae804b93cb8c88c4222480c7fb10abdb989bd7ea447d536f4f041cac81a0](https://chainscan-galileo.0g.ai/tx/0x969cae804b93cb8c88c4222480c7fb10abdb989bd7ea447d536f4f041cac81a0)
- Receipt batch tx: [0xdba30f735a19ed46aa74b2ce2ffe9f2024b5c08db47e48cba33ba1afe0b4c458](https://chainscan-galileo.0g.ai/tx/0xdba30f735a19ed46aa74b2ce2ffe9f2024b5c08db47e48cba33ba1afe0b4c458)
- Settlement batch tx: [0x76b20761dc408dad9af6389ceabfb9259b79361da1a4c5d027010cdefb37656a](https://chainscan-galileo.0g.ai/tx/0x76b20761dc408dad9af6389ceabfb9259b79361da1a4c5d027010cdefb37656a)

## Readback Verification

Command:

```bash
ZERO_G_RPC_URL=https://evmrpc-testnet.0g.ai \
PROOF_REGISTRY_ADDRESS=0x808a9B90862ad495b0Ee97335f55D4c114A5EE7C \
PROOF_ID=0x4559698deeb53d92ebbb9283be33b608d588320b16e463b16d073a2ae484c4bb \
npm run proof:read
```

Result:

- Proof kind: `3` (`SettlementBatch`)
- Provider: `0x0000000000000000000000000000000000000aBc`
- Subject id: `0x6fbebfc7bdaebce717dfc07be4f6254736f8f1d55c81b95a12c1b60f78eb55f7`
- Content hash: `0x993006b1bd029fdd2ff89c949f023bbf1900c16ccd184813b4e0a8dfc9e9f771`
- Storage URI: `0g://storage/xenodia-market-research-settlement-batch-3.json`
- Item count: `1`
- Anchored at: `1777348554` (`2026-04-28T03:55:54.000Z`)

## What This Proves

Xenodia can publish capability-market evidence to 0G without exposing its production LLM API layer. The chain stores hashes and proof pointers; private execution and payment internals stay off-chain.
