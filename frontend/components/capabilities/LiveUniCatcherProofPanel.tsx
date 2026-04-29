'use client';

import { useEffect, useState } from 'react';

const ZERO_G_EVIDENCE_CONTRACT = '0x808a9B90862ad495b0Ee97335f55D4c114A5EE7C';
const ZERO_G_EXPLORER_BASE = 'https://chainscan.0g.ai';

function shortHash(value?: string | null) {
  if (!value) return 'pending';
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

export type LiveUniCatcherProofContext = {
  capabilitySlug: 'unicatcher-query';
  operation: string;
  receiptId?: string;
  inputHash?: string;
  outputHash?: string;
  requestURL: string;
  idempotencyKey: string;
  input: unknown;
  result: unknown;
  status: 'success' | 'failed';
  requestId?: string;
  createdAt: string;
};

type LiveUniCatcherProofPanelProps = {
  token: string | null;
  context: LiveUniCatcherProofContext | null;
};

type RollupStatus = {
  localEvidenceCount: number;
  anchoredItemCount: number;
  pendingItemCount: number;
  contractAddress: string;
  explorerBase: string;
  contractURL: string;
  anchoredEvidence?: {
    status?: string;
    network?: string;
    itemCount?: number;
    storageRoot?: string;
    storageURI?: string;
    storageTx?: string;
    rollupRoot?: string;
    receiptBatchProofId?: string;
    receiptBatchTx?: string;
    updatedAt?: string;
  } | null;
  anchorResult?: {
    status?: string;
    itemCount?: number;
    rollupRoot?: string;
    storageURI?: string;
    storageTx?: string;
    receiptBatchProofId?: string;
    receiptBatchTx?: string;
  };
};

function EvidenceValue({ label, value, href }: { label: string; value?: string | number | null; href?: string }) {
  const rendered = value || 'pending';
  return (
    <div className="zerog-proof-row">
      <span><strong>{label}</strong><em>{href ? 'Explorer link available' : 'Verifiable credential'}</em></span>
      {href && value ? (
        <a href={href} rel="noreferrer" target="_blank"><code>{rendered}</code></a>
      ) : (
        <code>{rendered}</code>
      )}
    </div>
  );
}

export default function LiveUniCatcherProofPanel({ token, context }: LiveUniCatcherProofPanelProps) {
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('Useful, fresh evidence with clear provenance.');
  const [submitting, setSubmitting] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [error, setError] = useState('');
  const [anchorError, setAnchorError] = useState('');
  const [evidence, setEvidence] = useState<Record<string, any> | null>(null);
  const [rollupStatus, setRollupStatus] = useState<RollupStatus | null>(null);

  async function refreshRollupStatus() {
    const response = await fetch('/api/0g/unicatcher/rollup', { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.data) {
      setRollupStatus(payload.data);
    }
  }

  useEffect(() => {
    void refreshRollupStatus();
  }, []);

  async function submitReview() {
    if (!context || !token) {
      setError('Run a live UniCatcher invocation while signed in before submitting a review.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/0g/unicatcher/reviews', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invocation: context,
          rating: Number(rating),
          comment,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || payload.error || `Review failed: ${response.status}`);
      }
      setEvidence(payload.data);
      void refreshRollupStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function anchorRollup() {
    if (!token) {
      setAnchorError('Sign in before anchoring the local evidence batch to 0G.');
      return;
    }

    setAnchoring(true);
    setAnchorError('');
    try {
      const response = await fetch('/api/0g/unicatcher/rollup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || payload.error || `0G anchor failed: ${response.status}`);
      }
      setRollupStatus(payload.data);
    } catch (err) {
      setAnchorError(err instanceof Error ? err.message : '0G anchoring failed.');
    } finally {
      setAnchoring(false);
    }
  }

  const anchoredEvidence = rollupStatus?.anchoredEvidence;
  const explorerBase = rollupStatus?.explorerBase || ZERO_G_EXPLORER_BASE;
  const pendingItemCount = rollupStatus?.pendingItemCount || 0;
  const canAnchor = Boolean(token && rollupStatus && rollupStatus.localEvidenceCount > 0 && !anchoring);

  return (
    <section className="panel live-unicatcher-proof" style={{ padding: 22, marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div className="panel-title">0G Verified UniCatcher Review</div>
          <p style={{ color: 'var(--text2)', marginTop: 10, lineHeight: 1.55, maxWidth: 760 }}>
            After a real UniCatcher invocation, Xenodia creates a receipt hash, review hash, and reputation snapshot.
            The MVP keeps raw user data off-chain, then batches roots to 0G Storage and 0G Chain.
          </p>
        </div>
        <a
          className="btn btn-ghost"
          href={`${ZERO_G_EXPLORER_BASE}/address/${ZERO_G_EVIDENCE_CONTRACT}`}
          rel="noreferrer"
          target="_blank"
        >
          0G Registry
        </a>
      </div>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 18 }}>
        <div className="zerog-mini-proof">
          <span>Live invocation</span>
          <strong>{context ? context.operation : 'waiting'}</strong>
          <code>{context?.requestURL || 'Run UniCatcher first'}</code>
        </div>
        <label className="zerog-mini-proof">
          <span>Rating</span>
          <select className="form-input" value={rating} onChange={(event) => setRating(event.target.value)}>
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Good</option>
            <option value="3">3 - OK</option>
            <option value="2">2 - Weak</option>
            <option value="1">1 - Bad</option>
          </select>
        </label>
        <label className="zerog-mini-proof" style={{ gridColumn: 'span 2' }}>
          <span>Review</span>
          <textarea className="form-input" rows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
        <button className="btn btn-primary" disabled={!context || !token || submitting} onClick={() => void submitReview()} type="button">
          {submitting ? 'Recording receipt...' : 'Submit Review + Add To Batch'}
        </button>
        <span style={{ color: 'var(--text2)', fontSize: 13 }}>
          Records local proof material first. Batch anchoring to 0G is executed separately below.
        </span>
      </div>

      {error ? <div className="msg msg-err" style={{ marginTop: 16 }}>{error}</div> : null}

      {evidence ? (
        <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
          <div className="zerog-proof-row">
            <span><strong>Receipt root</strong><em>Invocation proof</em></span>
            <code>{evidence.roots?.receiptRoot}</code>
          </div>
          <div className="zerog-proof-row">
            <span><strong>Review root</strong><em>User feedback proof</em></span>
            <code>{evidence.roots?.reviewRoot}</code>
          </div>
          <div className="zerog-proof-row">
            <span><strong>Reputation root</strong><em>Provider rating snapshot</em></span>
            <code>{evidence.roots?.reputationRoot}</code>
          </div>
          <div className="zerog-proof-row">
            <span><strong>Recorded locally, pending batch anchor</strong><em>{evidence.chain?.network}</em></span>
            <code>{shortHash(evidence.chain?.contractAddress)}</code>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(180,255,0,.16)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div className="panel-title">0G Batch Anchor Control</div>
            <p style={{ color: 'var(--text2)', marginTop: 10, lineHeight: 1.55, maxWidth: 760 }}>
              Local receipts and reviews are accumulated off-chain first. This control uploads the current batch JSON to
              decentralized 0G Storage, then anchors the batch root to the 0G mainnet registry contract.
            </p>
          </div>
          <button className="btn btn-primary" disabled={!canAnchor} onClick={() => void anchorRollup()} type="button">
            {anchoring ? 'Uploading + anchoring...' : 'Upload To 0G Storage + Anchor Chain'}
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: 16 }}>
          <div className="zerog-mini-proof">
            <span>Local evidence items</span>
            <strong>{rollupStatus?.localEvidenceCount ?? '...'}</strong>
            <code>ready for batch</code>
          </div>
          <div className="zerog-mini-proof">
            <span>Anchored items</span>
            <strong>{rollupStatus?.anchoredItemCount ?? '...'}</strong>
            <code>latest on 0G</code>
          </div>
          <div className="zerog-mini-proof">
            <span>Pending items</span>
            <strong>{pendingItemCount}</strong>
            <code>{pendingItemCount > 0 ? 'needs anchoring' : 'no new local items'}</code>
          </div>
        </div>

        {anchorError ? <div className="msg msg-err" style={{ marginTop: 16 }}>{anchorError}</div> : null}

        <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
          <EvidenceValue
            href={rollupStatus?.contractURL}
            label="0G registry contract"
            value={rollupStatus?.contractAddress}
          />
          <EvidenceValue
            href={anchoredEvidence?.storageTx ? `${explorerBase}/tx/${anchoredEvidence.storageTx}` : undefined}
            label="0G Storage tx"
            value={anchoredEvidence?.storageTx}
          />
          <EvidenceValue label="0G Storage URI" value={anchoredEvidence?.storageURI} />
          <EvidenceValue label="0G Storage root" value={anchoredEvidence?.storageRoot} />
          <EvidenceValue label="Batch rollup root" value={anchoredEvidence?.rollupRoot} />
          <EvidenceValue label="Proof ID" value={anchoredEvidence?.receiptBatchProofId} />
          <EvidenceValue
            href={anchoredEvidence?.receiptBatchTx ? `${explorerBase}/tx/${anchoredEvidence.receiptBatchTx}` : undefined}
            label="0G Chain anchor tx"
            value={anchoredEvidence?.receiptBatchTx}
          />
          <EvidenceValue label="Last anchored at" value={anchoredEvidence?.updatedAt} />
        </div>
      </div>
    </section>
  );
}
