/**
 * Payment Controller — Xử lý HTTP cho deposit + webhooks
 *
 * Endpoints:
 *   POST /payment/deposit                    — Tạo giao dịch nạp tiền
 *   POST /payment/webhook/payos              — Webhook callback từ PayOS
 *   POST /payment/webhook/lemon-squeezy      — Webhook callback từ Lemon Squeezy
 *   POST /payment/webhook/sepay              — Webhook callback từ SePay
 *   GET  /payment/status/:id                 — Kiểm tra trạng thái giao dịch
 */

import { Request, Response } from "express";
import { query, pool } from "../../config/db";
import { PayOSService } from "../../services/payos.service";
import { LemonService } from "../../services/lemon.service";
import { SepayService } from "../../services/sepay.service";

type Provider = "PAYOS" | "LEMON_SQUEEZY" | "SEPAY";

/** Helper: get or create currency_id by code */
async function getCurrencyId(client: any, code: string): Promise<string> {
    const { rows } = await client.query(
        `SELECT id FROM currencies WHERE code = $1`, [code]
    );
    if (!rows[0]) throw new Error(`Currency ${code} not found`);
    return rows[0].id;
}

export class PaymentController {
    /**
     * POST /payment/deposit
     *
     * Body: { amount: number, provider: "PAYOS" | "LEMON_SQUEEZY" }
     *   - PAYOS:         amount = VND (nguyên)
     *   - LEMON_SQUEEZY: amount = USD cents (VD: 1000 = $10)
     */
    static async deposit(req: Request, res: Response) {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ success: false, error: "Unauthorized" });
            }

            const { amount, provider } = req.body as { amount: number; provider: Provider };

            // ─── Validate ────────────────────────────────────────
            if (!amount || !provider) {
                return res.status(400).json({
                    success: false,
                    error: "amount và provider là bắt buộc",
                });
            }

            if (!["PAYOS", "LEMON_SQUEEZY", "SEPAY"].includes(provider)) {
                return res.status(400).json({
                    success: false,
                    error: "provider phải là PAYOS, LEMON_SQUEEZY hoặc SEPAY",
                });
            }

            if (typeof amount !== "number" || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: "amount phải là số dương",
                });
            }

            // ─── PayOS (VND) ─────────────────────────────────────
            if (provider === "PAYOS") {
                if (amount < 2000) {
                    return res.status(400).json({
                        success: false,
                        error: "PayOS yêu cầu tối thiểu 2,000 VND",
                    });
                }

                // Tạo payment link
                const { checkoutUrl, orderCode } = await PayOSService.createPaymentLink(
                    userId, amount, "Nap tien OCR"
                );

                // Lưu transaction
                const [txn] = await query(
                    `INSERT INTO transactions
                        (user_id, type, status, amount_cents, currency, payment_method,
                         provider, order_code, payment_url, description, ip_address)
                     VALUES ($1, 'deposit', 'pending', $2, 'VND', 'payos',
                             'PAYOS', $3, $4, $5, $6)
                     RETURNING id, order_code, status, created_at`,
                    [
                        userId,
                        amount, // VND nguyên
                        orderCode,
                        checkoutUrl,
                        `Nạp ${amount.toLocaleString("vi-VN")} VND qua PayOS`,
                        req.ip || null,
                    ]
                );

                return res.json({
                    success: true,
                    data: {
                        transactionId: txn.id,
                        checkoutUrl,
                        orderCode,
                        provider: "PAYOS",
                    },
                });
            }

            // ─── Lemon Squeezy (USD) ─────────────────────────────
            if (provider === "LEMON_SQUEEZY") {
                const userEmail = req.userEmail || undefined;

                // Tạo checkout
                const { checkoutUrl, lemonCheckoutId } = await LemonService.createCheckout(
                    userId, amount, userEmail
                );

                // Lưu transaction
                const [txn] = await query(
                    `INSERT INTO transactions
                        (user_id, type, status, amount_cents, currency, payment_method,
                         provider, provider_txn_id, payment_url, description, ip_address)
                     VALUES ($1, 'deposit', 'pending', $2, 'USD', 'lemon_squeezy',
                             'LEMON_SQUEEZY', $3, $4, $5, $6)
                     RETURNING id, provider_txn_id, status, created_at`,
                    [
                        userId,
                        amount,
                        lemonCheckoutId,
                        checkoutUrl,
                        `Nạp $${(amount / 100).toFixed(2)} USD qua Lemon Squeezy`,
                        req.ip || null,
                    ]
                );

                return res.json({
                    success: true,
                    data: {
                        transactionId: txn.id,
                        checkoutUrl,
                        provider: "LEMON_SQUEEZY",
                    },
                });
            }

            // ─── SePay (VND — VietQR inline) ─────────────────────
            if (provider === "SEPAY") {
                if (amount < 2000) {
                    return res.status(400).json({
                        success: false,
                        error: "Số tiền tối thiểu là 2,000 VND",
                    });
                }

                // Tạo QR data (paymentCode = OCR-{clientId}-{8CHAR})
                const qrData = SepayService.createQrData(userId, amount);

                // Lưu transaction — paymentCode làm provider_txn_id để webhook match
                const [txn] = await query(
                    `INSERT INTO transactions
                        (user_id, type, status, amount_cents, currency, payment_method,
                         provider, provider_txn_id, payment_url, description, ip_address)
                     VALUES ($1, 'deposit', 'pending', $2, 'VND', 'sepay',
                             'SEPAY', $3, $4, $5, $6)
                     RETURNING id, provider_txn_id, status, created_at`,
                    [
                        userId,
                        amount, // VND nguyên
                        qrData.content, // paymentCode → provider_txn_id
                        qrData.qrUrl,
                        `Nạp ${amount.toLocaleString("vi-VN")} VND qua SePay`,
                        req.ip || null,
                    ]
                );

                return res.json({
                    success: true,
                    data: {
                        transactionId: txn.id,
                        provider: "SEPAY",
                        paymentCode: qrData.content,
                        qrUrl: qrData.qrUrl,
                        amountVND: qrData.amountVND,
                        bankName: qrData.bankName,
                        accountNumber: qrData.accountNumber,
                    },
                });
            }
        } catch (error: any) {
            console.error("[PaymentController] deposit error:", error);
            return res.status(500).json({
                success: false,
                error: error.message || "Lỗi tạo giao dịch",
            });
        }
    }

    /**
     * POST /payment/webhook/payos
     *
     * PayOS gửi webhook khi giao dịch thành công/thất bại.
     * Verify bằng SDK checksum, sau đó cập nhật DB + wallet.
     */
    static async webhookPayOS(req: Request, res: Response) {
        try {
            // 1. Verify webhook signature
            let verifiedData: any;
            try {
                verifiedData = await PayOSService.verifyWebhookData(req.body);
            } catch (err) {
                console.error("[Webhook/PayOS] Verification failed:", err);
                return res.status(400).json({ success: false, error: "Invalid signature" });
            }

            const orderCode = verifiedData.orderCode;
            // PayOS webhook "code" field: "00" = success
            const code = verifiedData.code || req.body?.code;

            if (!orderCode) {
                return res.status(400).json({ success: false, error: "Missing orderCode" });
            }

            // 2. Lookup transaction
            const [txn] = await query(
                `SELECT id, user_id, amount_cents, status FROM transactions WHERE order_code = $1`,
                [orderCode]
            );

            if (!txn) {
                console.warn("[Webhook/PayOS] Transaction not found for orderCode:", orderCode);
                return res.status(404).json({ success: false, error: "Transaction not found" });
            }

            // 3. Đã xử lý rồi thì skip
            if (txn.status === "paid" || txn.status === "success") {
                return res.json({ success: true, message: "Already processed" });
            }

            // 4. PayOS code "00" = thành công
            if (code === "00") {
                // Atomic: update transaction + cộng wallet
                const client = await pool.connect();
                try {
                    await client.query("BEGIN");

                    await client.query(
                        `UPDATE transactions
                         SET status = 'paid', completed_at = NOW(), updated_at = NOW(),
                             gateway_response = $2
                         WHERE id = $1`,
                        [txn.id, JSON.stringify(verifiedData)]
                    );

                    // Get VND currency_id
                    const currencyId = await getCurrencyId(client, 'VND');

                    await client.query(
                        `INSERT INTO wallets (user_id, currency_id, balance, total_deposited)
                         VALUES ($1, $3, $2, $2)
                         ON CONFLICT ON CONSTRAINT uq_wallets_user_currency DO UPDATE SET
                             balance = wallets.balance + $2,
                             total_deposited = wallets.total_deposited + $2,
                             updated_at = NOW()`,
                        [txn.user_id, txn.amount_cents, currencyId]
                    );

                    await client.query("COMMIT");
                    console.log(`[Webhook/PayOS] ✅ Paid: txn=${txn.id}, amount=${txn.amount_cents} VND`);
                } catch (dbErr) {
                    await client.query("ROLLBACK");
                    throw dbErr;
                } finally {
                    client.release();
                }
            } else {
                // Thất bại hoặc cancelled
                await query(
                    `UPDATE transactions
                     SET status = 'failed', updated_at = NOW(),
                         gateway_response = $2
                     WHERE id = $1`,
                    [txn.id, JSON.stringify(verifiedData)]
                );
                console.log(`[Webhook/PayOS] ❌ Failed: txn=${txn.id}, code=${code}`);
            }

            return res.json({ success: true });
        } catch (error: any) {
            console.error("[Webhook/PayOS] Error:", error);
            return res.status(500).json({ success: false, error: "Webhook processing failed" });
        }
    }

    /**
     * POST /payment/webhook/lemon-squeezy
     *
     * Lemon Squeezy gửi webhook với X-Signature header.
     * Verify HMAC-SHA256, parse event, cập nhật DB + wallet.
     */
    static async webhookLemonSqueezy(req: Request, res: Response) {
        try {
            // 1. Verify HMAC signature
            const signature = req.headers["x-signature"] as string;
            const rawBody = (req as any).rawBody;

            if (!signature || !rawBody) {
                return res.status(400).json({ success: false, error: "Missing signature or body" });
            }

            const isValid = LemonService.verifyWebhook(rawBody, signature);
            if (!isValid) {
                console.error("[Webhook/Lemon] Invalid signature");
                return res.status(401).json({ success: false, error: "Invalid signature" });
            }

            // 2. Parse event
            const { eventName, orderId, userId, status } = LemonService.parseWebhookEvent(req.body);

            console.log(`[Webhook/Lemon] Event: ${eventName}, orderId: ${orderId}, userId: ${userId}`);

            // Chỉ xử lý khi order_created hoặc order_paid
            if (eventName !== "order_created" && eventName !== "order_paid") {
                return res.json({ success: true, message: `Ignored event: ${eventName}` });
            }

            // Chỉ cộng tiền khi status = "paid"
            if (status !== "paid") {
                return res.json({ success: true, message: `Order status: ${status}, skipped` });
            }

            if (!userId || !orderId) {
                console.error("[Webhook/Lemon] Missing userId or orderId");
                return res.status(400).json({ success: false, error: "Missing userId or orderId" });
            }

            // 3. Lookup transaction bằng provider_txn_id hoặc tạo mới nếu chưa có
            let [txn] = await query(
                `SELECT id, user_id, amount_cents, status FROM transactions
                 WHERE provider_txn_id = $1 AND provider = 'LEMON_SQUEEZY'`,
                [orderId]
            );

            // Nếu chưa có transaction (webhook đến trước deposit response)
            if (!txn) {
                // Lấy amount từ webhook data
                const amountCents = Math.round(
                    (req.body?.data?.attributes?.total || 0) * 100
                );

                const [newTxn] = await query(
                    `INSERT INTO transactions
                        (user_id, type, status, amount_cents, currency, payment_method,
                         provider, provider_txn_id, description)
                     VALUES ($1, 'deposit', 'pending', $2, 'USD', 'lemon_squeezy',
                             'LEMON_SQUEEZY', $3, $4)
                     RETURNING id, user_id, amount_cents, status`,
                    [
                        userId,
                        amountCents,
                        orderId,
                        `Nạp $${(amountCents / 100).toFixed(2)} USD qua Lemon Squeezy (webhook)`,
                    ]
                );
                txn = newTxn;
            }

            // 4. Đã xử lý rồi thì skip
            if (txn.status === "paid" || txn.status === "success") {
                return res.json({ success: true, message: "Already processed" });
            }

            // 5. Atomic: update transaction + cộng wallet
            const client = await pool.connect();
            try {
                await client.query("BEGIN");

                await client.query(
                    `UPDATE transactions
                     SET status = 'paid', completed_at = NOW(), updated_at = NOW(),
                         gateway_response = $2
                     WHERE id = $1`,
                    [txn.id, JSON.stringify(req.body)]
                );

                // Get USD currency_id
                const currencyId = await getCurrencyId(client, 'USD');

                await client.query(
                    `INSERT INTO wallets (user_id, currency_id, balance, total_deposited)
                     VALUES ($1, $3, $2, $2)
                     ON CONFLICT ON CONSTRAINT uq_wallets_user_currency DO UPDATE SET
                         balance = wallets.balance + $2,
                         total_deposited = wallets.total_deposited + $2,
                         updated_at = NOW()`,
                    [txn.user_id, txn.amount_cents, currencyId]
                );

                await client.query("COMMIT");
                console.log(`[Webhook/Lemon] ✅ Paid: txn=${txn.id}, amount=${txn.amount_cents} cents`);
            } catch (dbErr) {
                await client.query("ROLLBACK");
                throw dbErr;
            } finally {
                client.release();
            }

            return res.json({ success: true });
        } catch (error: any) {
            console.error("[Webhook/Lemon] Error:", error);
            return res.status(500).json({ success: false, error: "Webhook processing failed" });
        }
    }

    /**
     * POST /payment/webhook/sepay
     *
     * SePay gửi webhook khi có biến động số dư TK ngân hàng.
     *
     * Auth: Authorization: Bearer ${SEPAY_WEBHOOK_KEY}
     *
     * Flow:
     *   1. Verify Bearer token
     *   2. Log toàn bộ payload vào webhook_logs
     *   3. Regex parse content → tìm paymentCode OCR-{clientId}-{8CHAR}
     *   4. Match transaction pending + validate amount
     *   5. Atomic: update status → SUCCESS + cộng wallet
     *   6. Trả 200 để SePay dừng retry
     */
    static async webhookSePay(req: Request, res: Response) {
        let logId: string | null = null;

        try {
            // ─── 1. Verify Authorization header ──────────────────
            //    SePay gửi API Key trong header Authorization.
            //    Chấp nhận: "Bearer <key>", "Apikey <key>", hoặc raw "<key>"
            const authHeader = req.headers["authorization"] as string | undefined;
            const expectedKey = process.env.SEPAY_WEBHOOK_KEY;

            if (!expectedKey) {
                console.error("[Webhook/SePay] SEPAY_WEBHOOK_KEY chưa cấu hình trong .env");
                return res.status(500).json({ success: false, error: "Server misconfigured" });
            }

            // Trích xuất key từ header (bỏ prefix Bearer/Apikey nếu có)
            const receivedKey = authHeader
                ? authHeader.replace(/^(Bearer|Apikey)\s+/i, "").trim()
                : "";

            if (!receivedKey || receivedKey !== expectedKey) {
                console.error(`[Webhook/SePay] Unauthorized — received key: "${receivedKey?.substring(0, 4)}..."`);
                await query(
                    `INSERT INTO webhook_logs (provider, event_type, payload, status, ip_address)
                     VALUES ('sepay', 'unauthorized', $1, 'rejected', $2)`,
                    [JSON.stringify(req.body), req.ip || null]
                );
                return res.status(401).json({ success: false, error: "Unauthorized" });
            }

            // ─── 2. Destructure payload ───────────────────────────
            const {
                id: sepayId,
                gateway,
                transactionDate,
                accountNumber,
                code,
                content,
                transferType,
                transferAmount,
                accumulated,
                subAccount,
                referenceCode,
                description,
            } = req.body;

            // ─── 3. Log toàn bộ webhook vào DB ───────────────────
            const [log] = await query(
                `INSERT INTO webhook_logs (provider, event_type, payload, status, ip_address)
                 VALUES ('sepay', $1, $2, 'received', $3)
                 RETURNING id`,
                [transferType || "unknown", JSON.stringify(req.body), req.ip || null]
            );
            logId = log?.id || null;

            console.log(
                `[Webhook/SePay] Received: sepay_id=${sepayId}, gateway=${gateway}, ` +
                `amount=${transferAmount}, type=${transferType}, content="${content}", ref=${referenceCode}`
            );

            // ─── 4. Chỉ xử lý giao dịch tiền VÀO ────────────────
            if (transferType !== "in") {
                await query(`UPDATE webhook_logs SET status = 'ignored' WHERE id = $1`, [logId]);
                return res.json({ success: true });
            }

            if (!content || !transferAmount) {
                await query(`UPDATE webhook_logs SET status = 'invalid' WHERE id = $1`, [logId]);
                return res.json({ success: true });
            }

            // ─── 5. Match paymentCode từ content ──────────────────
            //    Ngân hàng STRIP hết dấu gạch ngang (-) khỏi nội dung CK.
            //    VD: "OCR-441bdd73-...-A7K3M9XB" → "OCR441bdd73...A7K3M9XB"
            //    Nên cần normalize cả 2 bên khi so sánh.
            const normalizedContent = content.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

            // Kiểm tra content có bắt đầu bằng "OCR" không
            if (!normalizedContent.startsWith("OCR")) {
                console.warn(`[Webhook/SePay] Content không bắt đầu bằng OCR: "${content}"`);
                await query(`UPDATE webhook_logs SET status = 'no_match' WHERE id = $1`, [logId]);
                return res.json({ success: true });
            }

            console.log(`[Webhook/SePay] Normalized content: ${normalizedContent}`);

            // ─── 6. Tìm transaction pending bằng normalized match ─
            //    So sánh provider_txn_id (đã strip dashes) với content (đã strip)
            const [txn] = await query(
                `SELECT id, user_id, amount_cents, status FROM transactions
                 WHERE UPPER(REPLACE(provider_txn_id, '-', '')) = $1
                   AND provider = 'SEPAY' AND status = 'pending'`,
                [normalizedContent]
            );

            if (!txn) {
                console.warn(`[Webhook/SePay] No pending transaction for normalized: ${normalizedContent}`);
                await query(`UPDATE webhook_logs SET status = 'no_match' WHERE id = $1`, [logId]);
                return res.json({ success: true });
            }

            // ─── 7. Đã xử lý rồi thì skip ───────────────────────
            if (txn.status === "success" || txn.status === "paid") {
                await query(
                    `UPDATE webhook_logs SET status = 'duplicate', matched_txn_id = $2 WHERE id = $1`,
                    [logId, txn.id]
                );
                return res.json({ success: true });
            }

            // ─── 8. Validate amount ──────────────────────────────
            const expectedAmount = Number(txn.amount_cents);
            const receivedAmount = Number(transferAmount);

            if (expectedAmount !== receivedAmount) {
                console.warn(
                    `[Webhook/SePay] Amount mismatch: expected=${expectedAmount}, received=${receivedAmount}`
                );
                await query(
                    `UPDATE webhook_logs SET status = 'amount_mismatch', matched_txn_id = $2 WHERE id = $1`,
                    [logId, txn.id]
                );
                // Vẫn trả 200 để SePay không retry, nhưng KHÔNG cộng ví
                return res.json({ success: true });
            }

            // ─── 9. Atomic: update transaction → SUCCESS + cộng wallet ──
            const client = await pool.connect();
            try {
                await client.query("BEGIN");

                // Update transaction status → success
                await client.query(
                    `UPDATE transactions
                     SET status = 'success', completed_at = NOW(), updated_at = NOW(),
                         gateway_txn_id = $2, gateway_response = $3
                     WHERE id = $1`,
                    [txn.id, String(sepayId || referenceCode || ""), JSON.stringify(req.body)]
                );

                // Cộng wallet cho user (dùng clientId từ paymentCode hoặc user_id trong txn)
                // Get VND currency_id
                const currencyId = await getCurrencyId(client, 'VND');

                await client.query(
                    `INSERT INTO wallets (user_id, currency_id, balance, total_deposited)
                     VALUES ($1, $3, $2, $2)
                     ON CONFLICT ON CONSTRAINT uq_wallets_user_currency DO UPDATE SET
                         balance = wallets.balance + $2,
                         total_deposited = wallets.total_deposited + $2,
                         updated_at = NOW()`,
                    [txn.user_id, receivedAmount, currencyId]
                );

                // Update webhook log
                if (logId) {
                    await client.query(
                        `UPDATE webhook_logs SET status = 'processed', matched_txn_id = $2 WHERE id = $1`,
                        [logId, txn.id]
                    );
                }

                await client.query("COMMIT");
                console.log(
                    `[Webhook/SePay] ✅ SUCCESS: txn=${txn.id}, amount=${receivedAmount} VND, ` +
                    `user=${txn.user_id}, sepay_id=${sepayId}`
                );
            } catch (dbErr) {
                await client.query("ROLLBACK");
                throw dbErr;
            } finally {
                client.release();
            }

            return res.json({ success: true });
        } catch (error: any) {
            console.error("[Webhook/SePay] Error:", error);
            if (logId) {
                await query(`UPDATE webhook_logs SET status = 'error' WHERE id = $1`, [logId]).catch(() => { });
            }
            return res.status(500).json({ success: false, error: "Webhook processing failed" });
        }
    }

    /**
     * GET /payment/status/:id
     *
     * Frontend polling endpoint — trả về trạng thái transaction.
     * Dùng cho SePay flow (QR inline, không redirect).
     */
    static async getTransactionStatus(req: Request, res: Response) {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ success: false, error: "Unauthorized" });
            }

            const txnId = req.params.id;
            if (!txnId) {
                return res.status(400).json({ success: false, error: "Missing transaction ID" });
            }

            const [txn] = await query(
                `SELECT id, status, amount_cents, currency, provider, completed_at
                 FROM transactions
                 WHERE id = $1 AND user_id = $2`,
                [txnId, userId]
            );

            if (!txn) {
                return res.status(404).json({ success: false, error: "Transaction not found" });
            }

            return res.json({
                success: true,
                data: {
                    id: txn.id,
                    status: txn.status,
                    amountCents: txn.amount_cents,
                    currency: txn.currency,
                    provider: txn.provider,
                    completedAt: txn.completed_at,
                },
            });
        } catch (error: any) {
            console.error("[PaymentController] getTransactionStatus error:", error);
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    }
}
