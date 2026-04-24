import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { compileContracts } from '../scripts/compile-contracts.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
    throw new Error(`Missing ${name}. Dry-run mode works without chain credentials.`);
  }
  return value;
}

export async function sendProofPayload(payload) {
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

  let capabilityReceipt = null;
  const capabilityAnchored = await registry.hasProof(payload.capability.proofId);
  if (!capabilityAnchored) {
    const capabilityTx = await registry.publishCapabilityManifest(
      payload.provider,
      payload.capability.capabilityId,
      payload.capability.version,
      payload.capability.manifestHash,
      payload.capability.storageURI
    );
    capabilityReceipt = await capabilityTx.wait();
  }

  let receiptBatchReceipt = null;
  const receiptBatchAnchored = await registry.hasProof(payload.receiptBatch.proofId);
  if (payload.receiptBatch.receiptCount > 0 && !receiptBatchAnchored) {
    const receiptTx = await registry.anchorReceiptBatch(
      payload.provider,
      payload.receiptBatch.batchId,
      payload.receiptBatch.receiptRoot,
      payload.receiptBatch.storageURI,
      payload.receiptBatch.receiptCount
    );
    receiptBatchReceipt = await receiptTx.wait();
  }

  let settlementReceipt = null;
  const settlementBatchAnchored = await registry.hasProof(payload.settlementBatch.proofId);
  if (payload.settlementBatch.settlementCount > 0 && !settlementBatchAnchored) {
    const settlementTx = await registry.anchorSettlementBatch(
      payload.provider,
      payload.settlementBatch.batchId,
      payload.settlementBatch.settlementRoot,
      payload.settlementBatch.storageURI,
      payload.settlementBatch.settlementCount
    );
    settlementReceipt = await settlementTx.wait();
  }

  return {
    providerTx: providerReceipt.hash,
    capabilityTx: capabilityReceipt?.hash || 'already_anchored',
    receiptBatchTx: receiptBatchReceipt?.hash || (receiptBatchAnchored ? 'already_anchored' : null),
    settlementBatchTx: settlementReceipt?.hash || (settlementBatchAnchored ? 'already_anchored' : null)
  };
}
