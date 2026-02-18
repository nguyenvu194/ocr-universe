"use client";

/**
 * Login Page — Đăng nhập only
 *
 * UI:
 *   - Form email/password + Google OAuth
 *   - Validation + error display
 *   - Link to /register for new accounts
 */

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GoogleLogin } from "@react-oauth/google";
import Link from "next/link";
import { useAuth } from "@/contexts/auth.context";

export default function LoginPage() {
    const { login, googleLogin } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<string[]>([]);

    // ─── Submit Form ─────────────────────────────────────

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setFieldErrors([]);
        setLoading(true);

        try {
            await login(email, password);
            toast.success("Đăng nhập thành công!");
        } catch (err: any) {
            const message = err?.message || "Đã xảy ra lỗi";
            toast.error(message);
            setFieldErrors([message]);
        } finally {
            setLoading(false);
        }
    };

    // ─── Google Login ────────────────────────────────────

    const handleGoogleSuccess = async (credentialResponse: any) => {
        const idToken = credentialResponse?.credential;
        if (!idToken) {
            toast.error("Không nhận được thông tin từ Google");
            return;
        }

        setLoading(true);
        try {
            await googleLogin(idToken);
            toast.success("Đăng nhập Google thành công!");
        } catch (err: any) {
            toast.error(err?.message || "Đăng nhập Google thất bại");
        } finally {
            setLoading(false);
        }
    };

    // ─── Render ──────────────────────────────────────────

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Card */}
                <div className="rounded-2xl border border-white/10 bg-bg-card/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/20">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white">
                            Chào mừng trở lại
                        </h1>
                        <p className="text-white/70 text-sm mt-2">
                            Đăng nhập để tiếp tục sử dụng OCR Universe
                        </p>
                    </div>

                    {/* Google Login — white style */}
                    <div className="mb-6">
                        <div className="flex justify-center [&>div]:!w-full">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => toast.error("Google login thất bại")}
                                theme="outline"
                                shape="pill"
                                size="large"
                                text="signin_with"
                                width="100%"
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-white/50 text-xs uppercase tracking-wider font-medium">
                            hoặc
                        </span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error Display */}
                        <AnimatePresence>
                            {fieldErrors.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="rounded-lg bg-red-500/10 border border-red-500/20 p-3"
                                >
                                    {fieldErrors.map((err, i) => (
                                        <p key={i} className="text-red-400 text-sm">
                                            {err}
                                        </p>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    Đăng nhập
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Register link */}
                    <p className="text-center text-white/60 text-sm mt-6">
                        Chưa có tài khoản?{" "}
                        <Link
                            href="/register"
                            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            Đăng ký ngay
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-white/40 text-xs mt-6">
                    Bằng việc tiếp tục, bạn đồng ý với{" "}
                    <span className="text-white/50 hover:text-white/70 cursor-pointer transition-colors">
                        Điều khoản sử dụng
                    </span>{" "}
                    và{" "}
                    <span className="text-white/50 hover:text-white/70 cursor-pointer transition-colors">
                        Chính sách bảo mật
                    </span>
                </p>
            </motion.div>
        </div>
    );
}
