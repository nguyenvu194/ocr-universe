"use client";

/**
 * Auth Context — Quản lý trạng thái đăng nhập toàn app
 *
 * Features:
 *   - AuthProvider wrap layout → share user state
 *   - Tự động restore session từ localStorage trên mount (F5)
 *   - Login / Register / Google OAuth
 *   - Logout → clear token + redirect
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
    authApi,
    getToken,
    setToken,
    removeToken,
    type UserProfile,
} from "@/services/api";

// ─── Types ───────────────────────────────────────────────

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    login: (email: string, password: string, redirectTo?: string | null) => Promise<void>;
    register: (email: string, password: string, displayName?: string) => Promise<void>;
    googleLogin: (idToken: string, redirectTo?: string | null) => Promise<void>;
    loginWithToken: (token: string) => Promise<void>;
    refreshUser: () => Promise<void>;
    logout: () => void;
}

// ─── Context ─────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

// ─── Provider ────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Restore session on mount (F5 reload)
    useEffect(() => {
        const restoreSession = async () => {
            const token = getToken();
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const res = await authApi.getMe();
                if (res.success && res.data) {
                    setUser(res.data.user);
                } else {
                    removeToken();
                }
            } catch {
                removeToken();
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, []);

    // ─── Actions ──────────────────────────────────────────

    const login = useCallback(
        async (email: string, password: string, redirectTo?: string | null) => {
            const res = await authApi.login(email, password);

            if (!res.success || !res.data) {
                throw new Error(
                    res.error?.message || "Đăng nhập thất bại"
                );
            }

            setToken(res.data.token);
            setUser(res.data.user);
            if (redirectTo !== null) router.push(redirectTo ?? "/workspace");
        },
        [router]
    );

    const register = useCallback(
        async (email: string, password: string, displayName?: string) => {
            const res = await authApi.register(email, password, displayName);

            if (!res.success || !res.data) {
                throw new Error(
                    res.error?.message || "Đăng ký thất bại"
                );
            }

            setToken(res.data.token);
            setUser(res.data.user);
            router.push("/workspace");
        },
        [router]
    );

    const googleLogin = useCallback(
        async (idToken: string, redirectTo?: string | null) => {
            const res = await authApi.googleAuth(idToken);

            if (!res.success || !res.data) {
                throw new Error(
                    res.error?.message || "Đăng nhập Google thất bại"
                );
            }

            setToken(res.data.token);
            setUser(res.data.user);
            if (redirectTo !== null) router.push(redirectTo ?? "/workspace");
        },
        [router]
    );

    /**
     * loginWithToken — Dùng khi register-verify trả về token,
     * set token + fetch user profile → cập nhật context
     */
    const loginWithToken = useCallback(
        async (token: string) => {
            setToken(token);
            try {
                const res = await authApi.getMe();
                if (res.success && res.data) {
                    setUser(res.data.user);
                } else {
                    removeToken();
                    throw new Error("Không thể lấy thông tin user");
                }
            } catch {
                removeToken();
                throw new Error("Không thể lấy thông tin user");
            }
        },
        []
    );

    const refreshUser = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await authApi.getMe();
            if (res.success && res.data) {
                setUser(res.data.user);
            }
        } catch {
            // silently fail
        }
    }, []);

    const logout = useCallback(() => {
        removeToken();
        setUser(null);
        router.push("/login");
    }, [router]);

    return (
        <AuthContext.Provider
            value={{ user, loading, login, register, googleLogin, loginWithToken, refreshUser, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}
