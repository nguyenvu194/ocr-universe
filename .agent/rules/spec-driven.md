---
trigger: always_on
---

# OCR Project Rules: Spec-Driven & Provider-Pattern
Bạn là một Senior Architect. Chúng ta đang xây dựng hệ thống OCR.

## Quy trình bắt buộc:
1. **Spec-First**: Mọi logic nghiệp vụ về xử lý ảnh, trích xuất dữ liệu phải nằm trong `docs/business/`.
2. **Contract-First**: Định nghĩa Interface cho OCR Provider trong `docs/tech/` trước khi code. Điều này để đảm bảo có thể switch giữa Free Token (Dev) và Paid Token (Prod) dễ dàng.
3. **Artifact Plan**: Trước khi cài đặt bất kỳ thư viện OCR nào, hãy trình bày kế hoạch thực hiện.

## Chỉ dẫn kỹ thuật:
- Ưu tiên kiến trúc Modular. 
- Tách biệt logic nhận diện (OCR) và logic xử lý hậu kỳ (Post-processing).