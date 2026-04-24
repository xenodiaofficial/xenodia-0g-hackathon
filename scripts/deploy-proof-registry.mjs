import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContractFactory, JsonRpcProvider, Wallet } from 'ethers';
import { compileContracts } from './compile-contracts.mjs';

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
  compileContracts({ writeArtifacts: true });

  const rpcUrl = requiredEnv('ZERO_G_RPC_URL');
  const privateKey = requiredEnv('DEPLOYER_PRIVATE_KEY');
  const expectedChainId = process.env.ZERO_G_CHAIN_ID ? BigInt(process.env.ZERO_G_CHAIN_ID) : null;

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const provider = new JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();

  if (expectedChainId !== null && network.chainId !== expectedChainId) {
    throw new Error(`RPC chainId mismatch: expected ${expectedChainId}, got ${network.chainId}`);
  }

  const wallet = new Wallet(privateKey, provider);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(wallet.address);
  const receipt = await contract.deploymentTransaction().wait();

  console.log(JSON.stringify({
    network: network.name,
    chainId: network.chainId.toString(),
    contractAddress: await contract.getAddress(),
    deployer: wallet.address,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

