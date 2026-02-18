# OCR Project Setup

- [x] Initialize Project Structure
    - [x] `src/core/`
    - [x] `src/providers/`
    - [x] `src/services/`
    - [x] `src/utils/`
- [x] Implement Core Components <!-- id: 1 -->
    - [x] Define `IOCRProvider` interface in `src/core/interfaces.ts` <!-- id: 2 -->
    - [x] Implement `OCRManager` in `src/core/OCRManager.ts` <!-- id: 3 -->
    - [x] Implement Stub Providers (Tesseract, GoogleVision) implementation to satisfy factory logic <!-- id: 4 -->
- [x] Create Implementation Plan Artifact <!-- id: 5 -->

# Frontend UI

- [x] Khởi tạo Next.js (App Router + TypeScript + Tailwind CSS v4)
- [x] Thiết kế Design System — Dark theme tokens, animations, glow effects
- [x] Xây dựng Shared Components (Header, Footer)
- [x] Xây dựng Trang chủ — Split hero, stats, "Cách hoạt động", "Công cụ khác"
- [x] Xây dựng Trang Pricing — 3-column cards, toggle monthly/yearly, FAQ
- [x] Branding "OCR Universe" — Logo, gradient heading, emerald/indigo palette
- [x] Fix text contrast — Xóa grid-flow animation gây opacity 0.03 trên content
- [x] Thiết kế giao diện Drag & Drop để upload ảnh
- [x] Xây dựng Component hiển thị kết quả OCR dưới dạng JSON/Text
- [ ] Tích hợp tính năng "Sửa lỗi trực tiếp" (Inline editing)
- [x] Cài đặt tính năng tải xuống (PDF, CSV, DOCX) từ ExportService

# AI Features

- [x] AI Reconstruct — Phục chế văn bản OCR bằng OpenAI GPT
- [x] Translation — Dịch thuật chuyên nghiệp đa ngôn ngữ (8 ngôn ngữ)
    - [x] `TranslationResult` interface + `IAIProcessor.translate()`
    - [x] `DevAIProcessor.translate()` (DEV placeholder)
    - [x] `OpenAIProcessor.translate()` (expert prompt, giữ thuật ngữ + định dạng)
    - [x] API route `/api/ai/translate` (POST + GET health check)
    - [x] Language selector dropdown (🇻🇳🇺🇸🇯🇵🇰🇷🇨🇳🇫🇷🇩🇪🇹🇭)
    - [x] Translation tab trong ResultEditor
    - [x] Workspace page wiring + toast notifications
