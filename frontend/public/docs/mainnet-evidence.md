# 0G Mainnet Evidence

Status: anchored

## Network

- Network: 0G Mainnet
- Explorer: https://chainscan.0g.ai
- Registry contract: [0x808a9B90862ad495b0Ee97335f55D4c114A5EE7C](https://chainscan.0g.ai/address/0x808a9B90862ad495b0Ee97335f55D4c114A5EE7C)
- Deploy tx: [0xf108ae9d41a3b8e9b3909a7ba54dc1f3e89f0c98bb2af4a91f4a5cba062e3828](https://chainscan.0g.ai/tx/0xf108ae9d41a3b8e9b3909a7ba54dc1f3e89f0c98bb2af4a91f4a5cba062e3828)
- Operator: `0xfBec82FCbe4816004B8A459f62754b3e2aD8f963`

## Live UniCatcher Receipt and Review Rollup

- Evidence items: `2`
- Rollup root: `0x3b1d2ea7951d2226eab1376158898e522baf08d07e6b4dc99ed2f3f58e8f1d04`
- 0G Storage root: `0xc735ba92b76a606149144a1ef37338a6f9214001e3ba48b80226132e698b218b`
- 0G Storage URI: `0g://storage/0xc735ba92b76a606149144a1ef37338a6f9214001e3ba48b80226132e698b218b`
- 0G Storage tx: [0x2ba5c950aed84fd95b18c80026a6d6a5f890fc4435cc064981da88e65139d066](https://chainscan.0g.ai/tx/0x2ba5c950aed84fd95b18c80026a6d6a5f890fc4435cc064981da88e65139d066)
- Receipt proofId: `0x33ee52c65804b81459722404de92fe7958fcd41d54cd4a128184c9d93e81029c`
- Receipt anchor tx: [0x171fd6a2af7544fa3ac8c715bae88a7ea5cf52348b5675c1fc60ffc8ff36ea2f](https://chainscan.0g.ai/tx/0x171fd6a2af7544fa3ac8c715bae88a7ea5cf52348b5675c1fc60ffc8ff36ea2f)
- Judge-visible artifact: `docs/evidence-artifacts/unicatcher-live-evidence-rollup-2.json`

On-chain readback:

- Kind: `2`
- Provider: `0x0000000000000000000000000000000000000aBc`
- Content hash: `0x3b1d2ea7951d2226eab1376158898e522baf08d07e6b4dc99ed2f3f58e8f1d04`
- Item count: `2`

## Default Capability Receipt Batch

- Receipt count: `1`
- Receipt root: `0x881dba5d65d8194ae7ee56792b0ab4cbbd6205bfa5180060756e349bf7b27d30`
- 0G Storage root: `0x9dc64f6742b6c981db5083cca126d0d5631e26e21d5bebd17e0d5ee293f3be76`
- 0G Storage URI: `0g://storage/0x9dc64f6742b6c981db5083cca126d0d5631e26e21d5bebd17e0d5ee293f3be76`
- 0G Storage tx: [0x2883413796921a8d6712b223e26f828b8a81aa27386f3cab33ebd2745e66feaf](https://chainscan.0g.ai/tx/0x2883413796921a8d6712b223e26f828b8a81aa27386f3cab33ebd2745e66feaf)
- Receipt proofId: `0x8efbda850cff5fe79b7d397518e9baf2caaf70fe2e5ae9da09a6744c79578125`
- Receipt anchor tx: [0xde9d31a74f4de058befb169832ab0cc8f1664aa0a0c5e114049a455fcb3676c0](https://chainscan.0g.ai/tx/0xde9d31a74f4de058befb169832ab0cc8f1664aa0a0c5e114049a455fcb3676c0)
- Judge-visible artifact: `docs/evidence-artifacts/capability-receipt-batch-1.json`

On-chain readback:

- Kind: `2`
- Provider: `0x0000000000000000000000000000000000000aBc`
- Content hash: `0x881dba5d65d8194ae7ee56792b0ab4cbbd6205bfa5180060756e349bf7b27d30`
- Item count: `1`

## What This Proves

Xenodia now has judge-visible 0G mainnet evidence for both user-reviewed live UniCatcher service use and default server-observed capability receipts. Raw user prompts, raw outputs, provider API keys, production LLM routing, and billing internals remain off-chain and outside the judge repository.
