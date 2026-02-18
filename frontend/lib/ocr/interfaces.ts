/**
 * Kết quả trả về từ OCR Provider.
 */
export interface OCRResult {
    /** Văn bản đã nhận diện được */
    text: string;
    /** Điểm tự tin (0-100) */
    confidence: number;
    /** Thời gian xử lý (ms) */
    processingTimeMs: number;
}

/**
 * Interface chuẩn cho mọi OCR Provider.
 */
export interface IOCRProvider {
    /**
     * Nhận diện văn bản từ file ảnh.
     * @param imagePath - Đường dẫn tuyệt đối tới file ảnh.
     */
    recognize(imagePath: string): Promise<OCRResult>;

    /**
     * Trả về tên của Provider.
     */
    getProviderName(): string;
}

/**
 * Response chuẩn từ OCR API.
 */
export interface OCRAPIResponse {
    success: boolean;
    data?: OCRResult & {
        provider: string;
        /** AI post-processing fields */
        cleanedText?: string;
        corrections?: Array<{
            original: string;
            corrected: string;
            reason: string;
        }>;
        structured?: Record<string, unknown>;
        aiProcessingTimeMs?: number;
        aiProcessor?: string;
    };
    error?: string;
}
