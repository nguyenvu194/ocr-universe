/**
 * Lemon Squeezy Service — Tạo checkout URL & verify webhook
 *
 * API: REST (JSON:API format)
 * Docs: https://docs.lemonsqueezy.com/api
 *
 * Webhook verification: HMAC-SHA256(secret, rawBody) === X-Signature
 */

import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const LEMON_API_BASE = "https://api.lemonsqueezy.com/v1";

export interface LemonCheckoutResult {
    checkoutUrl: string;
    lemonCheckoutId: string;
}

export class LemonService {
    /**
     * Tạo checkout session trên Lemon Squeezy
     *
     * @param userId    - UUID user (lưu trong custom_data để webhook tracking)
     * @param amountUSD - Số tiền USD (cents), VD: 1000 = $10.00
     * @param userEmail - Email user để pre-fill checkout
     */
    static async createCheckout(
        userId: string,
        amountUSD: number,
        userEmail?: string
    ): Promise<LemonCheckoutResult> {
        const storeId = process.env.LEMON_STORE_ID;
        const variantId = process.env.LEMON_VARIANT_ID;
        const apiKey = process.env.LEMON_API_KEY;

        if (!storeId || !variantId || !apiKey) {
            throw new Error("Lemon Squeezy credentials chưa được cấu hình");
        }

        // JSON:API request body
        const body = {
            data: {
                type: "checkouts",
                attributes: {
                    checkout_data: {
                        custom: {
                            user_id: userId,
                        },
                        ...(userEmail && { email: userEmail }),
                    },
                    checkout_options: {
                        embed: false,
                        media: true,
                        logo: true,
                    },
                    product_options: {
                        enabled_variants: [parseInt(variantId)],
                        redirect_url: process.env.PAYMENT_RETURN_URL || "http://localhost:3001/account/billing?payment=success",
                    },
                },
                relationships: {
                    store: {
                        data: {
                            type: "stores",
                            id: storeId,
                        },
                    },
                    variant: {
                        data: {
                            type: "variants",
                            id: variantId,
                        },
                    },
                },
            },
        };

        const response = await fetch(`${LEMON_API_BASE}/checkouts`, {
            method: "POST",
            headers: {
                Accept: "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[LemonService] Checkout failed:", response.status, errorText);
            throw new Error(`Lemon Squeezy API error: ${response.status}`);
        }

        const result = await response.json();
        const checkoutUrl = result.data?.attributes?.url;
        const lemonCheckoutId = result.data?.id;

        if (!checkoutUrl) {
            throw new Error("Lemon Squeezy không trả về checkout URL");
        }

        return { checkoutUrl, lemonCheckoutId };
    }

    /**
     * Xác thực webhook signature từ Lemon Squeezy
     *
     * Lemon Squeezy ký webhook bằng HMAC-SHA256:
     *   hash = HMAC-SHA256(webhookSecret, rawBody)
     *   header: X-Signature = hex(hash)
     *
     * @param rawBody   - Raw request body (Buffer/string)
     * @param signature - Giá trị header X-Signature
     * @returns true nếu signature hợp lệ
     */
    static verifyWebhook(rawBody: string | Buffer, signature: string): boolean {
        const secret = process.env.LEMON_WEBHOOK_SECRET;
        if (!secret) {
            console.error("[LemonService] LEMON_WEBHOOK_SECRET chưa được cấu hình");
            return false;
        }

        const hmac = crypto
            .createHmac("sha256", secret)
            .update(rawBody)
            .digest("hex");

        return crypto.timingSafeEqual(
            Buffer.from(hmac, "hex"),
            Buffer.from(signature, "hex")
        );
    }

    /**
     * Parse Lemon Squeezy webhook event
     *
     * @param body - Parsed JSON body
     * @returns { eventName, orderId, userId, status }
     */
    static parseWebhookEvent(body: any): {
        eventName: string;
        orderId: string | null;
        userId: string | null;
        status: string | null;
    } {
        const eventName = body?.meta?.event_name || "";
        const orderId = body?.data?.id || null;
        const userId = body?.meta?.custom_data?.user_id || null;
        const status = body?.data?.attributes?.status || null;

        return { eventName, orderId, userId, status };
    }
}
