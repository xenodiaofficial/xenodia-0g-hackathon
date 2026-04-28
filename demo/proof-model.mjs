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

export function makeSeededDemoState() {
  const state = makeInitialState();
  [
    'Find x402 payment-aware providers for an autonomous agent.',
    'Rank capability providers by verifiable receipts and risk.',
    'Prepare offline settlement evidence for a paid skill invocation.'
  ].forEach((prompt, index) => {
    const { response, receipt } = mockExecuteCapability(state, {
      prompt,
      createdAt: `2026-04-24T00:0${index}:00.000Z`
    });
    state.invocations.unshift({ id: receipt.receiptId, prompt, response, receipt });
  });

  return state;
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

export function buildStorageDocuments(state) {
  const proofPayload = buildProofPayload(state);
  const providerProfile = buildProviderProfile(state.provider);
  const capabilityManifest = buildCapabilityManifest(state);
  const ledger = buildSettlementLedger(state);
  const receipts = [...state.invocations].map((invocation) => invocation.receipt);

  return [
    {
      kind: 'providerProfile',
      fileName: 'xenodia-demo-provider-profile.json',
      anchorHash: proofPayload.profile.profileHash,
      payload: {
        schema: 'xenodia.0g.provider-profile.v1',
        provider: providerProfile,
        profileHash: proofPayload.profile.profileHash
      }
    },
    {
      kind: 'capabilityManifest',
      fileName: `${state.capability.slug}-manifest-${state.capability.version}.json`,
      anchorHash: proofPayload.capability.manifestHash,
      payload: {
        schema: 'xenodia.0g.capability-manifest.v1',
        manifest: capabilityManifest,
        manifestHash: proofPayload.capability.manifestHash,
        proofId: proofPayload.capability.proofId
      }
    },
    {
      kind: 'receiptBatch',
      fileName: `${state.capability.slug}-receipt-batch-${receipts.length}.json`,
      anchorHash: proofPayload.receiptBatch.receiptRoot,
      payload: {
        schema: 'xenodia.0g.receipt-batch.v1',
        batchId: proofPayload.receiptBatch.batchId,
        receiptRoot: proofPayload.receiptBatch.receiptRoot,
        receiptCount: proofPayload.receiptBatch.receiptCount,
        receipts
      }
    },
    {
      kind: 'settlementBatch',
      fileName: `${state.capability.slug}-settlement-batch-${receipts.length}.json`,
      anchorHash: proofPayload.settlementBatch.settlementRoot,
      payload: {
        schema: 'xenodia.0g.settlement-batch.v1',
        batchId: proofPayload.settlementBatch.batchId,
        settlementRoot: proofPayload.settlementBatch.settlementRoot,
        settlementCount: proofPayload.settlementBatch.settlementCount,
        totals: ledger.totals,
        providerSummaries: ledger.providerSummaries,
        rows: ledger.rows
      }
    }
  ];
}

export function applyStorageUploadsToState(state, uploadsByKind) {
  if (uploadsByKind.providerProfile?.uri) {
    state.provider.profileURI = uploadsByKind.providerProfile.uri;
  }
  if (uploadsByKind.capabilityManifest?.uri) {
    state.capability.storageURI = uploadsByKind.capabilityManifest.uri;
  }
  state.storageUploads = uploadsByKind;
  return state;
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
      storageURI: state.storageUploads?.receiptBatch?.uri
        || `0g://storage/${state.capability.slug}-receipt-batch-${receipts.length}.json`,
      receiptCount: receipts.length,
      proofId: solidityPackedKeccak256(
        ['string', 'address', 'bytes32', 'bytes32'],
        ['xenodia.0g.receipts', provider, receiptBatchId, receiptRoot]
      )
    },
    settlementBatch: {
      batchId: settlementBatchId,
      settlementRoot,
      storageURI: state.storageUploads?.settlementBatch?.uri
        || `0g://storage/${state.capability.slug}-settlement-batch-${receipts.length}.json`,
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

export function buildSettlementLedger(state) {
  const rows = [...state.invocations].reverse().map((invocation) => {
    const receipt = invocation.receipt;
    return {
      invocationId: invocation.id,
      receiptId: receipt.receiptId,
      provider: receipt.provider,
      capabilitySlug: receipt.capabilitySlug,
      capabilityVersion: receipt.capabilityVersion,
      status: 'recorded_for_offline_settlement',
      currency: 'USDC',
      unit: 'microUSDC',
      grossAmountMicroUSDC: receipt.priceMicroUSDC,
      providerShareMicroUSDC: receipt.providerShareMicroUSDC,
      platformShareMicroUSDC: receipt.platformShareMicroUSDC,
      createdAt: receipt.createdAt
    };
  });

  const byProvider = new Map();
  for (const row of rows) {
    const existing = byProvider.get(row.provider) || {
      provider: row.provider,
      currency: row.currency,
      unit: row.unit,
      invocationCount: 0,
      grossAmountMicroUSDC: 0,
      providerShareMicroUSDC: 0,
      platformShareMicroUSDC: 0
    };

    existing.invocationCount += 1;
    existing.grossAmountMicroUSDC += row.grossAmountMicroUSDC;
    existing.providerShareMicroUSDC += row.providerShareMicroUSDC;
    existing.platformShareMicroUSDC += row.platformShareMicroUSDC;
    byProvider.set(row.provider, existing);
  }

  return {
    settlementMode: 'offline_provider_share_record',
    rows,
    providerSummaries: [...byProvider.values()],
    totals: rows.reduce(
      (total, row) => ({
        currency: row.currency,
        unit: row.unit,
        invocationCount: total.invocationCount + 1,
        grossAmountMicroUSDC: total.grossAmountMicroUSDC + row.grossAmountMicroUSDC,
        providerShareMicroUSDC: total.providerShareMicroUSDC + row.providerShareMicroUSDC,
        platformShareMicroUSDC: total.platformShareMicroUSDC + row.platformShareMicroUSDC
      }),
      {
        currency: 'USDC',
        unit: 'microUSDC',
        invocationCount: 0,
        grossAmountMicroUSDC: 0,
        providerShareMicroUSDC: 0,
        platformShareMicroUSDC: 0
      }
    )
  };
}
