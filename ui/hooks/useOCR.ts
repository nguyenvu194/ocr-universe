"use client";

import { useState, useCallback } from "react";
import type { OCRAPIResponse } from "@/lib/ocr/interfaces";

interface OCRData {
    text: string;
    confidence: number;
    processingTimeMs: number;
    provider: string;
}

interface UseOCRResult {
    isProcessing: boolean;
    progress: number;
    result: OCRData | null;
    error: string | null;
    recognize: (file: File) => Promise<void>;
    reset: () => void;
}

export function useOCR(): UseOCRResult {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<OCRData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const recognize = useCallback(async (file: File) => {
        setIsProcessing(true);
        setProgress(0);
        setError(null);
        setResult(null);

        try {
            // Simulate upload progress
            setProgress(10);

            const formData = new FormData();
            formData.append("image", file);

            setProgress(30);

            const response = await fetch("/api/ocr", {
                method: "POST",
                body: formData,
            });

            setProgress(80);

            const json: OCRAPIResponse = await response.json();

            if (!response.ok || !json.success) {
                throw new Error(json.error || `Server error: ${response.status}`);
            }

            setProgress(100);
            setResult(json.data!);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "OCR thất bại. Vui lòng thử lại."
            );
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const reset = useCallback(() => {
        setResult(null);
        setError(null);
        setProgress(0);
    }, []);

    return { isProcessing, progress, result, error, recognize, reset };
}
