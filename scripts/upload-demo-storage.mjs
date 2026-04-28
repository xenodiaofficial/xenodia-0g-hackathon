import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk';
import { JsonRpcProvider, Wallet, formatEther } from 'ethers';
import {
  applyStorageUploadsToState,
  buildStorageDocuments,
  makeSeededDemoState,
  stableStringify
} from '../demo/proof-model.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultWalletPath = path.join(os.homedir(), '.config', 'xenodia-0g-hackathon', 'demo-wallet.json');
const walletPath = process.env.LOCAL_DEMO_WALLET_FILE || defaultWalletPath;
const storageArtifactDir = path.join(repoRoot, 'artifacts', 'storage');
const defaultIndexerRpc = 'https://indexer-storage-testnet-turbo.0g.ai';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function readDemoWallet() {
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Missing local demo wallet: ${walletPath}`);
  }

  return JSON.parse(fs.readFileSync(walletPath, 'utf8'));
}

function writeStorageFile(document) {
  fs.mkdirSync(storageArtifactDir, { recursive: true });
  const filePath = path.join(storageArtifactDir, document.fileName);
  fs.writeFileSync(filePath, `${JSON.stringify(document.payload, null, 2)}\n`);
  return filePath;
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
      txHash: result.txHash
    };
  }

  return {
    rootHash: result.rootHashes?.[0] || fallbackRootHash,
    txHash: result.txHashes?.[0] || null,
    rootHashes: result.rootHashes,
    txHashes: result.txHashes
  };
}

async function uploadDocument({ document, dryRun, indexer, rpcUrl, signer }) {
  const filePath = writeStorageFile(document);
  const localRootHash = await merkleRootForPayload(document.payload);

  if (dryRun) {
    return {
      kind: document.kind,
      fileName: document.fileName,
      filePath,
      anchorHash: document.anchorHash,
      rootHash: localRootHash,
      txHash: null,
      uri: storageURI(localRootHash),
      mode: 'dry-run'
    };
  }

  const bytes = new TextEncoder().encode(`${JSON.stringify(document.payload, null, 2)}\n`);
  const memData = new MemData(bytes);
  const [, treeErr] = await memData.merkleTree();
  if (treeErr !== null) {
    throw new Error(`0G Storage Merkle tree error: ${treeErr}`);
  }

  const [tx, uploadErr] = await indexer.upload(memData, rpcUrl, signer);
  if (uploadErr !== null) {
    throw new Error(`0G Storage upload error for ${document.kind}: ${uploadErr}`);
  }

  const normalized = normalizeUploadResult(tx, localRootHash);
  return {
    kind: document.kind,
    fileName: document.fileName,
    filePath,
    anchorHash: document.anchorHash,
    rootHash: normalized.rootHash,
    txHash: normalized.txHash,
    uri: storageURI(normalized.rootHash),
    mode: 'uploaded'
  };
}

export async function uploadDemoStorageDocuments({
  state = makeSeededDemoState(),
  dryRun = false,
  rpcUrl = process.env.ZERO_G_RPC_URL,
  expectedChainId = process.env.ZERO_G_CHAIN_ID,
  indexerRpc = process.env.ZERO_G_STORAGE_INDEXER_RPC || defaultIndexerRpc,
  privateKey
} = {}) {
  const documents = buildStorageDocuments(state);
  let signer = null;
  let balance0G = null;

  if (!dryRun) {
    const walletFile = privateKey ? { privateKey } : readDemoWallet();
    const provider = new JsonRpcProvider(requiredEnv('ZERO_G_RPC_URL'));
    const network = await provider.getNetwork();
    if (expectedChainId && network.chainId !== BigInt(expectedChainId)) {
      throw new Error(`RPC chainId mismatch: expected ${expectedChainId}, got ${network.chainId}`);
    }
    signer = new Wallet(walletFile.privateKey, provider);
    balance0G = formatEther(await provider.getBalance(signer.address));
  }

  const indexer = dryRun ? null : new Indexer(indexerRpc);
  const uploads = [];
  for (const document of documents) {
    uploads.push(await uploadDocument({ document, dryRun, indexer, rpcUrl, signer }));
  }

  const uploadsByKind = Object.fromEntries(uploads.map((upload) => [upload.kind, upload]));
  applyStorageUploadsToState(state, uploadsByKind);

  const manifest = {
    schema: 'xenodia.0g.storage-upload-manifest.v1',
    mode: dryRun ? 'dry-run' : 'uploaded',
    rpcUrl: dryRun ? null : rpcUrl,
    indexerRpc: dryRun ? null : indexerRpc,
    signer: signer?.address || null,
    balance0G,
    generatedAt: new Date().toISOString(),
    uploads,
    stateProofStorageURIs: {
      providerProfile: state.provider.profileURI,
      capabilityManifest: state.capability.storageURI,
      receiptBatch: state.storageUploads.receiptBatch.uri,
      settlementBatch: state.storageUploads.settlementBatch.uri
    }
  };

  fs.mkdirSync(storageArtifactDir, { recursive: true });
  const manifestPath = path.join(
    storageArtifactDir,
    dryRun ? 'upload-manifest-dry-run.json' : 'upload-manifest-0g-testnet.json'
  );
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return { state, uploads, uploadsByKind, manifest, manifestPath };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const result = await uploadDemoStorageDocuments({ dryRun });
  console.log(stableStringify({
    mode: result.manifest.mode,
    manifestPath: result.manifestPath,
    uploads: result.uploads.map((upload) => ({
      kind: upload.kind,
      rootHash: upload.rootHash,
      txHash: upload.txHash,
      uri: upload.uri,
      anchorHash: upload.anchorHash
    }))
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
