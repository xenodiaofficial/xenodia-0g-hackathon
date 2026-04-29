import liveEvidence from '@/content/zerog-live-evidence.json';
import receiptBatchIndex from '@/content/zerog-receipt-batches.json';

const CONTRACT_ADDRESS = liveEvidence.contractAddress;
const EXPLORER_BASE = liveEvidence.explorerBase;
const receiptBatches = Array.isArray(receiptBatchIndex.batches) ? receiptBatchIndex.batches : [];
const latestReceiptBatch = receiptBatches[0];

const storageEvidence = [
  {
    label: 'Live UniCatcher receipt/review rollup',
    tx: liveEvidence.storageTx,
    root: liveEvidence.storageRoot,
  },
  latestReceiptBatch
    ? {
        label: 'Default capability receipt batch',
        tx: latestReceiptBatch.storageTx,
        root: latestReceiptBatch.storageRoot,
      }
    : null,
].filter((item): item is { label: string; tx: string; root: string } => Boolean(item));

const proofTransactions = [
  {
    label: 'Live receipt/review proof',
    tx: liveEvidence.receiptBatchTx,
    note: 'UniCatcher receipt, review, and provider reputation rollup',
  },
  latestReceiptBatch
    ? {
        label: 'Default capability receipt proof',
        tx: latestReceiptBatch.anchorTx,
        note: 'Server-observed invocation receipt batch',
      }
    : null,
].filter((item): item is { label: string; tx: string; note: string } => Boolean(item));

const liveEvidenceAnchored = liveEvidence.status === 'anchored' && Boolean(liveEvidence.receiptBatchTx);

function EvidenceLink({ href, title, value }: { href: string; title: string; value: string }) {
  return (
    <a className="zerog-evidence-link" href={href} target="_blank" rel="noreferrer">
      <span>{title}</span>
      <strong>{value}</strong>
    </a>
  );
}

export default function ZeroGHackathonPage() {
  return (
    <main className="zerog-page">
      <section className="hero zerog-hero">
        <div className="hero-watermark">0G</div>
        <div className="hero-tag">XENODIA 0G HACKATHON</div>
        <h1 className="hero-title">
          Verifiable infrastructure
          <br />
          for agent capabilities on 0G.
        </h1>
        <p className="hero-sub">
          Xenodia makes 0G the verifiable infrastructure layer for agent capabilities: provider identity,
          service receipts, user reviews, reputation roots, storage roots, and settlement accounting can be checked
          outside the product database.
        </p>
        <div className="hero-buttons">
          <a className="btn btn-primary" href="/capabilities/unicatcher-query">
            Run Live UniCatcher
          </a>
          <a className="btn btn-primary" href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">
            Open 0G Explorer
          </a>
          <a className="btn btn-primary" href="/0g-proof-center">
            Open Proof Center
          </a>
        </div>
      </section>

      <section className="stats-bar zerog-proof-strip">
        <div className="stat-item">
          <div className="stat-value">{storageEvidence.length}</div>
          <div className="stat-label">0G_STORAGE_ROOTS</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{proofTransactions.length}</div>
          <div className="stat-label">CHAIN_PROOFS</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">1</div>
          <div className="stat-label">PROOF_REGISTRY</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">MVP</div>
          <div className="stat-label">JUDGE_READY</div>
        </div>
      </section>

      <section className="features zerog-section">
        <div className="section-header">
          <span className="section-kicker">FULL PRODUCT TARGET</span>
          <h2>0G remains the evidence layer, not a separate demo skin.</h2>
          <p>
            In the complete version, every qualified capability provider can expose services through Xenodia while
            0G stores the public evidence needed to verify identity, execution receipts, user feedback, reputation,
            and settlement accounting.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-label">LIVE CALL</div>
            <h3 className="feature-title">Authenticated capability invocation</h3>
            <p className="feature-desc">
              Users and agents invoke capabilities with normal Xenodia authentication. The product records enough
              evidence to prove service activity without exposing private prompts, outputs, or provider keys.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-label">REVIEW</div>
            <h3 className="feature-title">User review and reputation proof</h3>
            <p className="feature-desc">
              Successful service use can produce review roots and provider-level reputation snapshots. Rank is scoped
              to the provider first, not over-designed per capability in the MVP.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-label">ROLLUP</div>
            <h3 className="feature-title">Batched 0G anchoring</h3>
            <p className="feature-desc">
              High-frequency service logs are rolled up before writing to 0G. Storage carries the evidence bundle;
              chain anchors prove the root and timestamp.
            </p>
          </div>
        </div>
      </section>

      <section className="features zerog-section">
        <div className="section-header">
          <span className="section-kicker">MVP INTEGRATION</span>
          <h2>Xenodia makes 0G verifiable infrastructure for the agent capability layer.</h2>
          <p>
            The MVP narrows implementation to the pieces that matter for the hackathon: provider identity, versioned
            capability evidence, live UniCatcher receipts, user reviews, provider reputation, and settlement accounting roots.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-label">IDENTITY</div>
            <h3 className="feature-title">Provider-level identity and rank</h3>
            <p className="feature-desc">
              MVP reputation is scoped to capability providers, avoiding per-skill over-design while preserving a path
              to provider rank, eligibility, and audit history.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-label">RECEIPTS</div>
            <h3 className="feature-title">Immutable service process evidence</h3>
            <p className="feature-desc">
              Service receipts are batched, uploaded to 0G Storage, and anchored through the registry contract so judges
              can verify the evidence trail.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-label">SETTLEMENT</div>
            <h3 className="feature-title">Verifiable settlement accounting</h3>
            <p className="feature-desc">
              The complete system keeps provider revenue-share accounting auditable through batch roots. Payout execution
              can remain off-chain or move on-chain later without changing the evidence model.
            </p>
          </div>
        </div>
      </section>

      {liveEvidenceAnchored ? (
        <section className="zerog-section zerog-evidence-grid">
          <div className="zerog-panel zerog-panel-wide">
            <div className="feature-label">LIVE UNICATCHER EVIDENCE</div>
            <h2>Production capability use anchored to 0G</h2>
            <div className="zerog-proof-list">
              <EvidenceLink
                href={`${liveEvidence.explorerBase}/tx/${liveEvidence.storageTx}`}
                title="Live evidence storage root"
                value={liveEvidence.storageRoot}
              />
              <EvidenceLink
                href={`${liveEvidence.explorerBase}/tx/${liveEvidence.receiptBatchTx}`}
                title="Live receipt/review anchor"
                value={liveEvidence.rollupRoot}
              />
              <EvidenceLink
                href={`${liveEvidence.explorerBase}/address/${liveEvidence.contractAddress}`}
                title={`${liveEvidence.itemCount} live review item(s)`}
                value={liveEvidence.receiptBatchProofId}
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="zerog-section zerog-evidence-grid">
        <div className="zerog-panel">
          <div className="feature-label">0G CHAIN</div>
          <h2>Proof registry contract</h2>
          <EvidenceLink
            href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`}
            title="Contract"
            value={CONTRACT_ADDRESS}
          />
        </div>

        <div className="zerog-panel">
          <div className="feature-label">0G STORAGE</div>
          <h2>Uploaded evidence roots</h2>
          <div className="zerog-list">
            {storageEvidence.map((item) => (
              <EvidenceLink
                key={item.tx}
                href={`${EXPLORER_BASE}/tx/${item.tx}`}
                title={item.label}
                value={item.root}
              />
            ))}
          </div>
        </div>

        <div className="zerog-panel zerog-panel-wide">
          <div className="feature-label">VERIFIABLE ACTIVITY</div>
          <h2>On-chain proof transactions</h2>
          <div className="zerog-proof-list">
            {proofTransactions.map((item) => (
              <a key={item.tx} className="zerog-proof-row" href={`${EXPLORER_BASE}/tx/${item.tx}`} target="_blank" rel="noreferrer">
                <span>
                  <strong>{item.label}</strong>
                  <em>{item.note}</em>
                </span>
                <code>{item.tx}</code>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
