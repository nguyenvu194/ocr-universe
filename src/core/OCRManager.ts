import { IOCRProvider } from './interfaces';
import { TesseractProvider } from '../providers/TesseractProvider';
import { GoogleVisionProvider } from '../providers/GoogleVisionProvider';
import * as dotenv from 'dotenv';

dotenv.config();

export class OCRManager {
    private static instance: OCRManager;
    private provider: IOCRProvider;

    private constructor() {
        const mode = process.env.OCR_MODE || 'DEV';
        const defaultProvider = process.env.OCR_DEFAULT_PROVIDER || 'TESSERACT';

        console.log(`[OCRManager] Initializing in ${mode} mode.`);

        if (mode === 'PROD') {
            // In PROD, we might still check OCR_DEFAULT_PROVIDER or default to Google Vision
            // Logic based on .env.example: "GOOGLE_VISION (Paid)"
            this.provider = new GoogleVisionProvider();
        } else {
            // DEV mode defaults to Tesseract (Free)
            this.provider = new TesseractProvider();
        }

        // Override logic if specific provider is forced (optional enhancement)
        if (defaultProvider === 'GOOGLE_VISION') {
            this.provider = new GoogleVisionProvider();
        } else if (defaultProvider === 'TESSERACT') {
            this.provider = new TesseractProvider();
        }
    }

    public static getInstance(): OCRManager {
        if (!OCRManager.instance) {
            OCRManager.instance = new OCRManager();
        }
        return OCRManager.instance;
    }

    public getProvider(): IOCRProvider {
        return this.provider;
    }
}
