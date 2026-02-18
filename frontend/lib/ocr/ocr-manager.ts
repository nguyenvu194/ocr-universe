import { IOCRProvider } from "./interfaces";
import { TesseractProvider } from "./tesseract-provider";

export class OCRManager {
    private static instance: OCRManager;
    private provider: IOCRProvider;

    private constructor() {
        const mode = process.env.OCR_MODE || "DEV";
        const defaultProvider = process.env.OCR_DEFAULT_PROVIDER || "TESSERACT";

        console.log(`[OCRManager] Initializing in ${mode} mode.`);

        // Factory: chọn provider dựa trên env
        if (defaultProvider === "GOOGLE_VISION") {
            // TODO: import GoogleVisionProvider khi cần
            console.warn(
                "[OCRManager] GoogleVisionProvider chưa được tích hợp vào frontend. Fallback to Tesseract."
            );
            this.provider = new TesseractProvider();
        } else {
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
