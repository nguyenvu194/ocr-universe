/**
 * Auth Middleware — Xác thực JWT từ Authorization header
 *
 * Sử dụng:
 *   router.get("/me", authMiddleware, controller.getMe);
 *
 * Flow:
 *   1. Lấy token từ header "Authorization: Bearer <token>"
 *   2. Verify JWT
 *   3. Gắn userId + email vào req
 *   4. Nếu invalid → 401
 */

import { Request, Response, NextFunction } from "express";
import { AuthService } from "../modules/auth/auth.service";

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userEmail?: string;
        }
    }
}

export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // 1. Lấy token
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                error: {
                    code: "NO_TOKEN",
                    message: "Vui lòng đăng nhập để tiếp tục",
                },
            });
            return;
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            res.status(401).json({
                success: false,
                error: {
                    code: "NO_TOKEN",
                    message: "Token không hợp lệ",
                },
            });
            return;
        }

        // 2. Verify JWT
        const payload = AuthService.verifyToken(token);

        // 3. Gắn vào request
        req.userId = payload.userId;
        req.userEmail = payload.email;

        next();
    } catch (error: any) {
        // JWT expired
        if (error?.name === "TokenExpiredError") {
            res.status(401).json({
                success: false,
                error: {
                    code: "TOKEN_EXPIRED",
                    message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
                },
            });
            return;
        }

        // JWT malformed / invalid
        res.status(401).json({
            success: false,
            error: {
                code: "INVALID_TOKEN",
                message: "Token không hợp lệ",
            },
        });
    }
}
