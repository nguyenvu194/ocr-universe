"use client";

/**
 * Account Profile Page
 *
 * - Display email (read-only)
 * - Edit full name (with save button)
 * - Show account creation date
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Calendar, Save, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth.context";
import { profileApi } from "@/services/api";

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();

    const [displayName, setDisplayName] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Sync displayName when user loads
    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || "");
        }
    }, [user]);

    const hasChanges = user && displayName !== (user.displayName || "");

    const handleSave = async () => {
        if (!hasChanges) return;
        setSaving(true);
        setSaved(false);

        try {
            const res = await profileApi.updateProfile({ displayName: displayName.trim() });
            if (res.success) {
                await refreshUser();
                setSaved(true);
                toast.success("Đã cập nhật thông tin!");
                setTimeout(() => setSaved(false), 2000);
            } else {
                toast.error(res.error?.message || "Cập nhật thất bại");
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full"
        >
            <h1 className="text-2xl font-bold text-white mb-8">Account</h1>

            {/* Profile Card */}
            <div className="rounded-2xl border border-white/10 bg-bg-card/80 backdrop-blur-xl p-6 shadow-2xl shadow-black/20 space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                    {user.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt="Avatar"
                            className="w-16 h-16 rounded-full border-2 border-white/10"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                            {(user.displayName || user.email)[0].toUpperCase()}
                        </div>
                    )}
                    <div>
                        <p className="text-lg font-semibold text-white">
                            {user.displayName || user.email.split("@")[0]}
                        </p>
                        <p className="text-sm text-white/60">Thành viên OCR Universe</p>
                    </div>
                </div>

                <hr className="border-white/8" />

                {/* Full Name — Editable */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                        <User className="w-4 h-4 text-blue-500" />
                        Họ và tên
                    </label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Nhập họ và tên"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm"
                    />
                </div>

                {/* Email — Read Only */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                        <Mail className="w-4 h-4 text-blue-500" />
                        Email
                    </label>
                    <div className="px-4 py-3 rounded-xl bg-white/3 border border-white/8 text-white/70 text-sm">
                        {user.email}
                    </div>
                </div>

                {/* Created At */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        Ngày tạo tài khoản
                    </label>
                    <div className="px-4 py-3 rounded-xl bg-white/3 border border-white/8 text-white/70 text-sm">
                        {new Date(user.createdAt).toLocaleDateString("vi-VN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saved ? (
                        <>
                            <CheckCircle className="w-4 h-4" />
                            Đã lưu
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Lưu thay đổi
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );
}
