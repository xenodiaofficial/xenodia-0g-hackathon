import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContractFactory, JsonRpcProvider, Wallet, formatEther } from 'ethers';
import { compileContracts } from './compile-contracts.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultWalletPath = path.join(os.homedir(), '.config', 'xenodia-0g-hackathon', 'demo-wallet.json');
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

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolvePrivateKey() {
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    return process.env.DEPLOYER_PRIVATE_KEY;
  }

  const walletPath = process.env.LOCAL_DEMO_WALLET_FILE || defaultWalletPath;
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Missing DEPLOYER_PRIVATE_KEY and local demo wallet: ${walletPath}`);
  }

  const walletFile = readJSON(walletPath);
  if (!walletFile.privateKey) {
    throw new Error(`Local demo wallet does not contain privateKey: ${walletPath}`);
  }
  return walletFile.privateKey;
}

async function main() {
  compileContracts({ writeArtifacts: true });

  const rpcUrl = requiredEnv('ZERO_G_RPC_URL');
  const privateKey = resolvePrivateKey();
  const expectedChainId = process.env.ZERO_G_CHAIN_ID ? BigInt(process.env.ZERO_G_CHAIN_ID) : null;

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const provider = new JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();

  if (expectedChainId !== null && network.chainId !== expectedChainId) {
    throw new Error(`RPC chainId mismatch: expected ${expectedChainId}, got ${network.chainId}`);
  }

  const wallet = new Wallet(privateKey, provider);
  const balance = await provider.getBalance(wallet.address);
  if (balance === 0n) {
    throw new Error(`Deployer ${wallet.address} has 0 native token balance on chain ${network.chainId}. Fund it before deploying.`);
  }

  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(wallet.address);
  const receipt = await contract.deploymentTransaction().wait();

  console.log(JSON.stringify({
    network: network.name,
    chainId: network.chainId.toString(),
    contractAddress: await contract.getAddress(),
    deployer: wallet.address,
    deployerBalanceBeforeDeploy: `${formatEther(balance)} 0G`,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
