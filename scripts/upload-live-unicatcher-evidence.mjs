import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk';
import { Contract, JsonRpcProvider, Wallet, formatEther, id, solidityPackedKeccak256 } from 'ethers';
import { compileContracts } from './compile-contracts.mjs';
import { hashJSON, stableStringify } from '../demo/proof-model.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultWalletPath = path.join(os.homedir(), '.config', 'xenodia-0g-hackathon', 'demo-wallet.json');
const walletPath = process.env.LOCAL_DEMO_WALLET_FILE || defaultWalletPath;
const liveEvidencePath = path.join(repoRoot, 'tmp', '0g-live-unicatcher-evidence.json');
const evidenceArtifactDir = path.join(repoRoot, 'docs', 'evidence-artifacts');
const liveEvidenceDocPath = path.join(repoRoot, 'docs', 'live-unicatcher-evidence.md');
const publicLiveEvidenceDocPath = path.join(repoRoot, 'frontend', 'public', 'docs', 'live-unicatcher-evidence.md');
const frontendEvidencePath = path.join(repoRoot, 'frontend', 'content', 'zerog-live-evidence.json');
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

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readWallet() {
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Missing local demo wallet: ${walletPath}`);
  }
  return readJSON(walletPath);
}

function stripEmpty(value) {
  if (Array.isArray(value)) {
    return value.map(stripEmpty);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => typeof entry !== 'undefined' && entry !== null && entry !== '')
      .map(([key, entry]) => [key, stripEmpty(entry)]),
  );
}

function sanitizeEvidenceItem(item) {
  return stripEmpty({
    receipt: item.receipt
      ? {
          schema: item.receipt.schema,
          receiptId: item.receipt.receiptId,
          providerId: item.receipt.providerId,
          capabilitySlug: item.receipt.capabilitySlug,
          operation: item.receipt.operation,
          requestId: item.receipt.requestId,
          requestURL: item.receipt.requestURL,
          idempotencyKeyHash: item.receipt.idempotencyKeyHash,
          accountHash: item.receipt.accountHash,
          inputHash: item.receipt.inputHash,
          outputHash: item.receipt.outputHash,
          status: item.receipt.status,
          createdAt: item.receipt.createdAt,
        }
      : null,
    review: item.review
      ? {
          schema: item.review.schema,
          reviewId: item.review.reviewId,
          receiptId: item.review.receiptId,
          providerId: item.review.providerId,
          capabilitySlug: item.review.capabilitySlug,
          accountHash: item.review.accountHash,
          rating: item.review.rating,
          commentHash: item.review.commentHash,
          createdAt: item.review.createdAt,
        }
      : null,
    roots: item.roots,
  });
}

function buildLiveRollup(log) {
  const items = Array.isArray(log.items) ? log.items.filter((item) => item?.receipt && item?.review) : [];
  if (items.length === 0) {
    throw new Error('No live UniCatcher evidence items found. Run a live invocation and review first.');
  }

  const sanitizedItems = items.map(sanitizeEvidenceItem);
  const latest = items[0];
  const reputation = stripEmpty({
    ...latest.reputation,
    lastReceiptId: latest.reputation?.lastReceiptId,
    lastReviewId: latest.reputation?.lastReviewId,
  });
  const rollup = {
    schema: 'xenodia.0g.live-unicatcher-rollup.v1',
    generatedAt: new Date().toISOString(),
    sourceSchema: log.schema,
    provider: {
      id: 'unicatcher',
      rankScope: 'provider',
      rankModel: 'aggregate_user_reviews',
    },
    capabilitySlug: 'unicatcher-query',
    itemCount: sanitizedItems.length,
    items: sanitizedItems,
    reputation,
  };

  return {
    ...rollup,
    rollupRoot: hashJSON(rollup),
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

async function uploadRollup({ rollup, signer, rpcUrl, indexerRpc }) {
  const bytes = new TextEncoder().encode(`${JSON.stringify(rollup, null, 2)}\n`);
  const memData = new MemData(bytes);
  const [, treeErr] = await memData.merkleTree();
  if (treeErr !== null) {
    throw new Error(`0G Storage Merkle tree error: ${treeErr}`);
  }

  const localRootHash = await merkleRootForPayload(rollup);
  const indexer = new Indexer(indexerRpc);
  const [tx, uploadErr] = await indexer.upload(memData, rpcUrl, signer);
  if (uploadErr !== null) {
    throw new Error(`0G Storage upload error for live UniCatcher rollup: ${uploadErr}`);
  }

  const normalized = normalizeUploadResult(tx, localRootHash);
  return {
    rootHash: normalized.rootHash,
    txHash: normalized.txHash,
    uri: storageURI(normalized.rootHash),
  };
}

async function anchorRollup({ rollup, upload, signer, contractAddress }) {
  compileContracts({ writeArtifacts: true });
  const artifact = readJSON(artifactPath);
  const registry = new Contract(contractAddress, artifact.abi, signer);
  const providerAddress = process.env.LIVE_UNICATCHER_PROVIDER_ADDRESS || defaultProvider;
  const batchId = id(`unicatcher-query:live-reviews:${rollup.itemCount}:${rollup.rollupRoot}`);
  const proofId = solidityPackedKeccak256(
    ['string', 'address', 'bytes32', 'bytes32'],
    ['xenodia.0g.receipts', providerAddress, batchId, rollup.rollupRoot],
  );

  if (await registry.hasProof(proofId)) {
    return {
      providerAddress,
      batchId,
      proofId,
      txHash: 'already_anchored',
    };
  }

  const tx = await registry.anchorReceiptBatch(providerAddress, batchId, rollup.rollupRoot, upload.uri, rollup.itemCount);
  const receipt = await tx.wait();
  return {
    providerAddress,
    batchId,
    proofId,
    txHash: receipt.hash,
  };
}

function writeArtifacts({ rollup, upload, anchor, walletAddress, balance0G }) {
  fs.mkdirSync(evidenceArtifactDir, { recursive: true });
  const rollupFileName = `unicatcher-live-evidence-rollup-${rollup.itemCount}.json`;
  const rollupPath = path.join(evidenceArtifactDir, rollupFileName);
  fs.writeFileSync(rollupPath, `${JSON.stringify(rollup, null, 2)}\n`);

  const explorerBase = process.env.ZERO_G_EXPLORER_BASE || defaultExplorerBase;
  const networkName = process.env.ZERO_G_NETWORK_NAME || defaultNetworkName;
  const contractAddress = requiredEnv('PROOF_REGISTRY_ADDRESS');
  const frontendEvidence = {
    status: 'anchored',
    network: networkName,
    contractAddress,
    explorerBase,
    itemCount: rollup.itemCount,
    storageRoot: upload.rootHash,
    storageURI: upload.uri,
    storageTx: upload.txHash || 'already_finalized',
    rollupRoot: rollup.rollupRoot,
    receiptBatchProofId: anchor.proofId,
    receiptBatchTx: anchor.txHash,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(frontendEvidencePath, `${JSON.stringify(frontendEvidence, null, 2)}\n`);

  const storageTxLine = upload.txHash && upload.txHash !== 'already_finalized'
    ? `[${upload.txHash}](${explorerBase}/tx/${upload.txHash})`
    : '`already_finalized`';
  const anchorTxLine = anchor.txHash && anchor.txHash !== 'already_anchored'
    ? `[${anchor.txHash}](${explorerBase}/tx/${anchor.txHash})`
    : '`already_anchored`';
  const content = `# Live UniCatcher 0G Evidence

Status: anchored

## Network

- Network: ${networkName}
- Explorer: ${explorerBase}
- Contract: [${contractAddress}](${explorerBase}/address/${contractAddress})
- Operator: \`${walletAddress}\`
- Operator balance before live upload: \`${balance0G} 0G\`

## Live Rollup

- Capability: \`unicatcher-query\`
- Provider rank scope: \`provider\`
- Evidence items: \`${rollup.itemCount}\`
- Rollup root: \`${rollup.rollupRoot}\`
- 0G Storage root: \`${upload.rootHash}\`
- 0G Storage URI: \`${upload.uri}\`
- 0G Storage tx: ${storageTxLine}
- Receipt proofId: \`${anchor.proofId}\`
- Receipt anchor tx: ${anchorTxLine}
- Judge-visible rollup JSON: \`docs/evidence-artifacts/${rollupFileName}\`

## What This Proves

A signed-in Xenodia user invoked UniCatcher through the production capability gateway, submitted a review, and Xenodia rolled the sanitized receipt, review, and provider-level reputation snapshot into a 0G Storage object. The registry anchors the rollup root and storage URI on 0G Chain without exposing raw user prompts, raw results, upstream API keys, or production LLM routing code.
`;
  fs.writeFileSync(liveEvidenceDocPath, content);
  fs.mkdirSync(path.dirname(publicLiveEvidenceDocPath), { recursive: true });
  fs.writeFileSync(publicLiveEvidenceDocPath, content);

  return { rollupPath, liveEvidenceDocPath, publicLiveEvidenceDocPath, frontendEvidencePath, frontendEvidence };
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
  const log = readJSON(liveEvidencePath);
  const rollup = buildLiveRollup(log);
  const upload = await uploadRollup({ rollup, signer, rpcUrl, indexerRpc });
  const anchor = await anchorRollup({ rollup, upload, signer, contractAddress });
  const artifacts = writeArtifacts({ rollup, upload, anchor, walletAddress: signer.address, balance0G });

  console.log(stableStringify({
    status: 'anchored',
    itemCount: rollup.itemCount,
    rollupRoot: rollup.rollupRoot,
    storageURI: upload.uri,
    storageTx: upload.txHash || 'already_finalized',
    receiptBatchProofId: anchor.proofId,
    receiptBatchTx: anchor.txHash,
    liveEvidenceDocPath: artifacts.liveEvidenceDocPath,
    publicLiveEvidenceDocPath: artifacts.publicLiveEvidenceDocPath,
    frontendEvidencePath: artifacts.frontendEvidencePath,
  }));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
