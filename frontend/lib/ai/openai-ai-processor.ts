import { IAIProcessor, AIProcessedResult, TranslationResult } from "./ai-interfaces";

/**
 * PROD AI Processor — sử dụng OpenAI GPT để xử lý text chuyên sâu.
 *
 * 1. Reconstruct: Chuyên gia phục chế tài liệu
 * 2. Schema Extract: Hỗ trợ INVOICE, CV, CUSTOM
 * 3. Translate: Dịch thuật chuyên nghiệp
 * 4. Validation: Kiểm tra JSON trước khi trả về
 */

// ─── Predefined Schema Prompts ─────────────────────────────

const INVOICE_SCHEMA_PROMPT = `Trích xuất hóa đơn thành JSON:
{
  "vendor": "Tên nhà cung cấp", "vendorAddress": "Địa chỉ",
  "invoiceNumber": "Số hóa đơn", "date": "YYYY-MM-DD", "dueDate": "YYYY-MM-DD",
  "items": [{ "description": "Mô tả", "quantity": 1, "unitPrice": 0, "amount": 0 }],
  "subtotal": 0, "tax": 0, "taxRate": "10%", "total": 0,
  "currency": "VND", "paymentMethod": "..."
}`;

const CV_SCHEMA_PROMPT = `Trích xuất CV thành JSON:
{
  "name": "Họ và tên", "email": "Email", "phone": "SĐT", "address": "Địa chỉ",
  "summary": "Tóm tắt",
  "experience": [{ "company": "...", "position": "...", "period": "...", "description": "..." }],
  "education": [{ "institution": "...", "degree": "...", "period": "..." }],
  "skills": ["..."], "languages": ["..."], "certifications": ["..."]
}`;

const SCHEMA_MAP: Record<string, string> = {
    INVOICE: INVOICE_SCHEMA_PROMPT,
    CV: CV_SCHEMA_PROMPT,
};

const REQUIRED_FIELDS_MAP: Record<string, string[]> = {
    INVOICE: ["vendor", "date", "total"],
    CV: ["name"],
};

// ─── Language names for prompt ────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
    vi: "Tiếng Việt",
    en: "English",
    ja: "日本語 (Tiếng Nhật)",
    ko: "한국어 (Tiếng Hàn)",
    zh: "中文 (Tiếng Trung)",
    fr: "Français (Tiếng Pháp)",
    de: "Deutsch (Tiếng Đức)",
    th: "ภาษาไทย (Tiếng Thái)",
};

export class OpenAIProcessor implements IAIProcessor {
    private apiKey: string;
    private model: string;

    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || "";
        this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";

        if (!this.apiKey) {
            console.warn("[OpenAIProcessor] OPENAI_API_KEY not set. AI features will fail.");
        }
    }

    // ═══════════════════════════════════════════════════
    // 1. RECONSTRUCT — Phục chế tài liệu
    // ═══════════════════════════════════════════════════

    async reconstruct(rawText: string, confidence: number): Promise<AIProcessedResult> {
        const startTime = Date.now();

        const systemPrompt = `Bạn là CHUYÊN GIA PHỤC CHẾ TÀI LIỆU hàng đầu, chuyên xử lý văn bản OCR bị hỏng.

BỐI CẢNH:
- Văn bản được quét bằng OCR với độ tin cậy ${confidence}%.
- ${confidence < 60 ? "Confidence RẤT THẤP — nhiều lỗi nghiêm trọng." : confidence < 80 ? "Confidence TRUNG BÌNH — một số lỗi cần sửa." : "Confidence CAO — chỉ lỗi nhỏ."}

QUY TRÌNH PHỤC CHẾ:

1. PHÂN TÍCH NGỮ CẢNH:
   - Đọc toàn bộ để hiểu chủ đề, lĩnh vực, ngôn ngữ (Việt/Anh/hỗn hợp).
   - Xác định loại tài liệu (hóa đơn, hợp đồng, sách, CV...).

2. SỬA LỖI KÝ TỰ OCR:
   - Ký tự nhận sai: "rn"→"m", "cl"→"d", "0"↔"O", "1"↔"l"↔"I"
   - Dấu tiếng Việt mất: "nguoi"→"người", "khong"→"không"
   - Xóa ký tự Unicode rác

3. ĐIỀN TỪ BỊ MẤT:
   - Phân tích ngữ cảnh xung quanh [...] hoặc đoạn vô nghĩa
   - Đánh dấu từ đã đoán: «từ_đoán»
   - Chỉ đoán khi ≥70% chắc chắn, nếu không giữ [...]

4. SỬA ĐỊNH DẠNG:
   - Gộp dòng bị ngắt sai, sửa dấu câu, viết hoa đầu câu

QUY TẮC: Không thêm nội dung mới. Giữ 100% ý nghĩa gốc.

TRẢ VỀ JSON thuần:
{
  "cleanedText": "văn bản đã phục chế",
  "corrections": [
    { "original": "gốc", "corrected": "đã sửa", "type": "spelling|missing_word|formatting|diacritics", "confidence": 0.95, "reason": "lý do" }
  ]
}`;

        const userPrompt = `PHỤC CHẾ VĂN BẢN (confidence: ${confidence}%):\n\n---\n${rawText}\n---`;

        try {
            const content = await this.callOpenAI(systemPrompt, userPrompt, 0.15);
            const parsed = this.safeParseJSON(content);

            if (!parsed || !parsed.cleanedText) {
                return this.fallbackResult(rawText, startTime);
            }

            return {
                cleanedText: String(parsed.cleanedText),
                corrections: this.normalizeCorrections(parsed.corrections),
                aiProcessingTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            console.error("[OpenAIProcessor] reconstruct error:", error);
            return this.fallbackResult(rawText, startTime);
        }
    }

    // ═══════════════════════════════════════════════════
    // 2. STRUCTURED EXTRACTION
    // ═══════════════════════════════════════════════════

    async extractSchema(rawText: string, schema: Record<string, string>): Promise<AIProcessedResult> {
        const startTime = Date.now();

        const schemaType = (schema as Record<string, string>).__type;
        const schemaPrompt = (schemaType && SCHEMA_MAP[schemaType])
            ? SCHEMA_MAP[schemaType]
            : `Trích xuất theo schema:\n${JSON.stringify(schema, null, 2)}`;

        const systemPrompt = `Bạn là CHUYÊN GIA TRÍCH XUẤT DỮ LIỆU từ tài liệu.

${schemaPrompt}

QUY TẮC:
1. Trích xuất CHÍNH XÁC giá trị, không suy diễn quá mức.
2. Trường không tìm thấy → null. Mảng không tìm thấy → [].
3. Số tiền: bỏ ký hiệu (ví dụ "1.500.000đ" → 1500000).
4. Ngày: chuẩn hóa YYYY-MM-DD.

TRẢ VỀ JSON thuần:
{
  "structured": { ... },
  "corrections": [{ "original": "nguồn", "corrected": "giá trị trích xuất", "reason": "lý do" }]
}`;

        const userPrompt = `VĂN BẢN:\n\n---\n${rawText}\n---`;

        try {
            const content = await this.callOpenAI(systemPrompt, userPrompt, 0.1);
            const parsed = this.safeParseJSON(content);

            if (!parsed || !parsed.structured) {
                return this.fallbackResult(rawText, startTime, {});
            }

            const validationErrors = this.validateData(parsed.structured as Record<string, unknown>, schemaType);
            if (validationErrors.length > 0) {
                console.warn("[OpenAIProcessor] Validation warnings:", validationErrors);
            }

            return {
                cleanedText: rawText,
                corrections: this.normalizeCorrections(parsed.corrections),
                structured: {
                    ...(parsed.structured as Record<string, unknown>),
                    _validation: { isValid: validationErrors.length === 0, errors: validationErrors },
                },
                aiProcessingTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            console.error("[OpenAIProcessor] extractSchema error:", error);
            return this.fallbackResult(rawText, startTime, {});
        }
    }

    // ═══════════════════════════════════════════════════
    // 3. TRANSLATE — Dịch thuật chuyên nghiệp
    // ═══════════════════════════════════════════════════

    async translate(text: string, targetLanguage: string): Promise<TranslationResult> {
        const startTime = Date.now();
        const targetName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

        const systemPrompt = `Bạn là DỊCH GIẢ CHUYÊN NGHIỆP hàng đầu, chuyên dịch tài liệu OCR.

NHIỆM VỤ: Dịch văn bản sang ${targetName}.

QUY TẮC BẮT BUỘC:
1. DỊCH CHUYÊN NGHIỆP — giữ nguyên nghĩa gốc, văn phong tự nhiên và lưu loát.
2. GIỮ NGUYÊN THUẬT NGỮ CHUYÊN MÔN — các thuật ngữ kỹ thuật, tên riêng, viết tắt, số hiệu giữ nguyên.
3. GIỮ NGUYÊN ĐỊNH DẠNG — giữ nguyên cấu trúc dòng, đoạn văn, danh sách, bảng biểu.
4. KHÔNG thêm/bớt — KHÔNG diễn giải, KHÔNG giải thích, KHÔNG tóm tắt.
5. Ký hiệu đặc biệt: «từ» (từ AI đoán) — giữ nguyên ký hiệu «» trong bản dịch.
6. Số liệu, ngày tháng, đơn vị tiền tệ — giữ nguyên format gốc.

TRẢ VỀ JSON thuần:
{
  "translatedText": "văn bản đã dịch",
  "sourceLanguage": "mã ngôn ngữ gốc (vi/en/ja/ko/...)"
}`;

        const userPrompt = `DỊCH SANG ${targetName}:\n\n---\n${text}\n---`;

        try {
            const content = await this.callOpenAI(systemPrompt, userPrompt, 0.2);
            const parsed = this.safeParseJSON(content);

            if (!parsed || !parsed.translatedText) {
                return {
                    translatedText: text,
                    sourceLanguage: "unknown",
                    targetLanguage,
                    processingTimeMs: Date.now() - startTime,
                };
            }

            return {
                translatedText: String(parsed.translatedText),
                sourceLanguage: String(parsed.sourceLanguage || "auto"),
                targetLanguage,
                processingTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            console.error("[OpenAIProcessor] translate error:", error);
            return {
                translatedText: text,
                sourceLanguage: "unknown",
                targetLanguage,
                processingTimeMs: Date.now() - startTime,
            };
        }
    }

    // ═══════════════════════════════════════════════════
    // 4. VALIDATION
    // ═══════════════════════════════════════════════════

    private validateData(data: Record<string, unknown>, schemaType?: string): string[] {
        const errors: string[] = [];
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return ["Dữ liệu không phải JSON object hợp lệ."];
        }
        const requiredFields = schemaType ? REQUIRED_FIELDS_MAP[schemaType] || [] : [];
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null || data[field] === "") {
                errors.push(`Trường bắt buộc '${field}' bị thiếu.`);
            }
        }
        if (schemaType === "INVOICE") {
            for (const f of ["subtotal", "tax", "total"]) {
                if (data[f] !== null && data[f] !== undefined && typeof data[f] !== "number") {
                    errors.push(`'${f}' phải là số.`);
                }
            }
            if (typeof data.subtotal === "number" && typeof data.tax === "number" && typeof data.total === "number") {
                const expected = (data.subtotal as number) + (data.tax as number);
                if (Math.abs(expected - (data.total as number)) > 1) {
                    errors.push(`Tổng không khớp: subtotal + tax = ${expected}, total = ${data.total}.`);
                }
            }
        }
        if (schemaType === "CV") {
            if (data.email && typeof data.email === "string" && !/^[\w.-]+@[\w.-]+\.\w{2,}$/.test(data.email)) {
                errors.push(`Email '${data.email}' không hợp lệ.`);
            }
        }
        return errors;
    }

    // ═══════════════════════════════════════════════════
    // Utilities
    // ═══════════════════════════════════════════════════

    private async callOpenAI(systemPrompt: string, userPrompt: string, temperature: number = 0.15): Promise<string> {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature,
                max_tokens: 4096,
                response_format: { type: "json_object" },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API ${response.status}: ${error}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    }

    private safeParseJSON(raw: string): Record<string, unknown> | null {
        try {
            return JSON.parse(raw);
        } catch {
            const cleaned = raw.replace(/^```(?:json)?\s*\n?/gm, "").replace(/\n?```\s*$/gm, "").trim();
            try {
                return JSON.parse(cleaned);
            } catch {
                console.error("[OpenAIProcessor] JSON parse failed:", raw.substring(0, 200));
                return null;
            }
        }
    }

    private normalizeCorrections(raw: unknown): AIProcessedResult["corrections"] {
        if (!Array.isArray(raw)) return [];
        return raw.map((c: Record<string, unknown>) => ({
            original: String(c.original || ""),
            corrected: String(c.corrected || ""),
            reason: String(c.reason || ""),
        }));
    }

    private fallbackResult(rawText: string, startTime: number, structured?: Record<string, unknown>): AIProcessedResult {
        return {
            cleanedText: rawText,
            corrections: [],
            structured,
            aiProcessingTimeMs: Date.now() - startTime,
        };
    }

    getProcessorName(): string {
        return "OPENAI_GPT";
    }
}
