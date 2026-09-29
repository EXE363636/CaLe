# HANDOFF — Session 2026-09-29 (nút Rút tiền + P2-3 miễn phí dịch vụ theo đợt)

> Đọc kèm `CLAUDE.md` và `docs/HANDOFF_SESSION_2026-09-28_FEEDBACK.md` (plan P0–P3).

## ✅ Migration 0025 ĐÃ apply lên DB thật (29/09, hungkobe273)
- File: `supabase/migrations/20260929000025_fee_free_campaign.sql`.
- `npx supabase db push` chạy 29/09 sau khi chủ dự án đồng ý. Sau push đã kiểm:
  `migration list` có cả local lẫn remote; `fee_free_until` = NULL (đợt đang
  TẮT, phí 10% như cũ); nhật ký trống; hàm phiên cọc dùng `_shift_fee_rate`;
  quyền đúng (anon chỉ gọi được `get_fee_settings`; không ai gọi thẳng được
  hàm nội bộ; anon không đọc được bảng audit).
- Đã chạy thử trên DB thật trong transaction + `rollback` (4 lần, bản cuối ở
  `d9e3dcf`): mọi kiểm tra đạt, sau rollback DB không còn dấu vết.
- Code (nhánh `fix/wallet-withdraw-visible`) merge được ngay. Sau khi deploy,
  kiểm tra tay trên production:
  1. `npx supabase migration list` → 0025 có cả local lẫn remote.
  2. Admin → tab Thống kê → đặt "Miễn phí đến hết ngày" → trang Đăng ca của
     employer hiện "Miễn phí (đợt đến hết …)", bước xác nhận giữ cọc = đúng tiền
     công (không cộng 10%).
  3. Đổi ngày làm ca ra quá 30 ngày sau đợt → hiện lại phí 10% + dòng nhắc.
  4. Bấm "Tắt miễn phí" → phí về 10%.

## 0. Trạng thái repo
- `main` = `75755d7`: đã merge PR #8 (P0 + P1) và PR #9 (trang chủ có ảnh +
  "Ca gấp cần người"; sửa 7 test e2e ví; eslint bỏ qua thư mục sinh ra).
- Nhánh **`fix/wallet-withdraw-visible`** (tách từ `main`), chưa merge:
  - `491ba1f` **fix(wallet): nút "Rút tiền" luôn hiện**, làm mờ khi số dư dưới
    mức rút tối thiểu (PayOS 2.000 đ) + dòng lý do. Trước đây nút bị ẩn hẳn nên
    người dùng tưởng không có tính năng rút. Chỉ đổi hiển thị. E2E mới trong
    spec 20.
  - `d9e3dcf` **feat(fee): P2-3 miễn phí dịch vụ theo đợt** (mục dưới).
  - commit docs này.

### Giải thích cho câu hỏi "worker mất nút nạp/rút"
- Worker **không có nút Nạp là cố ý** (`860d98b`, 22/09): worker không giữ cọc,
  tiền công tự cộng vào ví khi ca hoàn thành.
- Nút Rút trước đây chỉ hiện khi số dư ≥ 2.000 đ (`c7d55db`, 26/09) → ví 0 đ
  không thấy nút. Đã sửa ở `491ba1f`.

## 1. P2-3 — miễn phí dịch vụ theo đợt (feedback F12)
Mục đích: campaign "Miễn phí tất cả 1 tuần" / "Free cả tháng".

**Quy tắc (chủ dự án chốt 29/09, phương án 2):** ca được phí 0% khi
- giữ cọc (đăng ca) **đến hết ngày `fee_free_until`** theo giờ Việt Nam, **và**
- **ngày làm ca ≤ `fee_free_until` + 30 ngày** (chặn đăng trước hàng loạt ca ở
  xa để né phí).

Ví dụ đợt đến hết 07/10: đăng 05/10 ca 20/10 → miễn phí; ca 07/11 → 10%; đăng
08/10 → 10%. Ca đã đăng trước đợt giữ nguyên phí.

**Server (0025):**
- Cột `platform_settings.fee_free_until date` (NULL = tắt, mặc định).
- `_shift_fee_rate(ngày ca)` thay hằng `0.10` trong
  `create_deposit_session_before_verify_guard` — thân hàm giữ nguyên bản 0010,
  chỉ đổi dòng tính phí (đã diff).
- `get_fee_settings()` công khai (chỉ trả tỉ lệ + ngày, không bí mật).
- `admin_set_fee_free_until(date)` chỉ admin; ngày từ hôm nay đến +366; NULL để
  tắt. Mỗi lần đổi ghi `platform_settings_audit` (ai đổi, cũ → mới).
- Đối soát/hoàn cọc (0018) và chuyển phí cho admin (0021) dùng
  `payment_sessions.platform_fee` → phí 0 thì không cộng gì (đã kiểm).

**Client:**
- `src/domain/deposit.ts`: `isFeeFreeForShift`, `shiftFeeRate`,
  `feeFreeShiftDeadline`, `serverWageTotal` (làm tròn tiền công như server) —
  test `src/__tests__/feeFreeCampaign.test.ts` (14 test).
- `src/data/repos/feeRepo.ts`, `src/lib/useFeeSettings.ts` (đọc 1 lần khi mount).
- Trang Đăng ca (`ShiftForm`, `employer/shifts/new`): dòng phí "Miễn phí (đợt
  đến hết …)" hoặc nhắc khi ca quá xa.
- Admin tab Thống kê: `FeeCampaignCard`.
- `DepositWalletConfirm`: nếu số server khác số người dùng đã thấy → dừng, hiện
  số mới, bắt bấm lại (không bao giờ giữ vượt số đã hiện).

**security-reviewer (2 lượt):** không có lỗi Nghiêm trọng/Cao. Đã sửa: giữ cọc
vượt số hiển thị (Cao), audit người đổi đợt, lệch làm tròn với ca có phút lẻ,
race khi admin tắt đợt, câu báo phiên hết hạn. Chấp nhận (ghi trong migration):
phiên tạo trong đợt còn hạn 30 phút nên có thể xác nhận ngay sau khi đợt hết.
Còn lại (Thấp): mô tả sổ cái phí ở 0021 ghi cứng "10%".

## 2. Gate
- tsc 0 lỗi · lint 0 lỗi (7 cảnh báo có sẵn) · `test:run` 792/792 · build OK,
  đúng 33 route.
- E2E ví (spec 14/16/20/21) qua. Luồng miễn phí chỉ có ở production nên chưa
  có e2e — kiểm tay theo mục ⛔ sau khi push.

## 3. Việc tiếp theo
- [x] `db push` 0025 (29/09).
- [ ] Merge `fix/wallet-withdraw-visible` → kiểm tay theo mục ✅ ở đầu file.
- [ ] (tuỳ chọn) Trang Bảng giá / `/tuyen-dung` hiện dải "Đang miễn phí dịch vụ
      đến hết …" khi có đợt — chưa làm.
- [ ] **P2-2 thưởng nạp ví** (đã chốt F10: nạp 500.000 đ được +100.000 đ, tiền
      thưởng chỉ trừ phí dịch vụ, không trả công, không rút). Cần thêm điều
      khoản "tiền thưởng không quy đổi tiền mặt".
- [ ] **P2-1 cọc worker** vẫn chờ chủ dự án chốt 3 điểm: worker vắng mặt thì cọc
      về đâu; "1 tháng" là 30 ngày gần nhất hay tháng dương lịch; đã xác thực
      CCCD có miễn cọc không.

## 4. Lưu ý môi trường (Windows)
- Dev server supabase thường chạy ở :3000 trong repo → e2e chạy trên bản copy
  tạm (junction `node_modules`) với
  `NEXT_PUBLIC_DATA_MODE=local npx next dev --webpack -p 3101` và `E2E_PORT=3101`.
- Build trên bản copy dùng `npx next build --webpack` (Turbopack báo lỗi với
  junction `node_modules`).
- Chạy thử migration: `npx supabase db query --linked -f <file có begin; … rollback;>`.
