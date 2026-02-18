# Database Schema — Giải thích chi tiết

> **Phiên bản:** v2 — Input/Output Token Model  
> **Database:** PostgreSQL 15+  
> **Cập nhật:** 2026-02-13

---

## Tổng quan

Hệ thống gồm **9 bảng** chia thành 3 nhóm:

| Nhóm | Bảng | Mô tả |
|------|------|-------|
| **Auth** | `users`, `user_providers` | Quản lý người dùng & xác thực |
| **Billing** | `wallets`, `token_packages`, `user_token_balances`, `transactions` | Ví tiền, gói token, lịch sử giao dịch |
| **Usage** | `usage_logs` | Audit trail sử dụng tính năng |
| **Promo** | `promo_codes`, `promo_usages` | Mã khuyến mãi |

---

## 1. `users` — Người dùng

Bảng profile chính. **Không lưu password** — password nằm ở `user_providers`.

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | UUID (PK) | ID duy nhất, tự sinh bằng `uuid_generate_v4()` |
| `email` | VARCHAR(255) | Email đăng nhập, **unique**, validate format bằng regex |
| `display_name` | VARCHAR(100) | Tên hiển thị (nullable — user có thể chưa cập nhật) |
| `avatar_url` | TEXT | URL ảnh đại diện (từ Google hoặc upload) |
| `is_active` | BOOLEAN | `false` = tài khoản bị khóa/ban |
| `email_verified` | BOOLEAN | `true` khi user đã xác nhận email qua link |
| `last_login_at` | TIMESTAMPTZ | Thời điểm đăng nhập gần nhất |
| `created_at` | TIMESTAMPTZ | Ngày tạo tài khoản |
| `updated_at` | TIMESTAMPTZ | Tự động cập nhật qua trigger |

---

## 2. `user_providers` — Phương thức xác thực

Cho phép **1 user liên kết nhiều phương thức** đăng nhập (email + Google cùng lúc).

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | UUID (PK) | ID record |
| `user_id` | UUID (FK → users) | User sở hữu phương thức này |
| `provider` | ENUM | `email` · `google` · `facebook` · `github` |
| `provider_uid` | VARCHAR(255) | ID từ OAuth provider (Google `sub`, Facebook ID). **Bắt buộc** khi provider ≠ email |
| `provider_email` | VARCHAR(255) | Email trả về từ OAuth (có thể khác email chính) |
| `provider_data` | JSONB | Dữ liệu bổ sung: access_token, refresh_token, profile |
| `password_hash` | VARCHAR(255) | Bcrypt hash. **Bắt buộc** khi provider = `email`, NULL khi social login |

**Constraints quan trọng:**
- `UNIQUE(user_id, provider)` — mỗi user chỉ link 1 Google ID
- `UNIQUE(provider, provider_uid)` — 1 Google ID không thể link 2 user
- `CHECK` — email phải có password, social phải có uid

---

## 3. `token_packages` — Định nghĩa gói Token

Bảng tham chiếu do **admin quản lý**. Seed sẵn 3 gói:

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | UUID (PK) | ID gói |
| `slug` | VARCHAR(50) | Mã gói: `payg`, `basic`, `premium` |
| `name` | VARCHAR(100) | Tên hiển thị: "Pay-as-you-go", "Gói Basic"... |
| `package_type` | ENUM | `payg` · `basic` · `premium` |
| `price_usd` | DECIMAL(10,2) | Giá bán: $0 (payg), $10 (basic), $19 (premium) |
| `input_tokens` | BIGINT | Token input được cấp: 0 (payg), 55M, 118M |
| `output_tokens` | BIGINT | Token output được cấp: 0 (payg), 27M, 59M |
| `input_rate_per_million` | DECIMAL(10,4) | Giá input per 1M tokens ($0.20 cho payg) |
| `output_rate_per_million` | DECIMAL(10,4) | Giá output per 1M tokens ($0.40 cho payg) |
| `is_active` | BOOLEAN | `false` = ẩn gói khỏi trang pricing |
| `sort_order` | INT | Thứ tự hiển thị trên UI |

**Dữ liệu seed:**

| Slug | Giá | Input | Output | Rate In/Out |
|------|-----|-------|--------|-------------|
| `payg` | $0 | — | — | $0.20 / $0.40 per 1M |
| `basic` | $10 | 55M | 27M | — |
| `premium` | $19 | 118M | 59M | — |

---

## 4. `wallets` — Ví tiền USD

Lưu **số dư tiền thật** (USD cents). Tách riêng khỏi `users` để dễ `SELECT FOR UPDATE` lock row khi thao tác tài chính.

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | UUID (PK) | ID ví |
| `user_id` | UUID (FK → users, **unique**) | Mỗi user chỉ có **1 ví** (quan hệ 1:1) |
| `balance_cents` | BIGINT | Số dư hiện tại, đơn vị **USD cents** (ví dụ: 1000 = $10.00) |
| `total_deposited_cents` | BIGINT | Tổng tiền đã nạp (thống kê) |
| `total_spent_cents` | BIGINT | Tổng tiền đã chi (mua gói + payg) |

> **Tại sao dùng cents (BIGINT) thay vì DECIMAL?**  
> Tránh lỗi floating-point khi tính toán tài chính. 1 USD = 100 cents.

---

## 5. `user_token_balances` — Token còn lại (per gói)

Mỗi lần user mua 1 gói (Basic/Premium) → tạo **1 row** ở đây. Khi dùng hết → `is_exhausted = true` → chuyển sang row tiếp (FIFO).

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | UUID (PK) | ID record |
| `user_id` | UUID (FK → users) | User sở hữu |
| `package_id` | UUID (FK → token_packages) | Gói nào đã mua |
| `transaction_id` | UUID (FK → transactions) | Giao dịch mua gói |
| `initial_input_tokens` | BIGINT | Token input ban đầu khi mua (ví dụ: 55M) |
| `initial_output_tokens` | BIGINT | Token output ban đầu khi mua (ví dụ: 27M) |
| `remaining_input_tokens` | BIGINT | Token input **còn lại** (giảm dần) |
| `remaining_output_tokens` | BIGINT | Token output **còn lại** (giảm dần) |
| `expires_at` | TIMESTAMPTZ | Ngày hết hạn. `NULL` = không giới hạn thời gian |
| `is_exhausted` | BOOLEAN | `true` khi cả input + output = 0 |

**Ví dụ:** User mua Basic → row: `remaining_input = 55M, remaining_output = 27M`.  
Sau khi OCR 100 lần → giảm dần. Hết → `is_exhausted = true`.

---

## 6. `transactions` — Lịch sử nạp tiền & mua gói

Ghi nhận **mọi giao dịch tài chính**: nạp tiền, mua gói, topup payg.

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | UUID (PK) | ID giao dịch |
| `user_id` | UUID (FK → users) | Ai thực hiện. Dùng `ON DELETE RESTRICT` — không cho xóa user có giao dịch |
| `type` | ENUM | `deposit` (nạp tiền) · `package_purchase` (mua gói) · `payg_topup` (nạp thêm cho payg) |
| `status` | ENUM | `pending` → `success` / `failed` / `refunded` |
| `amount_cents` | BIGINT | Số tiền USD (cents) |
| `currency` | VARCHAR(3) | Mã tiền tệ ISO 4217: `USD`, `VND`... |
| `package_id` | UUID (FK → token_packages) | Gói nào được mua (chỉ khi type = `package_purchase`) |
| `payment_method` | ENUM | `momo` · `vnpay` · `zalopay` · `stripe` · `bank_transfer` · `manual` |
| `gateway_txn_id` | VARCHAR(255) | Mã giao dịch từ cổng thanh toán (MoMo, VNPay...) |
| `gateway_response` | JSONB | Response gốc từ gateway (để debug/audit) |
| `description` | TEXT | Mô tả: "Nạp $10 - Gói Basic" |
| `ip_address` | INET | IP client lúc tạo giao dịch |
| `promo_code_id` | UUID (FK → promo_codes) | Mã khuyến mãi đã áp dụng |
| `completed_at` | TIMESTAMPTZ | Thời điểm hoàn thành (khi status chuyển sang `success`) |

---

## 7. `usage_logs` — Lịch sử sử dụng

**Audit trail** — ghi nhận mỗi lần user dùng feature OCR/AI/Export. Bảng này **chỉ INSERT, không UPDATE/DELETE**.

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | UUID (PK) | ID record |
| `user_id` | UUID (FK → users) | Ai sử dụng |
| `feature` | ENUM | `ocr_basic` · `ocr_advanced` · `ai_reconstruct` · `ai_translate` · `ai_summarize` · `export_pdf` · `export_docx` · `export_xlsx` |
| `input_tokens_used` | BIGINT | Số token input đã dùng lần này |
| `output_tokens_used` | BIGINT | Số token output đã dùng lần này |
| `token_balance_id` | UUID (FK → user_token_balances) | Trừ từ gói nào. **NULL** = trừ payg từ wallet |
| `cost_cents` | BIGINT | Chi phí USD (cents) nếu pay-as-you-go. `0` nếu dùng gói |
| `input_metadata` | JSONB | Thông tin đầu vào: `{ file_name, file_size, mime_type, dimensions }` |
| `output_metadata` | JSONB | Thông tin đầu ra: `{ text_length, confidence, provider, processing_ms }` |
| `ip_address` | INET | IP client |
| `user_agent` | TEXT | Browser/app info |

> **Không có `updated_at`** vì đây là audit log — dữ liệu bất biến.

---

## 8. `promo_codes` — Mã khuyến mãi

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | UUID (PK) | ID mã |
| `code` | VARCHAR(50) | Mã nhập: `WELCOME20`, `SUMMER2026`... (unique) |
| `description` | TEXT | Mô tả nội bộ |
| `status` | ENUM | `active` · `expired` · `depleted` (hết lượt) |
| `discount_percent` | INT | Giảm giá %: `20` = giảm 20% |
| `discount_cents` | BIGINT | Giảm giá cố định: `500` = giảm $5.00 |
| `bonus_input_tokens` | BIGINT | Token input thưởng thêm |
| `bonus_output_tokens` | BIGINT | Token output thưởng thêm |
| `max_uses` | INT | Tổng lượt dùng tối đa. `NULL` = không giới hạn |
| `current_uses` | INT | Số lượt đã dùng |
| `max_uses_per_user` | INT | Mỗi user dùng tối đa mấy lần (mặc định 1) |
| `applicable_packages` | VARCHAR | Áp dụng cho gói nào: `basic`, `premium` |
| `min_amount_cents` | BIGINT | Đơn hàng tối thiểu để dùng promo |
| `starts_at` | TIMESTAMPTZ | Ngày bắt đầu có hiệu lực |
| `expires_at` | TIMESTAMPTZ | Ngày hết hạn. `NULL` = vĩnh viễn |

---

## 9. `promo_usages` — Lịch sử sử dụng promo

Tracking **ai đã dùng mã nào**, tại giao dịch nào — để đảm bảo `max_uses_per_user`.

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | UUID (PK) | ID record |
| `promo_code_id` | UUID (FK → promo_codes) | Mã nào |
| `user_id` | UUID (FK → users) | Ai dùng |
| `transaction_id` | UUID (FK → transactions) | Giao dịch nào |

---

## Stored Functions

### `fn_consume_tokens()`
Trừ token khi user sử dụng feature. Logic:
1. Tìm gói token chưa hết (**FIFO** — mua trước dùng trước)
2. Nếu có gói → trừ `remaining_input/output_tokens`
3. Nếu hết gói → fallback **pay-as-you-go**: tính tiền USD → trừ `wallets.balance_cents`
4. Ghi 1 record vào `usage_logs`

### `fn_complete_transaction()`
Xử lý khi payment gateway callback thành công:
- **Deposit**: cộng tiền vào `wallets.balance_cents`
- **Package purchase**: trừ tiền wallet → tạo row mới trong `user_token_balances`

### `fn_update_timestamp()`
Trigger tự động set `updated_at = NOW()` mỗi khi UPDATE row.

---

## Quan hệ giữa các bảng

```
users (1) ──── (1) wallets                  1 user = 1 ví
users (1) ──── (N) user_providers           1 user = nhiều phương thức login
users (1) ──── (N) user_token_balances      1 user = nhiều gói đã mua
users (1) ──── (N) transactions             1 user = nhiều giao dịch
users (1) ──── (N) usage_logs               1 user = nhiều lý sử dụng

token_packages (1) ──── (N) user_token_balances   1 gói = nhiều user mua
promo_codes    (1) ──── (N) promo_usages          1 mã = nhiều lượt dùng
transactions   (1) ──── (N) promo_usages          1 giao dịch = 1 promo usage
```
