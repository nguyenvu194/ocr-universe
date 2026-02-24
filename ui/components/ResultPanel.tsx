"use client";

import { useState } from "react";

interface ResultPanelProps {
    text: string;
    confidence: number;
    processingTimeMs: number;
}

export default function ResultPanel({ text, confidence, processingTimeMs }: ResultPanelProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ocr-result.txt";
        a.click();
        URL.revokeObjectURL(url);
    };

    const confidenceColor =
        confidence >= 90 ? "text-success" : confidence >= 70 ? "text-warning" : "text-danger";

    return (
        <div className="w-full rounded-2xl border border-border bg-bg-card p-5 animate-fade-in-up">
            {/* Stats */}
            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
                    <span className="text-text-muted text-xs">Độ tự tin</span>
                    <span className={`font-bold text-xs ${confidenceColor}`}>{confidence.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
                    <span className="text-text-muted text-xs">Thời gian</span>
                    <span className="font-bold text-xs text-text-primary">{(processingTimeMs / 1000).toFixed(1)}s</span>
                </div>
                <div className="ml-auto flex gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:border-accent hover:text-accent"
                    >
                        {copied ? (
                            <><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Đã sao chép</>
                        ) : (
                            <><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Sao chép</>
                        )}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent-glow"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Tải .txt
                    </button>
                </div>
            </div>

            {/* Result */}
            <div className="rounded-xl bg-bg-surface border border-border p-4 min-h-[180px] max-h-[360px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary font-sans">{text}</pre>
            </div>
        </div>
    );
}
