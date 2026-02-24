/**
 * OCR Service — Wrapper quanh OCR providers cũ,
 * tích hợp billing (trừ token trước khi xử lý)
 */

import { BillingService } from "../billing/billing.service";

export class OcrService {
    /**
     * Xử lý OCR có tích hợp billing
     *
     * Flow:
     *   1. Trừ token (input tokens = file size estimate)
     *   2. Gọi OCR provider
     *   3. Cập nhật output metadata
     */
    static async processWithBilling(params: {
        userId: string;
        imageBuffer: Buffer;
        fileName: string;
        mimeType: string;
        provider: "TESSERACT" | "GOOGLE_VISION";
        ip?: string;
        ua?: string;
    }) {
        const feature = params.provider === "TESSERACT" ? "ocr_basic" : "ocr_advanced";

        // Ước tính input tokens dựa trên file size (1 byte ≈ 1 token)
        const inputTokens = params.imageBuffer.length;

        // Trừ token trước
        const billing = await BillingService.consumeTokens({
            userId: params.userId,
            feature,
            inputTokens,
            outputTokens: 0, // Cập nhật sau khi có kết quả
            inputMeta: {
                file_name: params.fileName,
                file_size: params.imageBuffer.length,
                mime_type: params.mimeType,
            },
            ip: params.ip,
            ua: params.ua,
        });

        if (!billing.success) {
            throw new Error(
                billing.source === "insufficient_balance"
                    ? "Không đủ token. Vui lòng nạp thêm hoặc mua gói."
                    : "Lỗi trừ token"
            );
        }

        // TODO: Gọi OCR provider cũ (OCRManager)
        // const result = await OCRManager.process(params.imageBuffer, params.provider);

        return {
            billing,
            // result,
        };
    }
}
