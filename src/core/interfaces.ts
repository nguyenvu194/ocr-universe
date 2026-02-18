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
     * @returns Promise chứa kết quả OCR.
     */
    recognize(imagePath: string): Promise<OCRResult>;

    /**
     * Trả về tên của Provider.
     */
    getProviderName(): string;
}
