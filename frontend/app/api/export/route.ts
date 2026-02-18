import { NextRequest, NextResponse } from "next/server";
import { ExportService } from "@/lib/export/export-service";

/**
 * POST /api/export
 *
 * Body (JSON):
 * {
 *   format: "pdf" | "xlsx" | "docx",
 *   content: string,          // văn bản (cho PDF, DOCX)
 *   jsonData?: object | array, // dữ liệu JSON (cho XLSX)
 *   title?: string,
 *   confidence?: number,
 *   provider?: string
 * }
 */

interface ExportRequest {
    format: "pdf" | "xlsx" | "docx";
    content?: string;
    jsonData?: Record<string, unknown> | Array<Record<string, unknown>>;
    title?: string;
    confidence?: number;
    provider?: string;
}

const MIME_TYPES: Record<string, string> = {
    pdf: "application/pdf",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as ExportRequest;

        const { format, content, jsonData, title, confidence, provider } = body;

        // ── Validate ──
        if (!format || !MIME_TYPES[format]) {
            return NextResponse.json(
                { success: false, error: `Format không hợp lệ: '${format}'. Chấp nhận: pdf, xlsx, docx.` },
                { status: 400 }
            );
        }

        if ((format === "pdf" || format === "docx") && !content) {
            return NextResponse.json(
                { success: false, error: `Format '${format}' yêu cầu field 'content' (string).` },
                { status: 400 }
            );
        }

        if (format === "xlsx" && !jsonData && !content) {
            return NextResponse.json(
                { success: false, error: "Format 'xlsx' yêu cầu 'jsonData' (object/array) hoặc 'content' (string)." },
                { status: 400 }
            );
        }

        const options = { title, confidence, provider };

        // ── Generate ──
        let buffer: Buffer;
        let fileName: string;

        const timestamp = new Date().toISOString().slice(0, 10);
        const safeTitle = (title || "ocr-result").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);

        switch (format) {
            case "pdf":
                buffer = ExportService.toPDF(content!, options);
                fileName = `${safeTitle}_${timestamp}.pdf`;
                break;

            case "xlsx": {
                // Nếu có jsonData → dùng trực tiếp, nếu không → convert content thành key-value
                const data = jsonData || contentToKV(content!);
                buffer = await ExportService.toExcel(data, options);
                fileName = `${safeTitle}_${timestamp}.xlsx`;
                break;
            }

            case "docx":
                buffer = await ExportService.toDocx(content!, options);
                fileName = `${safeTitle}_${timestamp}.docx`;
                break;

            default:
                return NextResponse.json({ success: false, error: "Format không hỗ trợ." }, { status: 400 });
        }

        // ── Return file ──
        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                "Content-Type": MIME_TYPES[format],
                "Content-Disposition": `attachment; filename="${fileName}"`,
                "Content-Length": String(buffer.length),
            },
        });
    } catch (error) {
        console.error("[API/Export] Error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Lỗi không xác định khi xuất file." },
            { status: 500 }
        );
    }
}

/** Helper: convert text content to key-value for Excel fallback */
function contentToKV(content: string): Record<string, string> {
    const lines = content.split("\n").filter((l) => l.trim());
    const result: Record<string, string> = {};
    lines.forEach((line, i) => {
        const kvMatch = line.match(/^(.+?)\s*[:：]\s*(.+)$/);
        if (kvMatch) {
            result[kvMatch[1].trim()] = kvMatch[2].trim();
        } else {
            result[`line_${i + 1}`] = line.trim();
        }
    });
    return result;
}

/** GET: Supported formats */
export async function GET() {
    return NextResponse.json({
        status: "ok",
        formats: ["pdf", "xlsx", "docx"],
        usage: {
            method: "POST",
            body: {
                format: "pdf | xlsx | docx",
                content: "string (required for pdf/docx)",
                jsonData: "object | array (optional for xlsx, overrides content)",
                title: "string (optional)",
                confidence: "number (optional)",
                provider: "string (optional)",
            },
        },
    });
}
