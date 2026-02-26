import { IAIProcessor, AIProcessedResult, TranslationResult } from "./ai-interfaces";

/**
 * DEV AI Processor — sửa lỗi cơ bản bằng regex patterns.
 * Không cần API key, chạy offline.
 */
export class DevAIProcessor implements IAIProcessor {
    /** Các pattern sửa lỗi phổ biến cho tiếng Việt */
    private corrections: Array<{
        pattern: RegExp;
        replacement: string;
        reason: string;
    }> = [
            // Dấu câu
            { pattern: /\s+([.,;:!?])/g, replacement: "$1", reason: "Xóa khoảng trắng thừa trước dấu câu" },
            { pattern: /([.,;:!?])(\w)/g, replacement: "$1 $2", reason: "Thêm khoảng trắng sau dấu câu" },
            // Khoảng trắng
            { pattern: /\s{2,}/g, replacement: " ", reason: "Xóa khoảng trắng thừa" },
            { pattern: /^\s+|\s+$/gm, replacement: "", reason: "Xóa khoảng trắng đầu/cuối dòng" },
            // Dấu tiếng Việt bị lỗi OCR phổ biến
            { pattern: /\bl[aà]m/gi, replacement: "làm", reason: "Sửa dấu tiếng Việt" },
            { pattern: /\bva\b/g, replacement: "và", reason: "Thiếu dấu tiếng Việt" },
            { pattern: /\bco\b/g, replacement: "có", reason: "Thiếu dấu tiếng Việt" },
            { pattern: /\bda\b/g, replacement: "đã", reason: "Thiếu dấu tiếng Việt" },
            { pattern: /\bde\b/g, replacement: "để", reason: "Thiếu dấu tiếng Việt" },
            { pattern: /\bkhong\b/gi, replacement: "không", reason: "Thiếu dấu tiếng Việt" },
            { pattern: /\bnguoi\b/gi, replacement: "người", reason: "Thiếu dấu tiếng Việt" },
            { pattern: /\bnhung\b/gi, replacement: "nhưng", reason: "Thiếu dấu tiếng Việt" },
            // Lỗi OCR phổ biến
            { pattern: /\bl\b/g, replacement: "I", reason: "Lỗi nhận diện ký tự l/I" },
            { pattern: /\bO\b(?=\d)/g, replacement: "0", reason: "Lỗi nhận diện O/0" },
            // Dòng trống thừa
            { pattern: /\n{3,}/g, replacement: "\n\n", reason: "Xóa dòng trống thừa" },
        ];

    async reconstruct(rawText: string, confidence: number): Promise<AIProcessedResult> {
        const startTime = Date.now();
        const appliedCorrections: AIProcessedResult["corrections"] = [];
        let cleanedText = rawText;

        const patterns = confidence < 80
            ? this.corrections
            : this.corrections.filter((c) =>
                c.reason.includes("khoảng trắng") || c.reason.includes("dòng trống") || c.reason.includes("dấu câu")
            );

        for (const rule of patterns) {
            const matches = cleanedText.match(rule.pattern);
            if (matches) {
                for (const match of matches) {
                    const corrected = match.replace(rule.pattern, rule.replacement);
                    if (match !== corrected) {
                        appliedCorrections.push({ original: match, corrected, reason: rule.reason });
                    }
                }
                cleanedText = cleanedText.replace(rule.pattern, rule.replacement);
            }
        }

        cleanedText = cleanedText.replace(
            /(?:^|[.!?]\s+)([a-zàáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ])/gm,
            (match, char) => match.slice(0, -1) + char.toUpperCase()
        );

        return {
            cleanedText,
            corrections: appliedCorrections.slice(0, 20),
            aiProcessingTimeMs: Date.now() - startTime,
        };
    }

    async extractSchema(rawText: string, schema: Record<string, string>): Promise<AIProcessedResult> {
        const startTime = Date.now();
        const structured: Record<string, unknown> = {};
        const lines = rawText.split("\n").filter((l) => l.trim());

        for (const [key, type] of Object.entries(schema)) {
            const keyLower = key.toLowerCase();
            const matchLine = lines.find((line) => line.toLowerCase().includes(keyLower));

            if (matchLine) {
                const colonIdx = matchLine.indexOf(":");
                const value = colonIdx > -1
                    ? matchLine.substring(colonIdx + 1).trim()
                    : matchLine.replace(new RegExp(key, "i"), "").trim();

                if (type === "number") {
                    const num = parseFloat(value.replace(/[^\d.-]/g, ""));
                    structured[key] = isNaN(num) ? null : num;
                } else if (type === "boolean") {
                    structured[key] = /true|yes|có|đúng/i.test(value);
                } else {
                    structured[key] = value || null;
                }
            } else {
                structured[key] = null;
            }
        }

        return {
            cleanedText: rawText,
            corrections: [],
            structured,
            aiProcessingTimeMs: Date.now() - startTime,
        };
    }

    // ═══════════════════════════════════════════════════
    // TRANSLATE — DEV mode (free Google Translate API)
    // ═══════════════════════════════════════════════════

    async translate(text: string, targetLanguage: string): Promise<TranslationResult> {
        const startTime = Date.now();

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLanguage)}&dt=t&q=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Google Translate HTTP ${res.status}`);
            const data = await res.json();

            // data[0] = array of [translatedSegment, originalSegment, ...]
            // data[2] = detected source language
            const translatedText = (data[0] as Array<[string]>)
                .map((seg: [string]) => seg[0])
                .join("");
            const sourceLanguage = (data[2] as string) || "auto";

            return {
                translatedText,
                sourceLanguage,
                targetLanguage,
                processingTimeMs: Date.now() - startTime,
            };
        } catch (err) {
            console.error("[DevAI] Google Translate failed:", err);
            // Fallback: return original text with error note
            return {
                translatedText: text,
                sourceLanguage: "auto",
                targetLanguage,
                processingTimeMs: Date.now() - startTime,
            };
        }
    }

    getProcessorName(): string {
        return "DEV_REGEX";
    }
}
