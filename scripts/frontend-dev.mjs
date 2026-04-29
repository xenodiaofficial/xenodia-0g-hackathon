import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const formalFrontendAuthPath = path.resolve(repoRoot, '..', 'myxeno-fe', 'lib', 'auth.tsx');

const publicFirebaseEnv = [
  ['NEXT_PUBLIC_FIREBASE_API_KEY', 'apiKey'],
  ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'authDomain'],
  ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'projectId'],
  ['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'storageBucket'],
  ['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId'],
  ['NEXT_PUBLIC_FIREBASE_APP_ID', 'appId'],
];

function parseFormalFrontendFirebaseConfig() {
  if (!existsSync(formalFrontendAuthPath)) {
    return {};
  }

  const source = readFileSync(formalFrontendAuthPath, 'utf8');
  const values = {};

  for (const [envName, fieldName] of publicFirebaseEnv) {
    const pattern = new RegExp(`${fieldName}\\s*:\\s*process\\.env\\.${envName}\\s*\\|\\|\\s*'([^']+)'`);
    const match = source.match(pattern);
    if (match?.[1]) {
      values[envName] = match[1];
    }
  }

  return values;
}

function buildEnvironment() {
  const env = {
    ...process.env,
    BACKEND_BASE_URL: process.env.BACKEND_BASE_URL || 'https://api.xenodia.xyz',
    AUTH_BASE_URL: process.env.AUTH_BASE_URL || 'https://api.xenodia.xyz',
    GATEWAY_BASE_URL: process.env.GATEWAY_BASE_URL || 'https://api.xenodia.xyz',
    BILLING_BASE_URL: process.env.BILLING_BASE_URL || 'https://api.xenodia.xyz',
    NEXT_PUBLIC_WEB_BASE_URL: process.env.NEXT_PUBLIC_WEB_BASE_URL || 'http://localhost:4041',
  };

  const missingFirebaseEnv = publicFirebaseEnv.some(([envName]) => !env[envName]);
  if (missingFirebaseEnv) {
    const localConfig = parseFormalFrontendFirebaseConfig();
    for (const [envName] of publicFirebaseEnv) {
      if (!env[envName] && localConfig[envName]) {
        env[envName] = localConfig[envName];
      }
    }
  }

  return env;
}

const env = buildEnvironment();
const firebaseReady = publicFirebaseEnv.every(([envName]) => Boolean(env[envName]));

console.log(`0G frontend dev: production Xenodia APIs enabled on http://localhost:4041`);
console.log(`0G frontend dev: Google sign-in ${firebaseReady ? 'configured' : 'not configured; set NEXT_PUBLIC_FIREBASE_* or keep the sibling myxeno-fe checkout available'}`);

const child = spawn('npm', ['--prefix', 'frontend', 'run', 'dev', '--', '--port', '4041'], {
  cwd: repoRoot,
  env,
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
