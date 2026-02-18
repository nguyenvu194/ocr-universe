import { IOCRProvider, OCRResult } from '../core/interfaces';
import Tesseract from 'tesseract.js';

export class TesseractProvider implements IOCRProvider {
    async recognize(imagePath: string): Promise<OCRResult> {
        const startTime = Date.now();

        const { data } = await Tesseract.recognize(imagePath, 'eng+vie', {
            logger: (info) => {
                if (info.status === 'recognizing text') {
                    process.stdout.write(`\r  [Tesseract] Đang nhận diện... ${Math.round(info.progress * 100)}%`);
                }
            }
        });
        // Xuống dòng sau khi progress xong
        process.stdout.write('\n');

        const processingTimeMs = Date.now() - startTime;

        return {
            text: data.text,
            confidence: data.confidence,
            processingTimeMs,
        };
    }

    getProviderName(): string {
        return "TESSERACT";
    }
}
