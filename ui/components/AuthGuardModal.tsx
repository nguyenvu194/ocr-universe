"use client";

/**
 * AuthGuardModal — Premium glassmorphism login popup
 *
 * Shows when unauthenticated users try to use OCR features.
 * Includes Google OAuth + redirect to login page.
 * Uses React Portal to render at document.body level (bypasses CSS stacking context issues).
 */

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ScanText } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/contexts/auth.context";
import { toast } from "sonner";
import Link from "next/link";

interface AuthGuardModalProps {
    open: boolean;
    onClose: () => void;
}

export default function AuthGuardModal({ open, onClose }: AuthGuardModalProps) {
    const { googleLogin } = useAuth();

    const handleGoogleSuccess = async (credentialResponse: any) => {
        const idToken = credentialResponse?.credential;
        if (!idToken) {
            toast.error("Không nhận được thông tin từ Google");
            return;
        }
        try {
            await googleLogin(idToken, null);
            toast.success("Đăng nhập thành công!");
            onClose();
        } catch (err: any) {
            toast.error(err?.message || "Đăng nhập Google thất bại");
        }
    };

    if (typeof document === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 24 }}
                        transition={{ type: "spring", damping: 26, stiffness: 300 }}
                        className="relative w-full max-w-[380px] rounded-3xl border border-white/[0.08] bg-slate-900/95 backdrop-blur-xl p-8 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close */}
                        <button
                            onClick={onClose}
                            aria-label="Đóng"
                            className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-white/8 transition-colors text-white/40 hover:text-white/80"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Branding icon */}
                        <div className="flex justify-center mb-5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <ScanText className="w-7 h-7 text-white" />
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-center text-lg font-bold text-white tracking-tight mb-1.5">
                            Tiếp tục với OCR Universe
                        </h3>
                        <p className="text-center text-sm text-slate-400 mb-7 leading-relaxed">
                            Đăng nhập để trích xuất văn bản từ ảnh<br />
                            và sử dụng đầy đủ tính năng AI.
                        </p>

                        {/* Google Login */}
                        <div className="flex justify-center mb-4">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => toast.error("Google login thất bại")}
                                theme="filled_black"
                                shape="pill"
                                size="large"
                                width="320"
                                text="continue_with"
                            />
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px bg-white/[0.06]" />
                            <span className="text-[11px] text-slate-500 uppercase tracking-wider">hoặc</span>
                            <div className="flex-1 h-px bg-white/[0.06]" />
                        </div>

                        {/* Login with email */}
                        <Link
                            href="/login"
                            className="flex items-center justify-center w-full py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-slate-300 hover:text-white hover:border-white/20 hover:bg-white/[0.04] transition-all duration-200"
                        >
                            Đăng nhập bằng email
                        </Link>

                        {/* Maybe later */}
                        <button
                            onClick={onClose}
                            className="w-full mt-3 py-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
                        >
                            Để sau
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
