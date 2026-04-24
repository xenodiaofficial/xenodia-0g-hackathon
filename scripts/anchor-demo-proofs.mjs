import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  id,
  solidityPackedKeccak256
} from 'ethers';
import { compileContracts } from './compile-contracts.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactPath = path.join(
  repoRoot,
  'artifacts',
  'contracts',
  'ZeroGProofRegistry.sol',
  'ZeroGProofRegistry.json'
);

const sendTransactions = process.argv.includes('--send');

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Set it in the shell before running with --send.`);
  }
  return value;
}

function makeDemoPayload() {
  const provider = process.env.DEMO_PROVIDER_ADDRESS || '0x0000000000000000000000000000000000000abc';
  const capabilitySlug = 'xenodia-market-research';
  const capabilityVersion = 'v0.1.0-0g-demo';
  const receiptBatchIdText = 'xenodia-receipts-2026-04-24-demo';
  const settlementBatchIdText = 'xenodia-settlements-2026-04-24-demo';

  const profileHash = id(JSON.stringify({
    displayName: 'Xenodia Demo Provider',
    zeroGDomain: 'xenodia.0g',
    trustStatus: 'platform_verified'
  }));
  const capabilityId = id(capabilitySlug);
  const manifestHash = id(JSON.stringify({
    capabilitySlug,
    capabilityVersion,
    provider,
    operations: ['invoke', 'quote'],
    x402: true
  }));
  const receiptBatchId = id(receiptBatchIdText);
  const receiptRoot = id(JSON.stringify({
    batch: receiptBatchIdText,
    receiptCount: 3,
    totalPaidMicroUSDC: 420000
  }));
  const settlementBatchId = id(settlementBatchIdText);
  const settlementRoot = id(JSON.stringify({
    batch: settlementBatchIdText,
    provider,
    providerShareMicroUSDC: 294000,
    platformShareMicroUSDC: 126000
  }));

  return {
    provider,
    profile: {
      profileHash,
      profileURI: '0g://storage/xenodia-demo-provider-profile.json',
      zeroGDomain: 'xenodia.0g',
      rank: 100,
      active: true
    },
    capability: {
      capabilitySlug,
      capabilityId,
      version: capabilityVersion,
      manifestHash,
      storageURI: '0g://storage/xenodia-market-research-manifest-v0.1.0.json',
      proofId: solidityPackedKeccak256(
        ['string', 'address', 'bytes32', 'string', 'bytes32'],
        ['xenodia.0g.capability', provider, capabilityId, capabilityVersion, manifestHash]
      )
    },
    receiptBatch: {
      batchId: receiptBatchId,
      receiptRoot,
      storageURI: '0g://storage/xenodia-receipts-2026-04-24-demo.json',
      receiptCount: 3,
      proofId: solidityPackedKeccak256(
        ['string', 'address', 'bytes32', 'bytes32'],
        ['xenodia.0g.receipts', provider, receiptBatchId, receiptRoot]
      )
    },
    settlementBatch: {
      batchId: settlementBatchId,
      settlementRoot,
      storageURI: '0g://storage/xenodia-settlements-2026-04-24-demo.json',
      settlementCount: 1,
      proofId: solidityPackedKeccak256(
        ['string', 'address', 'bytes32', 'bytes32'],
        ['xenodia.0g.settlements', provider, settlementBatchId, settlementRoot]
      )
    }
  };
}

async function maybeSend(payload) {
  if (!sendTransactions) return null;

  compileContracts({ writeArtifacts: true });
  const rpcUrl = requiredEnv('ZERO_G_RPC_URL');
  const privateKey = requiredEnv('DEPLOYER_PRIVATE_KEY');
  const contractAddress = requiredEnv('PROOF_REGISTRY_ADDRESS');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const wallet = new Wallet(privateKey, new JsonRpcProvider(rpcUrl));
  const registry = new Contract(contractAddress, artifact.abi, wallet);

  const providerTx = await registry.updateProviderIdentity(
    payload.provider,
    payload.profile.profileHash,
    payload.profile.profileURI,
    payload.profile.zeroGDomain,
    payload.profile.rank,
    payload.profile.active
  );
  const providerReceipt = await providerTx.wait();

  const capabilityTx = await registry.publishCapabilityManifest(
    payload.provider,
    payload.capability.capabilityId,
    payload.capability.version,
    payload.capability.manifestHash,
    payload.capability.storageURI
  );
  const capabilityReceipt = await capabilityTx.wait();

  const receiptTx = await registry.anchorReceiptBatch(
    payload.provider,
    payload.receiptBatch.batchId,
    payload.receiptBatch.receiptRoot,
    payload.receiptBatch.storageURI,
    payload.receiptBatch.receiptCount
  );
  const receiptBatchReceipt = await receiptTx.wait();

  const settlementTx = await registry.anchorSettlementBatch(
    payload.provider,
    payload.settlementBatch.batchId,
    payload.settlementBatch.settlementRoot,
    payload.settlementBatch.storageURI,
    payload.settlementBatch.settlementCount
  );
  const settlementReceipt = await settlementTx.wait();

  return {
    providerTx: providerReceipt.hash,
    capabilityTx: capabilityReceipt.hash,
    receiptBatchTx: receiptBatchReceipt.hash,
    settlementBatchTx: settlementReceipt.hash
  };
}

const payload = makeDemoPayload();
const txs = await maybeSend(payload);
console.log(JSON.stringify({ mode: sendTransactions ? 'sent' : 'dry-run', payload, txs }, null, 2));

