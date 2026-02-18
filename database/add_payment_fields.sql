-- ═══════════════════════════════════════════════════════════════════════
-- Payment Module Migration — PayOS + Lemon Squeezy
-- Run against: ocr_universe database
-- Date: 2026-02-14
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. Thêm enum values ─────────────────────────────────────────────

-- payment_method
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'payos';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'lemon_squeezy';

-- transaction_status
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'cancelled';

-- ─── 2. Thêm columns vào transactions ────────────────────────────────

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS provider         VARCHAR(20),
    ADD COLUMN IF NOT EXISTS order_code       BIGINT,
    ADD COLUMN IF NOT EXISTS provider_txn_id  VARCHAR(255),
    ADD COLUMN IF NOT EXISTS payment_url      TEXT;

-- ─── 3. Index & Constraint ───────────────────────────────────────────

-- Unique index cho PayOS orderCode lookup
CREATE UNIQUE INDEX IF NOT EXISTS uq_txn_order_code
    ON transactions (order_code)
    WHERE order_code IS NOT NULL;

-- Index cho Lemon Squeezy provider_txn_id lookup
CREATE INDEX IF NOT EXISTS idx_txn_provider_txn_id
    ON transactions (provider_txn_id)
    WHERE provider_txn_id IS NOT NULL;

-- ─── 4. Comment ──────────────────────────────────────────────────────

COMMENT ON COLUMN transactions.provider        IS 'Payment provider: PAYOS hoặc LEMON_SQUEEZY';
COMMENT ON COLUMN transactions.order_code      IS 'PayOS orderCode — số nguyên dương, unique';
COMMENT ON COLUMN transactions.provider_txn_id IS 'Lemon Squeezy order ID hoặc gateway transaction ID';
COMMENT ON COLUMN transactions.payment_url     IS 'Checkout URL để user mở lại nếu cần';
