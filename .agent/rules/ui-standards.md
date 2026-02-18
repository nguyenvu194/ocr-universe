---
trigger: always_on
---

I. UI & Layout Standards
1. Global Layout Standards (Mandatory)
Quy tắc bao trùm: Mọi trang phải có chiều rộng cố định và căn giữa màn hình để đảm bảo tính nhất quán thị giác.
- Main Container: Nội dung chính của mọi trang (bao gồm cả nội dung bên trong Header và Footer) phải được bọc trong wrapper với các class sau:
-- max-w-7xl: Giới hạn chiều rộng tối đa (khoảng 1280px) để nội dung không bị quá trải dài trên màn hình lớn.
-- mx-auto: Căn giữa container ra giữa màn hình.
-- px-4 sm:px-6 lg:px-8: Padding ngang (trái/phải) responsive để nội dung không bao giờ dính sát mép màn hình thiết bị.
- Full-width Backgrounds: Nếu một Section (như Header hoặc Hero) có màu nền (background-color), màu nền đó phải trải full màn hình (w-full), nhưng nội dung bên trong vẫn phải tuân thủ Main Container ở trên.
2. Header Template
Cấu trúc Header phải đồng nhất và căn thẳng hàng với lưới (grid) của nội dung chính:
- Wrapper: Header có thể w-full nhưng nội dung bên trong phải nằm trong max-w-7xl mx-auto... như quy tắc Global Layout.
- Grid Layout: Sử dụng Flexbox hoặc Grid chia làm 3 phần:
-- Left (1/4): Chứa Logo, sát lề trái của container.
-- Center (2/4): Chứa các Menu Buttons, căn chính giữa tuyệt đối.
- Right (1/4): Chứa Button Login/Register, sát lề phải của container.
Sizing: Các button và menu items phải có cùng chiều cao (height) và padding đồng nhất để tạo sự cân bằng.

II. Design Pattern: Unified Blue System (High Contrast & Dark Mode)
Mọi phần tử trong hệ thống (Body, Buttons, Cards, Icons) tuyệt đối không sử dụng màu Xanh lá cây (Green). Hệ thống sử dụng giao diện Dark Mode/Deep Blue, do đó độ tương phản (Contrast) là ưu tiên số 1.
1. Bảng màu chủ đạo (Tailwind Palette)
- Primary Action: bg-blue-600 (#2563eb) - Dùng cho nút bấm chính (Primary Button).
- Secondary Surface: bg-slate-800 hoặc bg-slate-900 - Dùng cho nền Card, Sidebar.
- Background: bg-slate-950 - Dùng cho nền chính của trang (Body background).
2. Quy tắc Typography & Contrast (CRITICAL)
Để đảm bảo tính dễ đọc trên nền tối, tuân thủ tuyệt đối các rule về màu chữ sau:
- Primary Text (Tiêu đề, Label chính, Button Text):
-- Bắt buộc dùng: text-white (Trắng tuyệt đối).
-- Áp dụng cho: Heading (h1-h6), Button Label, Table Header, Sidebar Menu Item (Active).
- Secondary Text (Mô tả phụ, Subtitle):
-- Bắt buộc dùng: text-slate-300 hoặc text-blue-200.
-- CẤM: Không dùng text-gray-500, text-gray-600 hay text-blue-600 trên nền tối vì không đọc được.
- Interactive Elements (Links/Icons):
-- Default: text-blue-400 (Sáng hơn blue-600 để nổi trên nền đen).
-- Hover: text-blue-300.
3. Quy tắc Component
- Buttons:
-- Primary: bg-blue-600 text-white hover:bg-blue-500.
-- Secondary/Outline: border border-slate-600 text-slate-300 hover:border-white hover:text-white.
- Inputs/Form:
-- Background: bg-slate-900 (hoặc suốt/transparent).
-- Text: text-white.
-- Border: border-slate-700.
