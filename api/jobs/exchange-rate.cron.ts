/**
 * Exchange Rate Cron Job
 *
 * Chạy syncAllExchangeRates theo interval cấu hình từ .env
 * Env: CRON_INTERVAL_MINUTES (mặc định 120 phút = 2 giờ)
 */
import cron from "node-cron";
import { syncAllExchangeRates } from "../services/exchange-rate.service";

/**
 * Đăng ký cron job cập nhật tỉ giá.
 * Gọi hàm này trong bootstrap() khi server khởi động.
 */
export function registerExchangeRateCron(): void {
    const intervalMinutes = parseInt(process.env.CRON_INTERVAL_MINUTES || "120", 10);

    // Chạy ngay lập tức khi server start
    console.log("[Cron] Đang sync tỉ giá lần đầu...");
    syncAllExchangeRates().catch((err) =>
        console.error("[Cron] Lỗi sync tỉ giá ban đầu:", err.message)
    );

    // Cron expression: mỗi N phút
    const cronExpression = `*/${intervalMinutes} * * * *`;
    cron.schedule(cronExpression, async () => {
        try {
            await syncAllExchangeRates();
        } catch (err: any) {
            console.error("[Cron] Lỗi cập nhật tỉ giá:", err.message);
        }
    });

    console.log(`[Cron] ✅ Exchange rate sync job registered (every ${intervalMinutes} minutes)`);
}
