/**
 * Payment Routes — Nạp tiền & Webhook
 *
 * Routes:
 *   POST /payment/deposit                 — Tạo giao dịch nạp tiền (Protected)
 *   GET  /payment/status/:id              — Kiểm tra trạng thái giao dịch (Protected)
 *   POST /payment/webhook/payos           — PayOS callback (Public)
 *   POST /payment/webhook/lemon-squeezy   — Lemon Squeezy callback (Public)
 *   POST /payment/webhook/sepay           — SePay callback (Public)
 */

import { Router, json, raw } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { PaymentController } from "./payment.controller";

const router = Router();

// ─── Protected: Tạo checkout ─────────────────────────────────
router.post("/deposit", json(), authMiddleware, PaymentController.deposit);

// ─── Protected: Kiểm tra trạng thái (polling) ───────────────
router.get("/status/:id", json(), authMiddleware, PaymentController.getTransactionStatus);

// ─── Public: Webhooks ────────────────────────────────────────
// PayOS webhook — JSON body, verified bằng SDK checksum
router.post("/webhook/payos", json(), PaymentController.webhookPayOS);

// Lemon Squeezy webhook — cần raw body cho HMAC verification
// Middleware lưu rawBody trước khi parse JSON
router.post(
    "/webhook/lemon-squeezy",
    raw({ type: "application/json" }),
    (req, _res, next) => {
        // Lưu raw body buffer để verify signature
        (req as any).rawBody = req.body;
        // Parse body thành JSON
        req.body = JSON.parse(req.body.toString());
        next();
    },
    PaymentController.webhookLemonSqueezy
);

// SePay webhook — JSON body, verified bằng X-Secret-Key header
router.post("/webhook/sepay", json(), PaymentController.webhookSePay);

export default router;
