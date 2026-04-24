import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Contract, JsonRpcProvider } from 'ethers';

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
    throw new Error(`Missing ${name}. Set it in the shell before running this script.`);
  }
  return value;
}

async function main() {
  const rpcUrl = requiredEnv('ZERO_G_RPC_URL');
  const contractAddress = requiredEnv('PROOF_REGISTRY_ADDRESS');
  const proofId = requiredEnv('PROOF_ID');

  if (!fs.existsSync(artifactPath)) {
    throw new Error('Missing contract artifact. Run npm run contracts:compile first.');
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const provider = new JsonRpcProvider(rpcUrl);
  const contract = new Contract(contractAddress, artifact.abi, provider);
  const record = await contract.proofRecords(proofId);

  console.log(JSON.stringify({
    proofId,
    kind: Number(record.kind),
    provider: record.provider,
    subjectId: record.subjectId,
    contentHash: record.contentHash,
    storageURI: record.storageURI,
    itemCount: record.itemCount.toString(),
    anchoredAt: record.anchoredAt.toString()
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

