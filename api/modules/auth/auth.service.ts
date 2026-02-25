/**
 * Auth Service — Business logic cho xác thực người dùng
 *
 * Chịu trách nhiệm:
 *  - Đăng ký email/password (+ tạo wallet)
 *  - Đăng ký email/OTP verification (2 bước)
 *  - Đăng nhập email/password (verify bcrypt)
 *  - Đăng nhập/Đăng ký Google OAuth (verify idToken)
 *  - Lấy thông tin user + balance
 */

import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { query } from "../../config/db";
import { EmailService } from "../../services/email.service";

// ─── Constants ───────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_to_a_random_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const OTP_EXPIRY_MINUTES = 5;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ─── Types ───────────────────────────────────────────────

export interface JwtPayload {
    userId: string;
    email: string;
}

export interface UserProfile {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    isActive: boolean;
    emailVerified: boolean;
    balance: number;
    createdAt: Date;
}

export interface AuthResponse {
    user: UserProfile;
    token: string;
}

export interface GoogleProfile {
    sub: string;
    email: string;
    name: string;
    picture: string;
    email_verified: boolean;
}

// ─── Service ─────────────────────────────────────────────

export class AuthService {
    /**
     * Tạo JWT token
     */
    static signToken(payload: JwtPayload): string {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        } as jwt.SignOptions);
    }

    /**
     * Verify JWT token
     */
    static verifyToken(token: string): JwtPayload {
        return jwt.verify(token, JWT_SECRET) as JwtPayload;
    }

    // ─── Register ────────────────────────────────────────

    /**
     * Đăng ký bằng Email & Password
     *
     * Flow:
     *   1. Hash password (bcrypt 12 rounds)
     *   2. INSERT users
     *   3. INSERT user_providers (provider = 'email')
     *   4. INSERT wallets (balance = 0)
     *   5. Return JWT + profile
     */
    static async register(
        email: string,
        password: string,
        displayName?: string
    ): Promise<AuthResponse> {
        // Check email trùng
        const [existing] = await query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );
        if (existing) {
            throw new AuthError("EMAIL_EXISTS", "Email đã được sử dụng", 409);
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Transaction: tạo user + provider (wallet tạo lazy khi nạp tiền lần đầu)
        const [user] = await query(
            `INSERT INTO users (email, display_name, email_verified)
             VALUES ($1, $2, FALSE)
             RETURNING id, email, display_name, avatar_url, is_active, email_verified, created_at`,
            [email, displayName || null]
        );

        await query(
            `INSERT INTO user_providers (user_id, provider, password_hash)
             VALUES ($1, 'email', $2)`,
            [user.id, passwordHash]
        );

        // Generate token
        const token = this.signToken({ userId: user.id, email: user.email });

        return {
            user: this.mapUserProfile(user, 0),
            token,
        };
    }

    // ─── Login ───────────────────────────────────────────

    /**
     * Đăng nhập bằng Email & Password
     *
     * Flow:
     *   1. Tìm user + password_hash từ user_providers
     *   2. Verify bcrypt
     *   3. Update last_login_at
     *   4. Return JWT + profile + balance
     */
    static async login(email: string, password: string): Promise<AuthResponse> {
        // Join users + user_providers để lấy password_hash
        const [row] = await query(
            `SELECT u.id, u.email, u.display_name, u.avatar_url,
                    u.is_active, u.email_verified, u.created_at,
                    p.password_hash
             FROM users u
             JOIN user_providers p ON p.user_id = u.id AND p.provider = 'email'
             WHERE u.email = $1`,
            [email]
        );

        if (!row) {
            throw new AuthError("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng", 401);
        }

        if (!row.is_active) {
            throw new AuthError("ACCOUNT_DISABLED", "Tài khoản đã bị khóa", 403);
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, row.password_hash);
        if (!isValidPassword) {
            throw new AuthError("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng", 401);
        }

        // Update last login
        await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [row.id]);

        // Get balance
        const [wallet] = await query(
            `SELECT balance FROM wallets WHERE user_id = $1`,
            [row.id]
        );

        const token = this.signToken({ userId: row.id, email: row.email });

        return {
            user: this.mapUserProfile(row, wallet?.balance ?? 0),
            token,
        };
    }

    // ─── Google OAuth ────────────────────────────────────

    /**
     * Đăng nhập / Đăng ký bằng Google idToken
     *
     * Flow:
     *   1. Verify idToken với Google
     *   2. Check Google ID đã link user nào chưa → login
     *   3. Check email đã tồn tại → link Google vào account
     *   4. Hoàn toàn mới → tạo user + provider + wallet
     */
    static async googleAuth(idToken: string): Promise<AuthResponse & { action: string }> {
        // 1. Verify Google idToken
        const googleProfile = await this.verifyGoogleToken(idToken);

        // 2. Check Google ID đã link chưa
        const [existingProvider] = await query(
            `SELECT u.id, u.email, u.display_name, u.avatar_url,
                    u.is_active, u.email_verified, u.created_at
             FROM user_providers p
             JOIN users u ON u.id = p.user_id
             WHERE p.provider = 'google' AND p.provider_uid = $1`,
            [googleProfile.sub]
        );

        if (existingProvider) {
            // Đã link → login
            if (!existingProvider.is_active) {
                throw new AuthError("ACCOUNT_DISABLED", "Tài khoản đã bị khóa", 403);
            }

            await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [existingProvider.id]);

            const [wallet] = await query(
                `SELECT balance FROM wallets WHERE user_id = $1`,
                [existingProvider.id]
            );

            const token = this.signToken({ userId: existingProvider.id, email: existingProvider.email });

            return {
                user: this.mapUserProfile(existingProvider, wallet?.balance ?? 0),
                token,
                action: "login",
            };
        }

        // 3. Check email đã tồn tại
        const [existingUser] = await query(
            `SELECT id, email, display_name, avatar_url, is_active, email_verified, created_at
             FROM users WHERE email = $1`,
            [googleProfile.email]
        );

        if (existingUser) {
            // Link Google vào account cũ
            await query(
                `INSERT INTO user_providers (user_id, provider, provider_uid, provider_email, provider_data)
                 VALUES ($1, 'google', $2, $3, $4)`,
                [
                    existingUser.id,
                    googleProfile.sub,
                    googleProfile.email,
                    JSON.stringify({ name: googleProfile.name, picture: googleProfile.picture }),
                ]
            );

            // Cập nhật avatar nếu chưa có + verify email
            await query(
                `UPDATE users
                 SET avatar_url = COALESCE(avatar_url, $2),
                     email_verified = TRUE,
                     last_login_at = NOW()
                 WHERE id = $1`,
                [existingUser.id, googleProfile.picture]
            );

            const [wallet] = await query(
                `SELECT balance FROM wallets WHERE user_id = $1`,
                [existingUser.id]
            );

            const updatedUser = { ...existingUser, email_verified: true, avatar_url: existingUser.avatar_url || googleProfile.picture };
            const token = this.signToken({ userId: existingUser.id, email: existingUser.email });

            return {
                user: this.mapUserProfile(updatedUser, wallet?.balance ?? 0),
                token,
                action: "linked",
            };
        }

        // 4. Tạo user hoàn toàn mới
        const [newUser] = await query(
            `INSERT INTO users (email, display_name, avatar_url, email_verified)
             VALUES ($1, $2, $3, TRUE)
             RETURNING id, email, display_name, avatar_url, is_active, email_verified, created_at`,
            [googleProfile.email, googleProfile.name, googleProfile.picture]
        );

        // Wallet tạo lazy khi nạp tiền lần đầu
        await query(
            `INSERT INTO user_providers (user_id, provider, provider_uid, provider_email, provider_data)
             VALUES ($1, 'google', $2, $3, $4)`,
            [
                newUser.id,
                googleProfile.sub,
                googleProfile.email,
                JSON.stringify({ name: googleProfile.name, picture: googleProfile.picture }),
            ]
        );

        const token = this.signToken({ userId: newUser.id, email: newUser.email });

        return {
            user: this.mapUserProfile(newUser, 0),
            token,
            action: "registered",
        };
    }

    // ─── OTP Registration (2-step) ───────────────────────

    /**
     * Bước 1: Gửi OTP xác thực email
     *
     * Flow:
     *   1. Check email trùng
     *   2. Sinh OTP 6 số ngẫu nhiên (crypto)
     *   3. UPSERT vào otp_verifications (unique email)
     *   4. Gửi email chứa OTP
     */
    static async sendRegisterOTP(email: string): Promise<{ message: string }> {
        // Check email đã tồn tại
        const [existing] = await query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );
        if (existing) {
            throw new AuthError("EMAIL_EXISTS", "Email đã được sử dụng", 409);
        }

        // Sinh OTP 6 chữ số
        const otp = crypto.randomInt(100_000, 999_999).toString();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // UPSERT: nếu email đã có OTP cũ → cập nhật mới
        await query(
            `INSERT INTO otp_verifications (email, otp, expires_at)
             VALUES ($1, $2, $3)
             ON CONFLICT ON CONSTRAINT uq_otp_email
             DO UPDATE SET otp = $2, expires_at = $3, created_at = NOW()`,
            [email, otp, expiresAt.toISOString()]
        );

        // Gửi email
        await EmailService.sendOTP(email, otp);

        return {
            message: `Mã OTP đã được gửi đến ${email}. Vui lòng kiểm tra email.`,
        };
    }

    /**
     * Bước 2: Xác thực OTP + tạo tài khoản
     *
     * Flow:
     *   1. Tìm OTP theo email
     *   2. Check hợp lệ + chưa hết hạn
     *   3. Tạo user + provider + wallet
     *   4. Xoá OTP
     *   5. Return JWT + profile
     */
    static async registerWithOTP(
        email: string,
        otp: string,
        password: string,
        displayName?: string
    ): Promise<AuthResponse> {
        // 1. Tìm OTP record
        const [record] = await query(
            `SELECT otp, expires_at FROM otp_verifications WHERE email = $1`,
            [email]
        );

        if (!record) {
            throw new AuthError("OTP_NOT_FOUND", "Không tìm thấy mã OTP. Vui lòng gửi lại.", 400);
        }

        // 2. Check hết hạn
        if (new Date(record.expires_at) < new Date()) {
            // Xoá OTP hết hạn
            await query(`DELETE FROM otp_verifications WHERE email = $1`, [email]);
            throw new AuthError("OTP_EXPIRED", "Mã OTP đã hết hạn. Vui lòng gửi lại.", 400);
        }

        // 3. Check OTP khớp
        if (record.otp !== otp) {
            throw new AuthError("OTP_INVALID", "Mã OTP không đúng.", 400);
        }

        // 4. Double-check email chưa bị đăng ký (race condition guard)
        const [existingUser] = await query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );
        if (existingUser) {
            await query(`DELETE FROM otp_verifications WHERE email = $1`, [email]);
            throw new AuthError("EMAIL_EXISTS", "Email đã được sử dụng", 409);
        }

        // 5. Tạo user + provider + wallet
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const [user] = await query(
            `INSERT INTO users (email, display_name, email_verified)
             VALUES ($1, $2, TRUE)
             RETURNING id, email, display_name, avatar_url, is_active, email_verified, created_at`,
            [email, displayName || null]
        );

        await query(
            `INSERT INTO user_providers (user_id, provider, password_hash)
             VALUES ($1, 'email', $2)`,
            [user.id, passwordHash]
        );

        // 6. Xoá OTP (single-use)
        await query(`DELETE FROM otp_verifications WHERE email = $1`, [email]);

        // 7. Generate JWT
        const token = this.signToken({ userId: user.id, email: user.email });

        return {
            user: this.mapUserProfile(user, 0),
            token,
        };
    }

    // ─── Update Profile ──────────────────────────────────

    /**
     * Cập nhật thông tin user (displayName)
     */
    static async updateProfile(
        userId: string,
        data: { displayName: string | null }
    ): Promise<void> {
        await query(
            `UPDATE users SET display_name = $2, updated_at = NOW() WHERE id = $1`,
            [userId, data.displayName]
        );
    }

    // ─── Get Profile ─────────────────────────────────────

    /**
     * Lấy thông tin user + balance
     */
    static async getProfile(userId: string): Promise<UserProfile> {
        const [user] = await query(
            `SELECT u.id, u.email, u.display_name, u.avatar_url,
                    u.is_active, u.email_verified, u.created_at,
                    COALESCE(w.balance, 0) as balance
             FROM users u
             LEFT JOIN wallets w ON w.user_id = u.id
             WHERE u.id = $1`,
            [userId]
        );

        if (!user) {
            throw new AuthError("USER_NOT_FOUND", "Không tìm thấy người dùng", 404);
        }

        return this.mapUserProfile(user, user.balance);
    }

    // ─── Private Helpers ─────────────────────────────────

    /**
     * Verify Google idToken → trả về profile
     */
    private static async verifyGoogleToken(idToken: string): Promise<GoogleProfile> {
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            if (!payload) {
                throw new Error("Empty payload");
            }

            return {
                sub: payload.sub,
                email: payload.email || "",
                name: payload.name || "",
                picture: payload.picture || "",
                email_verified: payload.email_verified ?? false,
            };
        } catch (error) {
            throw new AuthError("GOOGLE_TOKEN_INVALID", "Google token không hợp lệ hoặc đã hết hạn", 401);
        }
    }

    /**
     * Map DB row → UserProfile
     */
    private static mapUserProfile(row: any, balance: number): UserProfile {
        return {
            id: row.id,
            email: row.email,
            displayName: row.display_name,
            avatarUrl: row.avatar_url,
            isActive: row.is_active,
            emailVerified: row.email_verified,
            balance: Number(balance),
            createdAt: row.created_at,
        };
    }
}

// ─── Custom Error ────────────────────────────────────────

export class AuthError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 400
    ) {
        super(message);
        this.name = "AuthError";
    }
}
