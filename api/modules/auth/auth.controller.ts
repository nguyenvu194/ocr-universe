/**
 * Auth Controller — HTTP request handlers cho auth endpoints
 *
 * Mỗi method:
 *   1. Validate input (Zod)
 *   2. Gọi AuthService
 *   3. Trả response chuẩn hoá
 *   4. Catch errors → HTTP status phù hợp
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { AuthService, AuthError } from "./auth.service";
import {
    registerSchema,
    loginSchema,
    googleAuthSchema,
    sendOtpSchema,
    registerVerifySchema,
} from "./auth.validation";

// ─── Helpers ─────────────────────────────────────────────

function formatZodErrors(error: ZodError): string[] {
    return error.issues.map((e: any) => {
        const path = e.path ? e.path.join(".") : "";
        return path ? `${path}: ${e.message}` : e.message;
    });
}

function handleError(res: Response, error: unknown): Response {
    // AuthError — lỗi nghiệp vụ (email trùng, sai pass, account bị khóa...)
    if (error instanceof AuthError) {
        return res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
            },
        });
    }

    // Unexpected error
    console.error("[Auth] Unexpected error:", error);
    return res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_ERROR",
            message: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
        },
    });
}

// ─── Controller ──────────────────────────────────────────

export class AuthController {
    /**
     * POST /auth/register
     *
     * Body: { email, password, displayName? }
     * Response: { success, data: { user, token } }
     */
    static async register(req: Request, res: Response): Promise<Response> {
        try {
            // Validate
            const input = registerSchema.parse(req.body);

            // Execute
            const result = await AuthService.register(
                input.email,
                input.password,
                input.displayName
            );

            return res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Dữ liệu không hợp lệ",
                        details: formatZodErrors(error),
                    },
                });
            }
            return handleError(res, error);
        }
    }

    /**
     * POST /auth/login
     *
     * Body: { email, password }
     * Response: { success, data: { user, token } }
     */
    static async login(req: Request, res: Response): Promise<Response> {
        try {
            const input = loginSchema.parse(req.body);
            const result = await AuthService.login(input.email, input.password);

            return res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Dữ liệu không hợp lệ",
                        details: formatZodErrors(error),
                    },
                });
            }
            return handleError(res, error);
        }
    }

    /**
     * POST /auth/google
     *
     * Body: { idToken }
     * Response: { success, data: { user, token, action } }
     */
    static async googleAuth(req: Request, res: Response): Promise<Response> {
        try {
            const input = googleAuthSchema.parse(req.body);
            const result = await AuthService.googleAuth(input.idToken);

            const statusCode = result.action === "registered" ? 201 : 200;

            return res.status(statusCode).json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Dữ liệu không hợp lệ",
                        details: formatZodErrors(error),
                    },
                });
            }
            return handleError(res, error);
        }
    }

    /**
     * GET /auth/me
     *
     * Headers: Authorization: Bearer <token>
     * Response: { success, data: { user } }
     *
     * Lưu ý: req.userId được set bởi authMiddleware
     */
    static async getMe(req: Request, res: Response): Promise<Response> {
        try {
            const userId = (req as any).userId;
            const user = await AuthService.getProfile(userId);

            return res.json({
                success: true,
                data: { user },
            });
        } catch (error) {
            return handleError(res, error);
        }
    }

    /**
     * PATCH /auth/profile
     *
     * Headers: Authorization: Bearer <token>
     * Body: { displayName?: string }
     * Response: { success, data: { user } }
     */
    static async updateProfile(req: Request, res: Response): Promise<Response> {
        try {
            const userId = (req as any).userId;
            const { displayName } = req.body;

            if (displayName !== undefined && typeof displayName !== "string") {
                return res.status(400).json({
                    success: false,
                    error: { code: "VALIDATION_ERROR", message: "displayName phải là chuỗi" },
                });
            }

            await AuthService.updateProfile(userId, {
                displayName: displayName?.trim() || null,
            });

            const user = await AuthService.getProfile(userId);

            return res.json({
                success: true,
                data: { user },
            });
        } catch (error) {
            return handleError(res, error);
        }
    }

    /**
     * POST /auth/send-register-otp
     *
     * Body: { email }
     * Response: { success, data: { message } }
     */
    static async sendRegisterOtp(req: Request, res: Response): Promise<Response> {
        try {
            const input = sendOtpSchema.parse(req.body);
            const result = await AuthService.sendRegisterOTP(input.email);

            return res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Dữ liệu không hợp lệ",
                        details: formatZodErrors(error),
                    },
                });
            }
            return handleError(res, error);
        }
    }

    /**
     * POST /auth/register-verify
     *
     * Body: { email, otp, password, displayName? }
     * Response: { success, data: { user, token } }
     */
    static async registerVerify(req: Request, res: Response): Promise<Response> {
        try {
            const input = registerVerifySchema.parse(req.body);
            const result = await AuthService.registerWithOTP(
                input.email,
                input.otp,
                input.password,
                input.displayName
            );

            return res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Dữ liệu không hợp lệ",
                        details: formatZodErrors(error),
                    },
                });
            }
            return handleError(res, error);
        }
    }
}
