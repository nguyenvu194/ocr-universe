-- ═══════════════════════════════════════════════════════════════════════
-- OCR Universe — Core User & Billing Database Schema
-- PostgreSQL 15+
-- Updated : 2026-02-13 (v2 — Input/Output Token Model)
-- ═══════════════════════════════════════════════════════════════════════
--
-- PRICING MODEL:
--   Pay-as-you-go : Input $0.20/1M tokens · Output $0.40/1M tokens
--   Basic ($10)   : 55M input + 27M output tokens
--   Premium ($19) : 118M input + 59M output tokens
--
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Extensions ──────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ═════════════════════════════════════════════════════════════════════
--  ENUM TYPES
-- ═════════════════════════════════════════════════════════════════════

CREATE TYPE auth_provider_type AS ENUM ('email', 'google', 'facebook', 'github');

CREATE TYPE transaction_status AS ENUM ('pending', 'success', 'failed', 'refunded');

CREATE TYPE payment_method AS ENUM ('momo', 'vnpay', 'zalopay', 'bank_transfer', 'stripe', 'manual');

-- Loại giao dịch: nạp tiền hoặc mua gói
CREATE TYPE transaction_type AS ENUM ('deposit', 'package_purchase', 'payg_topup');

-- Loại gói token
CREATE TYPE package_type AS ENUM ('payg', 'basic', 'premium');

-- Tính năng sử dụng
CREATE TYPE ocr_feature_type AS ENUM (
    'ocr_basic',          -- Tesseract
    'ocr_advanced',       -- Google Vision
    'ai_reconstruct',     -- AI phục chế
    'ai_translate',       -- AI dịch thuật
    'ai_summarize',       -- AI tóm tắt
    'export_pdf',
    'export_docx',
    'export_xlsx'
);

-- Trạng thái promo code
CREATE TYPE promo_status AS ENUM ('active', 'expired', 'depleted');


-- ═════════════════════════════════════════════════════════════════════
--  1. USERS
-- ═════════════════════════════════════════════════════════════════════

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100),
    avatar_url      TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_email_format CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
);

CREATE INDEX idx_users_active     ON users (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_created_at ON users (created_at DESC);


-- ═════════════════════════════════════════════════════════════════════
--  2. USER_PROVIDERS — Multi-provider Auth
-- ═════════════════════════════════════════════════════════════════════

CREATE TABLE user_providers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL,
    provider        auth_provider_type NOT NULL,
    provider_uid    VARCHAR(255),       -- Google sub, Facebook ID...
    provider_email  VARCHAR(255),
    provider_data   JSONB,              -- OAuth tokens, profile extras
    password_hash   VARCHAR(255),       -- Chỉ khi provider = 'email'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_providers_user   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_provider    UNIQUE (user_id, provider),
    CONSTRAINT uq_provider_uid     UNIQUE (provider, provider_uid),
    CONSTRAINT ck_email_has_pw     CHECK (provider != 'email' OR password_hash IS NOT NULL),
    CONSTRAINT ck_social_has_uid   CHECK (provider = 'email'  OR provider_uid IS NOT NULL)
);

CREATE INDEX idx_providers_user   ON user_providers (user_id);
CREATE INDEX idx_providers_lookup ON user_providers (provider, provider_uid);


-- ═════════════════════════════════════════════════════════════════════
--  3. TOKEN_PACKAGES — Định nghĩa các gói Token
-- ═════════════════════════════════════════════════════════════════════
-- Bảng tham chiếu — admin quản lý, ít thay đổi.

CREATE TABLE token_packages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug            VARCHAR(50) NOT NULL,           -- 'payg', 'basic', 'premium'
    name            VARCHAR(100) NOT NULL,           -- 'Pay-as-you-go', 'Gói Basic'...
    package_type    package_type NOT NULL,
    price_usd       NUMERIC(10, 2) NOT NULL,         -- $0 cho payg (trả theo dùng)

    -- Token allocation cho gói cố định (Basic, Premium)
    input_tokens    BIGINT NOT NULL DEFAULT 0,       -- 55M, 118M...
    output_tokens   BIGINT NOT NULL DEFAULT 0,       -- 27M, 59M...

    -- Giá per-token cho Pay-as-you-go ($)
    input_rate_per_million   NUMERIC(10, 4) DEFAULT 0,  -- $0.20
    output_rate_per_million  NUMERIC(10, 4) DEFAULT 0,  -- $0.40

    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_packages_slug UNIQUE (slug)
);


-- ═════════════════════════════════════════════════════════════════════
--  4. WALLETS — Số dư tiền thật (USD) của client
-- ═════════════════════════════════════════════════════════════════════
-- Lưu balance bằng tiền thật (USD, cent-based).
-- Khi user dùng pay-as-you-go, trừ trực tiếp từ balance.
-- Khi user mua gói, trừ balance → cộng token vào user_token_balances.

CREATE TABLE wallets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL,

    -- Số dư tiền thật (đơn vị: USD cents, 1$ = 100)
    balance_cents   BIGINT NOT NULL DEFAULT 0,

    -- Thống kê tổng nạp / tổng tiêu
    total_deposited_cents BIGINT NOT NULL DEFAULT 0,
    total_spent_cents     BIGINT NOT NULL DEFAULT 0,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_wallets_user     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_wallets_user     UNIQUE (user_id),
    CONSTRAINT ck_balance_positive CHECK (balance_cents >= 0)
);


-- ═════════════════════════════════════════════════════════════════════
--  5. USER_TOKEN_BALANCES — Số token còn lại (per package purchase)
-- ═════════════════════════════════════════════════════════════════════
-- Mỗi lần user mua 1 gói → tạo 1 row ở đây.
-- Dùng hết token trong row này → chuyển sang row khác hoặc fallback payg.
-- Hệ thống ưu tiên dùng gói cũ nhất (FIFO) trước.

CREATE TABLE user_token_balances (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL,
    package_id          UUID NOT NULL,
    transaction_id      UUID,               -- Link đến transaction mua gói

    -- Token ban đầu khi mua
    initial_input_tokens   BIGINT NOT NULL,
    initial_output_tokens  BIGINT NOT NULL,

    -- Token còn lại (giảm dần khi sử dụng)
    remaining_input_tokens  BIGINT NOT NULL,
    remaining_output_tokens BIGINT NOT NULL,

    -- Hết hạn (NULL = không giới hạn thời gian)
    expires_at          TIMESTAMPTZ,
    is_exhausted        BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE khi cả 2 token = 0

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_token_bal_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_token_bal_pkg     FOREIGN KEY (package_id) REFERENCES token_packages(id),
    CONSTRAINT ck_input_positive    CHECK (remaining_input_tokens >= 0),
    CONSTRAINT ck_output_positive   CHECK (remaining_output_tokens >= 0)
);

CREATE INDEX idx_token_bal_user      ON user_token_balances (user_id);
CREATE INDEX idx_token_bal_active    ON user_token_balances (user_id, is_exhausted)
    WHERE is_exhausted = FALSE;


-- ═════════════════════════════════════════════════════════════════════
--  6. TRANSACTIONS — Lịch sử nạp tiền & mua gói
-- ═════════════════════════════════════════════════════════════════════

CREATE TABLE transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL,

    -- Loại & trạng thái
    type                transaction_type NOT NULL,   -- deposit | package_purchase | payg_topup
    status              transaction_status NOT NULL DEFAULT 'pending',

    -- Số tiền
    amount_cents        BIGINT NOT NULL,             -- Số tiền USD (cents)
    currency            VARCHAR(3) NOT NULL DEFAULT 'USD',

    -- Nếu mua gói: link đến package
    package_id          UUID,

    -- Payment gateway
    payment_method      payment_method NOT NULL,
    gateway_txn_id      VARCHAR(255),
    gateway_response    JSONB,

    -- Extra
    description         TEXT,
    ip_address          INET,
    promo_code_id       UUID,                        -- Link đến promo_codes nếu có

    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_txn_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_txn_package FOREIGN KEY (package_id) REFERENCES token_packages(id),
    CONSTRAINT ck_txn_amount  CHECK (amount_cents > 0)
);

CREATE INDEX idx_txn_user       ON transactions (user_id);
CREATE INDEX idx_txn_status     ON transactions (status) WHERE status = 'pending';
CREATE INDEX idx_txn_created    ON transactions (created_at DESC);
CREATE INDEX idx_txn_gateway    ON transactions (payment_method, gateway_txn_id);


-- ═════════════════════════════════════════════════════════════════════
--  7. USAGE_LOGS — Lịch sử sử dụng & trừ Token
-- ═════════════════════════════════════════════════════════════════════
-- Audit trail — KHÔNG cho UPDATE/DELETE.
-- Tách input/output tokens consumed.

CREATE TABLE usage_logs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL,

    -- Tính năng
    feature             ocr_feature_type NOT NULL,

    -- Token consumed (tách input/output)
    input_tokens_used   BIGINT NOT NULL DEFAULT 0,
    output_tokens_used  BIGINT NOT NULL DEFAULT 0,

    -- Nguồn trừ token
    token_balance_id    UUID,               -- Trừ từ gói nào (NULL = pay-as-you-go)
    cost_cents          BIGINT DEFAULT 0,   -- Chi phí USD nếu pay-as-you-go

    -- Request metadata
    input_metadata      JSONB,              -- { file_name, file_size, mime_type, dimensions }
    output_metadata     JSONB,              -- { text_length, confidence, provider, processing_ms }

    ip_address          INET,
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_usage_user      FOREIGN KEY (user_id)          REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_usage_token_bal FOREIGN KEY (token_balance_id) REFERENCES user_token_balances(id),
    CONSTRAINT ck_usage_tokens    CHECK (input_tokens_used >= 0 AND output_tokens_used >= 0)
);

CREATE INDEX idx_usage_user      ON usage_logs (user_id);
CREATE INDEX idx_usage_feature   ON usage_logs (feature);
CREATE INDEX idx_usage_created   ON usage_logs (created_at DESC);
CREATE INDEX idx_usage_user_time ON usage_logs (user_id, created_at DESC);


-- ═════════════════════════════════════════════════════════════════════
--  8. PROMO_CODES — Mã khuyến mãi
-- ═════════════════════════════════════════════════════════════════════

CREATE TABLE promo_codes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50) NOT NULL,
    description     TEXT,
    status          promo_status NOT NULL DEFAULT 'active',

    -- Loại discount
    discount_percent    INT,                -- VD: 20 = giảm 20%
    discount_cents      BIGINT,             -- VD: 500 = giảm $5.00
    bonus_input_tokens  BIGINT DEFAULT 0,   -- Token input bonus thêm
    bonus_output_tokens BIGINT DEFAULT 0,   -- Token output bonus thêm

    -- Giới hạn
    max_uses            INT,                -- Tổng lượt dùng tối đa (NULL = không giới hạn)
    current_uses        INT NOT NULL DEFAULT 0,
    max_uses_per_user   INT DEFAULT 1,      -- Mỗi user dùng tối đa mấy lần

    -- Phạm vi áp dụng
    applicable_packages package_type[],     -- Áp dụng cho gói nào: {'basic','premium'}
    min_amount_cents    BIGINT DEFAULT 0,   -- Đơn hàng tối thiểu để dùng promo

    -- Thời hạn
    starts_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_promo_code UNIQUE (code),
    CONSTRAINT ck_promo_discount CHECK (
        discount_percent IS NOT NULL OR discount_cents IS NOT NULL
        OR bonus_input_tokens > 0 OR bonus_output_tokens > 0
    )
);

CREATE INDEX idx_promo_code   ON promo_codes (code) WHERE status = 'active';
CREATE INDEX idx_promo_status ON promo_codes (status);


-- ═════════════════════════════════════════════════════════════════════
--  9. PROMO_USAGES — Tracking ai đã dùng promo code nào
-- ═════════════════════════════════════════════════════════════════════

CREATE TABLE promo_usages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code_id   UUID NOT NULL,
    user_id         UUID NOT NULL,
    transaction_id  UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_promo_usage_code FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id),
    CONSTRAINT fk_promo_usage_user FOREIGN KEY (user_id)       REFERENCES users(id),
    CONSTRAINT fk_promo_usage_txn  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE INDEX idx_promo_usage_user ON promo_usages (promo_code_id, user_id);


-- ═════════════════════════════════════════════════════════════════════
--  10. AUTO-UPDATE TRIGGERS
-- ═════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_ts           BEFORE UPDATE ON users             FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_providers_ts       BEFORE UPDATE ON user_providers     FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_wallets_ts         BEFORE UPDATE ON wallets            FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_token_bal_ts       BEFORE UPDATE ON user_token_balances FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_txn_ts             BEFORE UPDATE ON transactions       FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_promo_ts           BEFORE UPDATE ON promo_codes        FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_packages_ts        BEFORE UPDATE ON token_packages     FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();


-- ═════════════════════════════════════════════════════════════════════
--  11. CORE FUNCTIONS
-- ═════════════════════════════════════════════════════════════════════

-- ─── Trừ Token khi sử dụng feature ──────────────────────────────────
-- Logic:
--   1. Tìm gói token chưa hết (FIFO — cũ nhất trước)
--   2. Nếu có gói → trừ từ gói
--   3. Nếu hết gói → fallback pay-as-you-go (trừ wallet balance)
--   4. Ghi usage_log

CREATE OR REPLACE FUNCTION fn_consume_tokens(
    p_user_id       UUID,
    p_feature       ocr_feature_type,
    p_input_tokens  BIGINT,
    p_output_tokens BIGINT,
    p_input_meta    JSONB DEFAULT NULL,
    p_output_meta   JSONB DEFAULT NULL,
    p_ip            INET DEFAULT NULL,
    p_ua            TEXT DEFAULT NULL
)
RETURNS TABLE (
    success         BOOLEAN,
    source          TEXT,           -- 'package' hoặc 'payg'
    balance_id      UUID,
    cost_cents      BIGINT
) AS $$
DECLARE
    v_bal           user_token_balances%ROWTYPE;
    v_wallet        wallets%ROWTYPE;
    v_payg_pkg      token_packages%ROWTYPE;
    v_cost          BIGINT := 0;
    v_source        TEXT;
    v_bal_id        UUID;
BEGIN
    -- 1) Tìm gói token active (FIFO: cũ nhất trước)
    SELECT * INTO v_bal
    FROM user_token_balances
    WHERE user_id = p_user_id
      AND is_exhausted = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND remaining_input_tokens >= p_input_tokens
      AND remaining_output_tokens >= p_output_tokens
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        -- 2a) Trừ từ gói
        UPDATE user_token_balances SET
            remaining_input_tokens  = remaining_input_tokens  - p_input_tokens,
            remaining_output_tokens = remaining_output_tokens - p_output_tokens,
            is_exhausted = (
                remaining_input_tokens  - p_input_tokens  = 0
                AND remaining_output_tokens - p_output_tokens = 0
            )
        WHERE id = v_bal.id;

        v_source := 'package';
        v_bal_id := v_bal.id;
        v_cost   := 0;
    ELSE
        -- 2b) Fallback: pay-as-you-go
        SELECT * INTO v_payg_pkg
        FROM token_packages
        WHERE package_type = 'payg' AND is_active = TRUE
        LIMIT 1;

        IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, 'error'::TEXT, NULL::UUID, 0::BIGINT;
            RETURN;
        END IF;

        -- Tính chi phí (cents)
        v_cost := CEIL(
            (p_input_tokens::NUMERIC  / 1000000.0) * v_payg_pkg.input_rate_per_million  * 100
          + (p_output_tokens::NUMERIC / 1000000.0) * v_payg_pkg.output_rate_per_million * 100
        );

        -- Trừ wallet
        SELECT * INTO v_wallet
        FROM wallets
        WHERE user_id = p_user_id
        FOR UPDATE;

        IF NOT FOUND OR v_wallet.balance_cents < v_cost THEN
            RETURN QUERY SELECT FALSE, 'insufficient_balance'::TEXT, NULL::UUID, v_cost;
            RETURN;
        END IF;

        UPDATE wallets SET
            balance_cents     = balance_cents - v_cost,
            total_spent_cents = total_spent_cents + v_cost
        WHERE user_id = p_user_id;

        v_source := 'payg';
        v_bal_id := NULL;
    END IF;

    -- 3) Ghi usage log
    INSERT INTO usage_logs (
        user_id, feature,
        input_tokens_used, output_tokens_used,
        token_balance_id, cost_cents,
        input_metadata, output_metadata,
        ip_address, user_agent
    ) VALUES (
        p_user_id, p_feature,
        p_input_tokens, p_output_tokens,
        v_bal_id, v_cost,
        p_input_meta, p_output_meta,
        p_ip, p_ua
    );

    RETURN QUERY SELECT TRUE, v_source, v_bal_id, v_cost;
END;
$$ LANGUAGE plpgsql;


-- ─── Xử lý khi payment gateway callback thành công ──────────────────
-- Cộng tiền vào wallet (deposit) hoặc tạo token balance (package_purchase)

CREATE OR REPLACE FUNCTION fn_complete_transaction(p_txn_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_txn   transactions%ROWTYPE;
    v_pkg   token_packages%ROWTYPE;
BEGIN
    SELECT * INTO v_txn FROM transactions WHERE id = p_txn_id FOR UPDATE;

    IF NOT FOUND OR v_txn.status != 'pending' THEN
        RETURN FALSE;
    END IF;

    IF v_txn.type = 'deposit' OR v_txn.type = 'payg_topup' THEN
        -- Nạp tiền thật vào wallet
        UPDATE wallets SET
            balance_cents         = balance_cents + v_txn.amount_cents,
            total_deposited_cents = total_deposited_cents + v_txn.amount_cents
        WHERE user_id = v_txn.user_id;

    ELSIF v_txn.type = 'package_purchase' THEN
        -- Mua gói → tạo token balance
        SELECT * INTO v_pkg FROM token_packages WHERE id = v_txn.package_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Package not found: %', v_txn.package_id;
        END IF;

        -- Trừ tiền wallet
        UPDATE wallets SET
            balance_cents     = balance_cents - v_txn.amount_cents,
            total_spent_cents = total_spent_cents + v_txn.amount_cents
        WHERE user_id = v_txn.user_id;

        -- Tạo token balance
        INSERT INTO user_token_balances (
            user_id, package_id, transaction_id,
            initial_input_tokens, initial_output_tokens,
            remaining_input_tokens, remaining_output_tokens
        ) VALUES (
            v_txn.user_id, v_pkg.id, v_txn.id,
            v_pkg.input_tokens, v_pkg.output_tokens,
            v_pkg.input_tokens, v_pkg.output_tokens
        );
    END IF;

    -- Cập nhật trạng thái
    UPDATE transactions SET status = 'success', completed_at = NOW()
    WHERE id = p_txn_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


-- ═════════════════════════════════════════════════════════════════════
--  12. SEED DATA — Package definitions
-- ═════════════════════════════════════════════════════════════════════

INSERT INTO token_packages (slug, name, package_type, price_usd, input_tokens, output_tokens, input_rate_per_million, output_rate_per_million, sort_order)
VALUES
    ('payg',    'Pay-as-you-go', 'payg',    0,     0,           0,          0.20,   0.40,   1),
    ('basic',   'Gói Basic',     'basic',   10.00, 55000000,    27000000,   0,      0,      2),
    ('premium', 'Gói Premium',   'premium', 19.00, 118000000,   59000000,   0,      0,      3);


-- ═════════════════════════════════════════════════════════════════════
--  TABLE COMMENTS
-- ═════════════════════════════════════════════════════════════════════

COMMENT ON TABLE users                IS 'Profile người dùng — không lưu password';
COMMENT ON TABLE user_providers       IS 'Multi-provider auth (email + Google liên kết)';
COMMENT ON TABLE token_packages       IS 'Định nghĩa các gói token (payg/basic/premium)';
COMMENT ON TABLE wallets              IS 'Số dư tiền USD (cents) của client';
COMMENT ON TABLE user_token_balances  IS 'Token còn lại cho mỗi gói đã mua (FIFO)';
COMMENT ON TABLE transactions         IS 'Lịch sử nạp tiền & mua gói';
COMMENT ON TABLE usage_logs           IS 'Audit trail — trừ token khi dùng OCR/AI/Export';
COMMENT ON TABLE promo_codes          IS 'Mã khuyến mãi với discount hoặc bonus tokens';
COMMENT ON TABLE promo_usages         IS 'Tracking ai đã dùng promo code nào';


-- ═════════════════════════════════════════════════════════════════════
--  13. CONSTANTS — App configuration key-value
-- ═════════════════════════════════════════════════════════════════════

CREATE TABLE constants (
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

CREATE INDEX idx_constants_code ON constants (code) WHERE is_enabled = TRUE;

INSERT INTO constants (code, value, name, description) VALUES
    ('deposit_min_amount', '1', 'Minimum Deposit Amount', 'Số tiền nạp tối thiểu (USD)');


-- ═════════════════════════════════════════════════════════════════════
--  14. WEBHOOK_LOGS — Payment webhook audit trail
-- ═════════════════════════════════════════════════════════════════════

CREATE TABLE webhook_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider        VARCHAR(50) NOT NULL,           -- 'sepay', 'payos', 'lemon'
    event_type      VARCHAR(100),                   -- 'deposit', 'unauthorized'...
    payload         JSONB,                          -- Raw webhook payload
    status          VARCHAR(50) DEFAULT 'received', -- received, processed, no_match, error...
    matched_txn_id  UUID,                           -- Link to matched transaction
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_webhook_txn FOREIGN KEY (matched_txn_id) REFERENCES transactions(id)
);

CREATE INDEX idx_webhook_provider  ON webhook_logs (provider);
CREATE INDEX idx_webhook_status    ON webhook_logs (status);
CREATE INDEX idx_webhook_created   ON webhook_logs (created_at DESC);


-- ═════════════════════════════════════════════════════════════════════
--  15. CONVERSION_RATES — Exchange rate history
-- ═════════════════════════════════════════════════════════════════════

CREATE TABLE conversion_rates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_code       VARCHAR(10) NOT NULL,
    to_code         VARCHAR(10) NOT NULL,
    rate            DECIMAL(20, 10) NOT NULL,
    source          VARCHAR(50) DEFAULT 'exchangerate-api',
    is_latest       SMALLINT DEFAULT 1,             -- 1 = current rate, 0 = historical
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversion_rates_codes  ON conversion_rates (from_code, to_code);
CREATE INDEX idx_conversion_rates_latest ON conversion_rates (from_code, to_code, is_latest);


-- ═════════════════════════════════════════════════════════════════════
--  16. OTP_VERIFICATIONS — Email OTP verification
-- ═════════════════════════════════════════════════════════════════════

CREATE TABLE otp_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL,
    otp             VARCHAR(10) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_email ON otp_verifications (email);


-- ═════════════════════════════════════════════════════════════════════
--  TRIGGERS for new tables
-- ═════════════════════════════════════════════════════════════════════

CREATE TRIGGER trg_constants_ts BEFORE UPDATE ON constants FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

