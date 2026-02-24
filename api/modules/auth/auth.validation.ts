/**
 * Auth Validation — Zod v4 schemas cho input validation
 */

import { z } from "zod";

// ─── Register ────────────────────────────────────────────

export const registerSchema = z.object({
    email: z
        .string({ error: "Email là bắt buộc" })
        .email("Email không hợp lệ")
        .max(255, "Email không được quá 255 ký tự")
        .transform((v) => v.toLowerCase().trim()),

    password: z
        .string({ error: "Mật khẩu là bắt buộc" })
        .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
        .max(100, "Mật khẩu không được quá 100 ký tự")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, và 1 số"
        ),

    displayName: z
        .string()
        .max(100, "Tên hiển thị không được quá 100 ký tự")
        .optional(),
});

// ─── Login ───────────────────────────────────────────────

export const loginSchema = z.object({
    email: z
        .string({ error: "Email là bắt buộc" })
        .email("Email không hợp lệ")
        .transform((v) => v.toLowerCase().trim()),

    password: z
        .string({ error: "Mật khẩu là bắt buộc" })
        .min(1, "Mật khẩu là bắt buộc"),
});

// ─── Google OAuth ────────────────────────────────────────

export const googleAuthSchema = z.object({
    idToken: z
        .string({ error: "Google idToken là bắt buộc" })
        .min(1, "Google idToken là bắt buộc"),
});

// ─── Send Register OTP ───────────────────────────────────

export const sendOtpSchema = z.object({
    email: z
        .string({ error: "Email là bắt buộc" })
        .email("Email không hợp lệ")
        .max(255, "Email không được quá 255 ký tự")
        .transform((v) => v.toLowerCase().trim()),
});

// ─── Register with OTP Verify ────────────────────────────

export const registerVerifySchema = z.object({
    email: z
        .string({ error: "Email là bắt buộc" })
        .email("Email không hợp lệ")
        .max(255, "Email không được quá 255 ký tự")
        .transform((v) => v.toLowerCase().trim()),

    otp: z
        .string({ error: "Mã OTP là bắt buộc" })
        .length(6, "Mã OTP phải có đúng 6 chữ số")
        .regex(/^\d{6}$/, "Mã OTP chỉ chứa chữ số"),

    password: z
        .string({ error: "Mật khẩu là bắt buộc" })
        .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
        .max(100, "Mật khẩu không được quá 100 ký tự")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, và 1 số"
        ),

    displayName: z
        .string()
        .max(100, "Tên hiển thị không được quá 100 ký tự")
        .optional(),
});

// ─── Types ───────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type RegisterVerifyInput = z.infer<typeof registerVerifySchema>;
