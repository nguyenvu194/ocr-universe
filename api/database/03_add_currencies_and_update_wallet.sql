-- ═══════════════════════════════════════════════════════════════════════
-- OCR Universe — Migration 03: Add currencies table & update wallets
-- Date: 2026-02-25
-- Description:
--   1. Create currencies table with all fiat + major crypto
--   2. Rename wallet columns: *_cents → plain names
--   3. Add currency_id FK to wallets
--   4. Update stored functions to use new column names
-- ═══════════════════════════════════════════════════════════════════════


-- ─── 1. CURRENCIES TABLE ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS currencies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(10) NOT NULL,
    type            SMALLINT NOT NULL DEFAULT 0,   -- 0 = fiat, 1 = crypto
    description     VARCHAR(255),
    decimal_place   SMALLINT NOT NULL DEFAULT 2,

    CONSTRAINT uq_currencies_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies (code);


-- ─── 2. SEED: FIAT CURRENCIES ────────────────────────────────────────

INSERT INTO currencies (code, type, description, decimal_place) VALUES
    ('AED', 0, 'United Arab Emirates Dirham', 2),
    ('AFN', 0, 'Afghan Afghani', 2),
    ('ALL', 0, 'Albanian Lek', 2),
    ('AMD', 0, 'Armenian Dram', 2),
    ('ANG', 0, 'Netherlands Antillean Guilder', 2),
    ('AOA', 0, 'Angolan Kwanza', 2),
    ('ARS', 0, 'Argentine Peso', 2),
    ('AUD', 0, 'Australian Dollar', 2),
    ('AWG', 0, 'Aruban Florin', 2),
    ('AZN', 0, 'Azerbaijani Manat', 2),
    ('BAM', 0, 'Bosnia-Herzegovina Convertible Mark', 2),
    ('BBD', 0, 'Barbadian Dollar', 2),
    ('BDT', 0, 'Bangladeshi Taka', 2),
    ('BGN', 0, 'Bulgarian Lev', 2),
    ('BHD', 0, 'Bahraini Dinar', 3),
    ('BIF', 0, 'Burundian Franc', 0),
    ('BMD', 0, 'Bermudian Dollar', 2),
    ('BND', 0, 'Brunei Dollar', 2),
    ('BOB', 0, 'Bolivian Boliviano', 2),
    ('BRL', 0, 'Brazilian Real', 2),
    ('BSD', 0, 'Bahamian Dollar', 2),
    ('BTN', 0, 'Bhutanese Ngultrum', 2),
    ('BWP', 0, 'Botswanan Pula', 2),
    ('BYN', 0, 'Belarusian Ruble', 2),
    ('BZD', 0, 'Belize Dollar', 2),
    ('CAD', 0, 'Canadian Dollar', 2),
    ('CDF', 0, 'Congolese Franc', 2),
    ('CHF', 0, 'Swiss Franc', 2),
    ('CLP', 0, 'Chilean Peso', 0),
    ('CNY', 0, 'Chinese Yuan', 2),
    ('COP', 0, 'Colombian Peso', 2),
    ('CRC', 0, 'Costa Rican Colón', 2),
    ('CUP', 0, 'Cuban Peso', 2),
    ('CVE', 0, 'Cape Verdean Escudo', 2),
    ('CZK', 0, 'Czech Koruna', 2),
    ('DJF', 0, 'Djiboutian Franc', 0),
    ('DKK', 0, 'Danish Krone', 2),
    ('DOP', 0, 'Dominican Peso', 2),
    ('DZD', 0, 'Algerian Dinar', 2),
    ('EGP', 0, 'Egyptian Pound', 2),
    ('ERN', 0, 'Eritrean Nakfa', 2),
    ('ETB', 0, 'Ethiopian Birr', 2),
    ('EUR', 0, 'Euro', 2),
    ('FJD', 0, 'Fijian Dollar', 2),
    ('FKP', 0, 'Falkland Islands Pound', 2),
    ('FOK', 0, 'Faroese Króna', 2),
    ('GBP', 0, 'British Pound Sterling', 2),
    ('GEL', 0, 'Georgian Lari', 2),
    ('GGP', 0, 'Guernsey Pound', 2),
    ('GHS', 0, 'Ghanaian Cedi', 2),
    ('GIP', 0, 'Gibraltar Pound', 2),
    ('GMD', 0, 'Gambian Dalasi', 2),
    ('GNF', 0, 'Guinean Franc', 0),
    ('GTQ', 0, 'Guatemalan Quetzal', 2),
    ('GYD', 0, 'Guyanaese Dollar', 2),
    ('HKD', 0, 'Hong Kong Dollar', 2),
    ('HNL', 0, 'Honduran Lempira', 2),
    ('HRK', 0, 'Croatian Kuna', 2),
    ('HTG', 0, 'Haitian Gourde', 2),
    ('HUF', 0, 'Hungarian Forint', 2),
    ('IDR', 0, 'Indonesian Rupiah', 2),
    ('ILS', 0, 'Israeli New Shekel', 2),
    ('IMP', 0, 'Isle of Man Pound', 2),
    ('INR', 0, 'Indian Rupee', 2),
    ('IQD', 0, 'Iraqi Dinar', 3),
    ('IRR', 0, 'Iranian Rial', 2),
    ('ISK', 0, 'Icelandic Króna', 0),
    ('JEP', 0, 'Jersey Pound', 2),
    ('JMD', 0, 'Jamaican Dollar', 2),
    ('JOD', 0, 'Jordanian Dinar', 3),
    ('JPY', 0, 'Japanese Yen', 0),
    ('KES', 0, 'Kenyan Shilling', 2),
    ('KGS', 0, 'Kyrgystani Som', 2),
    ('KHR', 0, 'Cambodian Riel', 2),
    ('KID', 0, 'Kiribati Dollar', 2),
    ('KMF', 0, 'Comorian Franc', 0),
    ('KRW', 0, 'South Korean Won', 0),
    ('KWD', 0, 'Kuwaiti Dinar', 3),
    ('KYD', 0, 'Cayman Islands Dollar', 2),
    ('KZT', 0, 'Kazakhstani Tenge', 2),
    ('LAK', 0, 'Laotian Kip', 2),
    ('LBP', 0, 'Lebanese Pound', 2),
    ('LKR', 0, 'Sri Lankan Rupee', 2),
    ('LRD', 0, 'Liberian Dollar', 2),
    ('LSL', 0, 'Lesotho Loti', 2),
    ('LYD', 0, 'Libyan Dinar', 3),
    ('MAD', 0, 'Moroccan Dirham', 2),
    ('MDL', 0, 'Moldovan Leu', 2),
    ('MGA', 0, 'Malagasy Ariary', 2),
    ('MKD', 0, 'Macedonian Denar', 2),
    ('MMK', 0, 'Myanmar Kyat', 2),
    ('MNT', 0, 'Mongolian Tugrik', 2),
    ('MOP', 0, 'Macanese Pataca', 2),
    ('MRU', 0, 'Mauritanian Ouguiya', 2),
    ('MUR', 0, 'Mauritian Rupee', 2),
    ('MVR', 0, 'Maldivian Rufiyaa', 2),
    ('MWK', 0, 'Malawian Kwacha', 2),
    ('MXN', 0, 'Mexican Peso', 2),
    ('MYR', 0, 'Malaysian Ringgit', 2),
    ('MZN', 0, 'Mozambican Metical', 2),
    ('NAD', 0, 'Namibian Dollar', 2),
    ('NGN', 0, 'Nigerian Naira', 2),
    ('NIO', 0, 'Nicaraguan Córdoba', 2),
    ('NOK', 0, 'Norwegian Krone', 2),
    ('NPR', 0, 'Nepalese Rupee', 2),
    ('NZD', 0, 'New Zealand Dollar', 2),
    ('OMR', 0, 'Omani Rial', 3),
    ('PAB', 0, 'Panamanian Balboa', 2),
    ('PEN', 0, 'Peruvian Sol', 2),
    ('PGK', 0, 'Papua New Guinean Kina', 2),
    ('PHP', 0, 'Philippine Peso', 2),
    ('PKR', 0, 'Pakistani Rupee', 2),
    ('PLN', 0, 'Polish Zloty', 2),
    ('PYG', 0, 'Paraguayan Guarani', 0),
    ('QAR', 0, 'Qatari Rial', 2),
    ('RON', 0, 'Romanian Leu', 2),
    ('RSD', 0, 'Serbian Dinar', 2),
    ('RUB', 0, 'Russian Ruble', 2),
    ('RWF', 0, 'Rwandan Franc', 0),
    ('SAR', 0, 'Saudi Riyal', 2),
    ('SBD', 0, 'Solomon Islands Dollar', 2),
    ('SCR', 0, 'Seychellois Rupee', 2),
    ('SDG', 0, 'Sudanese Pound', 2),
    ('SEK', 0, 'Swedish Krona', 2),
    ('SGD', 0, 'Singapore Dollar', 2),
    ('SHP', 0, 'Saint Helena Pound', 2),
    ('SLE', 0, 'Sierra Leonean Leone', 2),
    ('SOS', 0, 'Somali Shilling', 2),
    ('SRD', 0, 'Surinamese Dollar', 2),
    ('SSP', 0, 'South Sudanese Pound', 2),
    ('STN', 0, 'São Tomé and Príncipe Dobra', 2),
    ('SYP', 0, 'Syrian Pound', 2),
    ('SZL', 0, 'Swazi Lilangeni', 2),
    ('THB', 0, 'Thai Baht', 2),
    ('TJS', 0, 'Tajikistani Somoni', 2),
    ('TMT', 0, 'Turkmenistani Manat', 2),
    ('TND', 0, 'Tunisian Dinar', 3),
    ('TOP', 0, 'Tongan Paʻanga', 2),
    ('TRY', 0, 'Turkish Lira', 2),
    ('TTD', 0, 'Trinidad and Tobago Dollar', 2),
    ('TVD', 0, 'Tuvaluan Dollar', 2),
    ('TWD', 0, 'New Taiwan Dollar', 2),
    ('TZS', 0, 'Tanzanian Shilling', 2),
    ('UAH', 0, 'Ukrainian Hryvnia', 2),
    ('UGX', 0, 'Ugandan Shilling', 0),
    ('USD', 0, 'United States Dollar', 2),
    ('UYU', 0, 'Uruguayan Peso', 2),
    ('UZS', 0, 'Uzbekistani Som', 2),
    ('VES', 0, 'Venezuelan Bolívar', 2),
    ('VND', 0, 'Vietnamese Dong', 0),
    ('VUV', 0, 'Vanuatu Vatu', 0),
    ('WST', 0, 'Samoan Tala', 2),
    ('XAF', 0, 'Central African CFA Franc', 0),
    ('XCD', 0, 'East Caribbean Dollar', 2),
    ('XDR', 0, 'Special Drawing Rights', 2),
    ('XOF', 0, 'West African CFA Franc', 0),
    ('XPF', 0, 'CFP Franc', 0),
    ('YER', 0, 'Yemeni Rial', 2),
    ('ZAR', 0, 'South African Rand', 2),
    ('ZMW', 0, 'Zambian Kwacha', 2),
    ('ZWL', 0, 'Zimbabwean Dollar', 2)
ON CONFLICT (code) DO NOTHING;


-- ─── 3. SEED: CRYPTO CURRENCIES ──────────────────────────────────────

INSERT INTO currencies (code, type, description, decimal_place) VALUES
    ('USDT', 1, 'Tether', 6),
    ('USDC', 1, 'USD Coin', 6),
    ('BTC',  1, 'Bitcoin', 8),
    ('ETH',  1, 'Ethereum', 18),
    ('BNB',  1, 'Binance Coin', 8),
    ('SOL',  1, 'Solana', 9),
    ('XRP',  1, 'Ripple', 6),
    ('ADA',  1, 'Cardano', 6),
    ('DOGE', 1, 'Dogecoin', 8),
    ('DOT',  1, 'Polkadot', 10)
ON CONFLICT (code) DO NOTHING;


-- ─── 4. RENAME WALLET COLUMNS ────────────────────────────────────────

ALTER TABLE wallets RENAME COLUMN balance_cents TO balance;
ALTER TABLE wallets RENAME COLUMN total_deposited_cents TO total_deposited;
ALTER TABLE wallets RENAME COLUMN total_spent_cents TO total_spent;


-- ─── 5. ADD currency_id TO WALLETS ───────────────────────────────────

-- Default to VND for existing wallets (Vietnamese platform)
DO $$ DECLARE v_vnd_id UUID;
BEGIN
    SELECT id INTO v_vnd_id FROM currencies WHERE code = 'VND';

    -- Add column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wallets' AND column_name = 'currency_id'
    ) THEN
        ALTER TABLE wallets ADD COLUMN currency_id UUID;

        -- Set existing wallets to VND
        UPDATE wallets SET currency_id = v_vnd_id WHERE currency_id IS NULL;

        -- Now make it NOT NULL
        ALTER TABLE wallets ALTER COLUMN currency_id SET NOT NULL;

        -- Add FK constraint
        ALTER TABLE wallets ADD CONSTRAINT fk_wallets_currency
            FOREIGN KEY (currency_id) REFERENCES currencies(id);
    END IF;
END $$;

-- Drop old unique constraint (user can have multiple wallets, one per currency)
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS uq_wallets_user;

-- New unique: one wallet per user per currency
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_wallets_user_currency'
    ) THEN
        ALTER TABLE wallets ADD CONSTRAINT uq_wallets_user_currency
            UNIQUE (user_id, currency_id);
    END IF;
END $$;

-- Drop old check constraint (balance can be any amount now, not just cents)
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS ck_balance_positive;
ALTER TABLE wallets ADD CONSTRAINT ck_balance_positive CHECK (balance >= 0);


-- ─── 6. UPDATE STORED FUNCTIONS ──────────────────────────────────────

-- fn_consume_tokens: uses balance_cents → balance, total_spent_cents → total_spent
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
    source          TEXT,
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

        -- Tính chi phí
        v_cost := CEIL(
            (p_input_tokens::NUMERIC  / 1000000.0) * v_payg_pkg.input_rate_per_million  * 100
          + (p_output_tokens::NUMERIC / 1000000.0) * v_payg_pkg.output_rate_per_million * 100
        );

        -- Trừ wallet
        SELECT * INTO v_wallet
        FROM wallets
        WHERE user_id = p_user_id
        FOR UPDATE;

        IF NOT FOUND OR v_wallet.balance < v_cost THEN
            RETURN QUERY SELECT FALSE, 'insufficient_balance'::TEXT, NULL::UUID, v_cost;
            RETURN;
        END IF;

        UPDATE wallets SET
            balance     = balance - v_cost,
            total_spent = total_spent + v_cost
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


-- fn_complete_transaction: uses balance_cents → balance, total_* → new names
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
            balance         = balance + v_txn.amount_cents,
            total_deposited = total_deposited + v_txn.amount_cents
        WHERE user_id = v_txn.user_id;

    ELSIF v_txn.type = 'package_purchase' THEN
        -- Mua gói → tạo token balance
        SELECT * INTO v_pkg FROM token_packages WHERE id = v_txn.package_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Package not found: %', v_txn.package_id;
        END IF;

        -- Trừ tiền wallet
        UPDATE wallets SET
            balance     = balance - v_txn.amount_cents,
            total_spent = total_spent + v_txn.amount_cents
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


-- ─── 7. TRIGGER for updated_at ───────────────────────────────────────

DO $$ BEGIN
    CREATE TRIGGER trg_currencies_ts BEFORE UPDATE ON currencies
        FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
