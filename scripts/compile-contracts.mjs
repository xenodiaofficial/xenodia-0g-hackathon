import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import solc from 'solc';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contractsDir = path.join(repoRoot, 'contracts');
const artifactsDir = path.join(repoRoot, 'artifacts');

function collectSoliditySources(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const sources = {};

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(sources, collectSoliditySources(absPath));
      continue;
    }

    if (!entry.name.endsWith('.sol')) continue;
    const relPath = path.relative(repoRoot, absPath).replaceAll(path.sep, '/');
    sources[relPath] = { content: fs.readFileSync(absPath, 'utf8') };
  }

  return sources;
}

export function compileContracts({ writeArtifacts = true } = {}) {
  const sources = collectSoliditySources(contractsDir);
  if (Object.keys(sources).length === 0) {
    throw new Error(`No Solidity sources found in ${contractsDir}`);
  }

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: 'cancun',
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata']
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors || [];
  const fatalErrors = errors.filter((error) => error.severity === 'error');
  if (fatalErrors.length > 0) {
    const message = fatalErrors.map((error) => error.formattedMessage).join('\n');
    throw new Error(message);
  }

  if (writeArtifacts) {
    fs.rmSync(artifactsDir, { recursive: true, force: true });

    for (const [sourceName, contracts] of Object.entries(output.contracts || {})) {
      for (const [contractName, artifact] of Object.entries(contracts)) {
        const artifactPath = path.join(
          artifactsDir,
          sourceName,
          `${contractName}.json`
        );
        fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
        fs.writeFileSync(
          artifactPath,
          JSON.stringify(
            {
              contractName,
              sourceName,
              abi: artifact.abi,
              bytecode: `0x${artifact.evm.bytecode.object}`,
              deployedBytecode: `0x${artifact.evm.deployedBytecode.object}`,
              compiler: solc.version(),
              evmVersion: input.settings.evmVersion
            },
            null,
            2
          )
        );
      }
    }
  }

  return output;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const output = compileContracts({ writeArtifacts: true });
  const contractCount = Object.values(output.contracts || {}).reduce(
    (count, contracts) => count + Object.keys(contracts).length,
    0
  );
  console.log(`Compiled ${contractCount} contract(s) with solc ${solc.version()} and evmVersion=cancun.`);
}

