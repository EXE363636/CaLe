# HANDOFF — Session 2026-09-26 (Google login · Quên mật khẩu · OTP SĐT · CCCD)

> Đọc kèm `CLAUDE.md`, `HANDOFF.md`, `docs/SETUP_AUTH_OTP_CCCD.md` (hướng dẫn cấu hình
> dashboard từng bước).

## 1. Trạng thái
- Migration **`0022_phone_otp_identity_oauth.sql` ĐÃ apply** (`db push`), đã chạy thử
  trong transaction + rollback trước khi push. Edge Function **`phone-otp` ĐÃ deploy**.
- Cờ bắt buộc (`platform_settings`) đều **TẮT** → chưa ai bị chặn.
- Chưa cấu hình (chủ dự án làm theo `docs/SETUP_AUTH_OTP_CCCD.md`): Google provider,
  SMTP Resend + mẫu email, secret `SMS_PROVIDER` / `SPEEDSMS_TOKEN`, Redirect URLs.
- Gate: `tsc` sạch; eslint sạch trên file sửa; `test:run` 716/719 (3 fail
  `handbookContent` có sẵn); `build` OK (31 trang, thêm `/forgot-password`).

## 2. Đã làm
### DB (0022)
- `users.phone_verified_at`, `users.identity_verified_at`; đổi `phone` → mất xác thực
  (trigger); unique SĐT đã xác thực.
- `phone_otps` (chỉ service_role) + `_phone_otp_issue` (giới hạn: 60s cooldown, 5/tài
  khoản, 5/SĐT, 10/IP mỗi 24h, trần toàn hệ thống `otp_daily_cap`) + `verify_phone_otp`
  (sha256, 5 phút, 5 lần thử). `normalize_vn_phone()`.
- `identity_verifications` + bucket riêng tư `identity-docs` (`<uid>/…`, không sửa/xoá)
  + `submit_identity_verification`, `admin_list_identity_verifications`,
  `admin_review_identity`. Mỗi số CCCD chỉ duyệt cho 1 tài khoản.
- `get_my_verification`, `admin_get/set_verification_settings`.
- Chặn server: `apply` (SĐT) và `create_deposit_session` (SĐT + CCCD employer) — bọc
  bằng rename `*_before_verify_guard` như mẫu 0018. Chặn ở bước tạo phiên cọc, KHÔNG
  ở publish (ca đã trả QR vẫn lên được).
- OAuth: `handle_new_user` bỏ qua user OAuth chưa có vai trò (trước đây RAISE → Google
  lỗi); `complete_oauth_signup(jsonb)`; `_create_user_profile` dùng chung.

### Client
- `authStore`: `signInWithGoogle`, `pendingOAuth` + `markPendingOAuth` (phiên OAuth
  chưa hồ sơ KHÔNG bị signOut), `completeOAuthSignup`, `cancelOAuthSignup`,
  `requestPasswordReset`, `updatePassword`. AppHydrator + subscribeAuth xử lý `notfound`.
- `/login`: nút Google + link Quên mật khẩu. `/register`: nút Google; có
  `pendingOAuth` → form "Hoàn tất đăng ký" (không email/mật khẩu).
- `/forgot-password` (+ `?mode=reset` từ link email).
- `AccountVerificationCard` (Hồ sơ worker/employer, supabase), `VerificationGateNotice`
  (trang đăng ca, trang ca), `IdentityReviewPanel` (tab admin "Xác thực").
- Local/demo giữ nguyên luồng mô phỏng cũ.

## 3. Lưu ý
- Dev server (`next dev`) trong Browser pane bị ẩn: trang dùng `<Suspense>` + stream
  (vd /register) có thể kẹt nội dung ẩn (reveal chờ requestAnimationFrame). Build
  production chạy đúng — không phải lỗi code.
- `phone-otp` thiếu `SMS_PROVIDER` → trả `SMS_NOT_CONFIGURED` (UI: "Tính năng gửi mã
  chưa sẵn sàng"). Đừng bật "Bắt buộc SĐT" trước khi SMS gửi thật được.
- Chưa có: xoá ảnh CCCD sau X ngày; cập nhật Chính sách bảo mật (NĐ 13/2023);
  CAPTCHA cho gửi OTP (trần ngày đã giới hạn chi phí).
