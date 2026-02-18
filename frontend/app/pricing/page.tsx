"use client";

import { useState } from "react";
import PricingCard from "@/components/PricingCard";
import FAQ from "@/components/FAQ";
import { Zap, ToggleLeft, ToggleRight } from "lucide-react";

const TOKEN_PACKAGES = [
    {
        name: "Standard",
        price: 10,
        popular: false,
        inputTokens: "55M",
        outputTokens: "27M",
        features: [
            "55,000,000 input tokens",
            "27,000,000 output tokens",
            "Hỗ trợ tất cả tính năng OCR",
            "AI Reconstruct & Translate",
            "Export PDF, DOCX, XLSX",
            "Không giới hạn thời gian sử dụng",
        ],
    },
    {
        name: "Premium",
        price: 19,
        popular: true,
        inputTokens: "118M",
        outputTokens: "59M",
        features: [
            "118,000,000 input tokens",
            "59,000,000 output tokens",
            "Hỗ trợ tất cả tính năng OCR",
            "AI Reconstruct & Translate",
            "Export PDF, DOCX, XLSX",
            "Không giới hạn thời gian sử dụng",
            "Tiết kiệm ~10% so với gói Standard",
        ],
    },
];

export default function PricingPage() {
    const [paygEnabled, setPaygEnabled] = useState(false);

    return (
        <div className="grid-bg">
            {/* Header */}
            <section className="pt-16 pb-12 text-center animate-fade-in-up">
                <span className="inline-block rounded-full bg-accent-2-light border border-accent-2/20 px-3 py-1 text-xs font-semibold text-accent-2 mb-6">
                    💎 Linh hoạt cho mọi nhu cầu
                </span>
                <h1 className="text-4xl font-extrabold tracking-tight text-text-primary md:text-5xl">
                    Bảng giá{" "}
                    <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
                        minh bạch
                    </span>
                </h1>
                <p className="mx-auto mt-4 max-w-md text-base text-text-secondary">
                    Mua gói token theo nhu cầu. Không subscription, không cam kết.
                </p>
            </section>

            {/* Pay-as-you-go toggle */}
            <div className="mx-auto max-w-4xl px-6 mb-10 animate-fade-in-up">
                <div className="rounded-2xl border border-border bg-bg-card p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${paygEnabled ? "bg-accent/10" : "bg-white/5"} transition-colors`}>
                                <Zap className={`w-5 h-5 ${paygEnabled ? "text-accent" : "text-text-muted"}`} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-text-primary">Pay-as-you-go</p>
                                <p className="text-xs text-text-secondary mt-0.5">
                                    Tự động sử dụng số dư ví khi hết token gói
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-medium text-text-primary">$0.20 <span className="text-text-muted font-normal">/ 1M input</span></p>
                                <p className="text-xs font-medium text-text-primary">$0.40 <span className="text-text-muted font-normal">/ 1M output</span></p>
                            </div>
                            <button
                                onClick={() => setPaygEnabled(!paygEnabled)}
                                className="transition-colors"
                            >
                                {paygEnabled ? (
                                    <ToggleRight className="w-9 h-9 text-accent" />
                                ) : (
                                    <ToggleLeft className="w-9 h-9 text-text-muted" />
                                )}
                            </button>
                        </div>
                    </div>
                    {/* Mobile rates */}
                    <div className="flex gap-4 mt-3 sm:hidden text-xs text-text-secondary">
                        <span>Input: <span className="text-text-primary font-medium">$0.20/1M</span></span>
                        <span>Output: <span className="text-text-primary font-medium">$0.40/1M</span></span>
                    </div>
                </div>
            </div>

            {/* Token Package Cards */}
            <div className="mx-auto max-w-3xl px-6 mb-20 grid grid-cols-1 gap-5 md:grid-cols-2">
                {TOKEN_PACKAGES.map((pkg, i) => (
                    <div key={pkg.name} className={`animate-fade-in-up animate-delay-${i + 1}`}>
                        <PricingCard
                            name={pkg.name}
                            price={pkg.price}
                            inputTokens={pkg.inputTokens}
                            outputTokens={pkg.outputTokens}
                            features={pkg.features}
                            popular={pkg.popular}
                        />
                    </div>
                ))}
            </div>

            {/* FAQ */}
            <section className="border-t border-border bg-bg-secondary py-16">
                <div className="mx-auto max-w-2xl px-6">
                    <h2 className="mb-8 text-center text-2xl font-bold text-text-primary">
                        Câu hỏi thường gặp
                    </h2>
                    <FAQ />
                </div>
            </section>
        </div>
    );
}
