/**
 * SePay Service — VietQR Bank Transfer via SePay
 *
 * Flow:
 *   1. Server tạo nội dung CK unique + QR URL từ qr.sepay.vn
 *   2. User quét QR → chuyển khoản qua app ngân hàng
 *   3. SePay webhook gọi server khi nhận được tiền
 *   4. Server match nội dung CK → cộng ví
 *
 * Docs: https://sepay.vn
 */

import dotenv from "dotenv";

dotenv.config();

const SEPAY_QR_BASE = "https://qr.sepay.vn/img";

export interface SepayQrData {
    qrUrl: string;
    content: string;      // Nội dung chuyển khoản (unique)
    amountVND: number;
    bankName: string;
    accountNumber: string;
}

export class SepayService {
    /**
     * Tạo paymentCode unique
     *
     * Format: OCR-{clientId}-{8_CHAR_RANDOM_UPPERCASE}
     * Ví dụ: OCR-550e8400-e29b-41d4-a716-446655440000-A7K3M9XB
     */
    static generatePaymentCode(clientId: string): string {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let random = "";
        for (let i = 0; i < 8; i++) {
            random += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `OCR-${clientId}-${random}`;
    }

    /**
     * Build QR URL từ qr.sepay.vn
     *
     * URL: https://qr.sepay.vn/img?acc=STK&bank=BANK&amount=X&des=PAYMENT_CODE
     * Lưu ý: des phải được encodeURIComponent
     *
     * @param amountVND    - Số tiền VND
     * @param paymentCode  - Mã thanh toán unique (dùng làm nội dung CK)
     * @returns QR image URL
     */
    static buildQrUrl(amountVND: number, paymentCode: string): string {
        const bankName = process.env.SEPAY_BANK_NAME || "MBBank";
        const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER || "";

        if (!accountNumber) {
            throw new Error("SEPAY_ACCOUNT_NUMBER chưa được cấu hình");
        }

        return `${SEPAY_QR_BASE}?acc=${accountNumber}&bank=${bankName}&amount=${amountVND}&des=${encodeURIComponent(paymentCode)}`;
    }

    /**
     * Tạo dữ liệu QR cho giao dịch SePay
     *
     * @param clientId  - User ID (UUID)
     * @param amountVND - Số tiền VND
     * @returns Object chứa qrUrl, paymentCode, bank info
     */
    static createQrData(clientId: string, amountVND: number): SepayQrData {
        const paymentCode = SepayService.generatePaymentCode(clientId);
        const qrUrl = SepayService.buildQrUrl(amountVND, paymentCode);

        return {
            qrUrl,
            content: paymentCode,
            amountVND,
            bankName: process.env.SEPAY_BANK_NAME || "MBBank",
            accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || "",
        };
    }

    /**
     * Verify webhook từ SePay
     *
     * SePay gửi header X-Secret-Key kèm mỗi webhook request.
     * So sánh với SEPAY_WEBHOOK_SECRET trong env.
     *
     * @param headerSecretKey - Giá trị X-Secret-Key từ request header
     * @returns true nếu hợp lệ
     */
    static verifyWebhook(headerSecretKey: string | undefined): boolean {
        const secret = process.env.SEPAY_WEBHOOK_SECRET;
        if (!secret) {
            console.error("[SepayService] SEPAY_WEBHOOK_SECRET chưa được cấu hình");
            return false;
        }

        if (!headerSecretKey) {
            return false;
        }

        return headerSecretKey === secret;
    }
}
