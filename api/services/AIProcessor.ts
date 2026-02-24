/**
 * AIProcessor — Dịch vụ AI hậu kỳ chuyên sâu cho văn bản OCR.
 *
 * 3 chức năng chính:
 *  1. Reconstruct: Phục chế tài liệu — sửa lỗi OCR, điền khoảng trống, khôi phục ngữ cảnh.
 *  2. Structured Extraction: Trích xuất dữ liệu theo schema (INVOICE, CV, hoặc custom).
 *  3. Validation: Kiểm tra tính hợp lệ JSON trước khi trả về Frontend.
 */

// ─── Types ─────────────────────────────────────────────────

export type SchemaType = 'INVOICE' | 'CV' | 'CUSTOM';

export interface ReconstructResult {
    /** Văn bản đã được phục chế */
    cleanedText: string;
    /** Danh sách các sửa đổi */
    corrections: Array<{
        original: string;
        corrected: string;
        type: 'spelling' | 'missing_word' | 'formatting' | 'diacritics';
        confidence: number;
        reason: string;
    }>;
    /** Số lượng sửa đổi */
    totalCorrections: number;
    /** Phương thức xử lý */
    method: 'openai' | 'rule-based';
    /** Thời gian xử lý (ms) */
    processingTimeMs: number;
}

export interface InvoiceData {
    vendor: string | null;
    vendorAddress: string | null;
    invoiceNumber: string | null;
    date: string | null;
    dueDate: string | null;
    items: Array<{
        description: string;
        quantity: number | null;
        unitPrice: number | null;
        amount: number | null;
    }>;
    subtotal: number | null;
    tax: number | null;
    taxRate: string | null;
    total: number | null;
    currency: string | null;
    paymentMethod: string | null;
}

export interface CVData {
    name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    summary: string | null;
    experience: Array<{
        company: string;
        position: string;
        period: string;
        description: string;
    }>;
    education: Array<{
        institution: string;
        degree: string;
        period: string;
    }>;
    skills: string[];
    languages: string[];
    certifications: string[];
}

export interface ExtractionResult<T = Record<string, unknown>> {
    /** Dữ liệu đã trích xuất */
    data: T;
    /** Danh sách lý do trích xuất */
    reasoning: Array<{
        field: string;
        value: unknown;
        source: string;
        confidence: number;
    }>;
    /** Schema đã sử dụng */
    schemaType: SchemaType;
    /** Validation errors (nếu có) */
    validationErrors: string[];
    /** Phương thức xử lý */
    method: 'openai' | 'rule-based';
    /** Thời gian xử lý (ms) */
    processingTimeMs: number;
}

// ─── Predefined Schemas ────────────────────────────────────

const INVOICE_SCHEMA_PROMPT = `Trích xuất thông tin hóa đơn/invoice với cấu trúc JSON sau:
{
  "vendor": "Tên nhà cung cấp/công ty phát hành",
  "vendorAddress": "Địa chỉ nhà cung cấp",
  "invoiceNumber": "Số hóa đơn",
  "date": "Ngày phát hành (format: YYYY-MM-DD)",
  "dueDate": "Ngày đáo hạn (format: YYYY-MM-DD)",
  "items": [
    { "description": "Mô tả sản phẩm/dịch vụ", "quantity": 1, "unitPrice": 0, "amount": 0 }
  ],
  "subtotal": 0,
  "tax": 0,
  "taxRate": "10%",
  "total": 0,
  "currency": "VND hoặc USD",
  "paymentMethod": "Phương thức thanh toán"
}`;

const CV_SCHEMA_PROMPT = `Trích xuất thông tin CV/Resume với cấu trúc JSON sau:
{
  "name": "Họ và tên",
  "email": "Email",
  "phone": "Số điện thoại",
  "address": "Địa chỉ",
  "summary": "Tóm tắt bản thân",
  "experience": [
    { "company": "Tên công ty", "position": "Vị trí", "period": "Thời gian", "description": "Mô tả công việc" }
  ],
  "education": [
    { "institution": "Trường/Tổ chức", "degree": "Bằng cấp", "period": "Thời gian" }
  ],
  "skills": ["Kỹ năng 1", "Kỹ năng 2"],
  "languages": ["Ngôn ngữ"],
  "certifications": ["Chứng chỉ"]
}`;

const INVOICE_REQUIRED_FIELDS = ['vendor', 'date', 'total'];
const CV_REQUIRED_FIELDS = ['name'];

// ─── AIProcessor Class ─────────────────────────────────────

export class AIProcessor {
    private apiKey: string;
    private model: string;

    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || '';
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }

    // ═══════════════════════════════════════════════════════
    // 1. RECONSTRUCT — Phục chế tài liệu
    // ═══════════════════════════════════════════════════════

    /**
     * Phục chế văn bản OCR: sửa lỗi chính tả, điền khoảng trống, khôi phục dấu tiếng Việt.
     * @param rawText - Văn bản thô từ OCR
     * @param confidence - Điểm confidence từ OCR (0-100)
     */
    async reconstruct(rawText: string, confidence: number = 50): Promise<ReconstructResult> {
        const startTime = Date.now();

        if (this.hasValidApiKey()) {
            return this.reconstructWithAI(rawText, confidence, startTime);
        }
        return this.reconstructWithRules(rawText, startTime);
    }

    private async reconstructWithAI(
        rawText: string,
        confidence: number,
        startTime: number
    ): Promise<ReconstructResult> {
        const systemPrompt = `Bạn là CHUYÊN GIA PHỤC CHẾ TÀI LIỆU hàng đầu, chuyên xử lý văn bản OCR bị hỏng.

BỐI CẢNH:
- Văn bản được quét từ ảnh bằng công nghệ OCR với độ tin cậy ${confidence}%.
- ${confidence < 60 ? 'Độ tin cậy RẤT THẤP — văn bản chứa NHIỀU lỗi nghiêm trọng.' : confidence < 80 ? 'Độ tin cậy TRUNG BÌNH — có một số lỗi cần sửa.' : 'Độ tin cậy CAO — chỉ cần sửa lỗi nhỏ.'}

QUY TRÌNH PHỤC CHẾ (thực hiện tuần tự):

1. PHÂN TÍCH NGỮ CẢNH:
   - Đọc toàn bộ văn bản để hiểu chủ đề, lĩnh vực, và ngôn ngữ (Việt/Anh/hỗn hợp).
   - Xác định loại tài liệu (hóa đơn, hợp đồng, sách, bài báo, CV...).

2. SỬA LỖI KÝ TỰ OCR:
   - Ký tự bị nhận sai: "rn" → "m", "cl" → "d", "0" ↔ "O", "1" ↔ "l" ↔ "I"
   - Dấu tiếng Việt bị mất: "nguoi" → "người", "khong" → "không", "da" → "đã"
   - Ký tự lạ/rác: xóa các ký tự Unicode vô nghĩa

3. ĐIỀN TỪ BỊ MẤT:
   - Phân tích ngữ cảnh các từ xung quanh khoảng trống [...] hoặc đoạn vô nghĩa
   - Sử dụng kiến thức ngôn ngữ để đoán từ phù hợp nhất
   - Đánh dấu từ đã đoán bằng format: «từ_đoán»
   - CHỈ đoán khi có ≥70% chắc chắn, nếu không giữ [...]

4. SỬA ĐỊNH DẠNG:
   - Gộp các dòng bị ngắt sai thành câu hoàn chỉnh
   - Sửa dấu câu: thêm dấu cách sau dấu chấm/phẩy, xóa khoảng trắng thừa
   - Viết hoa đầu câu

QUY TẮC BẮT BUỘC:
- KHÔNG thêm nội dung mới, KHÔNG sáng tạo, KHÔNG diễn giải
- Giữ 100% ý nghĩa gốc
- Mỗi sửa đổi phải có lý do cụ thể

TRẢ VỀ JSON (chỉ JSON thuần, không markdown):
{
  "cleanedText": "văn bản đã phục chế",
  "corrections": [
    {
      "original": "đoạn gốc bị lỗi",
      "corrected": "đoạn đã sửa",
      "type": "spelling|missing_word|formatting|diacritics",
      "confidence": 0.95,
      "reason": "giải thích ngắn gọn"
    }
  ]
}`;

        const userPrompt = `PHỤC CHẾ VĂN BẢN OCR SAU (confidence: ${confidence}%):\n\n---\n${rawText}\n---`;

        try {
            const content = await this.callOpenAI(systemPrompt, userPrompt, 0.15);
            const parsed = this.safeParseJSON(content);

            if (!parsed || !parsed.cleanedText) {
                console.warn('[AIProcessor] AI reconstruct trả về format không hợp lệ, fallback.');
                return this.reconstructWithRules(rawText, startTime);
            }

            const corrections = Array.isArray(parsed.corrections)
                ? parsed.corrections.map((c: Record<string, unknown>) => ({
                    original: String(c.original || ''),
                    corrected: String(c.corrected || ''),
                    type: (['spelling', 'missing_word', 'formatting', 'diacritics'].includes(c.type as string)
                        ? c.type
                        : 'spelling') as 'spelling' | 'missing_word' | 'formatting' | 'diacritics',
                    confidence: typeof c.confidence === 'number' ? c.confidence : 0.8,
                    reason: String(c.reason || ''),
                }))
                : [];

            return {
                cleanedText: String(parsed.cleanedText),
                corrections,
                totalCorrections: corrections.length,
                method: 'openai',
                processingTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            console.error('[AIProcessor] Reconstruct AI error:', error);
            return this.reconstructWithRules(rawText, startTime);
        }
    }

    private reconstructWithRules(rawText: string, startTime: number): ReconstructResult {
        const corrections: ReconstructResult['corrections'] = [];
        let text = rawText;

        // 1. Chuẩn hóa line endings
        text = text.replace(/\r\n/g, '\n');

        // 2. Sửa lỗi OCR phổ biến
        const ocrFixes: Array<{ pattern: RegExp; replacement: string; type: ReconstructResult['corrections'][0]['type']; reason: string }> = [
            // Dấu tiếng Việt
            { pattern: /\bva\b/g, replacement: 'và', type: 'diacritics', reason: 'Thiếu dấu tiếng Việt' },
            { pattern: /\bco\b/g, replacement: 'có', type: 'diacritics', reason: 'Thiếu dấu tiếng Việt' },
            { pattern: /\bda\b/g, replacement: 'đã', type: 'diacritics', reason: 'Thiếu dấu tiếng Việt' },
            { pattern: /\bde\b/g, replacement: 'để', type: 'diacritics', reason: 'Thiếu dấu tiếng Việt' },
            { pattern: /\bkhong\b/gi, replacement: 'không', type: 'diacritics', reason: 'Thiếu dấu tiếng Việt' },
            { pattern: /\bnguoi\b/gi, replacement: 'người', type: 'diacritics', reason: 'Thiếu dấu tiếng Việt' },
            { pattern: /\bnhung\b/gi, replacement: 'nhưng', type: 'diacritics', reason: 'Thiếu dấu tiếng Việt' },
            { pattern: /\bcua\b/gi, replacement: 'của', type: 'diacritics', reason: 'Thiếu dấu tiếng Việt' },
            { pattern: /\bdong\b/gi, replacement: 'đồng', type: 'diacritics', reason: 'Thiếu dấu tiếng Việt' },
            { pattern: /\bnhieu\b/gi, replacement: 'nhiều', type: 'diacritics', reason: 'Thiếu dấu tiếng Việt' },
            { pattern: /\bduoc\b/gi, replacement: 'được', type: 'diacritics', reason: 'Thiếu dấu tiếng Việt' },
            // Ký tự OCR nhầm
            { pattern: /\brn\b/g, replacement: 'm', type: 'spelling', reason: 'OCR nhầm "rn" → "m"' },
            { pattern: /\bO(\d)/g, replacement: '0$1', type: 'spelling', reason: 'OCR nhầm O → 0 trong số' },
            // Khoảng trắng & dấu câu
            { pattern: /\s+([.,;:!?])/g, replacement: '$1', type: 'formatting', reason: 'Xóa khoảng trắng trước dấu câu' },
            { pattern: /([.,;:!?])(\w)/g, replacement: '$1 $2', type: 'formatting', reason: 'Thêm khoảng trắng sau dấu câu' },
            { pattern: /\s{2,}/g, replacement: ' ', type: 'formatting', reason: 'Xóa khoảng trắng thừa' },
            { pattern: /\n{3,}/g, replacement: '\n\n', type: 'formatting', reason: 'Xóa dòng trống thừa' },
        ];

        for (const fix of ocrFixes) {
            const matches = text.match(fix.pattern);
            if (matches) {
                for (const match of matches) {
                    const corrected = match.replace(fix.pattern, fix.replacement);
                    if (match !== corrected) {
                        corrections.push({
                            original: match,
                            corrected,
                            type: fix.type,
                            confidence: 0.7,
                            reason: fix.reason,
                        });
                    }
                }
                text = text.replace(fix.pattern, fix.replacement);
            }
        }

        // 3. Viết hoa đầu câu
        text = text.replace(
            /(?:^|[.!?]\s+)([a-zàáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ])/gm,
            (match, char) => match.slice(0, -1) + char.toUpperCase()
        );

        // 4. Trim
        text = text.trim();

        return {
            cleanedText: text,
            corrections: corrections.slice(0, 30),
            totalCorrections: corrections.length,
            method: 'rule-based',
            processingTimeMs: Date.now() - startTime,
        };
    }

    // ═══════════════════════════════════════════════════════
    // 2. STRUCTURED EXTRACTION — Trích xuất dữ liệu
    // ═══════════════════════════════════════════════════════

    /**
     * Trích xuất dữ liệu có cấu trúc từ văn bản.
     * @param text - Văn bản (đã hoặc chưa reconstruct)
     * @param schemaType - Loại schema: 'INVOICE', 'CV', hoặc 'CUSTOM'
     * @param customSchema - Schema tùy chỉnh (chỉ dùng khi schemaType = 'CUSTOM')
     */
    async extractData<T = Record<string, unknown>>(
        text: string,
        schemaType: SchemaType,
        customSchema?: Record<string, string>
    ): Promise<ExtractionResult<T>> {
        const startTime = Date.now();

        if (this.hasValidApiKey()) {
            return this.extractWithAI<T>(text, schemaType, customSchema, startTime);
        }
        return this.extractWithRules<T>(text, schemaType, startTime);
    }

    private async extractWithAI<T>(
        text: string,
        schemaType: SchemaType,
        customSchema: Record<string, string> | undefined,
        startTime: number
    ): Promise<ExtractionResult<T>> {
        let schemaPrompt: string;

        switch (schemaType) {
            case 'INVOICE':
                schemaPrompt = INVOICE_SCHEMA_PROMPT;
                break;
            case 'CV':
                schemaPrompt = CV_SCHEMA_PROMPT;
                break;
            case 'CUSTOM':
                if (!customSchema) {
                    return this.createEmptyResult<T>(schemaType, startTime, ['Custom schema không được cung cấp.']);
                }
                schemaPrompt = `Trích xuất thông tin với cấu trúc JSON sau:\n${JSON.stringify(customSchema, null, 2)}`;
                break;
        }

        const systemPrompt = `Bạn là CHUYÊN GIA TRÍCH XUẤT DỮ LIỆU từ tài liệu.

NHIỆM VỤ:
Phân tích văn bản và trích xuất chính xác các trường dữ liệu theo schema bên dưới.

${schemaPrompt}

QUY TẮC:
1. Trích xuất CHÍNH XÁC giá trị từ văn bản, không suy diễn quá mức.
2. Nếu một trường không tìm thấy trong văn bản → đặt giá trị là null.
3. Số tiền: chuyển về dạng số (bỏ ký hiệu tiền tệ, dấu phân cách) — ví dụ: "1.500.000đ" → 1500000.
4. Ngày tháng: chuẩn hóa về format YYYY-MM-DD.
5. Mảng: nếu không tìm thấy phần tử nào → trả về mảng rỗng [].

TRẢ VỀ JSON (chỉ JSON thuần, không markdown):
{
  "data": { ... dữ liệu theo schema ... },
  "reasoning": [
    { "field": "tên trường", "value": "giá trị", "source": "đoạn text gốc chứa thông tin", "confidence": 0.95 }
  ]
}`;

        const userPrompt = `VĂN BẢN NGUỒN:\n\n---\n${text}\n---`;

        try {
            const content = await this.callOpenAI(systemPrompt, userPrompt, 0.1);
            const parsed = this.safeParseJSON(content);

            if (!parsed || !parsed.data) {
                console.warn('[AIProcessor] AI extract trả về format không hợp lệ, fallback.');
                return this.extractWithRules<T>(text, schemaType, startTime);
            }

            // 3. VALIDATION
            const validationErrors = this.validateExtractedData(parsed.data as Record<string, unknown>, schemaType);

            const reasoning = Array.isArray(parsed.reasoning)
                ? parsed.reasoning.map((r: Record<string, unknown>) => ({
                    field: String(r.field || ''),
                    value: r.value,
                    source: String(r.source || ''),
                    confidence: typeof r.confidence === 'number' ? r.confidence : 0.5,
                }))
                : [];

            return {
                data: parsed.data as T,
                reasoning,
                schemaType,
                validationErrors,
                method: 'openai',
                processingTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            console.error('[AIProcessor] Extract AI error:', error);
            return this.extractWithRules<T>(text, schemaType, startTime);
        }
    }

    private extractWithRules<T>(
        text: string,
        schemaType: SchemaType,
        startTime: number
    ): ExtractionResult<T> {
        const lines = text.split('\n').filter((l) => l.trim());
        const kvPairs: Record<string, string> = {};

        // Parse "Key: Value" patterns
        for (const line of lines) {
            const match = line.match(/^(.+?)\s*[:：\-–—]\s*(.+)$/);
            if (match) {
                kvPairs[match[1].trim().toLowerCase()] = match[2].trim();
            }
        }

        let data: Record<string, unknown>;
        const reasoning: ExtractionResult['reasoning'] = [];

        switch (schemaType) {
            case 'INVOICE':
                data = this.extractInvoiceRuleBased(text, kvPairs, reasoning);
                break;
            case 'CV':
                data = this.extractCVRuleBased(text, kvPairs, reasoning);
                break;
            default:
                data = kvPairs;
        }

        const validationErrors = this.validateExtractedData(data, schemaType);

        return {
            data: data as T,
            reasoning,
            schemaType,
            validationErrors,
            method: 'rule-based',
            processingTimeMs: Date.now() - startTime,
        };
    }

    private extractInvoiceRuleBased(
        text: string,
        kvPairs: Record<string, string>,
        reasoning: ExtractionResult['reasoning']
    ): Record<string, unknown> {
        const findValue = (keys: string[]): string | null => {
            for (const key of keys) {
                for (const [k, v] of Object.entries(kvPairs)) {
                    if (k.includes(key)) {
                        reasoning.push({ field: key, value: v, source: `${k}: ${v}`, confidence: 0.7 });
                        return v;
                    }
                }
            }
            return null;
        };

        const findNumber = (keys: string[]): number | null => {
            const val = findValue(keys);
            if (!val) return null;
            const num = parseFloat(val.replace(/[^\d.-]/g, ''));
            return isNaN(num) ? null : num;
        };

        // Tìm ngày tháng bằng regex
        const dateMatch = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
        const dateStr = dateMatch
            ? `${dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`
            : null;

        return {
            vendor: findValue(['vendor', 'công ty', 'nhà cung cấp', 'company', 'seller', 'đơn vị']),
            vendorAddress: findValue(['địa chỉ', 'address']),
            invoiceNumber: findValue(['số hóa đơn', 'invoice', 'số hđ', 'số', 'number']),
            date: dateStr,
            dueDate: null,
            items: [],
            subtotal: findNumber(['subtotal', 'tạm tính', 'thành tiền']),
            tax: findNumber(['tax', 'thuế', 'vat']),
            taxRate: findValue(['thuế suất', 'tax rate']),
            total: findNumber(['total', 'tổng', 'tổng cộng', 'tổng tiền', 'thành tiền', 'amount']),
            currency: text.match(/VND|USD|EUR|đ|₫|\$/i)?.[0] || null,
            paymentMethod: findValue(['thanh toán', 'payment']),
        } satisfies InvoiceData;
    }

    private extractCVRuleBased(
        text: string,
        kvPairs: Record<string, string>,
        reasoning: ExtractionResult['reasoning']
    ): Record<string, unknown> {
        const findValue = (keys: string[]): string | null => {
            for (const key of keys) {
                for (const [k, v] of Object.entries(kvPairs)) {
                    if (k.includes(key)) {
                        reasoning.push({ field: key, value: v, source: `${k}: ${v}`, confidence: 0.6 });
                        return v;
                    }
                }
            }
            return null;
        };

        // Email regex
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
        // Phone regex (VN / international)
        const phoneMatch = text.match(/(?:\+84|0)\s*\d[\d\s\-.]{7,}/);

        // Skills: tìm sau "Kỹ năng" hoặc "Skills"
        const skillsSection = text.match(/(?:kỹ năng|skills?)[\s:]*([^\n]+(?:\n(?![A-Z\u00C0-\u024F]).+)*)/i);
        const skills = skillsSection
            ? skillsSection[1].split(/[,;•\-\n]/).map((s) => s.trim()).filter(Boolean)
            : [];

        // Tên: thường là dòng đầu tiên hoặc sau "Họ tên" / "Name"
        const name =
            findValue(['họ tên', 'họ và tên', 'name', 'full name']) ||
            text.split('\n').find((l) => l.trim().length > 2 && l.trim().length < 50)?.trim() ||
            null;

        return {
            name,
            email: emailMatch?.[0] || findValue(['email', 'e-mail']),
            phone: phoneMatch?.[0]?.trim() || findValue(['điện thoại', 'phone', 'sđt', 'tel']),
            address: findValue(['địa chỉ', 'address']),
            summary: findValue(['giới thiệu', 'summary', 'mục tiêu', 'objective']),
            experience: [],
            education: [],
            skills,
            languages: [],
            certifications: [],
        } satisfies CVData;
    }

    // ═══════════════════════════════════════════════════════
    // 3. VALIDATION — Kiểm tra tính hợp lệ JSON
    // ═══════════════════════════════════════════════════════

    /**
     * Kiểm tra tính hợp lệ của dữ liệu đã trích xuất.
     */
    private validateExtractedData(
        data: Record<string, unknown>,
        schemaType: SchemaType
    ): string[] {
        const errors: string[] = [];

        // A. Kiểm tra dữ liệu không phải object
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            errors.push('Dữ liệu trả về không phải là JSON object hợp lệ.');
            return errors;
        }

        // B. Kiểm tra fields bắt buộc
        let requiredFields: string[] = [];
        switch (schemaType) {
            case 'INVOICE':
                requiredFields = INVOICE_REQUIRED_FIELDS;
                break;
            case 'CV':
                requiredFields = CV_REQUIRED_FIELDS;
                break;
        }

        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null || data[field] === '') {
                errors.push(`Trường bắt buộc '${field}' bị thiếu hoặc rỗng.`);
            }
        }

        // C. Type checking cho INVOICE
        if (schemaType === 'INVOICE') {
            const numericFields = ['subtotal', 'tax', 'total'];
            for (const field of numericFields) {
                if (data[field] !== null && data[field] !== undefined && typeof data[field] !== 'number') {
                    errors.push(`Trường '${field}' phải là số, nhận được: ${typeof data[field]}.`);
                }
            }

            if (data.items !== undefined && !Array.isArray(data.items)) {
                errors.push("Trường 'items' phải là mảng.");
            }

            // Validate total vs subtotal + tax
            if (
                typeof data.subtotal === 'number' &&
                typeof data.tax === 'number' &&
                typeof data.total === 'number'
            ) {
                const expected = data.subtotal + data.tax;
                const diff = Math.abs(expected - data.total);
                if (diff > 1) {
                    errors.push(
                        `Tổng (${data.total}) không khớp: subtotal (${data.subtotal}) + tax (${data.tax}) = ${expected}.`
                    );
                }
            }
        }

        // D. Type checking cho CV
        if (schemaType === 'CV') {
            const arrayFields = ['experience', 'education', 'skills', 'languages', 'certifications'];
            for (const field of arrayFields) {
                if (data[field] !== undefined && !Array.isArray(data[field])) {
                    errors.push(`Trường '${field}' phải là mảng.`);
                }
            }

            // Validate email format
            if (data.email && typeof data.email === 'string') {
                if (!/^[\w.-]+@[\w.-]+\.\w{2,}$/.test(data.email)) {
                    errors.push(`Email '${data.email}' không hợp lệ.`);
                }
            }
        }

        return errors;
    }

    // ═══════════════════════════════════════════════════════
    // Utilities
    // ═══════════════════════════════════════════════════════

    private hasValidApiKey(): boolean {
        return !!(this.apiKey && this.apiKey !== 'your_openai_key_here');
    }

    private async callOpenAI(
        systemPrompt: string,
        userPrompt: string,
        temperature: number = 0.15
    ): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature,
                max_tokens: 4096,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`OpenAI API ${response.status}: ${errorBody}`);
        }

        const data = await response.json() as Record<string, unknown>;
        const choices = data.choices as Array<{ message: { content: string } }>;
        return choices?.[0]?.message?.content || '';
    }

    /**
     * Parse JSON an toàn — xử lý trường hợp AI trả về markdown code block.
     */
    private safeParseJSON(raw: string): Record<string, unknown> | null {
        try {
            // Thử parse trực tiếp
            return JSON.parse(raw);
        } catch {
            // Thử loại bỏ markdown code fence
            const cleaned = raw.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
            try {
                return JSON.parse(cleaned);
            } catch {
                console.error('[AIProcessor] JSON parse thất bại:', raw.substring(0, 200));
                return null;
            }
        }
    }

    private createEmptyResult<T>(
        schemaType: SchemaType,
        startTime: number,
        errors: string[]
    ): ExtractionResult<T> {
        return {
            data: {} as T,
            reasoning: [],
            schemaType,
            validationErrors: errors,
            method: 'rule-based',
            processingTimeMs: Date.now() - startTime,
        };
    }
}
