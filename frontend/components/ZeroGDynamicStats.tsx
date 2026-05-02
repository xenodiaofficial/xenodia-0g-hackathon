'use client';

import { useEffect, useState } from 'react';

type ZeroGStats = {
  localEvidenceCount: number;
  anchoredItemCount: number;
  pendingItemCount: number;
  registryStatus: string;
};

type RollupStatusResponse = {
  data?: {
    localEvidenceCount?: number;
    anchoredItemCount?: number;
    pendingItemCount?: number;
    contractAddress?: string;
  };
};

function normalizeCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function buildStats(payload: RollupStatusResponse | null, fallback: ZeroGStats): ZeroGStats {
  const data = payload?.data;
  if (!data) {
    return fallback;
  }

  return {
    localEvidenceCount: normalizeCount(data.localEvidenceCount),
    anchoredItemCount: normalizeCount(data.anchoredItemCount),
    pendingItemCount: normalizeCount(data.pendingItemCount),
    registryStatus: data.contractAddress ? 'LIVE' : fallback.registryStatus,
  };
}

export default function ZeroGDynamicStats({ initialStats }: { initialStats: ZeroGStats }) {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    let cancelled = false;

    async function refreshStats() {
      try {
        const response = await fetch('/api/0g/unicatcher/rollup', { cache: 'no-store' });
        const payload = (await response.json().catch(() => null)) as RollupStatusResponse | null;
        if (!cancelled && response.ok) {
          setStats((current) => buildStats(payload, current));
        }
      } catch {
        // Keep the last known values visible if the local status endpoint is unavailable.
      }
    }

    void refreshStats();
    const timer = window.setInterval(refreshStats, 5000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshStats();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <section className="stats-bar zerog-proof-strip">
      <div className="stat-item">
        <div className="stat-value">{stats.localEvidenceCount}</div>
        <div className="stat-label">LOCAL_EVIDENCE</div>
      </div>
      <div className="stat-item">
        <div className="stat-value">{stats.anchoredItemCount}</div>
        <div className="stat-label">ANCHORED_ITEMS</div>
      </div>
      <div className="stat-item">
        <div className="stat-value">{stats.pendingItemCount}</div>
        <div className="stat-label">PENDING_ROLLUP</div>
      </div>
      <div className="stat-item">
        <div className="stat-value">{stats.registryStatus}</div>
        <div className="stat-label">PROOF_REGISTRY</div>
      </div>
    </section>
  );
}
