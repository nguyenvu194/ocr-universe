# Technical Specification: OCR System Architecture

## 1. Tổng quan kiến trúc (High-Level Design)
Hệ thống được thiết kế theo mô hình **Provider Pattern** (Adapter Pattern). Mục tiêu là cô lập logic nhận diện OCR khỏi logic xử lý nghiệp vụ, cho phép thay đổi nhà cung cấp dịch vụ (Token) linh hoạt giữa các môi trường mà không ảnh hưởng đến mã nguồn chính.



---

## 2. Chiến lược Quản lý Token (Environment Strategy)

Hệ thống sẽ tự động chuyển đổi Provider dựa trên biến môi trường trong file `.env`.

| Môi trường | OCR_MODE | Provider mặc định | Chi phí | Mục đích |
| :--- | :--- | :--- | :--- | :--- |
| **Development** | DEV | Tesseract / HuggingFace | $0 | Phát triển giao diện, test luồng |
| **Production** | PROD | Paid_Token_Provider | Theo lưu lượng | Chạy thực tế, độ chính xác cao |

---

## 3. Định nghĩa Hợp đồng (The Interface Contract)

Mọi Provider mới (Dù là free hay paid) đều phải thực hiện giao diện (Interface) sau để đảm bảo tính nhất quán:

```typescript
/**
 * Interface chuẩn cho mọi OCR Provider
 */
interface IOCRProvider {
  name: string;
  
  /** Hàm core để nhận diện văn bản từ Buffer hoặc đường dẫn file */
  recognize(imageInput: Buffer | string): Promise<OCRResult>;
  
  /** Kiểm tra tính sẵn sàng của Provider (Token còn hạn, kết nối mạng) */
  checkStatus(): Promise<boolean>;
}

interface OCRResult {
  fullText: string;        // Văn bản thô sau khi nhận diện
  confidence: number;      // Độ tin cậy (thang điểm 0-100)
  language: string;        // Ngôn ngữ hệ thống phát hiện được
  blocks: Array<{          // Chi tiết vị trí từng khối chữ (phục vụ tái tạo dữ liệu)
    text: string;
    boundingBox: number[];
  }>;
}
```

---

## 4. Quy trình xử lý dữ liệu (Data Pipeline)

Hệ thống sẽ thực hiện theo một chuỗi các bước (Pipeline) để đảm bảo dữ liệu từ ảnh thô trở thành thông tin có ích:



1. **Pre-processing (Tiền xử lý):**
   - Sử dụng thuật toán để khử nhiễu, tăng độ tương phản và xoay ảnh về góc thẳng.
   - Đặc biệt: Xử lý các tài liệu bị mờ hoặc rách nhẹ để tăng khả năng đọc của OCR Engine.

2. **OCR Execution (Nhận dạng):**
   - Gọi `OCRManager` để chọn Provider (Tesseract cho **Dev** hoặc Cloud API cho **Prod**).
   - Xuất ra `OCRResult` bao gồm văn bản thô (raw text) và tọa độ các khối chữ (blocks).

3. **AI Transformation (Hậu xử lý thông minh):**
   - **Tái tạo dữ liệu:** Sử dụng LLM (Large Language Model) để dự đoán và điền các từ bị thiếu do tài liệu bị rách/tẩy xóa dựa trên ngữ cảnh.
   - **Trích xuất thực thể:** Chuyển đổi văn bản không cấu trúc thành JSON (Ví dụ: Trích xuất Họ tên, Số điện thoại từ CV).
   - **Dịch thuật & Tóm tắt:** Tự động phát hiện ngôn ngữ và dịch hoặc tóm tắt nội dung theo yêu cầu.



4. **Action Engine (Thực thi đầu ra):**
   - **Export:** Chuyển đổi JSON/Text sang định dạng yêu cầu (PDF, DOCX, CSV).
   - **Automation (RPA):** Tự động điền dữ liệu vào Google Forms, hệ thống ERP hoặc Web App thông qua trình duyệt tự động.
   - **TTS:** Chuyển đổi văn bản cuối cùng thành giọng nói (Text-to-Speech).

---

## 5. Danh mục Công nghệ (Technology Stack)

Hệ thống được thiết kế để dễ dàng mở rộng và bảo trì:

* **Ngôn ngữ chính:** TypeScript / Node.js (Khuyến nghị vì khả năng xử lý bất đồng bộ tốt cho API).
* **Môi trường Development (Free):**
    * OCR: `Tesseract.js` hoặc `EasyOCR` (Python).
    * AI: `Hugging Face Inference API` (Dùng các model nguồn mở miễn phí).
* **Môi trường Production (Paid):**
    * OCR: `Google Cloud Vision` (Độ chính xác cực cao cho chữ viết tay).
    * AI: `OpenAI GPT-4o` hoặc `Claude 3.5 Sonnet` (Xử lý logic nghiệp vụ phức tạp).
* **Công cụ Automation:** `Puppeteer` hoặc `Playwright` để thực hiện hành động điền form trên web.
* **Xử lý ảnh:** Thư viện `Sharp` (Node.js) để resize/filter ảnh tốc độ cao.

---

## 6. Danh sách các Skill cần thiết cho Agent (Anti Gravity Skills)

Để hỗ trợ phát triển hiệu quả, chúng ta sẽ xây dựng các "Skill" riêng biệt trong thư mục `.agent/skills/`:

1.  **`skill-ocr-factory`**: Chịu trách nhiệm khởi tạo đúng Provider dựa trên file `.env`. Giúp Agent không bị nhầm lẫn giữa code Dev và Prod.
2.  **`skill-schema-mapper`**: Kỹ năng chuyên biệt để thiết kế các JSON Schema cho các loại mẫu khác nhau (Hóa đơn, CV, Báo cáo).
3.  **`skill-document-generator`**: Chứa các hàm hỗ trợ xuất file sang đa định dạng (PDF, DOCX).
4.  **`skill-web-automation`**: Cung cấp các đoạn code mẫu để Agent có thể viết script tự động điền form nhanh chóng.