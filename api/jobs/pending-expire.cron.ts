/**
 * Pending Expire Cron Job
 *
 * Quét các transaction pending quá hạn và chuyển sang expired.
 * Env:
 *   PENDING_EXPIRE_SCAN_MINUTES — interval quét (mặc định 5 phút)
 *   PENDING_EXPIRE_TTL_MINUTES  — thời gian tối đa pending (mặc định 15 phút)
 */
import cron from "node-cron";
import { query } from "../config/db";

export function registerPendingExpireCron(): void {
    const scanMinutes = parseInt(process.env.PENDING_EXPIRE_SCAN_MINUTES || "5", 10);
    const ttlMinutes = parseInt(process.env.PENDING_EXPIRE_TTL_MINUTES || "15", 10);

    // Cron expression: mỗi N phút
    const cronExpression = `*/${scanMinutes} * * * *`;
    cron.schedule(cronExpression, async () => {
        try {
            const result = await query(
                `UPDATE transactions
                 SET status = 'expired', updated_at = NOW()
                 WHERE status = 'pending'
                   AND created_at < NOW() - INTERVAL '${ttlMinutes} minutes'
                 RETURNING id`
            );
            if (result.length > 0) {
                console.log(`[Cron] ⏰ Expired ${result.length} pending transaction(s)`);
            }
        } catch (err: any) {
            console.error("[Cron] Lỗi expire pending:", err.message);
        }
    });

    console.log(`[Cron] ✅ Pending expire job registered (scan every ${scanMinutes}min, TTL ${ttlMinutes}min)`);
}
