import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContractFactory, JsonRpcProvider, Wallet, formatEther } from 'ethers';
import { buildProofPayload, makeInitialState, mockExecuteCapability } from '../demo/proof-model.mjs';
import { sendProofPayload } from '../demo/chain-anchor.mjs';
import { compileContracts } from './compile-contracts.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultWalletPath = path.join(os.homedir(), '.config', 'xenodia-0g-hackathon', 'demo-wallet.json');
const walletPath = process.env.LOCAL_DEMO_WALLET_FILE || defaultWalletPath;
const evidencePath = path.join(repoRoot, 'docs', 'testnet-evidence.md');
const artifactPath = path.join(
  repoRoot,
  'artifacts',
  'contracts',
  'ZeroGProofRegistry.sol',
  'ZeroGProofRegistry.json'
);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function makeDemoPayload() {
  const state = makeInitialState();
  [
    'Find x402 payment-aware providers for an autonomous agent.',
    'Rank capability providers by verifiable receipts and risk.',
    'Prepare offline settlement evidence for a paid skill invocation.'
  ].forEach((prompt, index) => {
    const { response, receipt } = mockExecuteCapability(state, {
      prompt,
      createdAt: `2026-04-24T00:0${index}:00.000Z`
    });
    state.invocations.unshift({ id: receipt.receiptId, prompt, response, receipt });
  });

  return buildProofPayload(state);
}

function writePendingEvidence({ walletAddress, balance0G, reason }) {
  const content = `# 0G Testnet Evidence

Status: pending faucet funding

## Network

- Network: 0G Galileo Testnet
- RPC: https://evmrpc-testnet.0g.ai
- Chain ID: 16602
- Explorer: https://chainscan-galileo.0g.ai
- Faucet: https://hub.0g.ai/faucet

## Demo Wallet

- Address: \`${walletAddress}\`
- Balance: \`${balance0G} 0G\`

## Current Blocker

${reason}

The wallet private key is stored outside this repository at the local operator's config path and must never be committed.
`;

  fs.writeFileSync(evidencePath, content);
}

function writeCompletedEvidence({ walletAddress, balance0GBefore, deployment, proofPayload, proofTxs }) {
  const explorer = 'https://chainscan-galileo.0g.ai';
  const content = `# 0G Testnet Evidence

Status: deployed

## Network

- Network: 0G Galileo Testnet
- RPC: https://evmrpc-testnet.0g.ai
- Chain ID: 16602
- Explorer: ${explorer}

## Deployed Contract

- Contract: \`${deployment.contractAddress}\`
- Deploy transaction: [${deployment.transactionHash}](${explorer}/tx/${deployment.transactionHash})
- Contract address page: [${deployment.contractAddress}](${explorer}/address/${deployment.contractAddress})
- Block number: \`${deployment.blockNumber}\`
- Deployer: \`${walletAddress}\`
- Balance before deployment: \`${balance0GBefore} 0G\`

## Anchored Proofs

- Provider profile hash: \`${proofPayload.profile.profileHash}\`
- Capability manifest proofId: \`${proofPayload.capability.proofId}\`
- Capability manifest hash: \`${proofPayload.capability.manifestHash}\`
- Receipt batch proofId: \`${proofPayload.receiptBatch.proofId}\`
- Receipt root: \`${proofPayload.receiptBatch.receiptRoot}\`
- Settlement batch proofId: \`${proofPayload.settlementBatch.proofId}\`
- Settlement root: \`${proofPayload.settlementBatch.settlementRoot}\`

## Proof Transactions

- Provider identity tx: [${proofTxs.providerTx}](${explorer}/tx/${proofTxs.providerTx})
- Capability manifest tx: [${proofTxs.capabilityTx}](${explorer}/tx/${proofTxs.capabilityTx})
- Receipt batch tx: [${proofTxs.receiptBatchTx}](${explorer}/tx/${proofTxs.receiptBatchTx})
- Settlement batch tx: [${proofTxs.settlementBatchTx}](${explorer}/tx/${proofTxs.settlementBatchTx})

## What This Proves

Xenodia can publish capability-market evidence to 0G without exposing its production LLM API layer. The chain stores hashes and proof pointers; private execution and payment internals stay off-chain.
`;

  fs.writeFileSync(evidencePath, content);
}

async function main() {
  const rpcUrl = requiredEnv('ZERO_G_RPC_URL');
  const expectedChainId = BigInt(requiredEnv('ZERO_G_CHAIN_ID'));

  if (!fs.existsSync(walletPath)) {
    throw new Error(`Missing local demo wallet: ${walletPath}`);
  }

  const walletFile = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  const provider = new JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  if (network.chainId !== expectedChainId) {
    throw new Error(`RPC chainId mismatch: expected ${expectedChainId}, got ${network.chainId}`);
  }

  const wallet = new Wallet(walletFile.privateKey, provider);
  const balance = await provider.getBalance(wallet.address);
  const balance0G = formatEther(balance);

  if (balance === 0n) {
    const reason = `Faucet funding is required before deployment. Request testnet 0G for \`${wallet.address}\` at https://hub.0g.ai/faucet.`;
    writePendingEvidence({ walletAddress: wallet.address, balance0G, reason });
    throw new Error(reason);
  }

  compileContracts({ writeArtifacts: true });
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(wallet.address);
  const receipt = await contract.deploymentTransaction().wait();
  const contractAddress = await contract.getAddress();
  const proofPayload = makeDemoPayload();
  const proofTxs = await sendProofPayload(proofPayload, {
    rpcUrl,
    privateKey: walletFile.privateKey,
    contractAddress
  });

  const deployment = {
    contractAddress,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber
  };

  writeCompletedEvidence({
    walletAddress: wallet.address,
    balance0GBefore: balance0G,
    deployment,
    proofPayload,
    proofTxs
  });

  console.log(JSON.stringify({ deployment, proofPayload, proofTxs, evidencePath }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

