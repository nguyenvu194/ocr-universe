"use client";

import { useCallback, useState, useRef } from "react";

interface UploadZoneProps {
    onFileSelect: (file: File) => void;
    isProcessing: boolean;
    progress: number;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/gif", "image/tiff"];

export default function UploadZone({ onFileSelect, isProcessing, progress }: UploadZoneProps) {
    const [dragOver, setDragOver] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(
        (file: File) => {
            if (!ACCEPTED_TYPES.includes(file.type)) {
                alert("Định dạng không hỗ trợ. Vui lòng chọn JPG, PNG, WEBP, BMP, GIF hoặc TIFF.");
                return;
            }
            setFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
            onFileSelect(file);
        },
        [onFileSelect]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const resetUpload = () => {
        setPreview(null);
        setFileName(null);
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <div className="w-full">
            <div
                className={`upload-zone relative flex flex-col items-center justify-center rounded-2xl bg-bg-card p-8 md:p-12 transition-all cursor-pointer ${dragOver ? "drag-over scale-[1.01]" : ""
                    } ${isProcessing ? "pointer-events-none opacity-70" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !isProcessing && inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(",")}
                    className="hidden"
                    onChange={handleInputChange}
                />

                {preview ? (
                    <div className="relative flex flex-col items-center gap-4 w-full z-10">
                        <div className="relative w-full max-w-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full max-h-56 rounded-xl object-contain border border-border"
                            />
                            {!isProcessing && (
                                <button
                                    className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white text-xs font-bold shadow-lg hover:scale-110 transition-transform"
                                    onClick={(e) => { e.stopPropagation(); resetUpload(); }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-text-muted truncate max-w-xs">{fileName}</p>
                    </div>
                ) : (
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-light text-accent">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                        </div>
                        <p className="text-base font-semibold text-text-primary">
                            Kéo & thả ảnh vào đây
                        </p>
                        <p className="mt-1.5 text-sm text-text-secondary">
                            hoặc <span className="text-accent font-medium cursor-pointer">chọn file</span>
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                            {["JPG", "PNG", "WEBP", "BMP", "TIFF"].map((fmt) => (
                                <span key={fmt} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-text-muted">
                                    {fmt}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Progress bar */}
            {isProcessing && (
                <div className="mt-4 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-text-primary">Đang nhận diện...</span>
                        <span className="text-sm font-semibold text-accent">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                        <div
                            className="progress-bar h-full rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
