"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeft, Sparkles, Languages } from "lucide-react";
import { toast } from "sonner";
import OCRDropzone from "@/components/workspace/OCRDropzone";
import ActionButtonGroup from "@/components/workspace/ActionButtonGroup";
import ProcessingStatus from "@/components/workspace/ProcessingStatus";
import type { ProcessingStage } from "@/components/workspace/ProcessingStatus";
import ResultEditor from "@/components/workspace/ResultEditor";
import AuthGuardModal from "@/components/AuthGuardModal";
import { useOCR } from "@/hooks/useOCR";
import { useAuth } from "@/contexts/auth.context";

export default function WorkspacePage() {
    const { isProcessing, progress, result, error, recognize, reset } = useOCR();
    const { user, loading } = useAuth();
    const [showLoginPopup, setShowLoginPopup] = useState(false);

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [panelCollapsed, setPanelCollapsed] = useState(false);

    // AI Reconstruct state
    const [isReconstructing, setIsReconstructing] = useState(false);
    const [reconstructedText, setReconstructedText] = useState<string | null>(null);
    const [corrections, setCorrections] = useState<Array<{ original: string; corrected: string; reason: string }>>([]);

    // Export state
    const [isExporting, setIsExporting] = useState(false);

    // Translation state
    const [isTranslating, setIsTranslating] = useState(false);
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [translationSourceLang, setTranslationSourceLang] = useState<string | null>(null);
    const [translationTargetLang, setTranslationTargetLang] = useState<string | null>(null);
    const [targetLanguage, setTargetLanguage] = useState("en");

    // Map useOCR states to processing stages
    const getStage = (): ProcessingStage => {
        if (error) return "error";
        if (isReconstructing) return "reasoning";
        if (!isProcessing && result) return "done";
        if (!isProcessing) return "idle";
        if (progress < 20) return "uploading";
        if (progress < 70) return "extracting";
        if (progress < 90) return "reasoning";
        return "formatting";
    };

    const handleFileSelect = useCallback((selectedFile: File) => {
        setFile(selectedFile);
        setReconstructedText(null);
        setCorrections([]);
        setTranslatedText(null);
        setTranslationSourceLang(null);
        setTranslationTargetLang(null);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(selectedFile);
    }, []);

    const handleScan = useCallback(() => {
        if (!loading && !user) {
            setShowLoginPopup(true);
            return;
        }
        if (file) {
            setReconstructedText(null);
            setCorrections([]);
            setTranslatedText(null);
            setTranslationSourceLang(null);
            setTranslationTargetLang(null);
            recognize(file);
        }
    }, [file, recognize, user, loading]);

    const handleClear = useCallback(() => {
        setFile(null);
        setPreview(null);
        setReconstructedText(null);
        setCorrections([]);
        setTranslatedText(null);
        setTranslationSourceLang(null);
        setTranslationTargetLang(null);
        reset();
    }, [reset]);

    // ─── AI Reconstruct Handler ──────────────────────
    const handleAIReconstruct = useCallback(async () => {
        if (!result?.text) return;

        setIsReconstructing(true);
        toast.loading("AI đang phục chế văn bản...", { id: "reconstruct" });

        try {
            const res = await fetch("/api/ai/reconstruct", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rawText: result.text,
                    confidence: result.confidence,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "AI xử lý thất bại");
            }

            setReconstructedText(data.data.processedText);
            setCorrections(data.data.corrections || []);

            const numCorrections = data.data.corrections?.length || 0;
            toast.success(
                `Phục chế hoàn tất — ${numCorrections} chỉnh sửa (${data.data.processingTimeMs}ms)`,
                { id: "reconstruct" }
            );
        } catch (err) {
            console.error("Reconstruct error:", err);
            toast.error(
                err instanceof Error ? err.message : "Lỗi không xác định khi phục chế",
                { id: "reconstruct" }
            );
        } finally {
            setIsReconstructing(false);
        }
    }, [result]);

    // ─── Translate Handler ──────────────────────────
    const handleTranslate = useCallback(async () => {
        const textToTranslate = reconstructedText || result?.text;
        if (!textToTranslate) return;

        setIsTranslating(true);
        toast.loading("AI đang dịch thuật...", { id: "translate" });

        try {
            const res = await fetch("/api/ai/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: textToTranslate,
                    targetLanguage,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Dịch thuật thất bại");
            }

            setTranslatedText(data.data.translatedText);
            setTranslationSourceLang(data.data.sourceLanguage);
            setTranslationTargetLang(data.data.targetLanguage);

            toast.success(
                `Dịch hoàn tất — ${data.data.sourceLanguage} → ${data.data.targetLanguage} (${data.data.processingTimeMs}ms)`,
                { id: "translate" }
            );
        } catch (err) {
            console.error("Translate error:", err);
            toast.error(
                err instanceof Error ? err.message : "Lỗi không xác định khi dịch",
                { id: "translate" }
            );
        } finally {
            setIsTranslating(false);
        }
    }, [result, reconstructedText, targetLanguage]);

    // ─── Export Handler ──────────────────────────────
    const handleExport = useCallback(
        async (format: "pdf" | "csv" | "docx") => {
            const textToExport = reconstructedText || result?.text;
            if (!textToExport) return;

            setIsExporting(true);

            // Map csv → xlsx for backend
            const backendFormat = format === "csv" ? "xlsx" : format;

            toast.loading(`Đang tạo file ${format.toUpperCase()}...`, { id: "export" });

            try {
                const res = await fetch("/api/export", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        format: backendFormat,
                        content: textToExport,
                        title: file?.name?.replace(/\.[^.]+$/, "") || "OCR Result",
                        confidence: result?.confidence,
                        provider: result?.provider,
                    }),
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error((errData as { error?: string }).error || `Export thất bại (${res.status})`);
                }

                // Download file
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;

                const timestamp = new Date().toISOString().slice(0, 10);
                const safeName = (file?.name?.replace(/\.[^.]+$/, "") || "ocr-result")
                    .replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
                const ext = backendFormat === "xlsx" ? "xlsx" : backendFormat;
                a.download = `${safeName}_${timestamp}.${ext}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                toast.success(`File ${format.toUpperCase()} đã tải về!`, { id: "export" });
            } catch (err) {
                console.error("Export error:", err);
                toast.error(
                    err instanceof Error ? err.message : "Lỗi xuất file",
                    { id: "export" }
                );
            } finally {
                setIsExporting(false);
            }
        },
        [result, reconstructedText, file]
    );

    // The text to display in editor — prefer reconstructed if available
    const displayText = reconstructedText || result?.text || null;
    const hasResult = !!result?.text;

    return (
        <div className="h-[calc(100vh-4rem)] bg-[#060a14] flex flex-col">
            {/* ─── Action Bar ─── */}
            <div className="border-b border-white/5 bg-[#080d1a]/50">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                    <ActionButtonGroup
                        onScan={handleScan}
                        isScanDisabled={!file || isProcessing}
                        isProcessing={isProcessing}
                        onAIReconstruct={hasResult ? handleAIReconstruct : undefined}
                        isAIProcessing={isReconstructing}
                        onTranslate={hasResult ? handleTranslate : undefined}
                        isTranslating={isTranslating}
                        onExport={hasResult ? handleExport : undefined}
                        isExporting={isExporting}
                        targetLanguage={targetLanguage}
                        onTargetLanguageChange={setTargetLanguage}
                    />

                    {/* Right side: Status + Panel toggle */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center">
                            <ProcessingStatus
                                stage={getStage()}
                                progress={progress}
                                error={error}
                            />
                        </div>
                        <button
                            onClick={() => setPanelCollapsed(!panelCollapsed)}
                            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-all duration-200"
                            title={panelCollapsed ? "Mở panel" : "Thu gọn panel"}
                        >
                            {panelCollapsed ? (
                                <PanelLeft className="w-4 h-4" />
                            ) : (
                                <PanelLeftClose className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Split Viewer ─── */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Image View */}
                <motion.div
                    className="border-r border-white/5"
                    animate={{
                        width: panelCollapsed ? 0 : "50%",
                        opacity: panelCollapsed ? 0 : 1,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{ minWidth: panelCollapsed ? 0 : "300px" }}
                >
                    <div className="h-full p-4">
                        <OCRDropzone
                            onFileSelect={handleFileSelect}
                            disabled={isProcessing}
                            currentFile={file}
                            preview={preview}
                            onClear={handleClear}
                        />
                    </div>
                </motion.div>

                {/* Right Panel: Result Editor */}
                <motion.div
                    className="flex-1 min-w-0"
                    animate={{ width: panelCollapsed ? "100%" : "50%" }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                    <div className="h-full p-4">
                        <ResultEditor
                            text={displayText}
                            confidence={result?.confidence ?? null}
                            processingTimeMs={result?.processingTimeMs ?? null}
                            provider={result?.provider ?? null}
                            isLoading={isProcessing}
                            isReconstructing={isReconstructing}
                            isReconstructed={!!reconstructedText}
                            corrections={corrections}
                            isTranslating={isTranslating}
                            translatedText={translatedText}
                            translationSourceLang={translationSourceLang}
                            translationTargetLang={translationTargetLang}
                        />
                    </div>
                </motion.div>
            </div>

            {/* ─── Status Bar ─── */}
            <footer className="border-t border-white/5 bg-[#080d1a]/50 px-6 py-2">
                <div className="max-w-[1800px] mx-auto flex items-center justify-between text-[10px] text-white/40">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            API Connected
                        </span>
                        <span>
                            Provider:{" "}
                            <span className="text-white/60">
                                {result?.provider || "TESSERACT"}
                            </span>
                        </span>
                        {reconstructedText && (
                            <span className="flex items-center gap-1 text-purple-400/60">
                                <Sparkles className="w-3 h-3" />
                                AI Reconstructed
                            </span>
                        )}
                        {translatedText && (
                            <span className="flex items-center gap-1 text-cyan-400/60">
                                <Languages className="w-3 h-3" />
                                Translated → {translationTargetLang}
                            </span>
                        )}
                    </div>
                    <span>OCR Universe v1.0</span>
                </div>
            </footer>

            {/* ─── Auth Guard Modal ─── */}
            <AuthGuardModal open={showLoginPopup} onClose={() => setShowLoginPopup(false)} />
        </div>
    );
}
