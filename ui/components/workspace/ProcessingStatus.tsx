"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, Brain, FileSearch, Wand2 } from "lucide-react";

type ProcessingStage =
    | "idle"
    | "uploading"
    | "extracting"
    | "reasoning"
    | "formatting"
    | "done"
    | "error";

interface ProcessingStatusProps {
    stage: ProcessingStage;
    progress: number;
    error?: string | null;
}

const STAGES: Record<
    ProcessingStage,
    { label: string; icon: React.ElementType; color: string }
> = {
    idle: { label: "Sẵn sàng", icon: FileSearch, color: "text-white/50" },
    uploading: { label: "Đang tải ảnh lên...", icon: Loader2, color: "text-blue-400" },
    extracting: { label: "Đang trích xuất văn bản...", icon: FileSearch, color: "text-blue-400" },
    reasoning: { label: "AI đang phân tích...", icon: Brain, color: "text-purple-400" },
    formatting: { label: "Đang định dạng dữ liệu...", icon: Wand2, color: "text-cyan-400" },
    done: { label: "Hoàn thành!", icon: CheckCircle2, color: "text-blue-400" },
    error: { label: "Lỗi xảy ra", icon: AlertCircle, color: "text-red-400" },
};

export default function ProcessingStatus({
    stage,
    progress,
    error,
}: ProcessingStatusProps) {
    const stageInfo = STAGES[stage];
    const Icon = stageInfo.icon;
    const isActive = stage !== "idle" && stage !== "done" && stage !== "error";

    return (
        <div className="w-full">
            {/* Status bar */}
            <div className="flex items-center gap-3 py-2">
                <motion.div
                    animate={isActive ? { rotate: 360 } : {}}
                    transition={
                        isActive
                            ? { repeat: Infinity, duration: 1, ease: "linear" }
                            : {}
                    }
                >
                    <Icon className={`w-4 h-4 ${stageInfo.color}`} />
                </motion.div>

                <span className={`text-xs font-medium ${stageInfo.color}`}>
                    {error && stage === "error" ? error : stageInfo.label}
                </span>

                {isActive && (
                    <span className="text-[10px] text-white/50 ml-auto">
                        {Math.round(progress)}%
                    </span>
                )}
            </div>

            {/* Progress bar */}
            {(isActive || stage === "done") && (
                <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                        className={`h-full rounded-full ${stage === "done"
                            ? "bg-blue-500"
                            : "bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400"
                            }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                </div>
            )}
        </div>
    );
}

export type { ProcessingStage };
