/**
 * PayOS Service — Tạo link thanh toán VietQR & verify webhook
 *
 * SDK: @payos/node (v2)
 * API: paymentRequests.create() + webhooks.verify()
 */

import { PayOS } from "@payos/node";
import dotenv from "dotenv";

dotenv.config();

// ─── Singleton PayOS Client ─────────────────────────────────
// SDK tự đọc từ env nếu không truyền explicit
const payos = new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID || "",
    apiKey: process.env.PAYOS_API_KEY || "",
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || "",
});

export interface PayOSPaymentResult {
    checkoutUrl: string;
    orderCode: number;
}

export class PayOSService {
    /**
     * Tạo link thanh toán PayOS (VietQR)
     *
     * @param userId      - UUID user
     * @param amountVND   - Số tiền VND (nguyên, ≥ 2000)
     * @param description - Mô tả giao dịch (max 25 ký tự cho PayOS)
     */
    static async createPaymentLink(
        userId: string,
        amountVND: number,
        description?: string
    ): Promise<PayOSPaymentResult> {
        // PayOS yêu cầu orderCode là số nguyên dương, unique
        const orderCode = PayOSService.generateOrderCode();

        const result = await payos.paymentRequests.create({
            orderCode,
            amount: amountVND,
            description: (description || "Nap tien OCR Universe").substring(0, 25),
            returnUrl: process.env.PAYMENT_RETURN_URL || `${process.env.SERVER_URL || "http://localhost"}:3001/account/billing?payment=success`,
            cancelUrl: process.env.PAYMENT_CANCEL_URL || `${process.env.SERVER_URL || "http://localhost"}:3001/account/billing?payment=cancelled`,
        });

        return {
            checkoutUrl: result.checkoutUrl,
            orderCode,
        };
    }

    /**
     * Xác thực webhook data từ PayOS
     *
     * PayOS gửi webhook body dạng:
     *   { code, desc, success, data: WebhookData, signature }
     *
     * SDK verify checksum và trả về WebhookData nếu hợp lệ.
     *
     * @param body - Raw webhook request body
     * @returns Verified WebhookData (orderCode, amount, code, ...)
     */
    static async verifyWebhookData(body: any): Promise<any> {
        return payos.webhooks.verify(body);
    }

    /**
     * Generate orderCode — 8 chữ số ngẫu nhiên
     * Range: 10_000_000 — 99_999_999
     */
    private static generateOrderCode(): number {
        return Math.floor(10_000_000 + Math.random() * 90_000_000);
    }
}
