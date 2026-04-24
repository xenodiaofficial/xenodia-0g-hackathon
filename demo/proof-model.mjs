import { id, solidityPackedKeccak256 } from 'ethers';

export function stableStringify(value) {
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

export function hashJSON(value) {
  return id(stableStringify(value));
}

export function makeInitialState() {
  return {
    provider: {
      walletAddress: '0x0000000000000000000000000000000000000abc',
      displayName: 'Xenodia Demo Provider',
      zeroGDomain: 'xenodia.0g',
      providerKind: 'mcp',
      trustStatus: 'platform_verified',
      rank: 100,
      profileURI: '0g://storage/xenodia-demo-provider-profile.json'
    },
    capability: {
      slug: 'xenodia-market-research',
      name: 'Market Research Skill',
      version: 'v0.1.0-0g-demo',
      storageURI: '0g://storage/xenodia-market-research-manifest-v0.1.0.json',
      operations: ['quote', 'invoke'],
      priceMicroUSDC: 140000,
      providerShareBps: 7000
    },
    invocations: [],
    anchors: []
  };
}

export function buildProviderProfile(provider) {
  return {
    displayName: provider.displayName,
    providerKind: provider.providerKind,
    trustStatus: provider.trustStatus,
    walletAddress: provider.walletAddress,
    zeroGDomain: provider.zeroGDomain
  };
}

export function buildCapabilityManifest(state) {
  return {
    capabilitySlug: state.capability.slug,
    capabilityVersion: state.capability.version,
    provider: state.provider.walletAddress,
    providerKind: state.provider.providerKind,
    operations: state.capability.operations,
    pricing: {
      currency: 'USDC',
      unit: 'microUSDC',
      priceMicroUSDC: state.capability.priceMicroUSDC
    },
    payment: {
      standard: 'x402',
      settlementMode: 'offline_provider_share_record'
    },
    execution: {
      mode: 'mock_demo_executor',
      productionLLM: false
    }
  };
}

export function mockExecuteCapability(state, input) {
  const prompt = String(input.prompt || '').trim() || 'Compare three x402 service providers for an AI agent.';
  const priceMicroUSDC = Number(input.priceMicroUSDC || state.capability.priceMicroUSDC);
  const providerShareMicroUSDC = Math.round(priceMicroUSDC * state.capability.providerShareBps / 10000);
  const platformShareMicroUSDC = priceMicroUSDC - providerShareMicroUSDC;
  const timestamp = input.createdAt || new Date().toISOString();
  const normalizedPrompt = prompt.toLowerCase();
  const signals = [
    normalizedPrompt.includes('pay') || normalizedPrompt.includes('x402') ? 'payment-aware' : 'general',
    normalizedPrompt.includes('risk') ? 'risk-screened' : 'speed-first',
    normalizedPrompt.includes('agent') ? 'agent-ready' : 'human-readable'
  ];

  const response = {
    title: 'Mock market research result',
    summary: `Deterministic demo analysis for: "${prompt.slice(0, 96)}"`,
    signals,
    recommendation: signals.includes('payment-aware')
      ? 'Prefer providers with verifiable receipts and clear x402 payment metadata.'
      : 'Publish a capability manifest first, then attach receipts after paid execution.',
    productionLLM: false
  };

  const receipt = {
    receiptId: id(`${timestamp}:${state.provider.walletAddress}:${state.capability.slug}:${prompt}`),
    provider: state.provider.walletAddress,
    capabilitySlug: state.capability.slug,
    capabilityVersion: state.capability.version,
    inputHash: hashJSON({ prompt }),
    outputHash: hashJSON(response),
    priceMicroUSDC,
    providerShareMicroUSDC,
    platformShareMicroUSDC,
    createdAt: timestamp,
    executor: 'mock_demo_executor'
  };

  return { response, receipt };
}

export function buildProofPayload(state) {
  const provider = state.provider.walletAddress;
  const profileHash = hashJSON(buildProviderProfile(state.provider));
  const capabilityId = id(state.capability.slug);
  const manifestHash = hashJSON(buildCapabilityManifest(state));
  const receipts = [...state.invocations].map((invocation) => invocation.receipt);
  const receiptBatchId = id(`${state.capability.slug}:receipts:${receipts.length}`);
  const receiptRoot = hashJSON({
    receipts: receipts.map((receipt) => ({
      receiptId: receipt.receiptId,
      inputHash: receipt.inputHash,
      outputHash: receipt.outputHash,
      priceMicroUSDC: receipt.priceMicroUSDC,
      providerShareMicroUSDC: receipt.providerShareMicroUSDC,
      platformShareMicroUSDC: receipt.platformShareMicroUSDC
    }))
  });
  const totalPaidMicroUSDC = receipts.reduce((sum, receipt) => sum + receipt.priceMicroUSDC, 0);
  const providerShareMicroUSDC = receipts.reduce((sum, receipt) => sum + receipt.providerShareMicroUSDC, 0);
  const platformShareMicroUSDC = receipts.reduce((sum, receipt) => sum + receipt.platformShareMicroUSDC, 0);
  const settlementBatchId = id(`${state.capability.slug}:settlement:${receipts.length}`);
  const settlementRoot = hashJSON({
    provider,
    receiptCount: receipts.length,
    totalPaidMicroUSDC,
    providerShareMicroUSDC,
    platformShareMicroUSDC
  });

  return {
    provider,
    profile: {
      profileHash,
      profileURI: state.provider.profileURI,
      zeroGDomain: state.provider.zeroGDomain,
      rank: state.provider.rank,
      active: true
    },
    capability: {
      capabilitySlug: state.capability.slug,
      capabilityId,
      version: state.capability.version,
      manifestHash,
      storageURI: state.capability.storageURI,
      proofId: solidityPackedKeccak256(
        ['string', 'address', 'bytes32', 'string', 'bytes32'],
        ['xenodia.0g.capability', provider, capabilityId, state.capability.version, manifestHash]
      )
    },
    receiptBatch: {
      batchId: receiptBatchId,
      receiptRoot,
      storageURI: `0g://storage/${state.capability.slug}-receipt-batch-${receipts.length}.json`,
      receiptCount: receipts.length,
      proofId: solidityPackedKeccak256(
        ['string', 'address', 'bytes32', 'bytes32'],
        ['xenodia.0g.receipts', provider, receiptBatchId, receiptRoot]
      )
    },
    settlementBatch: {
      batchId: settlementBatchId,
      settlementRoot,
      storageURI: `0g://storage/${state.capability.slug}-settlement-batch-${receipts.length}.json`,
      settlementCount: receipts.length > 0 ? 1 : 0,
      totalPaidMicroUSDC,
      providerShareMicroUSDC,
      platformShareMicroUSDC,
      proofId: solidityPackedKeccak256(
        ['string', 'address', 'bytes32', 'bytes32'],
        ['xenodia.0g.settlements', provider, settlementBatchId, settlementRoot]
      )
    }
  };
}
