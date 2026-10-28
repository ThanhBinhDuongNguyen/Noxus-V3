# Hướng dẫn deploy NexusOMS lên Antigravity (hoặc Supabase mới)

## Vấn đề "lỗi Schema" và cách khắc phục

Lỗi Schema xảy ra vì 2 nguyên nhân:

### 1. Thiếu biến môi trường (env vars)

App cần 2 biến môi trường để kết nối Supabase:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...
```

**Trên Antigravity:** Tạo file `.env` ở thư mục gốc, điền URL và anon key từ Supabase Dashboard (Project Settings > API).

### 2. Database chưa có schema

40 migration cần được chạy trên database. Khi dùng database mới, chưa có bảng nào.

## Các bước deploy

### Bước 1: Tạo/kết nối Supabase project

- Tạo project mới trên Supabase (hoặc dùng project có sẵn)
- Lấy URL và anon key từ Settings > API
- Điền vào file `.env`

### Bước 2: Chạy migrations

Tất cả 40 file SQL trong `supabase/migrations/` cần được chạy theo thứ tự thời gian. Chạy từng file trong Supabase Dashboard > SQL Editor, hoặc dùng Supabase CLI:

```bash
supabase db push
```

### Bước 3: Tạo tài khoản demo (nếu cần)

Sau khi chạy migrations, dùng edge function `recreate-users` để tạo lại tài khoản demo, hoặc chạy SQL trong migration `seed_demo_flows_all_roles.sql`.

### Bước 4: Build và deploy

```bash
npm install
npm run build
```

Thư mục `dist/` chứa file đã build, deploy lên hosting.

## Kiểm tra

Sau khi deploy, mở app. Nếu thấy trang login thì kết nối thành công. Nếu thấy lỗi "Missing Supabase environment variables" thì `.env` chưa đúng. Nếu trang load nhưng không có dữ liệu thì migrations chưa chạy hết.
