/**
 * API Service — Cấu hình fetch wrapper cho Backend API
 *
 * Features:
 *   - Base URL: http://localhost:4000
 *   - Tự động đính kèm JWT token từ localStorage
 *   - Tự động parse JSON response
 *   - Error handling chuẩn hoá
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TOKEN_KEY = "ocr_auth_token";

// ─── Types ───────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: string[];
    };
}

export interface UserProfile {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    isActive: boolean;
    emailVerified: boolean;
    balance: number;
    balanceUsd: number;
    createdAt: string;
}

export interface AuthData {
    user: UserProfile;
    token: string;
}

export interface GoogleAuthData extends AuthData {
    action: "login" | "linked" | "registered";
}

// ─── Token Management ────────────────────────────────────

export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

// ─── Fetch Wrapper ───────────────────────────────────────

async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const token = getToken();

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok && !data.error) {
        throw new Error(`HTTP ${response.status}`);
    }

    return data;
}

// ─── Auth API ────────────────────────────────────────────

export const authApi = {
    register(email: string, password: string, displayName?: string) {
        return apiRequest<AuthData>("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password, displayName }),
        });
    },

    login(email: string, password: string) {
        return apiRequest<AuthData>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
    },

    googleAuth(idToken: string) {
        return apiRequest<GoogleAuthData>("/auth/google", {
            method: "POST",
            body: JSON.stringify({ idToken }),
        });
    },

    getMe() {
        return apiRequest<{ user: UserProfile }>("/auth/me");
    },

    // ─── OTP Registration ────────────────────────────────

    sendRegisterOtp(email: string) {
        return apiRequest<{ message: string }>("/auth/send-register-otp", {
            method: "POST",
            body: JSON.stringify({ email }),
        });
    },

    registerVerify(data: {
        email: string;
        otp: string;
        password: string;
        displayName?: string;
    }) {
        return apiRequest<AuthData>("/auth/register-verify", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },
};

// ─── Profile API ─────────────────────────────────────────

export const profileApi = {
    updateProfile(data: { displayName?: string }) {
        return apiRequest<{ user: UserProfile }>("/auth/profile", {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },
};

// ─── Billing API ─────────────────────────────────────────

export interface Transaction {
    id: string;
    type: "deposit" | "package_purchase" | "consume" | "refund";
    amount_cents: number;
    status: "pending" | "completed" | "success" | "paid" | "failed" | "cancelled";
    description: string | null;
    payment_method: string | null;
    created_at: string;
}

export interface WalletItem {
    id: string;
    user_id: string;
    balance: number;
    total_deposited: number;
    total_spent: number;
    currency_code: string;
    currency_name: string;
}

export interface WalletInfo {
    wallets: WalletItem[];
    totalBalanceUsd: number;
    tokenBalances: Array<{
        id: string;
        package_name: string;
        package_slug: string;
        input_tokens_remaining: number;
        output_tokens_remaining: number;
        is_exhausted: boolean;
        expires_at: string | null;
    }>;
}

export const billingApi = {
    getWallet() {
        return apiRequest<WalletInfo>("/api/billing/wallet");
    },

    getTransactions(limit = 20, offset = 0) {
        return apiRequest<Transaction[]>(
            `/api/billing/transactions?limit=${limit}&offset=${offset}`
        );
    },

    getPackages() {
        return apiRequest<any[]>("/api/billing/packages");
    },
};
