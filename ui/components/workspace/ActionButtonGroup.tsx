"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ScanLine,
    Sparkles,
    Languages,
    Download,
    FileText,
    FileSpreadsheet,
    FileType,
    ChevronDown,
    Loader2,
    Globe,
} from "lucide-react";

interface ActionButtonGroupProps {
    onScan: () => void;
    onAIReconstruct?: () => void;
    onTranslate?: () => void;
    onExport?: (format: "pdf" | "csv" | "docx") => void;
    isScanDisabled?: boolean;
    isProcessing?: boolean;
    isAIProcessing?: boolean;
    isTranslating?: boolean;
    isExporting?: boolean;
    // Language selector
    targetLanguage: string;
    onTargetLanguageChange: (lang: string) => void;
}

const LANGUAGES = [
    { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "ja", label: "日本語", flag: "🇯🇵" },
    { code: "ko", label: "한국어", flag: "🇰🇷" },
    { code: "zh", label: "中文", flag: "🇨🇳" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "de", label: "Deutsch", flag: "🇩🇪" },
    { code: "th", label: "ภาษาไทย", flag: "🇹🇭" },
];

export default function ActionButtonGroup({
    onScan,
    onAIReconstruct,
    onTranslate,
    onExport,
    isScanDisabled,
    isProcessing,
    isAIProcessing,
    isTranslating,
    isExporting,
    targetLanguage,
    onTargetLanguageChange,
}: ActionButtonGroupProps) {
    const [exportOpen, setExportOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);

    const selectedLang = LANGUAGES.find((l) => l.code === targetLanguage) || LANGUAGES[0];

    const exportFormats = [
        { key: "pdf" as const, label: "PDF", icon: FileText },
        { key: "csv" as const, label: "Excel (XLSX)", icon: FileSpreadsheet },
        { key: "docx" as const, label: "DOCX", icon: FileType },
    ];

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Scan Button — Primary */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onScan}
                disabled={isScanDisabled || isProcessing}
                className={`
          relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
          transition-all duration-200
          ${isScanDisabled || isProcessing
                        ? "bg-white/8 text-white/60 cursor-not-allowed border border-white/10"
                        : "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/20"
                    }
        `}
            >
                {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <ScanLine className="w-4 h-4" />
                )}
                {isProcessing ? "Đang xử lý..." : "Scan"}
                {!isScanDisabled && !isProcessing && (
                    <span className="absolute inset-0 rounded-lg animate-ping bg-blue-500/20 pointer-events-none" />
                )}
            </motion.button>

            {/* AI Reconstruct */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onAIReconstruct}
                disabled={!onAIReconstruct || isAIProcessing}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
          border transition-all duration-200
          ${isAIProcessing
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40 cursor-wait"
                        : onAIReconstruct
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/30"
                            : "bg-white/5 text-white/60 border-white/10 cursor-not-allowed"
                    }`}
            >
                {isAIProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Sparkles className="w-4 h-4" />
                )}
                {isAIProcessing ? "Đang phục chế..." : "AI Reconstruct"}
            </motion.button>

            {/* ─── Translate Group: Language Selector + Button ─── */}
            <div className="flex items-center gap-0">
                {/* Language Selector Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setLangOpen(!langOpen)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-l-lg text-sm font-medium
              border-y border-l transition-all duration-200
              ${onTranslate
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/15"
                                : "bg-white/5 text-white/60 border-white/10 cursor-not-allowed"
                            }`}
                        disabled={!onTranslate}
                    >
                        <Globe className="w-4 h-4" />
                        <span>{selectedLang.flag}</span>
                        <span className="hidden sm:inline">{selectedLang.label}</span>
                        <ChevronDown
                            className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`}
                        />
                    </button>

                    <AnimatePresence>
                        {langOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-white/10 bg-[#0f1629] shadow-2xl shadow-black/50 overflow-hidden z-50"
                            >
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            onTargetLanguageChange(lang.code);
                                            setLangOpen(false);
                                        }}
                                        className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm transition-colors
                      ${targetLanguage === lang.code
                                                ? "bg-cyan-500/10 text-cyan-400"
                                                : "text-white/70 hover:bg-white/5 hover:text-white"
                                            }`}
                                    >
                                        <span>{lang.flag}</span>
                                        <span>{lang.label}</span>
                                        {targetLanguage === lang.code && (
                                            <span className="ml-auto text-cyan-400 text-xs">✓</span>
                                        )}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Translate Button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onTranslate}
                    disabled={!onTranslate || isTranslating}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-r-lg text-sm font-medium
            border transition-all duration-200
            ${isTranslating
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 cursor-wait"
                            : onTranslate
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/30"
                                : "bg-white/5 text-white/60 border-white/10 cursor-not-allowed"
                        }`}
                >
                    {isTranslating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Languages className="w-4 h-4" />
                    )}
                    {isTranslating ? "Đang dịch..." : "Translate"}
                </motion.button>
            </div>

            {/* Export Dropdown */}
            <div className="relative">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setExportOpen(!exportOpen)}
                    disabled={!onExport || isExporting}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
            border transition-all duration-200
            ${isExporting
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40 cursor-wait"
                            : onExport
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30"
                                : "bg-white/5 text-white/60 border-white/10 cursor-not-allowed"
                        }`}
                >
                    {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4" />
                    )}
                    {isExporting ? "Đang xuất..." : "Export"}
                    <ChevronDown
                        className={`w-3 h-3 transition-transform ${exportOpen ? "rotate-180" : ""}`}
                    />
                </motion.button>

                <AnimatePresence>
                    {exportOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 mt-1 w-44 rounded-lg border border-white/10 bg-[#0f1629] shadow-2xl shadow-black/50 overflow-hidden z-50"
                        >
                            {exportFormats.map((fmt) => (
                                <button
                                    key={fmt.key}
                                    onClick={() => {
                                        onExport?.(fmt.key);
                                        setExportOpen(false);
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-white/70
                    hover:bg-white/5 hover:text-white transition-colors"
                                >
                                    <fmt.icon className="w-4 h-4" />
                                    {fmt.label}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
