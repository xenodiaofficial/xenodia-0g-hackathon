CREATE TABLE IF NOT EXISTS zerog_provider_identities (
  id BIGSERIAL PRIMARY KEY,
  provider_kind TEXT NOT NULL DEFAULT 'team',
  display_name TEXT NOT NULL,
  wallet_address TEXT NOT NULL UNIQUE,
  zero_g_domain TEXT NOT NULL DEFAULT '',
  trust_status TEXT NOT NULL DEFAULT 'unverified',
  status TEXT NOT NULL DEFAULT 'active',
  profile_storage_uri TEXT NOT NULL DEFAULT '',
  profile_hash TEXT NOT NULL DEFAULT '',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT zerog_provider_identities_kind_check
    CHECK (provider_kind IN ('agent', 'mcp', 'api', 'team', 'app')),
  CONSTRAINT zerog_provider_identities_trust_status_check
    CHECK (trust_status IN ('unverified', 'verified', 'preferred', 'suspended')),
  CONSTRAINT zerog_provider_identities_status_check
    CHECK (status IN ('active', 'disabled'))
);

CREATE INDEX IF NOT EXISTS idx_zerog_provider_identities_kind
  ON zerog_provider_identities(provider_kind, status);

DROP TRIGGER IF EXISTS set_updated_at_zerog_provider_identities ON zerog_provider_identities;
CREATE TRIGGER set_updated_at_zerog_provider_identities
  BEFORE UPDATE ON zerog_provider_identities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS zerog_capability_publications (
  id BIGSERIAL PRIMARY KEY,
  capability_slug TEXT NOT NULL,
  capability_version TEXT NOT NULL,
  provider_identity_id BIGINT REFERENCES zerog_provider_identities(id) ON DELETE SET NULL,
  manifest_hash TEXT NOT NULL DEFAULT '',
  manifest_storage_uri TEXT NOT NULL DEFAULT '',
  chain_tx_hash TEXT NOT NULL DEFAULT '',
  chain_network TEXT NOT NULL DEFAULT '0g-mainnet',
  publish_status TEXT NOT NULL DEFAULT 'local_ready',
  manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT zerog_capability_publications_status_check
    CHECK (publish_status IN ('local_ready', 'storage_uploaded', 'chain_anchored', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_zerog_capability_publication_version
  ON zerog_capability_publications(capability_slug, capability_version);

CREATE INDEX IF NOT EXISTS idx_zerog_capability_publications_provider
  ON zerog_capability_publications(provider_identity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_zerog_capability_publications_status
  ON zerog_capability_publications(publish_status, updated_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_zerog_capability_publications ON zerog_capability_publications;
CREATE TRIGGER set_updated_at_zerog_capability_publications
  BEFORE UPDATE ON zerog_capability_publications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
