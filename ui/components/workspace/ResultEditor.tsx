"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, FileText, Braces, AlertTriangle, Sparkles, ChevronDown, ChevronUp, Languages, Loader2 } from "lucide-react";

type TabType = "text" | "json" | "translation";

interface ResultEditorProps {
    text: string | null;
    confidence: number | null;
    processingTimeMs: number | null;
    provider: string | null;
    isLoading?: boolean;
    isReconstructing?: boolean;
    isReconstructed?: boolean;
    corrections?: Array<{ original: string; corrected: string; reason: string }>;
    // Translation props
    isTranslating?: boolean;
    translatedText?: string | null;
    translationSourceLang?: string | null;
    translationTargetLang?: string | null;
}

const LANG_LABELS: Record<string, string> = {
    vi: "Tiếng Việt",
    en: "English",
    ja: "日本語",
    ko: "한국어",
    zh: "中文",
    fr: "Français",
    de: "Deutsch",
    th: "ภาษาไทย",
};

export default function ResultEditor({
    text,
    confidence,
    processingTimeMs,
    provider,
    isLoading,
    isReconstructing,
    isReconstructed,
    corrections = [],
    isTranslating,
    translatedText,
    translationSourceLang,
    translationTargetLang,
}: ResultEditorProps) {
    const [activeTab, setActiveTab] = useState<TabType>("text");
    const [copied, setCopied] = useState(false);
    const [showCorrections, setShowCorrections] = useState(false);

    const hasTranslation = !!translatedText;

    const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
        { key: "text", label: isReconstructed ? "AI Text" : "Raw Text", icon: isReconstructed ? Sparkles : FileText },
        { key: "translation", label: hasTranslation ? `Translation (${LANG_LABELS[translationTargetLang || ""] || translationTargetLang || ""})` : "Translation", icon: Languages },
        { key: "json", label: "Structured JSON", icon: Braces },
    ];

    const jsonOutput = useMemo(() => {
        if (!text) return null;
        return JSON.stringify(
            {
                text,
                confidence,
                processingTimeMs,
                provider,
                isReconstructed,
                corrections: corrections.length > 0 ? corrections : undefined,
                translation: translatedText ? {
                    text: translatedText,
                    sourceLanguage: translationSourceLang,
                    targetLanguage: translationTargetLang,
                } : undefined,
                extractedAt: "(generated on copy)",
            },
            null,
            2
        );
    }, [text, confidence, processingTimeMs, provider, isReconstructed, corrections, translatedText, translationSourceLang, translationTargetLang]);

    const handleCopy = async () => {
        let content: string | null = null;
        if (activeTab === "text") content = text;
        else if (activeTab === "translation") content = translatedText || null;
        else {
            // Inject real timestamp when copying JSON
            content = jsonOutput ? jsonOutput.replace('"(generated on copy)"', `"${new Date().toISOString()}"`) : null;
        }
        if (!content) return;
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isLowConfidence = confidence !== null && confidence < 80;

    // Auto-switch to translation tab when translation completes
    if (hasTranslation && activeTab !== "translation" && isTranslating === false) {
        // Don't auto-switch, let user navigate
    }


    return (
        <div className="h-full flex flex-col rounded-xl border border-white/8 bg-[#0a0f1e] overflow-hidden">
            {/* Tab bar + stats */}
            <div className="flex items-center justify-between border-b border-white/8 px-1">
                <div className="flex items-center">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`
                relative flex items-center gap-1.5 px-4 py-3 text-xs font-medium
                transition-all duration-200 rounded-t-md
                ${activeTab === tab.key
                                    ? tab.key === "text" && isReconstructed
                                        ? "text-purple-400 bg-purple-500/5"
                                        : tab.key === "translation"
                                            ? "text-cyan-400 bg-cyan-500/5"
                                            : "text-blue-400 bg-blue-500/5"
                                    : "text-white/70 hover:text-white hover:bg-white/5"
                                }
              `}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[120px]">{tab.label}</span>
                            {tab.key === "translation" && isTranslating && (
                                <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                            )}
                            {activeTab === tab.key && (
                                <motion.div
                                    className={`absolute bottom-0 left-0 right-0 h-0.5 ${tab.key === "text" && isReconstructed ? "bg-purple-500"
                                        : tab.key === "translation" ? "bg-cyan-500"
                                            : "bg-blue-500"
                                        }`}
                                    layoutId="tab-indicator"
                                />
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 pr-3">
                    {/* AI badge */}
                    {isReconstructed && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400">
                            <Sparkles className="w-3 h-3" />
                            AI
                        </div>
                    )}



                    {/* Stats badges */}
                    {confidence !== null && (
                        <div
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
              ${isLowConfidence
                                    ? "bg-amber-500/10 text-amber-400"
                                    : "bg-blue-500/10 text-blue-400"
                                }`}
                        >
                            {isLowConfidence && <AlertTriangle className="w-3 h-3" />}
                            {confidence.toFixed(1)}%
                        </div>
                    )}
                    {processingTimeMs !== null && (
                        <span className="text-[10px] text-white/50">
                            {(processingTimeMs / 1000).toFixed(1)}s
                        </span>
                    )}

                    {/* Copy button */}
                    {(text || translatedText) && (
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
                bg-white/5 text-white/70 hover:bg-white/10 hover:text-white/80 transition-colors"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-3 h-3 text-blue-400" />
                                    <span className="text-blue-400">Đã copy</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3 h-3" />
                                    Copy
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-auto p-4">
                {isLoading || isReconstructing || (isTranslating && activeTab === "translation") ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            {isTranslating && activeTab === "translation" ? (
                                <>
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
                                        <Languages className="w-4 h-4 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                    <p className="text-xs text-cyan-300/60">AI đang dịch thuật...</p>
                                    <p className="text-[10px] text-white/20">Dịch chuyên nghiệp, giữ thuật ngữ và định dạng</p>
                                </>
                            ) : isReconstructing ? (
                                <>
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                                        <Sparkles className="w-4 h-4 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                    <p className="text-xs text-purple-300/60">AI đang phục chế văn bản...</p>
                                    <p className="text-[10px] text-white/20">Sửa lỗi chính tả, điền từ bị mất, khôi phục dấu tiếng Việt</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                                    <p className="text-xs text-white/30">Đang xử lý OCR...</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : activeTab === "translation" ? (
                    // ─── Translation tab content ───
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        {translatedText ? (
                            <div className="space-y-3">
                                {/* Translation header */}
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                                    <Languages className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-cyan-400">
                                            Bản dịch {LANG_LABELS[translationTargetLang || ""] || translationTargetLang}
                                        </p>
                                        <p className="text-[10px] text-cyan-400/50 mt-0.5">
                                            Ngôn ngữ gốc: {LANG_LABELS[translationSourceLang || ""] || translationSourceLang || "tự động"}
                                        </p>
                                    </div>
                                </div>

                                <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-white/90">
                                    {translatedText}
                                </pre>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <div className="flex flex-col items-center gap-3 text-white/20">
                                    <Languages className="w-10 h-10" />
                                    <p className="text-xs">
                                        Nhấn Translate để dịch văn bản
                                    </p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ) : text ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === "text" ? (
                            <div className="space-y-2">
                                {/* Low confidence warning */}
                                {isLowConfidence && !isReconstructed && (
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-4">
                                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-medium text-amber-400">
                                                Độ tin cậy thấp ({confidence?.toFixed(1)}%)
                                            </p>
                                            <p className="text-[10px] text-amber-400/60 mt-0.5">
                                                Hãy nhấn AI Reconstruct để sửa lỗi tự động.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* AI Reconstructed banner */}
                                {isReconstructed && (
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 mb-4">
                                        <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-purple-400">
                                                Văn bản đã được AI phục chế
                                            </p>
                                            {corrections.length > 0 && (
                                                <button
                                                    onClick={() => setShowCorrections(!showCorrections)}
                                                    className="flex items-center gap-1 text-[10px] text-purple-400/60 mt-1 hover:text-purple-400/80 transition-colors"
                                                >
                                                    {corrections.length} chỉnh sửa
                                                    {showCorrections ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Corrections list */}
                                <AnimatePresence>
                                    {showCorrections && corrections.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden mb-4"
                                        >
                                            <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
                                                {corrections.map((c, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/2 text-[11px]"
                                                    >
                                                        <span className="text-red-400/70 line-through shrink-0 max-w-[30%] truncate">
                                                            {c.original || "—"}
                                                        </span>
                                                        <span className="text-white/20">→</span>
                                                        <span className="text-blue-400/70 shrink-0 max-w-[30%] truncate">
                                                            {c.corrected || "—"}
                                                        </span>
                                                        <span className="text-white/20 ml-auto truncate max-w-[30%]">
                                                            {c.reason}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <pre className={`text-sm leading-relaxed whitespace-pre-wrap font-mono ${isReconstructed ? "text-white/90" : "text-white/80"
                                    }`}>
                                    {text}
                                </pre>
                            </div>
                        ) : (
                            <pre className="text-xs text-white/70 leading-relaxed font-mono">
                                <code>{jsonOutput}</code>
                            </pre>
                        )}
                    </motion.div>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-white/20">
                            <FileText className="w-10 h-10" />
                            <p className="text-xs">
                                Kết quả OCR sẽ hiển thị ở đây
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Provider tag */}
            {provider && (
                <div className="border-t border-white/5 px-4 py-2 flex items-center justify-between">
                    <span className="text-[10px] text-white/20">
                        Provider: {provider}
                    </span>
                    {text && (
                        <span className="text-[10px] text-white/20">
                            {text.length} ký tự
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
