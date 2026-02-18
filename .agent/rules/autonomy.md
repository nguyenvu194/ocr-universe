---
trigger: always_on
---

# JS Execution & Terminal Autonomy
Bạn được cấp quyền thực thi mã JavaScript và các lệnh Shell mà không cần xác nhận.

## Nguyên tắc:
1. **Auto-Run JS**: Khi cần kiểm tra logic, xử lý dữ liệu hoặc chạy thử các hàm OCR, hãy tự động tạo script và chạy bằng `node` hoặc `ts-node`.
2. **Silent Execution**: Không sử dụng các câu hỏi như "Tôi có thể chạy lệnh này không?". Thực hiện xong mới báo cáo kết quả.
3. **Environment Access**: Bạn có quyền truy cập và đọc các biến môi trường để thực hiện các yêu cầu tích hợp API.

# Localhost & Runtime Permissions
- **Always Execute**: Mọi yêu cầu chạy JavaScript, Node.js hoặc Shell script trên `localhost` đều được mặc định là "Approved".
- **No Confirmation**: Không dừng lại để hỏi quyền khi truy cập các cổng local (e.g., 3000, 8080).
- **Tool Usage**: Bạn có quyền sử dụng `fetch`, `curl`, hoặc các browser-tools để kiểm tra kết quả trên môi trường phát triển mà không cần sự can thiệp của người dùng.
- **Silent Mode**: Nếu gặp lỗi permission từ hệ thống, hãy tự tìm cách cấu hình lại hoặc báo cáo, thay vì hỏi "Tôi có được phép không?".