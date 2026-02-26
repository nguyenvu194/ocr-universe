import { pool, query } from "../../config/db";
import { getAggregatedBalanceUsd } from "../../services/exchange-rate.service";

/**
 * Billing Service — Nạp tiền, mua gói, trừ token
 */
export class BillingService {
    /**
     * Lấy thông tin ví & token balance của user
     * Trả về tất cả ví (multi-currency) + tổng số dư quy đổi USD
     */
    static async getWalletInfo(userId: string) {
        // Lấy tất cả ví kèm currency code
        const wallets = await query(
            `SELECT w.id, w.user_id, w.balance, w.total_deposited, w.total_spent,
                    c.code as currency_code, c.description as currency_name
             FROM wallets w
             JOIN currencies c ON c.id = w.currency_id
             WHERE w.user_id = $1
             ORDER BY w.created_at ASC`,
            [userId]
        );

        // Tổng số dư quy đổi USD
        const totalBalanceUsd = await getAggregatedBalanceUsd(userId);

        const tokenBalances = await query(
            `SELECT tb.*, tp.name as package_name, tp.slug as package_slug
             FROM user_token_balances tb
             JOIN token_packages tp ON tp.id = tb.package_id
             WHERE tb.user_id = $1 AND tb.is_exhausted = FALSE
               AND (tb.expires_at IS NULL OR tb.expires_at > NOW())
             ORDER BY tb.created_at ASC`,
            [userId]
        );

        return { wallets, totalBalanceUsd, tokenBalances };
    }

    /**
     * Lấy danh sách gói token
     */
    static async getPackages() {
        return query(
            `SELECT * FROM token_packages WHERE is_active = TRUE ORDER BY sort_order ASC`
        );
    }

    /**
     * Tạo transaction nạp tiền (pending)
     */
    static async createDeposit(
        userId: string,
        amountCents: number,
        paymentMethod: string,
        ipAddress?: string
    ) {
        const [txn] = await query(
            `INSERT INTO transactions (user_id, type, amount_cents, payment_method, ip_address)
             VALUES ($1, 'deposit', $2, $3, $4)
             RETURNING *`,
            [userId, amountCents, paymentMethod, ipAddress || null]
        );
        return txn;
    }

    /**
     * Tạo transaction mua gói (pending)
     */
    static async createPackagePurchase(
        userId: string,
        packageSlug: string,
        paymentMethod: string,
        promoCodeId?: string,
        ipAddress?: string
    ) {
        const [pkg] = await query(
            `SELECT * FROM token_packages WHERE slug = $1 AND is_active = TRUE`,
            [packageSlug]
        );
        if (!pkg) throw new Error(`Package '${packageSlug}' not found`);

        const amountCents = Math.round(pkg.price_usd * 100);

        const [txn] = await query(
            `INSERT INTO transactions
                (user_id, type, amount_cents, package_id, payment_method, promo_code_id, ip_address,
                 description)
             VALUES ($1, 'package_purchase', $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                userId, amountCents, pkg.id, paymentMethod,
                promoCodeId || null, ipAddress || null,
                `Mua ${pkg.name} — $${pkg.price_usd}`,
            ]
        );
        return txn;
    }

    /**
     * Hoàn thành transaction (gọi từ payment gateway callback)
     * Sử dụng stored function fn_complete_transaction()
     */
    static async completeTransaction(transactionId: string): Promise<boolean> {
        const [result] = await query(
            `SELECT fn_complete_transaction($1) as success`,
            [transactionId]
        );
        return result?.success ?? false;
    }

    /**
     * Trừ token khi sử dụng feature
     * Sử dụng stored function fn_consume_tokens()
     */
    static async consumeTokens(params: {
        userId: string;
        feature: string;
        inputTokens: number;
        outputTokens: number;
        inputMeta?: object;
        outputMeta?: object;
        ip?: string;
        ua?: string;
    }) {
        const rows = await query(
            `SELECT * FROM fn_consume_tokens($1, $2::ocr_feature_type, $3, $4, $5, $6, $7, $8)`,
            [
                params.userId,
                params.feature,
                params.inputTokens,
                params.outputTokens,
                params.inputMeta ? JSON.stringify(params.inputMeta) : null,
                params.outputMeta ? JSON.stringify(params.outputMeta) : null,
                params.ip || null,
                params.ua || null,
            ]
        );

        const result = rows[0];
        return {
            success: result?.success ?? false,
            source: result?.source,       // 'package' | 'payg' | 'insufficient_balance'
            balanceId: result?.balance_id,
            costCents: result?.cost_cents,
        };
    }

    /**
     * Lịch sử giao dịch
     */
    static async getTransactionHistory(userId: string, limit = 20, offset = 0) {
        return query(
            `SELECT * FROM transactions
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
    }

    /**
     * Lịch sử sử dụng
     */
    static async getUsageHistory(userId: string, limit = 20, offset = 0) {
        return query(
            `SELECT * FROM usage_logs
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
    }
}
