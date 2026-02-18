"use client";

/**
 * Register Page — 3-step OTP Registration
 *
 * Step 1: Nhập email → Gửi OTP
 * Step 2: Nhập OTP 6 số
 * Step 3: Nhập Full Name + Password + Confirm Password → Tạo tài khoản
 */

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mail, Lock, User, ArrowRight, ArrowLeft,
    Loader2, ShieldCheck, RefreshCw, UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { authApi } from "@/services/api";
import { useAuth } from "@/contexts/auth.context";
import OtpInput from "@/components/OtpInput";

// ─── Zod Schemas ─────────────────────────────────────────

const step1Schema = z.object({
    email: z.string().min(1, "Email là bắt buộc").email("Email không hợp lệ"),
});

const step2Schema = z.object({
    otp: z
        .string()
        .length(6, "Mã OTP phải có đúng 6 chữ số")
        .regex(/^\d{6}$/, "Mã OTP chỉ chứa chữ số"),
});

const step3Schema = z
    .object({
        displayName: z.string().max(100, "Tên không được quá 100 ký tự").optional(),
        password: z
            .string()
            .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                "Cần ít nhất 1 chữ hoa, 1 chữ thường, 1 số"
            ),
        confirmPassword: z.string().min(1, "Xác nhận mật khẩu là bắt buộc"),
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: "Mật khẩu xác nhận không khớp",
        path: ["confirmPassword"],
    });

// ─── Slide Variants ──────────────────────────────────────

const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// ─── Step Icons & Titles ─────────────────────────────────

const STEPS = [
    { icon: Mail, title: "Tạo tài khoản", desc: "Nhập email để nhận mã xác thực OTP" },
    { icon: ShieldCheck, title: "Xác thực email", desc: "" },
    { icon: UserPlus, title: "Hoàn tất đăng ký", desc: "Nhập thông tin tài khoản của bạn" },
] as const;

// ─── Component ───────────────────────────────────────────

export default function RegisterPage() {
    const router = useRouter();
    const { loginWithToken } = useAuth();

    // Steps: 1 | 2 | 3
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [direction, setDirection] = useState(1);

    // Data shared across steps
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");

    // Step 1
    const [emailInput, setEmailInput] = useState("");
    const [step1Errors, setStep1Errors] = useState<string[]>([]);
    const [sendingOtp, setSendingOtp] = useState(false);

    // Step 2
    const [step2Errors, setStep2Errors] = useState<string[]>([]);

    // Step 3
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [step3Errors, setStep3Errors] = useState<string[]>([]);
    const [registering, setRegistering] = useState(false);

    // Countdown
    const [countdown, setCountdown] = useState(0);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        if (countdown <= 0) return;
        const t = setInterval(() => setCountdown((p) => p - 1), 1000);
        return () => clearInterval(t);
    }, [countdown]);

    // ─── Step 1: Send OTP ────────────────────────────────

    const handleSendOtp = useCallback(
        async (e?: FormEvent) => {
            e?.preventDefault();
            setStep1Errors([]);

            const result = step1Schema.safeParse({ email: emailInput });
            if (!result.success) {
                setStep1Errors(result.error.issues.map((i) => i.message));
                return;
            }

            setSendingOtp(true);
            try {
                const res = await authApi.sendRegisterOtp(result.data.email);
                if (res.success) {
                    setEmail(result.data.email);
                    setDirection(1);
                    setStep(2);
                    setCountdown(60);
                    toast.success("Mã OTP đã gửi đến email của bạn!");
                } else {
                    const msg = res.error?.message || "Không thể gửi OTP";
                    toast.error(msg);
                    setStep1Errors([msg]);
                }
            } catch (err: any) {
                const msg = err?.message || "Lỗi kết nối server";
                toast.error(msg);
                setStep1Errors([msg]);
            } finally {
                setSendingOtp(false);
            }
        },
        [emailInput]
    );

    // ─── Resend OTP ──────────────────────────────────────

    const handleResend = useCallback(async () => {
        if (countdown > 0 || resending) return;
        setResending(true);
        try {
            const res = await authApi.sendRegisterOtp(email);
            if (res.success) {
                setCountdown(60);
                setOtp("");
                toast.success("Mã OTP mới đã được gửi!");
            } else {
                toast.error(res.error?.message || "Không thể gửi lại OTP");
            }
        } catch {
            toast.error("Lỗi kết nối server");
        } finally {
            setResending(false);
        }
    }, [email, countdown, resending]);

    // ─── Step 2: Verify OTP → Go to Step 3 ──────────────

    const handleVerifyOtp = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            setStep2Errors([]);

            const result = step2Schema.safeParse({ otp });
            if (!result.success) {
                setStep2Errors(result.error.issues.map((i) => i.message));
                return;
            }

            // OTP is valid locally → go to step 3
            setDirection(1);
            setStep(3);
        },
        [otp]
    );

    // ─── Step 3: Register ────────────────────────────────

    const handleRegister = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setStep3Errors([]);

            const result = step3Schema.safeParse({
                displayName: displayName || undefined,
                password,
                confirmPassword,
            });
            if (!result.success) {
                setStep3Errors(result.error.issues.map((i) => i.message));
                return;
            }

            setRegistering(true);
            try {
                const res = await authApi.registerVerify({
                    email,
                    otp,
                    password: result.data.password,
                    displayName: result.data.displayName,
                });

                if (res.success && res.data) {
                    await loginWithToken(res.data.token);
                    toast.success("Đăng ký thành công! Chào mừng bạn 🎉");
                    router.push("/");
                } else {
                    const msg = res.error?.message || "Đăng ký thất bại";
                    toast.error(msg);
                    setStep3Errors([msg]);
                }
            } catch (err: any) {
                const msg = err?.message || "Lỗi kết nối server";
                toast.error(msg);
                setStep3Errors([msg]);
            } finally {
                setRegistering(false);
            }
        },
        [email, otp, displayName, password, confirmPassword, router]
    );

    // ─── Navigation ──────────────────────────────────────

    const goBack = () => {
        setDirection(-1);
        if (step === 3) {
            setStep(2);
            setStep3Errors([]);
        } else if (step === 2) {
            setStep(1);
            setStep2Errors([]);
            setOtp("");
        }
    };

    // ─── Helpers ─────────────────────────────────────────

    const loading = sendingOtp || registering;
    const currentStep = STEPS[step - 1];
    const Icon = currentStep.icon;

    const stepDesc =
        step === 2
            ? `Mã OTP đã gửi đến ${email}`
            : currentStep.desc;

    // ─── Error display helper ────────────────────────────

    const ErrorBlock = ({ errors }: { errors: string[] }) => (
        <AnimatePresence>
            {errors.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="rounded-lg bg-red-500/10 border border-red-500/20 p-3"
                >
                    {errors.map((err, i) => (
                        <p key={i} className="text-red-400 text-sm">{err}</p>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );

    // ─── Input class ─────────────────────────────────────

    const inputCls =
        "w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm disabled:opacity-40";

    // ─── Render ──────────────────────────────────────────

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background */}
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
                <div className="rounded-2xl border border-white/10 bg-[var(--bg-card)]/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/20">
                    {/* Step indicator — 3 bars */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`h-1 rounded-full transition-all duration-300 ${s <= step ? "w-8 bg-blue-500" : "w-6 bg-white/10"
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Animated Steps */}
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={step}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                        >
                            {/* Header — shared across all steps */}
                            <div className="text-center mb-6">
                                <div className="inline-flex w-14 h-14 bg-blue-500/10 rounded-2xl items-center justify-center mb-4">
                                    <Icon className="w-7 h-7 text-blue-400" />
                                </div>
                                <h1 className="text-2xl font-bold text-white">{currentStep.title}</h1>
                                <p className="text-white/70 text-sm mt-2">
                                    {step === 2 ? (
                                        <>
                                            Mã OTP đã gửi đến{" "}
                                            <span className="text-blue-400 font-medium">{email}</span>
                                        </>
                                    ) : (
                                        stepDesc
                                    )}
                                </p>
                            </div>

                            {/* ═══ STEP 1: Email ═══ */}
                            {step === 1 && (
                                <form onSubmit={handleSendOtp} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                            <input
                                                type="email"
                                                value={emailInput}
                                                onChange={(e) => setEmailInput(e.target.value)}
                                                placeholder="you@example.com"
                                                required
                                                disabled={loading}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>

                                    <ErrorBlock errors={step1Errors} />

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {sendingOtp ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>Gửi mã xác thực <ArrowRight className="w-4 h-4" /></>
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* ═══ STEP 2: OTP ═══ */}
                            {step === 2 && (
                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2 text-center">
                                            Mã OTP
                                        </label>
                                        <OtpInput value={otp} onChange={setOtp} disabled={loading} />

                                        <div className="text-center mt-3">
                                            {countdown > 0 ? (
                                                <span className="text-white/50 text-xs">
                                                    Gửi lại sau{" "}
                                                    <span className="text-amber-400 font-medium">{countdown}s</span>
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handleResend}
                                                    disabled={resending}
                                                    className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
                                                    Gửi lại mã
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <ErrorBlock errors={step2Errors} />

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={goBack}
                                            className="flex items-center justify-center gap-1 px-4 py-3 rounded-xl border border-white/10 text-white/80 text-sm font-medium hover:bg-white/5 transition-all"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                            Quay lại
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={otp.length !== 6}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Xác thực <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* ═══ STEP 3: Name + Password ═══ */}
                            {step === 3 && (
                                <form onSubmit={handleRegister} className="space-y-4">
                                    {/* Display Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-1.5">
                                            Họ và tên <span className="text-white/50">(tuỳ chọn)</span>
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                placeholder="Nguyễn Văn A"
                                                disabled={loading}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-1.5">Mật khẩu</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Ít nhất 8 ký tự, 1 HOA, 1 số"
                                                required
                                                disabled={loading}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-1.5">
                                            Xác nhận mật khẩu
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Nhập lại mật khẩu"
                                                required
                                                disabled={loading}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>

                                    <ErrorBlock errors={step3Errors} />

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={goBack}
                                            disabled={loading}
                                            className="flex items-center justify-center gap-1 px-4 py-3 rounded-xl border border-white/10 text-white/80 text-sm font-medium hover:bg-white/5 transition-all disabled:opacity-40"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                            Quay lại
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {registering ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>Đăng ký <ArrowRight className="w-4 h-4" /></>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Login link */}
                    <p className="text-center text-white/60 text-sm mt-6">
                        Đã có tài khoản?{" "}
                        <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                            Đăng nhập
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-white/40 text-xs mt-6">
                    Bằng việc đăng ký, bạn đồng ý với{" "}
                    <span className="text-white/50 hover:text-white/70 cursor-pointer transition-colors">Điều khoản sử dụng</span>{" "}
                    và{" "}
                    <span className="text-white/50 hover:text-white/70 cursor-pointer transition-colors">Chính sách bảo mật</span>
                </p>
            </motion.div>
        </div>
    );
}
