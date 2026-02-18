"use client";

import { useState } from "react";

interface FAQItem { question: string; answer: string; }

const FAQ_DATA: FAQItem[] = [
    { question: "OCR Universe hoạt động như thế nào?", answer: "Công cụ sử dụng công nghệ OCR (Optical Character Recognition) để quét và nhận diện văn bản trong ảnh. Tải ảnh lên → hệ thống trích xuất → hiển thị kết quả." },
    { question: "Hỗ trợ định dạng ảnh nào?", answer: "JPG, JPEG, PNG, WEBP, BMP, GIF và TIFF." },
    { question: "Có hỗ trợ tiếng Việt không?", answer: "Có! Hỗ trợ nhận diện cả tiếng Anh và tiếng Việt với độ chính xác cao." },
    { question: "Token là gì?", answer: "Token là đơn vị tính phí sử dụng. Mỗi lần OCR, AI xử lý hoặc export sẽ tiêu tốn một lượng input/output tokens tương ứng. Bạn có thể mua gói token hoặc dùng Pay-as-you-go." },
    { question: "Sự khác biệt giữa gói token và Pay-as-you-go?", answer: "Gói token (Standard/Premium) cho phép mua trước một lượng token lớn với giá ưu đãi hơn. Pay-as-you-go trừ trực tiếp từ số dư ví theo giá $0.20/1M input và $0.40/1M output tokens." },
    { question: "Token có hết hạn không?", answer: "Không! Token gói bạn mua sẽ không hết hạn theo thời gian. Bạn chỉ mất token khi sử dụng các tính năng." },
    { question: "Kích thước file tối đa?", answer: "Tối đa 10MB cho mỗi file ảnh tải lên." },
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="space-y-2">
            {FAQ_DATA.map((item, i) => (
                <div key={i} className="rounded-xl border border-border bg-bg-card overflow-hidden">
                    <button
                        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-bg-card-hover"
                        onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    >
                        <span className="text-sm font-medium text-text-primary pr-4">{item.question}</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openIndex === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                        <p className="px-4 pb-4 text-sm text-text-secondary leading-relaxed">{item.answer}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
