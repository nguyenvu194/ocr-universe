"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, X } from "lucide-react";

interface OCRDropzoneProps {
    onFileSelect: (file: File) => void;
    disabled?: boolean;
    currentFile?: File | null;
    preview?: string | null;
    onClear?: () => void;
}

const ACCEPTED = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "image/bmp": [".bmp"],
    "image/tiff": [".tiff", ".tif"],
};

export default function OCRDropzone({
    onFileSelect,
    disabled,
    currentFile,
    preview,
    onClear,
}: OCRDropzoneProps) {
    const [isDragActive, setIsDragActive] = useState(false);

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles[0]) {
                onFileSelect(acceptedFiles[0]);
            }
        },
        [onFileSelect]
    );

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: ACCEPTED,
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024,
        disabled,
        onDragEnter: () => setIsDragActive(true),
        onDragLeave: () => setIsDragActive(false),
        onDropAccepted: () => setIsDragActive(false),
        onDropRejected: () => setIsDragActive(false),
    });

    return (
        <div className="h-full flex flex-col">
            {preview ? (
                /* ─── Image Preview Mode ─── */
                <div className="relative h-full flex items-center justify-center bg-[#060a14] rounded-xl overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={preview}
                        alt="Uploaded"
                        className="max-w-full max-h-full object-contain select-none"
                        draggable={false}
                    />
                    {/* File info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-blue-400" />
                                <span className="text-xs text-white/80 truncate max-w-[200px]">
                                    {currentFile?.name}
                                </span>
                                <span className="text-[10px] text-white/70">
                                    {currentFile
                                        ? `${(currentFile.size / 1024).toFixed(0)} KB`
                                        : ""}
                                </span>
                            </div>
                            {onClear && !disabled && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClear();
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                    Xóa
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* ─── Dropzone Mode ─── */
                <div
                    {...getRootProps()}
                    className={`
            relative h-full flex flex-col items-center justify-center rounded-xl
            border-2 border-dashed cursor-pointer transition-all duration-300
            ${isDragActive
                            ? "border-blue-400 bg-blue-500/10 shadow-[0_0_40px_rgba(59,130,246,0.15)]"
                            : "border-white/10 bg-[#0a0f1e] hover:border-blue-500/40 hover:bg-[#0c1225]"
                        }
            ${disabled ? "pointer-events-none opacity-50" : ""}
          `}
                >
                    <input {...getInputProps()} />

                    <motion.div
                        className="flex flex-col items-center gap-4 p-8"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Glow icon */}
                        <motion.div
                            className={`
                flex items-center justify-center w-16 h-16 rounded-2xl
                ${isDragActive ? "bg-blue-500/20" : "bg-blue-500/10"}
                transition-colors
              `}
                            animate={isDragActive ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            <Upload
                                className={`w-7 h-7 ${isDragActive ? "text-blue-400" : "text-blue-500/70"}`}
                            />
                        </motion.div>

                        <div className="text-center">
                            <p className="text-sm font-semibold text-white">
                                Kéo & thả ảnh vào đây
                            </p>
                            <p className="mt-1 text-xs text-white/70">
                                hoặc{" "}
                                <span className="text-blue-400 font-medium">
                                    click để chọn file
                                </span>
                            </p>
                        </div>

                        <div className="flex gap-1.5">
                            {["JPG", "PNG", "WEBP", "BMP", "TIFF"].map((fmt) => (
                                <span
                                    key={fmt}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/60"
                                >
                                    {fmt}
                                </span>
                            ))}
                        </div>

                        <p className="text-[10px] text-white/50">Tối đa 10MB</p>
                    </motion.div>

                    {/* Glow effect on drag */}
                    <AnimatePresence>
                        {isDragActive && (
                            <motion.div
                                className="absolute inset-0 rounded-xl pointer-events-none"
                                style={{
                                    background:
                                        "radial-gradient(circle at center, rgba(59,130,246,0.08) 0%, transparent 70%)",
                                }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            />
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
