-- ═════════════════════════════════════════════════════════════════════
-- OCR Universe — Migration: Add missing tables
-- Run this on the production server to add tables that were created
-- after the initial schema setup.
-- ═════════════════════════════════════════════════════════════════════

-- 13. CONSTANTS — App configuration key-value
CREATE TABLE IF NOT EXISTS constants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(100) NOT NULL,
    value           TEXT NOT NULL,
    name            VARCHAR(255),
    description     TEXT,
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_constants_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_constants_code ON constants (code) WHERE is_enabled = TRUE;

INSERT INTO constants (code, value, name, description)
VALUES ('deposit_min_amount', '1', 'Minimum Deposit Amount', 'Số tiền nạp tối thiểu (USD)')
ON CONFLICT (code) DO NOTHING;


-- 14. WEBHOOK_LOGS — Payment webhook audit trail
CREATE TABLE IF NOT EXISTS webhook_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider        VARCHAR(50) NOT NULL,
    event_type      VARCHAR(100),
    payload         JSONB,
    status          VARCHAR(50) DEFAULT 'received',
    matched_txn_id  UUID,
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_webhook_txn FOREIGN KEY (matched_txn_id) REFERENCES transactions(id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_provider ON webhook_logs (provider);
CREATE INDEX IF NOT EXISTS idx_webhook_status   ON webhook_logs (status);
CREATE INDEX IF NOT EXISTS idx_webhook_created  ON webhook_logs (created_at DESC);


-- 15. CONVERSION_RATES — Exchange rate history
CREATE TABLE IF NOT EXISTS conversion_rates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_code       VARCHAR(10) NOT NULL,
    to_code         VARCHAR(10) NOT NULL,
    rate            DECIMAL(20, 10) NOT NULL,
    source          VARCHAR(50) DEFAULT 'exchangerate-api',
    is_latest       SMALLINT DEFAULT 1,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversion_rates_codes  ON conversion_rates (from_code, to_code);
CREATE INDEX IF NOT EXISTS idx_conversion_rates_latest ON conversion_rates (from_code, to_code, is_latest);


-- 16. OTP_VERIFICATIONS — Email OTP verification
CREATE TABLE IF NOT EXISTS otp_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL,
    otp             VARCHAR(10) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verifications (email);


-- Triggers
DO $$ BEGIN
    CREATE TRIGGER trg_constants_ts BEFORE UPDATE ON constants
        FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
