/**
 * Email Service — Gửi email qua SMTP (nodemailer)
 *
 * Features:
 *   - Cấu hình SMTP transporter (Gmail / custom)
 *   - Template email OTP đẹp
 *   - Retry-friendly: mỗi lời gọi tạo mới connection
 */

import nodemailer from "nodemailer";

// ─── Config ──────────────────────────────────────────────

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || `"OCR Universe" <${SMTP_USER}>`;

// Dev mode: skip email khi SMTP chưa cấu hình
const IS_SMTP_CONFIGURED =
    SMTP_USER !== "" &&
    SMTP_PASS !== "" &&
    !SMTP_USER.includes("your_") &&
    !SMTP_PASS.includes("your_");

// ─── Transporter ─────────────────────────────────────────

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

// ─── OTP Email Template ─────────────────────────────────

function otpEmailHTML(otp: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="max-width:480px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(59,130,246,0.2);">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:32px 24px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">🔐 Xác thực Email</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">OCR Universe</p>
        </div>

        <!-- Body -->
        <div style="padding:32px 24px;">
            <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Xin chào! Bạn đang đăng ký tài khoản OCR Universe. Vui lòng sử dụng mã OTP bên dưới để xác thực email:
            </p>

            <!-- OTP Code -->
            <div style="text-align:center;margin:24px 0;">
                <div style="display:inline-block;background:#0f172a;border:2px solid #3b82f6;border-radius:12px;padding:16px 40px;letter-spacing:12px;font-size:32px;font-weight:700;color:#60a5fa;">
                    ${otp}
                </div>
            </div>

            <p style="color:#94a3b8;font-size:13px;text-align:center;margin:24px 0 0;">
                ⏱ Mã có hiệu lực trong <strong style="color:#f59e0b;">5 phút</strong>
            </p>

            <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0;">

            <p style="color:#64748b;font-size:12px;line-height:1.5;margin:0;">
                Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này. Mã OTP sẽ tự động hết hạn.
            </p>
        </div>

        <!-- Footer -->
        <div style="background:#0f172a;padding:16px 24px;text-align:center;">
            <p style="margin:0;color:#475569;font-size:11px;">
                © 2026 OCR Universe. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;
}

// ─── Public API ──────────────────────────────────────────

export class EmailService {
    /**
     * Gửi email OTP xác thực đăng ký
     *
     * Dev mode: nếu SMTP chưa cấu hình → log OTP ra console
     */
    static async sendOTP(email: string, otp: string): Promise<void> {
        if (!IS_SMTP_CONFIGURED) {
            console.log(`\n╔══════════════════════════════════════╗`);
            console.log(`║  📧 [DEV] OTP for ${email}`);
            console.log(`║  🔑 Code: ${otp}`);
            console.log(`╚══════════════════════════════════════╝\n`);
            return;
        }

        await transporter.sendMail({
            from: SMTP_FROM,
            to: email,
            subject: `🔐 Mã xác thực OTP: ${otp} — OCR Universe`,
            html: otpEmailHTML(otp),
        });
    }

    /**
     * Test kết nối SMTP
     */
    static async verifyConnection(): Promise<boolean> {
        try {
            await transporter.verify();
            console.log("[Email] SMTP connection verified");
            return true;
        } catch (error) {
            console.error("[Email] SMTP connection failed:", error);
            return false;
        }
    }
}
