/**
 * Billing Routes — Định nghĩa routes cho module Billing
 *
 * Routes (all protected by authMiddleware):
 *   GET  /api/billing/wallet       — Thông tin ví & token
 *   GET  /api/billing/packages     — Danh sách gói token
 *   GET  /api/billing/transactions — Lịch sử giao dịch
 *   GET  /api/billing/usage        — Lịch sử sử dụng
 */

import { Router } from "express";
import { BillingController } from "./billing.controller";

const router = Router();

router.get("/wallet", BillingController.getWallet);
router.get("/packages", BillingController.getPackages);
router.get("/transactions", BillingController.getTransactions);
router.get("/usage", BillingController.getUsageHistory);

export default router;
