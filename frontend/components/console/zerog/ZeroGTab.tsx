'use client';

import { FormEvent, useEffect, useState } from 'react';
import { type AdminCapabilitiesResponse, type AdminCapabilityDescriptor } from '@/lib/capabilities';
import { consoleApiFetch } from '@/lib/console/api';
import { formatDateTime } from '@/lib/console/format';

type ZeroGTabProps = {
  token?: string | null;
  refreshKey?: number;
};

type ListResponse<T> = {
  data: T[];
  count?: number;
};

type ZeroGProviderIdentity = {
  id: number;
  provider_kind: string;
  display_name: string;
  wallet_address: string;
  zero_g_domain?: string;
  trust_status: string;
  status: string;
  profile_storage_uri?: string;
  profile_hash?: string;
  created_at?: string;
  updated_at?: string;
};

type ZeroGCapabilityPublication = {
  id: number;
  capability_slug: string;
  capability_version: string;
  provider_identity_id?: number | null;
  provider_identity?: ZeroGProviderIdentity | null;
  manifest_hash: string;
  manifest_storage_uri?: string;
  chain_tx_hash?: string;
  chain_network: string;
  publish_status: string;
  created_at?: string;
  updated_at?: string;
};

const emptyProviderForm = {
  display_name: '',
  provider_kind: 'team',
  wallet_address: '',
  zero_g_domain: '',
  trust_status: 'unverified',
  status: 'active',
};

const emptyPublicationForm = {
  capability_slug: '',
  capability_version: '',
  provider_identity_id: '',
  manifest_storage_uri: '',
  chain_tx_hash: '',
  chain_network: '0g-mainnet',
  publish_status: '',
};

function shortHash(value?: string) {
  if (!value) return 'pending';
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

export default function ZeroGTab({ token, refreshKey = 0 }: ZeroGTabProps) {
  const [providers, setProviders] = useState<ZeroGProviderIdentity[]>([]);
  const [publications, setPublications] = useState<ZeroGCapabilityPublication[]>([]);
  const [capabilities, setCapabilities] = useState<AdminCapabilityDescriptor[]>([]);
  const [providerForm, setProviderForm] = useState(emptyProviderForm);
  const [publicationForm, setPublicationForm] = useState(emptyPublicationForm);
  const [loading, setLoading] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadZeroG() {
    setLoading(true);
    setError('');
    try {
      const [providerRes, publicationRes, capabilityRes] = await Promise.all([
        consoleApiFetch<ListResponse<ZeroGProviderIdentity>>('/v1/admin/zerog/provider-identities', token),
        consoleApiFetch<ListResponse<ZeroGCapabilityPublication>>('/v1/admin/zerog/capability-publications', token),
        consoleApiFetch<AdminCapabilitiesResponse>('/v1/admin/capabilities', token),
      ]);
      const nextCapabilities = capabilityRes.data || [];
      setProviders(providerRes.data || []);
      setPublications(publicationRes.data || []);
      setCapabilities(nextCapabilities);
      setPublicationForm((current) => ({
        ...current,
        capability_slug: current.capability_slug || nextCapabilities[0]?.slug || '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load 0G data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadZeroG();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, refreshKey]);

  async function createProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProvider(true);
    setError('');
    setNotice('');
    try {
      await consoleApiFetch('/v1/admin/zerog/provider-identities', token, {
        method: 'POST',
        body: JSON.stringify(providerForm),
      });
      setProviderForm(emptyProviderForm);
      setNotice('0G provider identity created.');
      await loadZeroG();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create 0G provider identity.');
    } finally {
      setSavingProvider(false);
    }
  }

  async function publishCapability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPublishing(true);
    setError('');
    setNotice('');
    try {
      await consoleApiFetch('/v1/admin/zerog/capability-publications', token, {
        method: 'POST',
        body: JSON.stringify({
          ...publicationForm,
          provider_identity_id: publicationForm.provider_identity_id ? Number(publicationForm.provider_identity_id) : undefined,
        }),
      });
      setPublicationForm((current) => ({
        ...emptyPublicationForm,
        capability_slug: current.capability_slug,
      }));
      setNotice('Capability manifest prepared for 0G publication.');
      await loadZeroG();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish capability manifest.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section className="panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div className="panel-title">0G Phase 1</div>
            <div style={{ color: 'var(--text2)', marginTop: 6 }}>
              Provider identities, capability manifests, and publication pointers.
            </div>
          </div>
          <button className="btn btn-ghost" disabled={loading} onClick={() => void loadZeroG()} type="button">
            Refresh
          </button>
        </div>
        {error && <div className="msg msg-err">{error}</div>}
        {notice && <div className="msg msg-ok">{notice}</div>}
      </section>

      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <form className="panel" onSubmit={createProvider} style={{ padding: 20, display: 'grid', gap: 14 }}>
          <div className="panel-title">Provider Identity</div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>Display name</span>
            <input
              className="form-input"
              onChange={(event) => setProviderForm((current) => ({ ...current, display_name: event.target.value }))}
              required
              value={providerForm.display_name}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>Wallet address</span>
            <input
              className="form-input"
              onChange={(event) => setProviderForm((current) => ({ ...current, wallet_address: event.target.value }))}
              placeholder="0x..."
              required
              value={providerForm.wallet_address}
            />
          </label>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ color: 'var(--text2)', fontSize: 12 }}>Kind</span>
              <select
                className="form-input"
                onChange={(event) => setProviderForm((current) => ({ ...current, provider_kind: event.target.value }))}
                value={providerForm.provider_kind}
              >
                <option value="team">Team</option>
                <option value="mcp">MCP</option>
                <option value="api">API</option>
                <option value="agent">Agent</option>
                <option value="app">App</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ color: 'var(--text2)', fontSize: 12 }}>Trust</span>
              <select
                className="form-input"
                onChange={(event) => setProviderForm((current) => ({ ...current, trust_status: event.target.value }))}
                value={providerForm.trust_status}
              >
                <option value="unverified">Unverified</option>
                <option value="verified">Verified</option>
                <option value="preferred">Preferred</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
          </div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>.0g domain</span>
            <input
              className="form-input"
              onChange={(event) => setProviderForm((current) => ({ ...current, zero_g_domain: event.target.value }))}
              placeholder="optional"
              value={providerForm.zero_g_domain}
            />
          </label>
          <button className="btn btn-primary" disabled={savingProvider} type="submit">
            {savingProvider ? 'Creating...' : 'Create Identity'}
          </button>
        </form>

        <form className="panel" onSubmit={publishCapability} style={{ padding: 20, display: 'grid', gap: 14 }}>
          <div className="panel-title">Capability Publication</div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>Capability</span>
            <select
              className="form-input"
              onChange={(event) => setPublicationForm((current) => ({ ...current, capability_slug: event.target.value }))}
              required
              value={publicationForm.capability_slug}
            >
              {capabilities.map((capability) => (
                <option key={capability.slug} value={capability.slug}>
                  {capability.name} ({capability.slug})
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>Provider identity</span>
            <select
              className="form-input"
              onChange={(event) => setPublicationForm((current) => ({ ...current, provider_identity_id: event.target.value }))}
              value={publicationForm.provider_identity_id}
            >
              <option value="">No provider identity</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.display_name}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ color: 'var(--text2)', fontSize: 12 }}>Version</span>
              <input
                className="form-input"
                onChange={(event) => setPublicationForm((current) => ({ ...current, capability_version: event.target.value }))}
                placeholder="default"
                value={publicationForm.capability_version}
              />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ color: 'var(--text2)', fontSize: 12 }}>Status</span>
              <select
                className="form-input"
                onChange={(event) => setPublicationForm((current) => ({ ...current, publish_status: event.target.value }))}
                value={publicationForm.publish_status}
              >
                <option value="">Auto</option>
                <option value="local_ready">Local ready</option>
                <option value="storage_uploaded">Storage uploaded</option>
                <option value="chain_anchored">Chain anchored</option>
                <option value="failed">Failed</option>
              </select>
            </label>
          </div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>0G storage URI</span>
            <input
              className="form-input"
              onChange={(event) => setPublicationForm((current) => ({ ...current, manifest_storage_uri: event.target.value }))}
              placeholder="optional for Phase 1"
              value={publicationForm.manifest_storage_uri}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>0G chain tx</span>
            <input
              className="form-input"
              onChange={(event) => setPublicationForm((current) => ({ ...current, chain_tx_hash: event.target.value }))}
              placeholder="optional for Phase 1"
              value={publicationForm.chain_tx_hash}
            />
          </label>
          <button className="btn btn-primary" disabled={publishing || capabilities.length === 0} type="submit">
            {publishing ? 'Publishing...' : 'Prepare Manifest'}
          </button>
        </form>
      </div>

      <section className="panel" style={{ padding: 20 }}>
        <div className="panel-title" style={{ marginBottom: 14 }}>Provider Identities</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {providers.length === 0 ? (
            <div style={{ color: 'var(--text2)' }}>No 0G provider identities yet.</div>
          ) : (
            providers.map((provider) => (
              <div key={provider.id} style={{ border: '1px solid var(--border-dim)', padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <strong>{provider.display_name}</strong>
                  <span className="tag">{provider.trust_status}</span>
                </div>
                <div style={{ color: 'var(--text2)', marginTop: 6, fontSize: 13 }}>
                  {provider.provider_kind} · {provider.wallet_address}
                  {provider.zero_g_domain ? ` · ${provider.zero_g_domain}` : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel" style={{ padding: 20 }}>
        <div className="panel-title" style={{ marginBottom: 14 }}>Capability Publications</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="console-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Capability</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Manifest</th>
                <th>Storage</th>
                <th>Chain</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {publications.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ color: 'var(--text2)' }}>No 0G capability publications yet.</td>
                </tr>
              ) : (
                publications.map((publication) => (
                  <tr key={publication.id}>
                    <td>{publication.capability_slug}@{publication.capability_version}</td>
                    <td>{publication.provider_identity?.display_name || 'platform'}</td>
                    <td><span className="tag">{publication.publish_status}</span></td>
                    <td>{shortHash(publication.manifest_hash)}</td>
                    <td>{shortHash(publication.manifest_storage_uri)}</td>
                    <td>{shortHash(publication.chain_tx_hash)}</td>
                    <td>{publication.updated_at ? formatDateTime(publication.updated_at) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
