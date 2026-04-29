'use client';

import { useState } from 'react';
import liveEvidence from '@/content/zerog-live-evidence.json';

type VerifyResult = {
  verified: boolean;
  outputHash: string;
  inputHash?: string;
  outputMatches: boolean;
  inputMatches: boolean | null;
  explanation: string;
  bestMatch?: {
    receiptId: string;
    providerId: string;
    capabilitySlug: string;
    operation: string;
    requestId?: string;
    inputHash: string;
    outputHash: string;
    status: string;
    createdAt: string;
    source: string;
    storageURI?: string;
    chainTx?: string;
  } | null;
  batchPreview?: {
    receiptCount: number;
    receiptRoot: string;
    anchorStatus: string;
  };
};

const EXPLORER_BASE = liveEvidence.explorerBase;

export default function ZeroGProofCenterPage() {
  const [receiptId, setReceiptId] = useState('');
  const [requestId, setRequestId] = useState('');
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function verify() {
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/0g/proof-center/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: receiptId.trim() || undefined,
          requestId: requestId.trim() || undefined,
          output,
          input: input.trim() ? input : undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || payload.error || `Verify failed: ${response.status}`);
      }
      setResult(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="zerog-page">
      <section className="hero zerog-hero">
        <div className="hero-watermark">0G</div>
        <div className="hero-tag">XENODIA 0G PROOF CENTER</div>
        <h1 className="hero-title">
          Verify a capability
          <br />
          receipt after the fact.
        </h1>
        <p className="hero-sub">
          Paste the API response, optionally add the original input, and Xenodia recomputes the hashes used in
          0G receipts. If the hashes match an anchored batch, the provider cannot deny that evidence trail.
        </p>
      </section>

      <section className="zerog-section zerog-evidence-grid">
        <div className="zerog-panel">
          <div className="feature-label">VERIFY</div>
          <h2>Receipt lookup</h2>
          <div className="proof-center-form">
            <label>
              <span>Receipt ID</span>
              <input className="form-input" value={receiptId} onChange={(event) => setReceiptId(event.target.value)} placeholder="0x..." />
            </label>
            <label>
              <span>Request ID</span>
              <input className="form-input" value={requestId} onChange={(event) => setRequestId(event.target.value)} placeholder="Optional request id" />
            </label>
            <label>
              <span>Original API output</span>
              <textarea
                className="form-input"
                rows={10}
                value={output}
                onChange={(event) => setOutput(event.target.value)}
                placeholder='Paste JSON response, for example {"data": ...}'
              />
            </label>
            <label>
              <span>Original API input</span>
              <textarea
                className="form-input"
                rows={6}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Optional. Paste the request input if you want to verify inputHash too."
              />
            </label>
            <button className="btn btn-primary" disabled={submitting || !output.trim()} onClick={() => void verify()} type="button">
              {submitting ? 'Verifying...' : 'Verify Evidence'}
            </button>
          </div>
        </div>

        <div className="zerog-panel">
          <div className="feature-label">RESULT</div>
          <h2>Proof result</h2>
          {error ? <div className="msg msg-err">{error}</div> : null}
          {!result && !error ? (
            <p style={{ color: 'var(--text2)', lineHeight: 1.6, marginTop: 18 }}>
              The verifier checks local receipts and the live UniCatcher 0G rollup artifact. Chain anchors are shown when
              the matched receipt has already been uploaded and anchored.
            </p>
          ) : null}
          {result ? (
            <div className="proof-result">
              <div className={result.verified ? 'proof-status proof-ok' : 'proof-status proof-bad'}>
                {result.verified ? 'VERIFIED' : 'NOT VERIFIED'}
              </div>
              <p>{result.explanation}</p>
              <div className="zerog-proof-list">
                <div className="zerog-proof-row">
                  <span><strong>Computed outputHash</strong><em>From pasted output</em></span>
                  <code>{result.outputHash}</code>
                </div>
                {result.inputHash ? (
                  <div className="zerog-proof-row">
                    <span><strong>Computed inputHash</strong><em>From pasted input</em></span>
                    <code>{result.inputHash}</code>
                  </div>
                ) : null}
                {result.bestMatch ? (
                  <>
                    <div className="zerog-proof-row">
                      <span><strong>Matched receipt</strong><em>{result.bestMatch.source}</em></span>
                      <code>{result.bestMatch.receiptId}</code>
                    </div>
                    <div className="zerog-proof-row">
                      <span><strong>Provider / capability</strong><em>{result.bestMatch.status}</em></span>
                      <code>{result.bestMatch.providerId} / {result.bestMatch.capabilitySlug}</code>
                    </div>
                    {result.bestMatch.storageURI ? (
                      <div className="zerog-proof-row">
                        <span><strong>0G Storage URI</strong><em>Evidence bundle</em></span>
                        <code>{result.bestMatch.storageURI}</code>
                      </div>
                    ) : null}
                    {result.bestMatch.chainTx ? (
                      <a className="zerog-proof-row" href={`${EXPLORER_BASE}/tx/${result.bestMatch.chainTx}`} target="_blank" rel="noreferrer">
                        <span><strong>0G Chain anchor</strong><em>Explorer transaction</em></span>
                        <code>{result.bestMatch.chainTx}</code>
                      </a>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
