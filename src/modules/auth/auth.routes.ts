/**
 * Auth Routes — Định nghĩa routes cho module Auth
 *
 * Routes:
 *   POST /auth/register   — Đăng ký (public)
 *   POST /auth/login      — Đăng nhập (public)
 *   POST /auth/google     — Google OAuth (public)
 *   GET  /auth/me         — Profile (protected)
 */

import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

// ─── Public routes ───────────────────────────────────────

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/google", AuthController.googleAuth);
router.post("/send-register-otp", AuthController.sendRegisterOtp);
router.post("/register-verify", AuthController.registerVerify);

// ─── Protected routes ────────────────────────────────────

router.get("/me", authMiddleware, AuthController.getMe);
router.patch("/profile", authMiddleware, AuthController.updateProfile);

export default router;
