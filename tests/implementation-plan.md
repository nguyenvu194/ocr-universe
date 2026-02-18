# Kế hoạch triển khai E2E Test

## Mục tiêu
Tạo file `src/e2e-test.ts` thực hiện luồng: quét ảnh từ `tests/samples/` → chạy OCR → xử lý qua `AIProcessor` → ghi kết quả ra `tests/results/`.

## Các thay đổi cần thực hiện

### 1. Nâng cấp Interface lõi

#### [SỬA] [interfaces.ts](file:///Users/matthew/Desktop/OCR/src/core/interfaces.ts)
- Thêm kiểu `OCRResult` gồm các trường: `text`, `confidence`, `processingTimeMs`.
- Đổi kiểu trả về của `recognize()` từ `Promise<string>` sang `Promise<OCRResult>`.

---

### 2. Triển khai Provider thực tế

#### [SỬA] [TesseractProvider.ts](file:///Users/matthew/Desktop/OCR/src/providers/TesseractProvider.ts)
- Cài đặt thư viện `tesseract.js`.
- Triển khai OCR thực tế, trả về `OCRResult` với điểm tự tin (confidence) và thời gian xử lý.

#### [SỬA] [GoogleVisionProvider.ts](file:///Users/matthew/Desktop/OCR/src/providers/GoogleVisionProvider.ts)
- Cập nhật kiểu trả về cho khớp với `OCRResult` (vẫn giữ stub).

---

### 3. Dịch vụ mới: AIProcessor

#### [MỚI] [AIProcessor.ts](file:///Users/matthew/Desktop/OCR/src/services/AIProcessor.ts)
- Nhận văn bản OCR thô, làm sạch và trích xuất thành JSON có cấu trúc.
- Khi `OPENAI_API_KEY` chưa được cấu hình (môi trường DEV): sử dụng **bộ xử lý dựa trên quy tắc** (cắt khoảng trắng, tách dòng, xuất JSON).
- Khi có API key: gọi OpenAI để trích xuất dữ liệu thông minh hơn.

---

### 4. Script E2E Test

#### [MỚI] [e2e-test.ts](file:///Users/matthew/Desktop/OCR/src/e2e-test.ts)
- Quét thư mục `tests/samples/` tìm file ảnh (`.jpg`, `.png`, `.webp`).
- Với mỗi ảnh: chạy OCR → AIProcessor → ghi file `.json` + `.txt` vào `tests/results/`.
- In ra bảng tóm tắt gồm: thời gian xử lý và điểm tự tin cho từng file.

---

### 5. Cập nhật OCRManager

#### [SỬA] [OCRManager.ts](file:///Users/matthew/Desktop/OCR/src/core/OCRManager.ts)
- Cập nhật nhỏ để tương thích với kiểu trả về `OCRResult` mới.

## Thư viện cần cài đặt
| Thư viện | Mục đích | Bắt buộc? |
|---|---|---|
| `tesseract.js` | OCR engine chạy trên Node.js, không cần cài native | ✅ Có |
| `openai` | Xử lý văn bản bằng AI (có fallback) | ⚠️ Tùy chọn |

## Cách kiểm tra
```bash
OCR_MODE=DEV npx ts-node src/e2e-test.ts
```

### Kết quả mong đợi
- 3 file kết quả trong `tests/results/` (tương ứng 3 ảnh mẫu).
- Console in ra bảng với thời gian và điểm tự tin của từng file.
