import 'dotenv/config';
import { createHash } from 'crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk';
import { Contract, JsonRpcProvider, Wallet, formatEther, solidityPackedKeccak256 } from 'ethers';
import { compileContracts } from './compile-contracts.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultWalletPath = path.join(os.homedir(), '.config', 'xenodia-0g-hackathon', 'demo-wallet.json');
const walletPath = process.env.LOCAL_DEMO_WALLET_FILE || defaultWalletPath;
const receiptLogPath = path.join(repoRoot, 'tmp', '0g-capability-receipts.json');
const evidenceArtifactDir = path.join(repoRoot, 'docs', 'evidence-artifacts');
const receiptBatchIndexPath = path.join(repoRoot, 'frontend', 'content', 'zerog-receipt-batches.json');
const receiptBatchDocPath = path.join(repoRoot, 'docs', 'capability-receipt-batches.md');
const artifactPath = path.join(repoRoot, 'artifacts', 'contracts', 'ZeroGProofRegistry.sol', 'ZeroGProofRegistry.json');
const defaultIndexerRpc = 'https://indexer-storage-turbo.0g.ai';
const defaultExplorerBase = 'https://chainscan.0g.ai';
const defaultNetworkName = '0G Mainnet';
const defaultProvider = '0x0000000000000000000000000000000000000abc';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function sha256Hex(value) {
  return `0x${createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function readJSON(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    if (fallback !== null) return fallback;
    throw new Error(`Missing ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readWallet() {
  return readJSON(walletPath);
}

function normalizeReceipts(items) {
  return items.map((item) => ({
    receiptId: item.receiptId,
    providerId: item.providerId,
    capabilitySlug: item.capabilitySlug,
    operation: item.operation,
    requestId: item.requestId,
    requestURL: item.requestURL,
    idempotencyKeyHash: item.idempotencyKeyHash,
    accountHash: item.accountHash,
    inputHash: item.inputHash,
    outputHash: item.outputHash,
    status: item.status,
    createdAt: item.createdAt,
  }));
}

function buildReceiptBatch(items) {
  const receipts = normalizeReceipts(items);
  if (receipts.length === 0) {
    throw new Error('No capability receipts found. Invoke a capability first.');
  }
  const receiptRoot = sha256Hex({
    receipts: receipts.map((receipt) => ({
      receiptId: receipt.receiptId,
      providerId: receipt.providerId,
      capabilitySlug: receipt.capabilitySlug,
      operation: receipt.operation,
      inputHash: receipt.inputHash,
      outputHash: receipt.outputHash,
      status: receipt.status,
      createdAt: receipt.createdAt,
    })),
  });
  const batchId = sha256Hex({
    type: 'capability-receipts',
    count: receipts.length,
    firstReceiptId: receipts[0]?.receiptId,
    lastReceiptId: receipts[receipts.length - 1]?.receiptId,
    receiptRoot,
  });

  return {
    schema: 'xenodia.0g.capability-receipt-batch.v1',
    generatedAt: new Date().toISOString(),
    batchId,
    receiptRoot,
    receiptCount: receipts.length,
    receipts,
  };
}

async function merkleRootForPayload(payload) {
  const bytes = new TextEncoder().encode(`${JSON.stringify(payload, null, 2)}\n`);
  const data = new MemData(bytes);
  const [tree, treeErr] = await data.merkleTree();
  if (treeErr !== null) {
    throw new Error(`0G Storage Merkle tree error: ${treeErr}`);
  }
  return tree.rootHash();
}

function storageURI(rootHash) {
  return `0g://storage/${rootHash}`;
}

function normalizeUploadResult(result, fallbackRootHash) {
  if ('rootHash' in result) {
    return {
      rootHash: result.rootHash || fallbackRootHash,
      txHash: result.txHash || null,
    };
  }
  return {
    rootHash: result.rootHashes?.[0] || fallbackRootHash,
    txHash: result.txHashes?.[0] || null,
  };
}

async function uploadBatch({ batch, signer, rpcUrl, indexerRpc }) {
  const bytes = new TextEncoder().encode(`${JSON.stringify(batch, null, 2)}\n`);
  const memData = new MemData(bytes);
  const [, treeErr] = await memData.merkleTree();
  if (treeErr !== null) {
    throw new Error(`0G Storage Merkle tree error: ${treeErr}`);
  }

  const localRootHash = await merkleRootForPayload(batch);
  const indexer = new Indexer(indexerRpc);
  const [tx, uploadErr] = await indexer.upload(memData, rpcUrl, signer);
  if (uploadErr !== null) {
    throw new Error(`0G Storage upload error for capability receipt batch: ${uploadErr}`);
  }

  const normalized = normalizeUploadResult(tx, localRootHash);
  return {
    rootHash: normalized.rootHash,
    txHash: normalized.txHash,
    uri: storageURI(normalized.rootHash),
  };
}

async function anchorBatch({ batch, upload, signer, contractAddress }) {
  compileContracts({ writeArtifacts: true });
  const artifact = readJSON(artifactPath);
  const registry = new Contract(contractAddress, artifact.abi, signer);
  const providerAddress = process.env.CAPABILITY_RECEIPT_PROVIDER_ADDRESS || defaultProvider;
  const proofId = solidityPackedKeccak256(
    ['string', 'address', 'bytes32', 'bytes32'],
    ['xenodia.0g.receipts', providerAddress, batch.batchId, batch.receiptRoot],
  );

  if (await registry.hasProof(proofId)) {
    return {
      providerAddress,
      proofId,
      txHash: 'already_anchored',
    };
  }

  const tx = await registry.anchorReceiptBatch(providerAddress, batch.batchId, batch.receiptRoot, upload.uri, batch.receiptCount);
  const receipt = await tx.wait();
  return {
    providerAddress,
    proofId,
    txHash: receipt.hash,
  };
}

function writeArtifacts({ batch, upload, anchor, walletAddress, balance0G }) {
  fs.mkdirSync(evidenceArtifactDir, { recursive: true });
  const fileName = `capability-receipt-batch-${batch.receiptCount}.json`;
  const batchPath = path.join(evidenceArtifactDir, fileName);
  fs.writeFileSync(batchPath, `${JSON.stringify(batch, null, 2)}\n`);

  const explorerBase = process.env.ZERO_G_EXPLORER_BASE || defaultExplorerBase;
  const networkName = process.env.ZERO_G_NETWORK_NAME || defaultNetworkName;
  const contractAddress = requiredEnv('PROOF_REGISTRY_ADDRESS');
  const batchIndex = readJSON(receiptBatchIndexPath, {
    schema: 'xenodia.0g.receipt-batch-index.v1',
    status: 'pending',
    network: networkName,
    contractAddress,
    explorerBase,
    batches: [],
  });
  const entry = {
    status: 'anchored',
    batchId: batch.batchId,
    receiptRoot: batch.receiptRoot,
    receiptCount: batch.receiptCount,
    receiptIds: batch.receipts.map((receipt) => receipt.receiptId),
    storageRoot: upload.rootHash,
    storageURI: upload.uri,
    storageTx: upload.txHash || 'already_finalized',
    proofId: anchor.proofId,
    anchorTx: anchor.txHash,
    artifactPath: `docs/evidence-artifacts/${fileName}`,
    updatedAt: new Date().toISOString(),
  };
  const nextBatches = [entry, ...(Array.isArray(batchIndex.batches) ? batchIndex.batches : []).filter((item) => item.batchId !== entry.batchId)].slice(0, 20);
  const nextIndex = {
    ...batchIndex,
    status: 'anchored',
    network: networkName,
    contractAddress,
    explorerBase,
    batches: nextBatches,
  };
  fs.mkdirSync(path.dirname(receiptBatchIndexPath), { recursive: true });
  fs.writeFileSync(receiptBatchIndexPath, `${JSON.stringify(nextIndex, null, 2)}\n`);

  const storageTxLine = upload.txHash && upload.txHash !== 'already_finalized'
    ? `[${upload.txHash}](${explorerBase}/tx/${upload.txHash})`
    : '`already_finalized`';
  const anchorTxLine = anchor.txHash && anchor.txHash !== 'already_anchored'
    ? `[${anchor.txHash}](${explorerBase}/tx/${anchor.txHash})`
    : '`already_anchored`';
  const content = `# Capability Receipt Batches

Status: anchored

## Latest Batch

- Operator: \`${walletAddress}\`
- Operator balance before upload: \`${balance0G} 0G\`
- Receipt count: \`${batch.receiptCount}\`
- Receipt root: \`${batch.receiptRoot}\`
- 0G Storage root: \`${upload.rootHash}\`
- 0G Storage URI: \`${upload.uri}\`
- 0G Storage tx: ${storageTxLine}
- Receipt proofId: \`${anchor.proofId}\`
- Receipt anchor tx: ${anchorTxLine}
- Artifact: \`docs/evidence-artifacts/${fileName}\`

## Meaning

This batch proves that capability calls generated default receipts before any optional review. Reviews can later point to these receipt IDs, while 0G anchors the batch root instead of one transaction per invocation.
`;
  fs.writeFileSync(receiptBatchDocPath, content);

  return { batchPath, receiptBatchDocPath, receiptBatchIndexPath, entry };
}

async function main() {
  const rpcUrl = requiredEnv('ZERO_G_RPC_URL');
  const expectedChainId = BigInt(requiredEnv('ZERO_G_CHAIN_ID'));
  const indexerRpc = process.env.ZERO_G_STORAGE_INDEXER_RPC || defaultIndexerRpc;
  const contractAddress = requiredEnv('PROOF_REGISTRY_ADDRESS');
  const walletFile = readWallet();
  const provider = new JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  if (network.chainId !== expectedChainId) {
    throw new Error(`RPC chainId mismatch: expected ${expectedChainId}, got ${network.chainId}`);
  }

  const signer = new Wallet(walletFile.privateKey, provider);
  const balance0G = formatEther(await provider.getBalance(signer.address));
  const receiptLog = readJSON(receiptLogPath, { items: [] });
  const batch = buildReceiptBatch(Array.isArray(receiptLog.items) ? receiptLog.items : []);
  const upload = await uploadBatch({ batch, signer, rpcUrl, indexerRpc });
  const anchor = await anchorBatch({ batch, upload, signer, contractAddress });
  const artifacts = writeArtifacts({ batch, upload, anchor, walletAddress: signer.address, balance0G });

  console.log(stableStringify({
    status: 'anchored',
    receiptCount: batch.receiptCount,
    receiptRoot: batch.receiptRoot,
    storageURI: upload.uri,
    storageTx: upload.txHash || 'already_finalized',
    proofId: anchor.proofId,
    anchorTx: anchor.txHash,
    receiptBatchDocPath: artifacts.receiptBatchDocPath,
    receiptBatchIndexPath: artifacts.receiptBatchIndexPath,
  }));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
