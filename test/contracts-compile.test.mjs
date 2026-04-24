import assert from 'node:assert/strict';
import test from 'node:test';
import { compileContracts } from '../scripts/compile-contracts.mjs';

test('ZeroGProofRegistry compiles and exposes proof anchoring functions', () => {
  const output = compileContracts({ writeArtifacts: false });
  const artifact = output.contracts['contracts/ZeroGProofRegistry.sol'].ZeroGProofRegistry;
  const functionNames = artifact.abi
    .filter((entry) => entry.type === 'function')
    .map((entry) => entry.name)
    .sort();

  assert.ok(functionNames.includes('updateProviderIdentity'));
  assert.ok(functionNames.includes('publishCapabilityManifest'));
  assert.ok(functionNames.includes('anchorReceiptBatch'));
  assert.ok(functionNames.includes('anchorSettlementBatch'));
  assert.equal(artifact.evm.bytecode.object.length > 0, true);
});

