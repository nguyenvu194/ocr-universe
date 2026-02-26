"use client";

import { useState, useCallback } from "react";
import UploadZone from "@/components/UploadZone";
import ResultPanel from "@/components/ResultPanel";
import ToolCard from "@/components/ToolCard";
import AuthGuardModal from "@/components/AuthGuardModal";
import { useOCR } from "@/hooks/useOCR";
import { useAuth } from "@/contexts/auth.context";
import { ScanSearch } from "lucide-react";

const TOOLS = [
  {
    title: "Image Translator",
    description: "Dịch văn bản trực tiếp từ ảnh sang ngôn ngữ khác",
    href: "/",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
      </svg>
    ),
  },
  {
    title: "JPG to Word",
    description: "Chuyển ảnh JPG sang Word có thể chỉnh sửa",
    href: "/",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: "Text to PDF",
    description: "Chuyển văn bản thành file PDF chuyên nghiệp",
    href: "/",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: "PDF to Word",
    description: "Chuyển PDF sang Word dễ dàng chỉnh sửa",
    href: "/",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m-6 3.75l3 3m0 0l3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75" />
      </svg>
    ),
  },
];

const STATS = [
  { value: "50K+", label: "Ảnh đã xử lý" },
  { value: "99%", label: "Độ chính xác" },
  { value: "2s", label: "Thời gian trung bình" },
  { value: "10+", label: "Ngôn ngữ" },
];

export default function Home() {
  const { isProcessing, progress, result, error, recognize, reset } = useOCR();
  const { user, loading } = useAuth();
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Upload only stores the file — does NOT trigger OCR
  const handleFileSelect = useCallback((file: File) => {
    setPendingFile(file);
    reset(); // clear any previous result/error
  }, [reset]);

  // Scan button: check auth → OCR or popup
  const handleScan = useCallback(() => {
    if (!pendingFile) return;
    if (!loading && !user) {
      setShowLoginPopup(true);
      return;
    }
    recognize(pendingFile);
  }, [pendingFile, user, loading, recognize]);

  const handleCloseLoginPopup = useCallback(() => {
    setShowLoginPopup(false);
    // keep the image — user can login and retry
  }, []);

  return (
    <div className="grid-bg">
      {/* ─── Hero: split layout ─────────────────────────── */}
      <section className="pt-16 pb-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: text */}
          <div className="animate-fade-in-left">
            <span className="inline-block rounded-full bg-accent-light border border-accent/20 px-3 py-1 text-xs font-semibold text-accent mb-6">
              🚀 AI nhận diện chữ chính xác đến 99% — Thử ngay
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-text-primary md:text-5xl lg:text-[3.5rem] leading-[1.1]">
              OCR{" "}
              <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
                Universe
              </span>
            </h1>
            <p className="mt-5 text-lg text-text-secondary leading-relaxed max-w-md">
              Trích xuất văn bản từ ảnh trong tích tắc.
              Hỗ trợ tiếng Anh, tiếng Việt và 10+ ngôn ngữ khác.
            </p>

            {/* Stats row */}
            <div className="mt-8 grid grid-cols-4 gap-4">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-xl font-bold text-accent">{s.value}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: upload zone + scan button */}
          <div className="animate-fade-in-right">
            <UploadZone onFileSelect={handleFileSelect} isProcessing={isProcessing} progress={progress} />

            {/* Scan button — appears after file is uploaded */}
            {pendingFile && !isProcessing && !result && (
              <button
                onClick={handleScan}
                className="mt-4 w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-2 text-white font-semibold text-sm shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <ScanSearch className="w-5 h-5" />
                Quét văn bản
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── Error ──────────────────────────────────────── */}
      {error && (
        <div className="mb-8">
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger animate-fade-in-up">
            ❌ {error}
          </div>
        </div>
      )}

      {/* ─── Result ─────────────────────────────────────── */}
      {result && (
        <section className="mb-16">
          <ResultPanel
            text={result.text}
            confidence={result.confidence}
            processingTimeMs={result.processingTimeMs}
          />
        </section>
      )}

      {/* ─── How it works ───────────────────────────────── */}
      <section className="border-t border-border bg-bg-secondary py-16 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto">
          <h2 className="text-center text-2xl font-bold text-text-primary mb-10 animate-fade-in-up">
            Cách hoạt động
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Tải ảnh lên", desc: "Kéo-thả hoặc chọn ảnh từ thiết bị" },
              { step: "02", title: "AI xử lý", desc: "OCR engine nhận diện văn bản trong giây lát" },
              { step: "03", title: "Nhận kết quả", desc: "Sao chép hoặc tải về file .txt" },
            ].map((item, i) => (
              <div key={i} className={`glow-card rounded-2xl p-6 animate-fade-in-up animate-delay-${i + 1}`}>
                <span className="text-2xl font-black text-accent/90">{item.step}</span>
                <h3 className="mt-2 text-sm font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-1 text-xs text-text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Other Tools ────────────────────────────────── */}
      <section className="py-16">
        <div>
          <h2 className="text-center text-2xl font-bold text-text-primary mb-8">
            Công cụ khác
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {TOOLS.map((tool) => (
              <ToolCard key={tool.title} {...tool} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Auth Guard Modal ─── */}
      <AuthGuardModal open={showLoginPopup} onClose={handleCloseLoginPopup} />
    </div>
  );
}
