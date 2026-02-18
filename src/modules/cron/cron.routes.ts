/**
 * Cron Routes
 *
 * API endpoints cho external cron services (Vercel Cron, Cron-job.org, etc.)
 * Bảo mật bằng Authorization: Bearer ${CRON_SECRET}
 */
import { Router, Request, Response } from "express";
import { syncAllExchangeRates } from "../../services/exchange-rate.service";

const router = Router();

/**
 * POST /api/cron/sync-rates
 *
 * Gọi bởi external cron service để sync tỉ giá.
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
router.all("/sync-rates", async (req: Request, res: Response) => {
    try {
        // ─── 1. Verify CRON_SECRET ────────────────────────
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
            console.error("[Cron/sync-rates] CRON_SECRET chưa cấu hình trong .env");
            return res.status(500).json({ success: false, error: "Server misconfigured" });
        }

        const authHeader = req.headers["authorization"] as string | undefined;
        const receivedKey = authHeader
            ? authHeader.replace(/^Bearer\s+/i, "").trim()
            : "";

        if (!receivedKey || receivedKey !== cronSecret) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        // ─── 2. Sync exchange rates ──────────────────────
        const count = await syncAllExchangeRates();

        return res.json({
            success: true,
            data: {
                updated: count,
                message: `Cập nhật thành công ${count} loại tiền tệ`,
                syncedAt: new Date().toISOString(),
            },
        });
    } catch (err: any) {
        console.error("[Cron/sync-rates] Error:", err.message);
        return res.status(500).json({
            success: false,
            error: err.message || "Sync failed",
        });
    }
});

export default router;
