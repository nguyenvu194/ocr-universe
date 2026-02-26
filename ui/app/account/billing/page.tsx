"use client";

/**
 * Billing Page
 *
 * - Token balance (input/output remaining)
 * - Wallet balance
 * - Pay-as-you-go toggle
 * - Transaction history table
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CreditCard, Wallet, Loader2, ArrowUpRight,
    ArrowDownRight, Package, RefreshCcw, Zap, ToggleLeft, ToggleRight,
    ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth.context";
import { billingApi, type Transaction, type WalletInfo } from "@/services/api";

export default function BillingPage() {
    const { user } = useAuth();

    const [wallet, setWallet] = useState<WalletInfo | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingWallet, setLoadingWallet] = useState(true);
    const [loadingTxns, setLoadingTxns] = useState(true);
    const [paygEnabled, setPaygEnabled] = useState(false);
    const [showBalanceDetail, setShowBalanceDetail] = useState(false);

    const fetchWallet = useCallback(async () => {
        setLoadingWallet(true);
        try {
            const res = await billingApi.getWallet();
            if (res.success && res.data) {
                setWallet(res.data);
            }
        } catch {
            // silently fail
        } finally {
            setLoadingWallet(false);
        }
    }, []);

    const fetchTransactions = useCallback(async () => {
        setLoadingTxns(true);
        try {
            const res = await billingApi.getTransactions(50);
            if (res.success && res.data) {
                setTransactions(res.data);
            }
        } catch {
            // silently fail
        } finally {
            setLoadingTxns(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchWallet();
            fetchTransactions();
        }
    }, [user, fetchWallet, fetchTransactions]);

    if (!user) return null;

    const balanceUsd = wallet?.totalBalanceUsd ?? user.balanceUsd ?? 0;
    const totalDeposited = wallet?.wallets?.reduce((sum, w) => sum + Number(w.total_deposited), 0) ?? 0;
    const totalSpent = wallet?.wallets?.reduce((sum, w) => sum + Number(w.total_spent), 0) ?? 0;

    // Aggregate token balances across all active packages
    const totalInputTokens = wallet?.tokenBalances?.reduce(
        (sum, tb) => sum + (tb.input_tokens_remaining ?? 0), 0
    ) ?? 0;
    const totalOutputTokens = wallet?.tokenBalances?.reduce(
        (sum, tb) => sum + (tb.output_tokens_remaining ?? 0), 0
    ) ?? 0;

    const formatTokens = (n: number) => {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
        return n.toLocaleString();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full"
        >
            <h1 className="text-2xl font-bold text-white mb-8">Billing</h1>

            {/* ─── Stats Grid ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {/* Token Balance */}
                <div className="flex flex-col rounded-2xl border border-white/10 bg-bg-card/80 backdrop-blur-xl p-5 shadow-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Token còn lại</span>
                    </div>
                    {loadingWallet ? (
                        <div className="w-20 h-6 rounded bg-white/5 animate-pulse" />
                    ) : (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-white/70">Input</span>
                                <span className="text-sm font-bold text-white">{formatTokens(totalInputTokens)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-white/70">Output</span>
                                <span className="text-sm font-bold text-white">{formatTokens(totalOutputTokens)}</span>
                            </div>
                        </div>
                    )}
                    <Link
                        href="/pricing"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 mt-auto pt-3 transition-colors"
                    >
                        <Package className="w-3 h-3" />
                        Mua gói token
                    </Link>
                </div>

                {/* Balance */}
                <div className="flex flex-col rounded-2xl border border-white/10 bg-bg-card/80 backdrop-blur-xl p-5 shadow-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <Wallet className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Số dư</span>
                    </div>
                    {loadingWallet ? (
                        <div className="w-20 h-6 rounded bg-white/5 animate-pulse" />
                    ) : (
                        <>
                            {/* USD Total — clickable */}
                            <button
                                onClick={() => setShowBalanceDetail(prev => !prev)}
                                className="flex items-center gap-2 group cursor-pointer"
                            >
                                <p className="text-lg font-bold text-white">
                                    ${balanceUsd.toFixed(4)}
                                </p>
                                <ChevronDown className={`w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-all duration-200 ${showBalanceDetail ? "rotate-180" : ""}`} />
                            </button>

                            {/* Per-currency breakdown */}
                            <AnimatePresence>
                                {showBalanceDetail && wallet?.wallets && wallet.wallets.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-3 pt-3 border-t border-white/8 space-y-2">
                                            <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Chi tiết</p>
                                            {wallet.wallets.map((w) => (
                                                <div key={w.id} className="flex items-center justify-between">
                                                    <span className="text-xs text-white/60">{w.currency_code}</span>
                                                    <span className="text-xs font-semibold text-white">
                                                        {Number(w.balance).toLocaleString("vi-VN")} {w.currency_code}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                    <Link
                        href="/dashboard/deposit"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 mt-auto pt-3 transition-colors"
                    >
                        <Wallet className="w-3 h-3" />
                        Nạp tiền
                    </Link>
                </div>

                {/* Total Stats */}
                <div className="flex flex-col rounded-2xl border border-white/10 bg-bg-card/80 backdrop-blur-xl p-5 shadow-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Tổng quan</span>
                    </div>
                    {loadingWallet ? (
                        <div className="w-20 h-6 rounded bg-white/5 animate-pulse" />
                    ) : (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <ArrowDownRight className="w-3 h-3 text-blue-400" />
                                <span className="text-xs text-white/70">Nạp:</span>
                                <span className="text-xs font-medium text-white/80">
                                    {Number(totalDeposited).toLocaleString("vi-VN")}đ
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ArrowUpRight className="w-3 h-3 text-orange-400" />
                                <span className="text-xs text-white/70">Chi:</span>
                                <span className="text-xs font-medium text-white/80">
                                    {Number(totalSpent).toLocaleString("vi-VN")}đ
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Pay-as-you-go Toggle ─── */}
            <div className="rounded-2xl border border-white/10 bg-bg-card/80 backdrop-blur-xl p-5 shadow-lg mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${paygEnabled ? "bg-blue-500/15" : "bg-white/5"} transition-colors`}>
                            <Zap className={`w-4 h-4 ${paygEnabled ? "text-blue-400" : "text-white/50"}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Pay-as-you-go</p>
                            <p className="text-xs text-white/60 mt-0.5">
                                Input $0.20/1M · Output $0.40/1M tokens
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setPaygEnabled(!paygEnabled)}
                        className="flex items-center gap-2 transition-colors"
                    >
                        {paygEnabled ? (
                            <ToggleRight className="w-8 h-8 text-blue-500" />
                        ) : (
                            <ToggleLeft className="w-8 h-8 text-white/40" />
                        )}
                    </button>
                </div>
                <p className="text-[11px] text-white/50 mt-3 pl-11">
                    Khi bật, hệ thống sẽ tự động trừ số dư ví khi token gói đã hết.
                </p>
            </div>

            {/* ─── Token Balances ─── */}
            {wallet?.tokenBalances && wallet.tokenBalances.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-bg-card/80 backdrop-blur-xl p-6 shadow-lg mb-8">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-500" />
                        Gói token đang sử dụng
                    </h2>
                    <div className="space-y-3">
                        {wallet.tokenBalances.map((tb) => (
                            <div
                                key={tb.id}
                                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/3 border border-white/8"
                            >
                                <div>
                                    <p className="text-sm font-medium text-white">{tb.package_name}</p>
                                    {tb.expires_at && (
                                        <p className="text-xs text-white/60 mt-0.5">
                                            Hết hạn: {new Date(tb.expires_at).toLocaleDateString("vi-VN")}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-white/70">
                                        Input: <span className="text-white/90 font-medium">{tb.input_tokens_remaining.toLocaleString()}</span>
                                    </p>
                                    <p className="text-xs text-white/70">
                                        Output: <span className="text-white/90 font-medium">{tb.output_tokens_remaining.toLocaleString()}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Transaction History ─── */}
            <div className="rounded-2xl border border-white/10 bg-bg-card/80 backdrop-blur-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <RefreshCcw className="w-4 h-4 text-blue-500" />
                        Lịch sử giao dịch
                    </h2>
                </div>

                {loadingTxns ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-12">
                        <CreditCard className="w-8 h-8 text-white/40 mx-auto mb-3" />
                        <p className="text-sm text-white/60">Chưa có giao dịch nào</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/8">
                                    <th className="text-left py-3 px-3 text-xs font-medium text-white/60 uppercase">Loại</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-white/60 uppercase">Mô tả</th>
                                    <th className="text-right py-3 px-3 text-xs font-medium text-white/60 uppercase">Số tiền</th>
                                    <th className="text-center py-3 px-3 text-xs font-medium text-white/60 uppercase">Trạng thái</th>
                                    <th className="text-right py-3 px-3 text-xs font-medium text-white/60 uppercase">Ngày</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((txn) => (
                                    <tr key={txn.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${txn.type === "deposit"
                                                ? "bg-blue-500/10 text-blue-400"
                                                : txn.type === "consume"
                                                    ? "bg-orange-500/10 text-orange-400"
                                                    : txn.type === "package_purchase"
                                                        ? "bg-purple-500/10 text-purple-400"
                                                        : "bg-white/5 text-white/70"
                                                }`}>
                                                {txn.type === "deposit" && <ArrowDownRight className="w-3 h-3" />}
                                                {txn.type === "consume" && <ArrowUpRight className="w-3 h-3" />}
                                                {txn.type === "package_purchase" && <Package className="w-3 h-3" />}
                                                {txn.type === "refund" && <RefreshCcw className="w-3 h-3" />}
                                                {txn.type === "deposit" ? "Nạp" :
                                                    txn.type === "consume" ? "Sử dụng" :
                                                        txn.type === "package_purchase" ? "Mua gói" : "Hoàn"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-white/80 max-w-[200px] truncate">
                                            {txn.description || "—"}
                                        </td>
                                        <td className={`py-3 px-3 text-right font-medium ${txn.type === "deposit" || txn.type === "refund"
                                            ? "text-blue-400"
                                            : "text-orange-400"
                                            }`}>
                                            {txn.type === "deposit" || txn.type === "refund" ? "+" : "-"}
                                            {Number(txn.amount_cents).toLocaleString("vi-VN")}đ
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${txn.status === "completed" || txn.status === "success" || txn.status === "paid"
                                                ? "bg-blue-500/10 text-blue-400"
                                                : txn.status === "pending"
                                                    ? "bg-yellow-500/10 text-yellow-400"
                                                    : "bg-red-500/10 text-red-400"
                                                }`}>
                                                {txn.status === "completed" || txn.status === "success" || txn.status === "paid" ? "Hoàn thành" :
                                                    txn.status === "pending" ? "Đang xử lý" :
                                                        txn.status === "failed" ? "Thất bại" : "Đã huỷ"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right text-white/60 text-xs">
                                            {new Date(txn.created_at).toLocaleDateString("vi-VN")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
