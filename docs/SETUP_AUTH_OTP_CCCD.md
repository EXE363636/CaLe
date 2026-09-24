# Cấu hình: Đăng nhập Google · Quên mật khẩu (Resend) · OTP SĐT (SpeedSMS) · CCCD

> Code: migration `0022_phone_otp_identity_oauth.sql`, Edge Function `phone-otp`,
> trang `/forgot-password`, thẻ "Xác thực tài khoản" (Hồ sơ), tab admin "Xác thực".
> **Không dán key/secret vào chat hay commit vào git.** Chỉ nhập trong dashboard
> hoặc `npx supabase secrets set`.

---

## 0. Triển khai code (1 lần)

```bash
npx supabase db push
npx supabase functions deploy phone-otp
```

Sau `db push`: mọi cờ bắt buộc đều **TẮT** → chưa ai bị chặn. Bật ở tab admin
**Xác thực** khi SMS đã gửi được thật.

---

## 1. Supabase — URL được phép quay về (bắt buộc cho cả Google lẫn Quên mật khẩu)

Supabase Dashboard → **Authentication → URL Configuration**
- **Site URL:** `https://cale.io.vn`
- **Redirect URLs** → Add URL:
  - `https://cale.io.vn/**`
  - `http://localhost:3000/**`

---

## 2. Đăng nhập Google (miễn phí)

### 2.1 Google Cloud
1. Vào <https://console.cloud.google.com> (đăng nhập Gmail của dự án) → góc trên
   chọn **Select a project → New project** → tên `CaLe` → Create.
2. Menu ☰ → **APIs & Services → OAuth consent screen** (hoặc "Google Auth Platform")
   → **Get started**:
   - App name: `CaLẻ` · User support email: email dự án
   - Audience: **External**
   - Contact information: email dự án → Create.
3. Mục **Branding** → *Authorized domains* → thêm `cale.io.vn` và
   `enurvffmliyrivehppaq.supabase.co` → Save.
4. Mục **Audience** → **Publish app** (chuyển "Testing" → "In production").
   Chỉ dùng quyền cơ bản (email, tên) nên KHÔNG cần Google duyệt.
5. Mục **Clients → Create client**:
   - Application type: **Web application** · Name: `CaLe web`
   - Authorized JavaScript origins: `https://cale.io.vn` và `http://localhost:3000`
   - Authorized redirect URIs: `https://enurvffmliyrivehppaq.supabase.co/auth/v1/callback`
   - Create → hiện **Client ID** và **Client secret** (để cửa sổ đó mở).

### 2.2 Supabase
Dashboard → **Authentication → Sign In / Providers → Google** → bật **Enable** →
dán **Client ID** và **Client secret** → **Save**.

### 2.3 Thử
cale.io.vn/login → **Tiếp tục với Google** → chọn tài khoản:
- Email chưa có tài khoản → trang **Hoàn tất đăng ký** (chọn vai trò, SĐT, tên…).
- Email đã đăng ký bằng mật khẩu → vào thẳng tài khoản cũ (Supabase tự liên kết).

> Màn Google sẽ ghi "tiếp tục tới enurvffmliyrivehppaq.supabase.co". Muốn hiện
> `cale.io.vn` cần Custom Domain của Supabase (gói trả phí) — không bắt buộc.

---

## 3. Quên mật khẩu — gửi email qua Resend (miễn phí 3.000 email/tháng, 100/ngày)

Email mặc định của Supabase chỉ gửi vài email/giờ và chỉ tới email thành viên
dự án → **không dùng được cho người dùng thật**.

### 3.1 Resend
1. Đăng ký <https://resend.com> → **Domains → Add domain** → nhập `cale.io.vn`
   (region gần nhất, vd Tokyo).
2. Resend hiện 3–4 bản ghi DNS (MX, TXT/SPF, TXT/DKIM, có thể thêm DMARC). Thêm
   đúng từng bản ghi vào nơi quản lý DNS của `cale.io.vn` (nơi mua tên miền, hoặc
   Vercel → Domains nếu DNS đang ở Vercel). Quay lại Resend bấm **Verify** (vài
   phút – vài giờ).
3. **API Keys → Create API key** → quyền *Sending access* → copy key (chỉ hiện 1 lần).

### 3.2 Supabase
Dashboard → **Authentication → Emails → SMTP Settings** → bật **Enable custom SMTP**:

| Ô | Giá trị |
|---|---|
| Sender email | `no-reply@cale.io.vn` |
| Sender name | `CaLẻ` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | *API key Resend* |

Rồi **Authentication → Rate Limits** → "Rate limit for sending emails" → đặt `100`/giờ.

### 3.3 Mẫu email tiếng Việt
**Authentication → Emails → Templates → Reset Password**:
- Subject: `Đặt lại mật khẩu CaLẻ`
- Body:
```html
<h2>Đặt lại mật khẩu</h2>
<p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu tài khoản CaLẻ.</p>
<p><a href="{{ .ConfirmationURL }}">Bấm vào đây để đặt mật khẩu mới</a></p>
<p>Link chỉ dùng được một lần và hết hạn sau 1 giờ. Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>
```

---

## 4. OTP số điện thoại — SpeedSMS

### 4.1 Thử trước, không tốn tiền (chế độ mock)
```bash
npx supabase secrets set SMS_PROVIDER=mock
```
Mã OTP không gửi SMS mà in ra log: Dashboard → **Edge Functions → phone-otp → Logs**.

### 4.2 Chạy thật
1. Đăng ký <https://connect.speedsms.vn> → nạp ít tiền (100–200 nghìn đ để thử).
2. Lấy **API access token** trong phần cài đặt tài khoản / API.
3. Tự chạy trên máy (không gửi token cho ai):
   ```bash
   npx supabase secrets set SMS_PROVIDER=speedsms SPEEDSMS_TOKEN=<token của bạn>
   ```
   Mặc định gửi bằng brandname chung **Notify** (`SPEEDSMS_SMS_TYPE=4`,
   `SPEEDSMS_SENDER=Notify`) — không cần đăng ký brandname. Khi có brandname riêng
   `CaLe` thì đặt `SPEEDSMS_SMS_TYPE=3` và `SPEEDSMS_SENDER=CaLe`.
4. Vào Hồ sơ → **Xác thực ngay** thử với số của bạn. Lỗi gửi (hết tiền, sai
   token…) hiện ở tab admin **Xác thực** ("Lỗi gần nhất") và log function.
5. Chạy ổn → tab admin **Xác thực** → bật **Bắt buộc xác thực SĐT**.

### 4.3 Chống spam / đốt tiền SMS (đã có sẵn)
- Chỉ tài khoản đã đăng nhập; chỉ số di động VN (không gửi quốc tế).
- 60 giây giữa 2 lần gửi; tối đa 5 mã/tài khoản, 5 mã/số điện thoại, 10 mã/IP
  trong 24 giờ.
- **Trần toàn hệ thống / 24 giờ** (mặc định 300 mã, sửa ở tab admin) → chi phí
  tối đa ≈ 300 × giá 1 tin mỗi ngày dù bị tấn công. Vượt trần: tạm ngừng gửi,
  người dùng thấy "Hệ thống tạm ngừng gửi mã".
- Mã 6 số, hết hạn 5 phút, sai 5 lần phải xin mã mới; DB chỉ lưu hash.

---

## 5. CCCD (admin duyệt tay)

- Người dùng: Hồ sơ → **Căn cước công dân** → họ tên, số CCCD, ngày sinh, ảnh 2 mặt
  + ảnh chân dung cầm CCCD, tick đồng ý → Gửi.
- Ảnh lưu ở bucket **riêng tư** `identity-docs` (chỉ chủ ảnh và admin xem, qua link
  ký tạm 10 phút). Mỗi số CCCD chỉ được duyệt cho 1 tài khoản.
- Admin: tab **Xác thực** → *Chờ duyệt* → **Xem ảnh** → **Duyệt** / **Từ chối** (ghi lý do).
- Bật **Bắt buộc CCCD đã duyệt trước khi employer đăng ca** khi sẵn sàng. Employer
  chưa duyệt sẽ thấy nhắc ở trang Đăng ca và bị chặn ở bước giữ cọc (trước khi trừ tiền).

> Pháp lý: ảnh CCCD + ảnh chân dung là dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP).
> Nên cập nhật trang Chính sách bảo mật: mục đích thu thập, thời gian lưu, quyền
> yêu cầu xoá.
