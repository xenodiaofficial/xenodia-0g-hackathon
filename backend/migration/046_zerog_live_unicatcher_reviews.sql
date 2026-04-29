-- 0G hackathon MVP: user-authenticated UniCatcher reviews and rollup evidence.
-- These tables are designed for the production gateway path, but the local
-- hackathon frontend can already generate the same receipt/review schema.

CREATE TABLE IF NOT EXISTS capability_reviews (
    id                      BIGSERIAL PRIMARY KEY,
    account_id              BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    gateway_call_id          BIGINT REFERENCES gateway_calls(id) ON DELETE SET NULL,
    request_id              TEXT,
    provider_key            TEXT NOT NULL DEFAULT 'unicatcher',
    capability_slug         TEXT NOT NULL,
    capability_operation    TEXT NOT NULL,
    rating                  INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment_hash            TEXT NOT NULL,
    comment_preview         TEXT,
    receipt_hash            TEXT NOT NULL,
    review_hash             TEXT NOT NULL UNIQUE,
    zero_g_batch_id         BIGINT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capability_reviews_account_created
    ON capability_reviews(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_capability_reviews_capability_created
    ON capability_reviews(capability_slug, created_at DESC);

CREATE TABLE IF NOT EXISTS zero_g_evidence_batches (
    id                      BIGSERIAL PRIMARY KEY,
    batch_kind              TEXT NOT NULL CHECK (batch_kind IN ('receipt', 'review', 'reputation')),
    provider_key            TEXT NOT NULL DEFAULT 'unicatcher',
    capability_slug         TEXT NOT NULL,
    item_count              INTEGER NOT NULL DEFAULT 0,
    evidence_root           TEXT NOT NULL,
    storage_uri             TEXT,
    chain_network           TEXT NOT NULL DEFAULT '0g-mainnet',
    chain_tx_hash           TEXT,
    chain_status            TEXT NOT NULL DEFAULT 'local_ready',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zero_g_evidence_batches_capability_created
    ON zero_g_evidence_batches(capability_slug, created_at DESC);
