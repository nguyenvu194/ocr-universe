import { IAIProcessor } from "./ai-interfaces";
import { DevAIProcessor } from "./dev-ai-processor";
import { OpenAIProcessor } from "./openai-ai-processor";

/**
 * Factory singleton cho AI Processor.
 * Chọn processor dựa trên AI_MODE env.
 */
export class AIManager {
    private static instance: AIManager;
    private processor: IAIProcessor;

    private constructor() {
        const mode = process.env.AI_MODE || process.env.OCR_MODE || "DEV";

        console.log(`[AIManager] Initializing in ${mode} mode.`);

        if (mode === "PROD" && process.env.OPENAI_API_KEY) {
            this.processor = new OpenAIProcessor();
        } else {
            if (mode === "PROD") {
                console.warn(
                    "[AIManager] PROD mode requested but OPENAI_API_KEY not set. Falling back to DEV processor."
                );
            }
            this.processor = new DevAIProcessor();
        }
    }

    public static getInstance(): AIManager {
        if (!AIManager.instance) {
            AIManager.instance = new AIManager();
        }
        return AIManager.instance;
    }

    public getProcessor(): IAIProcessor {
        return this.processor;
    }
}
