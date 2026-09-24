# HANDOFF — Session 2026-09-24 (Ví nền tảng nhận phí 10% + thống kê admin + graphify)

> Bàn giao cho partner. Đọc kèm `CLAUDE.md` + `HANDOFF.md`.
> Production (`NEXT_PUBLIC_DATA_MODE=supabase`) dùng **tiền THẬT qua PayOS** cho
> nạp / giữ cọc / trả công / hoàn cọc / rút tiền.

---

## 1. Trạng thái

- `main` = **`07221a0`** (fast-forward từ `fa5c36f`, không merge commit). Đã push.
  Nhánh `feat/payos-real-payment` trùng `main`.
- Supabase ref: `enurvffmliyrivehppaq`. **Migration `0021` ĐÃ apply** bằng
  `supabase db push` (máy chủ dự án đã `supabase link`). `migration list` xác nhận
  0001–0020 có sẵn trên remote → chỉ 0021 được đẩy.
- Đã kiểm tra thật trên localhost (supabase mode): thống kê admin đúng (1 ca đăng,
  1 hoàn thành), ví admin **4.545 đ** = phí của ca đã hoàn thành (backfill).
- Gate: `tsc` sạch; `eslint` sạch trên file đã sửa; `test:run` **716/719** (3 fail
  `handbookContent.test.tsx` — CÓ SẴN, không liên quan).
  `build` **chưa xác nhận** trên máy dev (không tải được font Inter từ Google Fonts
  — lỗi mạng). Kiểm tra lại bằng log build Vercel.

---

## 2. Đã làm (commit `ec2a94f`)

### 2.1 Thống kê admin toàn số 0 (bug)
- **Gốc:** `refetchPhase2Supabase` (`AppHydrator.tsx`) chỉ có nhánh employer/worker;
  admin chỉ nạp `public_shifts` (ca đang tuyển) → ca Completed/Cancelled không có
  trong `shiftStore` → "Tổng ca đã đăng" / "Ca đã hoàn thành" = 0.
- **Fix:** nhánh admin gọi `shiftStore.refetchAll()` (→ `shiftRepo.listAllShifts()`,
  đọc bảng `shifts`) rồi `applicationStore.refetchForShifts(mọi id)`.
  RLS `shifts_select` / `applications_select` vốn đã cho `is_admin()` đọc toàn bộ —
  **không cần migration**.

### 2.2 Phí 10% → ví admin (migration `0021_platform_fee_to_admin_wallet.sql`)
- Trước: phí chỉ ghi `PLATFORM_FEE` vào `mock_payment_ledger`, tiền nằm lại két
  (`system_bank`), không thuộc ví ai.
- `platform_settings` (1 dòng): `fee_wallet_user_id` = **một** admin nhận phí,
  mặc định admin tạo sớm nhất lúc apply. RLS: chỉ admin đọc; client không ghi.
- Trigger `mock_payment_ledger_platform_fee` (AFTER INSERT, `entry_type='PLATFORM_FEE'`)
  → `_credit_platform_fee(shift_id, amount)`: ví admin `+phí` (kind
  `PlatformFeeReceived`), két `−phí` — **cùng mẫu `_pay_worker_wage`**.
  - Bắt mọi đường chốt cọc (0012 `release_deposit`, 0018 `_finalize_shift_deposit`)
    mà không phải sửa lại các hàm đó.
  - Cùng transaction với chốt cọc (lỗi → rollback cả chốt cọc).
  - Idempotent theo ca: `pg_advisory_xact_lock` + kiểm tra ledger đã có
    `PlatformFeeReceived` cho `shift_id`.
  - Không có người nhận hợp lệ (NULL / không còn role admin) → phí ở lại két như cũ.
- `sync_platform_fees(p_since default '2026-09-24 00:00+07')` — chỉ `service_role`.
  Backfill đã chạy 1 lần khi apply. **Mốc 24/09** = ngày 0017 khoá nạp/rút mô phỏng;
  phí cũ hơn có thể sinh từ tiền mô phỏng → KHÔNG chuyển (tránh rút ra tiền thật
  không có thật).
- UI: tab Thống kê admin có `WalletPanel` "Ví nền tảng (phí dịch vụ 10%)",
  `allowTopUp={false}`, rút qua luồng PayOS hiện có (Edge Function `withdraw`
  không giới hạn vai trò). Chỉ hiện ở supabase mode.
- Type: `WalletLedgerEntryKind` thêm `'PlatformFeeReceived'`; i18n
  `wallet.kind.PlatformFeeReceived`, `admin.wallet.title`.

---

## 3. Tooling (commit `07221a0`)

- **Graphify** (knowledge graph của code) cài project-scoped:
  `.claude/skills/graphify/`, hook PreToolUse trong `.claude/settings.json`, mục
  `## graphify` cuối `CLAUDE.md`. `.graphifyignore` loại `.claude/`, `.next/`,
  `*.min.js`… `graphify-out/` bị gitignore → **mỗi máy tự dựng graph**.
- **Xoá `.kiro/skills/impeccable`** (tool thiết kế Kiro, runtime không dùng; script
  `impeccable-live` đã gỡ khỏi layout từ trước). **Giữ `.kiro/specs/`** (tài liệu
  lịch sử các phase). Bỏ tham chiếu `.impeccable/design.json` (file không tồn tại)
  trong `DESIGN.md`, `globals.css` (comment), `CLAUDE.md`. Trong `.kiro/specs/`
  vẫn còn nhắc `detect.mjs` / `design.json` — để nguyên vì là spec đã xong.

---

## 4. Partner cần làm sau khi pull

1. Nếu máy bạn đã tự cài graphify (gitignore local), `git pull` có thể báo:
   - *untracked files would be overwritten* → `rm -rf .claude/skills/graphify .claude/settings.json .claude/CLAUDE.md` rồi pull lại.
   - *local changes would be overwritten* ở `CLAUDE.md` → `git checkout -- CLAUDE.md` rồi pull lại.
   - Bỏ dòng ignore `.claude/` (trong `.gitignore` / `.git/info/exclude` / global gitignore) nếu có.
2. `graphify` phải có trong PATH (hook gọi lệnh trần). Pip `--user` trên Windows cài
   vào `%APPDATA%\Python\Python313\Scripts`. Parser SQL: `pip install "graphifyy[sql]"`.
3. Dựng graph (AST, không tốn token): `graphify update .`
   - **Tránh `/graphify` build full** — ~2,5 triệu chữ docs/spec → semantic
     extraction bằng subagent rất tốn token.
   - Tuỳ chọn: `graphify hook install` (git hook tự rebuild sau commit/checkout).
4. Không cần chạy migration — 0021 đã có trên Supabase dùng chung.

---

## 5. Điểm CẦN nắm / việc còn mở

- **Quỹ chi PayOS (ví Bảo Kim) đang hết tiền** — banner đỏ trên admin: 1 lệnh rút
  bị từ chối 24/09 14:53. Rút tiền (kể cả ví admin) sẽ bị PayOS từ chối và tự hoàn
  ví cho đến khi nạp thêm tài khoản chi.
- **Đổi người nhận phí** (service_role / SQL Editor):
  ```sql
  update platform_settings set fee_wallet_user_id = '<uuid admin>', updated_at = now();
  select public.sync_platform_fees();  -- chuyển bù phí chưa cộng (từ 24/09)
  ```
  Phí đã cộng cho admin cũ KHÔNG tự chuyển sang admin mới.
- Một ca có >1 phiên cọc (hiếm) → phí chỉ cộng cho phiên đầu; phần sau ở lại két.
- Admin `refetchForShifts(mọi id)` dùng `.in('shift_id', …)` trên URL — ổn với vài
  trăm ca; khi lớn cần phân trang hoặc RPC.
- "Ca đang hoạt động" (admin) đếm theo `shift.status` thô
  (`Published/FullyBooked/InProgress/AwaitingConfirmation`), không qua
  `getShiftLifecycleState` — có thể lệch nhãn lifecycle ở các trang khác. Chưa sửa.
- Máy chủ dự án còn thay đổi **chưa commit** ở `supabase/functions/create-payment/index.ts`
  (việc riêng, không nằm trong `main`).
