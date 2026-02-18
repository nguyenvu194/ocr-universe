"use client";

/**
 * OTP Input Component — 6 ô nhập riêng biệt
 *
 * Features:
 *   - Auto-focus ô tiếp theo khi nhập
 *   - Backspace quay lại ô trước
 *   - Paste hỗ trợ dán mã 6 số
 */

import { useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";

interface OtpInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export default function OtpInput({ value, onChange, disabled }: OtpInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const digits = value.padEnd(6, "").slice(0, 6).split("");

    const focusInput = useCallback((index: number) => {
        inputRefs.current[index]?.focus();
    }, []);

    const handleChange = useCallback(
        (index: number, char: string) => {
            if (!/^\d?$/.test(char)) return; // chỉ cho phép số

            const newDigits = [...digits];
            newDigits[index] = char;
            const newValue = newDigits.join("");
            onChange(newValue.replace(/\s/g, ""));

            // Auto-focus ô tiếp theo
            if (char && index < 5) {
                focusInput(index + 1);
            }
        },
        [digits, onChange, focusInput]
    );

    const handleKeyDown = useCallback(
        (index: number, e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Backspace" && !digits[index] && index > 0) {
                focusInput(index - 1);
            }
        },
        [digits, focusInput]
    );

    const handlePaste = useCallback(
        (e: ClipboardEvent<HTMLInputElement>) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (pasted) {
                onChange(pasted);
                focusInput(Math.min(pasted.length, 5));
            }
        },
        [onChange, focusInput]
    );

    return (
        <div className="flex gap-2 justify-center">
            {Array.from({ length: 6 }, (_, i) => (
                <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digits[i]?.trim() || ""}
                    disabled={disabled}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    className="w-11 h-13 text-center text-xl font-bold rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all disabled:opacity-40"
                    autoComplete="one-time-code"
                />
            ))}
        </div>
    );
}
