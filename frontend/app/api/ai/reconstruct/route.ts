import { NextRequest, NextResponse } from "next/server";
import { AIManager } from "@/lib/ai/ai-manager";

/**
 * POST /api/ai/reconstruct
 *
 * Body (JSON):
 * {
 *   rawText: string,       // Văn bản OCR gốc
 *   confidence?: number    // Confidence score (0-100)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   data?: {
 *     processedText: string,
 *     corrections: Array<{original, corrected, reason}>,
 *     processingTimeMs: number,
 *     processor: string
 *   },
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { rawText, confidence = 50 } = body;

        if (!rawText || typeof rawText !== "string") {
            return NextResponse.json(
                { success: false, error: "Field 'rawText' (string) là bắt buộc." },
                { status: 400 }
            );
        }

        if (rawText.length > 50000) {
            return NextResponse.json(
                { success: false, error: "Văn bản quá dài (tối đa 50,000 ký tự)." },
                { status: 400 }
            );
        }

        const aiManager = AIManager.getInstance();
        const processor = aiManager.getProcessor();

        console.log(`[API/AI] Reconstructing ${rawText.length} chars with ${processor.getProcessorName()}`);

        const result = await processor.reconstruct(rawText, confidence);

        return NextResponse.json({
            success: true,
            data: {
                processedText: result.cleanedText,
                corrections: result.corrections,
                processingTimeMs: result.aiProcessingTimeMs,
                processor: processor.getProcessorName(),
            },
        });
    } catch (error) {
        console.error("[API/AI/Reconstruct] Error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Lỗi xử lý AI." },
            { status: 500 }
        );
    }
}

/** GET: Health check */
export async function GET() {
    const aiManager = AIManager.getInstance();
    const processor = aiManager.getProcessor();

    return NextResponse.json({
        status: "ok",
        processor: processor.getProcessorName(),
        mode: process.env.AI_MODE || process.env.OCR_MODE || "DEV",
    });
}
