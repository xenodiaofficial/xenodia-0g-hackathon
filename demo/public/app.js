const els = {
  providerName: document.querySelector('#providerName'),
  walletAddress: document.querySelector('#walletAddress'),
  zeroGDomain: document.querySelector('#zeroGDomain'),
  capabilitySlug: document.querySelector('#capabilitySlug'),
  capabilityVersion: document.querySelector('#capabilityVersion'),
  capabilityStorage: document.querySelector('#capabilityStorage'),
  prompt: document.querySelector('#prompt'),
  saveProvider: document.querySelector('#saveProvider'),
  saveCapability: document.querySelector('#saveCapability'),
  invokeCapability: document.querySelector('#invokeCapability'),
  anchorDryRun: document.querySelector('#anchorDryRun'),
  anchorSend: document.querySelector('#anchorSend'),
  latestResult: document.querySelector('#latestResult'),
  anchorStatus: document.querySelector('#anchorStatus'),
  proofGrid: document.querySelector('#proofGrid'),
  ledgerSummary: document.querySelector('#ledgerSummary'),
  ledgerRows: document.querySelector('#ledgerRows'),
  judgeConsole: document.querySelector('#judgeConsole')
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function shortHash(value) {
  if (!value) return 'n/a';
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function renderProofs(state) {
  const payload = state.proofPayload;
  const proofs = [
    ['Provider profile hash', payload.profile.profileHash],
    ['Capability proofId', payload.capability.proofId],
    ['Manifest hash', payload.capability.manifestHash],
    ['Receipt batch proofId', payload.receiptBatch.proofId],
    ['Receipt root', payload.receiptBatch.receiptRoot],
    ['Settlement proofId', payload.settlementBatch.proofId],
    ['Settlement root', payload.settlementBatch.settlementRoot],
    ['Provider share', `${payload.settlementBatch.providerShareMicroUSDC} microUSDC`],
    ['Invocation count', `${payload.receiptBatch.receiptCount}`]
  ];

  els.proofGrid.innerHTML = proofs
    .map(([label, value]) => `
      <div class="proof-card">
        <strong>${label}</strong>
        <code title="${value}">${shortHash(String(value))}</code>
      </div>
    `)
    .join('');
}

function renderJudgeConsole(state) {
  const judge = state.judgeChecklist;
  const chain = judge.chainStatus;
  els.judgeConsole.innerHTML = `
    <div class="judge-topline">
      <div>
        <strong>${judge.headline}</strong>
        <span>${judge.track}</span>
      </div>
      <div class="chain-pill ${chain.status === 'deployed' ? 'ready' : 'pending'}">
        0G Chain: ${chain.status}
      </div>
    </div>
    <div class="checklist-grid">
      ${judge.checklist.map((item) => `
        <div class="check-item ${item.status}">
          <strong>${item.label}</strong>
          <span>${item.status}</span>
          <code title="${item.detail}">${shortHash(String(item.detail))}</code>
        </div>
      `).join('')}
    </div>
    <details>
      <summary>Demo runbook</summary>
      <ol>
        ${judge.runbook.map((step) => `<li>${step}</li>`).join('')}
      </ol>
    </details>
  `;
}

function formatMicroUSDC(value) {
  return `${(Number(value || 0) / 1_000_000).toFixed(6)} USDC`;
}

function renderLedger(state) {
  const ledger = state.settlementLedger;
  const totals = ledger.totals;
  els.ledgerSummary.innerHTML = `
    <div><strong>${totals.invocationCount}</strong><span>invocations</span></div>
    <div><strong>${formatMicroUSDC(totals.grossAmountMicroUSDC)}</strong><span>gross paid</span></div>
    <div><strong>${formatMicroUSDC(totals.providerShareMicroUSDC)}</strong><span>provider share</span></div>
    <div><strong>${formatMicroUSDC(totals.platformShareMicroUSDC)}</strong><span>platform share</span></div>
  `;

  if (ledger.rows.length === 0) {
    els.ledgerRows.innerHTML = '<p class="muted">No settlement records yet. Invoke the mock capability to create one.</p>';
    return;
  }

  els.ledgerRows.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Receipt</th>
          <th>Capability</th>
          <th>Provider Share</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${ledger.rows.slice().reverse().map((row) => `
          <tr>
            <td><code title="${row.receiptId}">${shortHash(row.receiptId)}</code></td>
            <td>${row.capabilitySlug}<br /><small>${row.capabilityVersion}</small></td>
            <td>${formatMicroUSDC(row.providerShareMicroUSDC)}</td>
            <td>${row.status}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function hydrate(state) {
  els.providerName.value = state.provider.displayName;
  els.walletAddress.value = state.provider.walletAddress;
  els.zeroGDomain.value = state.provider.zeroGDomain;
  els.capabilitySlug.value = state.capability.slug;
  els.capabilityVersion.value = state.capability.version;
  els.capabilityStorage.value = state.capability.storageURI;
  renderJudgeConsole(state);
  renderProofs(state);
  renderLedger(state);
}

async function refresh() {
  const state = await api('/api/state');
  hydrate(state);
}

els.saveProvider.addEventListener('click', async () => {
  const state = await api('/api/providers', {
    method: 'POST',
    body: {
      displayName: els.providerName.value,
      walletAddress: els.walletAddress.value,
      zeroGDomain: els.zeroGDomain.value
    }
  });
  hydrate(state);
});

els.saveCapability.addEventListener('click', async () => {
  const state = await api('/api/capabilities', {
    method: 'POST',
    body: {
      slug: els.capabilitySlug.value,
      version: els.capabilityVersion.value,
      storageURI: els.capabilityStorage.value
    }
  });
  hydrate(state);
});

els.invokeCapability.addEventListener('click', async () => {
  const data = await api('/api/invocations', {
    method: 'POST',
    body: { prompt: els.prompt.value }
  });
  els.latestResult.textContent = JSON.stringify(data.invocation.response, null, 2);
  hydrate(data.state);
});

async function anchor(send) {
  const data = await api('/api/anchor', {
    method: 'POST',
    body: { send }
  });
  els.anchorStatus.textContent = JSON.stringify({
    mode: data.anchor.mode,
    capabilityProofId: data.anchor.payload.capability.proofId,
    receiptBatchProofId: data.anchor.payload.receiptBatch.proofId,
    settlementBatchProofId: data.anchor.payload.settlementBatch.proofId,
    txs: data.anchor.txs
  }, null, 2);
  hydrate(data.state);
}

els.anchorDryRun.addEventListener('click', () => anchor(false));
els.anchorSend.addEventListener('click', () => anchor(true).catch((error) => {
  els.anchorStatus.textContent = error.message;
}));

refresh().catch((error) => {
  els.anchorStatus.textContent = error.message;
});
