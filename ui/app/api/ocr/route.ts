import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { OCRManager } from "@/lib/ocr/ocr-manager";
import { AIManager } from "@/lib/ai/ai-manager";
import type { OCRAPIResponse } from "@/lib/ocr/interfaces";

/** Allowed MIME types */
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
];

/** Max file size: 10 MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest): Promise<NextResponse<OCRAPIResponse>> {
    let tempFilePath: string | null = null;

    try {
        // 1. Parse multipart/form-data
        const formData = await request.formData();
        const file = formData.get("image") as File | null;
        const aiMode = (formData.get("mode") as string | null) || null; // "reconstruct" | "schema" | null
        const schemaRaw = formData.get("schema") as string | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: "Không tìm thấy file ảnh. Vui lòng gửi field 'image'." },
                { status: 400 }
            );
        }

        // 2. Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Định dạng không hỗ trợ: ${file.type}. Chấp nhận: JPG, PNG, WEBP, BMP, TIFF.`,
                },
                { status: 400 }
            );
        }

        // 3. Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                {
                    success: false,
                    error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa: 10MB.`,
                },
                { status: 400 }
            );
        }

        // 4. Validate schema param (if provided)
        let schema: Record<string, string> | null = null;
        if (aiMode === "schema") {
            if (!schemaRaw) {
                return NextResponse.json(
                    { success: false, error: "Mode 'schema' yêu cầu field 'schema' (JSON object, ví dụ: {\"title\":\"string\"})." },
                    { status: 400 }
                );
            }
            try {
                schema = JSON.parse(schemaRaw);
            } catch {
                return NextResponse.json(
                    { success: false, error: "Field 'schema' không phải JSON hợp lệ." },
                    { status: 400 }
                );
            }
        }

        // 5. Save to temp file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const tempDir = join(tmpdir(), "ocr-universe");
        await mkdir(tempDir, { recursive: true });

        const ext = file.name.split(".").pop() || "png";
        tempFilePath = join(tempDir, `${randomUUID()}.${ext}`);
        await writeFile(tempFilePath, buffer);

        // 6. Run OCR
        const ocrManager = OCRManager.getInstance();
        const provider = ocrManager.getProvider();

        console.log(`[API/OCR] Processing: ${file.name} (${(file.size / 1024).toFixed(1)}KB) with ${provider.getProviderName()}`);

        const ocrResult = await provider.recognize(tempFilePath);

        // 7. AI Post-Processing (if requested, or always reconstruct)
        const aiManager = AIManager.getInstance();
        const processor = aiManager.getProcessor();

        let cleanedText = ocrResult.text;
        let corrections: Array<{ original: string; corrected: string; reason: string }> = [];
        let structured: Record<string, unknown> | undefined;
        let aiProcessingTimeMs = 0;

        if (aiMode === "schema" && schema) {
            // Schema extraction mode
            console.log(`[API/AI] Extracting schema with ${processor.getProcessorName()}`);
            const aiResult = await processor.extractSchema(ocrResult.text, schema);
            cleanedText = aiResult.cleanedText;
            corrections = aiResult.corrections;
            structured = aiResult.structured;
            aiProcessingTimeMs = aiResult.aiProcessingTimeMs;
        } else {
            // Default: always reconstruct (fix spelling/guess missing words)
            console.log(`[API/AI] Reconstructing text with ${processor.getProcessorName()}`);
            const aiResult = await processor.reconstruct(ocrResult.text, ocrResult.confidence);
            cleanedText = aiResult.cleanedText;
            corrections = aiResult.corrections;
            aiProcessingTimeMs = aiResult.aiProcessingTimeMs;
        }

        // 8. Return enriched result
        return NextResponse.json({
            success: true,
            data: {
                text: ocrResult.text,
                confidence: ocrResult.confidence,
                processingTimeMs: ocrResult.processingTimeMs,
                provider: provider.getProviderName(),
                cleanedText,
                corrections,
                structured,
                aiProcessingTimeMs,
                aiProcessor: processor.getProcessorName(),
            },
        });
    } catch (error) {
        console.error("[API/OCR] Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Lỗi không xác định khi xử lý OCR.",
            },
            { status: 500 }
        );
    } finally {
        // 9. Cleanup temp file
        if (tempFilePath) {
            try {
                await unlink(tempFilePath);
            } catch {
                // Ignore cleanup errors
            }
        }
    }
}

/** GET: Health check */
export async function GET() {
    const ocrManager = OCRManager.getInstance();
    const provider = ocrManager.getProvider();

    const aiManager = AIManager.getInstance();
    const processor = aiManager.getProcessor();

    return NextResponse.json({
        status: "ok",
        provider: provider.getProviderName(),
        aiProcessor: processor.getProcessorName(),
        mode: process.env.OCR_MODE || "DEV",
    });
}
