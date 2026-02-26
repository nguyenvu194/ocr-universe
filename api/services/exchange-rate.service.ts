/**
 * Exchange Rate Service
 *
 * Sync tỉ giá từ ExchangeRate-API và cung cấp hàm chuyển đổi tiền tệ.
 * Base currency: USD
 * API: https://v6.exchangerate-api.com/v6/{API_KEY}/latest/USD
 */
import axios from "axios";
import { query } from "../config/db";

const API_BASE = "https://v6.exchangerate-api.com/v6";

// ─── Sync Job ────────────────────────────────────────────

/**
 * Lấy toàn bộ tỉ giá từ ExchangeRate-API rồi lưu vào bảng conversion_rates.
 * Mỗi lần sync tạo bản ghi MỚI (is_latest = 1) và đánh dấu bản ghi cũ (is_latest = 0).
 */
export async function syncAllExchangeRates(): Promise<number> {
    const apiKey = process.env.CURRENCY_API_KEY;
    if (!apiKey) {
        console.error("[ExchangeRate] CURRENCY_API_KEY chưa cấu hình trong .env");
        return 0;
    }

    console.log("[ExchangeRate] Đang cập nhật tỉ giá...");

    const url = `${API_BASE}/${apiKey}/latest/USD`;
    const { data } = await axios.get(url);

    if (data.result !== "success") {
        console.error("[ExchangeRate] API trả về lỗi:", data["error-type"]);
        return 0;
    }

    const rates: Record<string, number> = data.conversion_rates;
    const entries = Object.entries(rates);
    let count = 0;

    for (const [toCode, rate] of entries) {
        if (toCode === "USD") continue;

        // Đánh dấu bản ghi cũ cùng cặp currency → is_latest = 0
        await query(
            `UPDATE conversion_rates SET is_latest = 0
             WHERE from_code = 'USD' AND to_code = $1 AND is_latest = 1`,
            [toCode]
        );

        // Tạo bản ghi mới với is_latest = 1
        await query(
            `INSERT INTO conversion_rates (from_code, to_code, rate, source, is_latest, updated_at)
             VALUES ('USD', $1, $2, 'exchangerate-api', 1, NOW())`,
            [toCode, rate]
        );
        count++;
    }

    console.log(`[ExchangeRate] ✅ Cập nhật thành công ${count} loại tiền tệ`);
    return count;
}

// ─── Currency Converter ─────────────────────────────────

/**
 * Chuyển đổi tiền tệ sử dụng tỉ giá từ bảng conversion_rates.
 *
 * Logic:
 *   - USD  → Any:  amount * rate(USD→Any)
 *   - Any  → USD:  amount / rate(USD→Any)
 *   - AnyA → AnyB: Bắc cầu qua USD = (amount / rate(USD→AnyA)) * rate(USD→AnyB)
 *
 * @param amount  - Số tiền gốc
 * @param fromCode - Mã tiền tệ nguồn (VD: "VND", "USD", "EUR")
 * @param toCode   - Mã tiền tệ đích
 * @returns Số tiền sau khi chuyển đổi
 */
export async function convertCurrency(
    amount: number,
    fromCode: string,
    toCode: string
): Promise<number> {
    // Cùng loại → trả nguyên
    if (fromCode.toUpperCase() === toCode.toUpperCase()) return amount;

    const from = fromCode.toUpperCase();
    const to = toCode.toUpperCase();

    // Case 1: USD → Any
    if (from === "USD") {
        const rate = await getRate("USD", to);
        return amount * rate;
    }

    // Case 2: Any → USD
    if (to === "USD") {
        const rate = await getRate("USD", from);
        return amount / rate;
    }

    // Case 3: AnyA → AnyB — bắc cầu qua USD
    const rateFrom = await getRate("USD", from);
    const rateTo = await getRate("USD", to);
    const amountInUsd = amount / rateFrom;
    return amountInUsd * rateTo;
}

/**
 * Lấy tỉ giá từ DB. Throw nếu không tìm thấy.
 */
async function getRate(fromCode: string, toCode: string): Promise<number> {
    const [row] = await query<{ rate: string }>(
        `SELECT rate FROM conversion_rates
         WHERE from_code = $1 AND to_code = $2 AND is_latest = 1`,
        [fromCode, toCode]
    );

    if (!row) {
        throw new Error(
            `[ExchangeRate] Không tìm thấy tỉ giá ${fromCode} → ${toCode}. Hãy chạy syncAllExchangeRates() trước.`
        );
    }

    return parseFloat(row.rate);
}

// ─── Aggregated Balance ─────────────────────────────────

/**
 * Tính tổng số dư tất cả ví của user, quy đổi sang USD.
 *
 * Logic SQL:
 *   - JOIN wallets → currencies → conversion_rates
 *   - Nếu currency = USD → balance giữ nguyên
 *   - Nếu currency khác → balance / rate(USD→currency)
 *   - SUM tất cả → total USD
 */
export async function getAggregatedBalanceUsd(userId: string): Promise<number> {
    const [row] = await query<{ total_usd: string }>(
        `SELECT COALESCE(SUM(
            CASE
                WHEN c.code = 'USD' THEN w.balance
                ELSE w.balance / NULLIF(cr.rate, 0)
            END
        ), 0) AS total_usd
         FROM wallets w
         JOIN currencies c ON c.id = w.currency_id
         LEFT JOIN conversion_rates cr
           ON cr.from_code = 'USD' AND cr.to_code = c.code AND cr.is_latest = 1
         WHERE w.user_id = $1`,
        [userId]
    );
    return parseFloat(row?.total_usd ?? "0");
}
