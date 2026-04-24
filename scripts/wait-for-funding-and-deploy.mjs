import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonRpcProvider, Wallet, formatEther } from 'ethers';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultWalletPath = path.join(os.homedir(), '.config', 'xenodia-0g-hackathon', 'demo-wallet.json');
const walletPath = process.env.LOCAL_DEMO_WALLET_FILE || defaultWalletPath;
const deployScriptPath = path.join(repoRoot, 'scripts', 'deploy-testnet-evidence.mjs');
const faucetUrl = 'https://hub.0g.ai/faucet';
const defaultMinimumFundingWei = 5_000_000_000_000_000n;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function positiveIntegerEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function positiveBigIntEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = BigInt(raw);
  if (parsed <= 0n) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function runDeployEvidence() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [deployScriptPath], {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`deploy-testnet-evidence exited with ${signal || code}.`));
    });
  });
}

async function main() {
  const rpcUrl = requiredEnv('ZERO_G_RPC_URL');
  const expectedChainId = BigInt(requiredEnv('ZERO_G_CHAIN_ID'));
  const pollIntervalMs = positiveIntegerEnv('FUNDING_POLL_INTERVAL_MS', 30_000);
  const timeoutMs = positiveIntegerEnv('FUNDING_TIMEOUT_MS', 30 * 60 * 1000);
  const minimumFundingWei = positiveBigIntEnv('MIN_FUNDING_WEI', defaultMinimumFundingWei);

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
  const start = Date.now();
  console.log(`Waiting for 0G testnet funding for ${wallet.address}.`);
  console.log(`Faucet: ${faucetUrl}`);
  console.log(`Minimum funding threshold: ${formatEther(minimumFundingWei)} 0G`);

  while (Date.now() - start <= timeoutMs) {
    const balance = await provider.getBalance(wallet.address);
    const balance0G = formatEther(balance);
    const checkedAt = new Date().toISOString();
    console.log(`[${checkedAt}] balance=${balance0G} 0G`);

    if (balance >= minimumFundingWei) {
      console.log('Funding detected. Deploying registry and writing testnet evidence...');
      await runDeployEvidence();
      return;
    }

    const elapsedMs = Date.now() - start;
    await sleep(Math.min(pollIntervalMs, Math.max(timeoutMs - elapsedMs, 1)));
  }

  throw new Error(
    `Timed out waiting for 0G testnet funding. Request funds for ${wallet.address} at ${faucetUrl}.`
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
