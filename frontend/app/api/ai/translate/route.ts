import { NextRequest, NextResponse } from "next/server";
import { AIManager } from "@/lib/ai/ai-manager";

/**
 * POST /api/ai/translate
 *
 * Body (JSON):
 * {
 *   text: string,              // Văn bản cần dịch
 *   targetLanguage: string     // Mã ngôn ngữ đích (vi, en, ja, ko, zh, fr, de, th)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   data?: {
 *     translatedText: string,
 *     sourceLanguage: string,
 *     targetLanguage: string,
 *     processingTimeMs: number,
 *     processor: string
 *   },
 *   error?: string
 * }
 */

const SUPPORTED_LANGUAGES = ["vi", "en", "ja", "ko", "zh", "fr", "de", "th"];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, targetLanguage } = body;

        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { success: false, error: "Field 'text' (string) là bắt buộc." },
                { status: 400 }
            );
        }

        if (!targetLanguage || typeof targetLanguage !== "string") {
            return NextResponse.json(
                { success: false, error: "Field 'targetLanguage' (string) là bắt buộc." },
                { status: 400 }
            );
        }

        if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
            return NextResponse.json(
                { success: false, error: `Ngôn ngữ '${targetLanguage}' không hỗ trợ. Chấp nhận: ${SUPPORTED_LANGUAGES.join(", ")}.` },
                { status: 400 }
            );
        }

        if (text.length > 50000) {
            return NextResponse.json(
                { success: false, error: "Văn bản quá dài (tối đa 50,000 ký tự)." },
                { status: 400 }
            );
        }

        const aiManager = AIManager.getInstance();
        const processor = aiManager.getProcessor();

        console.log(`[API/AI] Translating ${text.length} chars → ${targetLanguage} with ${processor.getProcessorName()}`);

        const result = await processor.translate(text, targetLanguage);

        return NextResponse.json({
            success: true,
            data: {
                translatedText: result.translatedText,
                sourceLanguage: result.sourceLanguage,
                targetLanguage: result.targetLanguage,
                processingTimeMs: result.processingTimeMs,
                processor: processor.getProcessorName(),
            },
        });
    } catch (error) {
        console.error("[API/AI/Translate] Error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Lỗi xử lý dịch thuật." },
            { status: 500 }
        );
    }
}

/** GET: Health check */
export async function GET() {
    return NextResponse.json({
        status: "ok",
        supportedLanguages: SUPPORTED_LANGUAGES,
        languageNames: {
            vi: "Tiếng Việt",
            en: "English",
            ja: "Tiếng Nhật",
            ko: "Tiếng Hàn",
            zh: "Tiếng Trung",
            fr: "Tiếng Pháp",
            de: "Tiếng Đức",
            th: "Tiếng Thái",
        },
    });
}
