import { IOCRProvider, OCRResult } from "./interfaces";
import Tesseract from "tesseract.js";
import path from "path";

export class TesseractProvider implements IOCRProvider {
    async recognize(imagePath: string): Promise<OCRResult> {
        const startTime = Date.now();

        // Resolve langPath — traineddata files at project root (../eng.traineddata, ../vie.traineddata)
        const langPath = path.resolve(process.cwd(), "..");

        const worker = await Tesseract.createWorker("eng+vie", 1, {
            langPath,
            gzip: false, // local files are not gzipped
            logger: (info) => {
                if (info.status === "recognizing text") {
                    console.log(
                        `[Tesseract] Recognizing... ${Math.round(info.progress * 100)}%`
                    );
                }
            },
        });

        try {
            const { data } = await worker.recognize(imagePath);
            const processingTimeMs = Date.now() - startTime;

            return {
                text: data.text,
                confidence: data.confidence,
                processingTimeMs,
            };
        } finally {
            await worker.terminate();
        }
    }

    getProviderName(): string {
        return "TESSERACT";
    }
}
