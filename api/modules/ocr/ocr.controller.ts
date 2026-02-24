/**
 * OCR Controller — HTTP endpoint cho OCR
 *
 * Routes:
 *   POST /api/ocr/scan     — Upload ảnh & OCR (có trừ token)
 *
 * TODO: Tích hợp Express router + multer upload
 */

import { Request, Response } from "express";
import { OcrService } from "./ocr.service";

export class OcrController {
    /**
     * POST /api/ocr/scan
     */
    static async scan(req: Request, res: Response) {
        try {
            const userId = (req as any).userId;
            const file = (req as any).file; // multer

            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: "Vui lòng upload ảnh",
                });
            }

            const result = await OcrService.processWithBilling({
                userId,
                imageBuffer: file.buffer,
                fileName: file.originalname,
                mimeType: file.mimetype,
                provider: (req.query.provider as any) || "TESSERACT",
                ip: req.ip,
                ua: req.headers["user-agent"],
            });

            return res.json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            const status = error.message.includes("token") ? 402 : 500;
            return res.status(status).json({
                success: false,
                error: error.message || "Lỗi OCR",
            });
        }
    }
}
