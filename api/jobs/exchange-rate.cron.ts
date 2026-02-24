/**
 * Exchange Rate Cron Job
 *
 * Chạy syncAllExchangeRates mỗi 10 phút để cập nhật
 * toàn bộ tỉ giá từ ExchangeRate-API vào DB.
 */
import cron from "node-cron";
import { syncAllExchangeRates } from "../services/exchange-rate.service";

/**
 * Đăng ký cron job cập nhật tỉ giá.
 * Gọi hàm này trong bootstrap() khi server khởi động.
 */
export function registerExchangeRateCron(): void {
    // Chạy ngay lập tức khi server start
    console.log("[Cron] Đang sync tỉ giá lần đầu...");
    syncAllExchangeRates().catch((err) =>
        console.error("[Cron] Lỗi sync tỉ giá ban đầu:", err.message)
    );

    // Chạy mỗi 30 phút: */30 * * * *
    cron.schedule("*/30 * * * *", async () => {
        try {
            await syncAllExchangeRates();
        } catch (err: any) {
            console.error("[Cron] Lỗi cập nhật tỉ giá:", err.message);
        }
    });

    console.log("[Cron] ✅ Exchange rate sync job registered (every 10 minutes)");
}
