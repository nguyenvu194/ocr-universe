import { IOCRProvider, OCRResult } from '../core/interfaces';

export class GoogleVisionProvider implements IOCRProvider {
    async recognize(imagePath: string): Promise<OCRResult> {
        const startTime = Date.now();

        // TODO: Triển khai Google Vision API thực tế
        console.log(`  [GoogleVisionProvider] Xử lý ${imagePath} (stub)`);
        const processingTimeMs = Date.now() - startTime;

        return {
            text: "Google Vision OCR Result (Stub)",
            confidence: 0,
            processingTimeMs,
        };
    }

    getProviderName(): string {
        return "GOOGLE_VISION";
    }
}
