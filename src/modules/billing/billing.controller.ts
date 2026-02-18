/**
 * Billing Controller — Xử lý HTTP requests cho billing routes
 *
 * Routes:
 *   GET  /api/billing/wallet          — Lấy thông tin ví & token
 *   GET  /api/billing/packages        — Danh sách gói token
 *   POST /api/billing/deposit         — Tạo giao dịch nạp tiền
 *   POST /api/billing/purchase        — Mua gói token
 *   POST /api/billing/webhook/:method — Payment gateway callback
 *   GET  /api/billing/transactions    — Lịch sử giao dịch
 *   GET  /api/billing/usage           — Lịch sử sử dụng
 */

import { Request, Response } from "express";
import { BillingService } from "./billing.service";

export class BillingController {
    /**
     * GET /api/billing/wallet
     */
    static async getWallet(req: Request, res: Response) {
        try {
            const userId = (req as any).userId; // Set by auth middleware
            const data = await BillingService.getWalletInfo(userId);

            return res.json({ success: true, data });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Lỗi server" });
        }
    }

    /**
     * GET /api/billing/packages
     */
    static async getPackages(_req: Request, res: Response) {
        try {
            const packages = await BillingService.getPackages();
            return res.json({ success: true, data: packages });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Lỗi server" });
        }
    }

    /**
     * POST /api/billing/deposit
     */
    static async createDeposit(req: Request, res: Response) {
        try {
            const userId = (req as any).userId;
            const { amountCents, paymentMethod } = req.body;

            if (!amountCents || !paymentMethod) {
                return res.status(400).json({
                    success: false,
                    error: "amountCents và paymentMethod là bắt buộc",
                });
            }

            const txn = await BillingService.createDeposit(
                userId, amountCents, paymentMethod, req.ip
            );

            // TODO: Redirect to payment gateway
            return res.json({ success: true, data: { transaction: txn } });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Lỗi server" });
        }
    }

    /**
     * POST /api/billing/purchase
     */
    static async purchasePackage(req: Request, res: Response) {
        try {
            const userId = (req as any).userId;
            const { packageSlug, paymentMethod, promoCode } = req.body;

            const txn = await BillingService.createPackagePurchase(
                userId, packageSlug, paymentMethod, promoCode, req.ip
            );

            return res.json({ success: true, data: { transaction: txn } });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                error: error.message || "Lỗi mua gói",
            });
        }
    }

    /**
     * POST /api/billing/webhook/:method — Payment gateway callback
     */
    static async handleWebhook(req: Request, res: Response) {
        try {
            const { transactionId } = req.body;
            // TODO: Verify webhook signature from payment gateway

            const success = await BillingService.completeTransaction(transactionId);

            return res.json({ success });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Webhook processing failed" });
        }
    }

    /**
     * GET /api/billing/transactions
     */
    static async getTransactions(req: Request, res: Response) {
        try {
            const userId = (req as any).userId;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const transactions = await BillingService.getTransactionHistory(userId, limit, offset);
            return res.json({ success: true, data: transactions });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Lỗi server" });
        }
    }

    /**
     * GET /api/billing/usage
     */
    static async getUsageHistory(req: Request, res: Response) {
        try {
            const userId = (req as any).userId;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const usage = await BillingService.getUsageHistory(userId, limit, offset);
            return res.json({ success: true, data: usage });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Lỗi server" });
        }
    }
}
