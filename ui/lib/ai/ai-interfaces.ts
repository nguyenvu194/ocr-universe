/**
 * Kết quả sau khi AI xử lý text từ OCR.
 */
export interface AIProcessedResult {
    /** Văn bản đã được sửa lỗi */
    cleanedText: string;
    /** Danh sách các sửa đổi AI đã thực hiện */
    corrections: Array<{
        original: string;
        corrected: string;
        reason: string;
    }>;
    /** Dữ liệu có cấu trúc (nếu yêu cầu schema extraction) */
    structured?: Record<string, unknown>;
    /** Thời gian AI xử lý (ms) */
    aiProcessingTimeMs: number;
}

/**
 * Kết quả dịch thuật.
 */
export interface TranslationResult {
    /** Văn bản đã dịch */
    translatedText: string;
    /** Ngôn ngữ nguồn (detected) */
    sourceLanguage: string;
    /** Ngôn ngữ đích */
    targetLanguage: string;
    /** Thời gian xử lý (ms) */
    processingTimeMs: number;
}

/**
 * Interface chuẩn cho AI Processor.
 */
export interface IAIProcessor {
    /**
     * Sửa lỗi chính tả và đoán các từ bị mất.
     */
    reconstruct(rawText: string, confidence: number): Promise<AIProcessedResult>;

    /**
     * Trích xuất dữ liệu từ text theo JSON schema.
     */
    extractSchema(
        rawText: string,
        schema: Record<string, string>
    ): Promise<AIProcessedResult>;

    /**
     * Dịch thuật chuyên nghiệp — giữ thuật ngữ chuyên môn và định dạng.
     */
    translate(
        text: string,
        targetLanguage: string
    ): Promise<TranslationResult>;

    /**
     * Trả về tên processor.
     */
    getProcessorName(): string;
}
