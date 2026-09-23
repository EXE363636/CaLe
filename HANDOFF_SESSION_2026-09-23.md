# HANDOFF — Session 2026-09-23 (Ví/Escrow: hybrid QR + phí + hoàn cọc)

> Bàn giao cho partner. Đọc kèm `CLAUDE.md` + `HANDOFF.md` +
> `docs/HANDOFF_SESSION_2026-09-22.md`. Tất cả tính năng tiền là **MÔ PHỎNG**.

---

## 1. Trạng thái

- Branch `main`, commit **`d12363e`** — ĐÃ push + deploy cale.io.vn (Vercel).
- Supabase ref dùng chung dev+prod: `enurvffmliyrivehppaq`.
- **Migrations đã apply** (qua Dashboard SQL Editor): `0012` (ví+két), `0013`+`0014`
  (fix `_wallet_apply`), **`0015`** (hoàn cọc — session này).
- Gate xanh: `tsc`, `eslint`, `build` (28 route), `test:run` 716 pass (3 fail
  handbook CÓ SẴN, không liên quan), **`test:payment` 44 pass**.

---

## 2. Đã làm session này (đều trong d12363e)

### 2.1 Sửa lỗi số dư ví lệch server (bug chặn đăng ca)
- **Gốc:** `WalletPanel` tính balance bằng `deriveWalletBalance(ledger)` (client),
  không dùng số dư server → UI hiện đủ nhưng `confirm_deposit_session` đọc server
  báo `INSUFFICIENT_BALANCE`. Không nơi nào gọi refetch khi mount.
- **Fix:** supabase mode → balance đọc từ `wallets[].balance` (server), auto
  `refetchAsync(userId)` khi mount. `refetchAsync` nhận `userId` để gán số dư kể
  cả khi ledger rỗng. File: `walletStore.ts`, `WalletPanel.tsx`.

### 2.2 Flow hybrid QR (theo yêu cầu chủ dự án)
- **Nạp tiền = QR** (`WalletPanel` top-up 2 bước): nhập số → chọn NH demo + QR →
  "Mô phỏng nạp tiền thành công" → `wallet_top_up` (ví + két tăng).
- **Đăng ca = ví** (`DepositWalletConfirm.tsx` MỚI, thay `MockPaymentSession`
  trong `employer/shifts/new`):
  - Ví đủ → trừ trực tiếp (không QR).
  - Ví thiếu → nút **"Thanh toán bằng QR"**: 1 luồng = `createDeposit` (biết số
    tiền server) → `topUpAsync(phần thiếu)` → `confirmDeposit` (giữ cọc + publish).
- `MockPaymentSession` giờ CHỈ còn dùng trong test (`mockPayment.test.tsx`).

### 2.3 Phí dịch vụ 10% hiển thị đúng
- `domain/deposit.ts`: `PLATFORM_FEE_RATE`, `platformFee()`,
  `calculateDepositWithFee()` — khớp server `round(base × 0.1)`.
- `ShiftForm`: "Số dư cần đảm bảo" = base + phí, kèm note breakdown (chỉ supabase).
- `employer/shifts/new`: `depositPreview` gồm phí → khớp số server trừ ví.

### 2.4 Hoàn cọc ca huỷ / hết hạn (bug: trước đây tiền không về ví)
- **Migration `0015`**: thêm status `REFUNDED` + ledger type `REFUND` + RPC
  `refund_deposit_for_shift(p_shift_id)` (security definer, search_path='').
  - Điều kiện hoàn (server tự kiểm): ca `Cancelled`, HOẶC quá giờ kết thúc và
    KHÔNG có application `Confirmed` (không ai làm).
  - Hoàn ví employer +cọc, **két KHÔNG đổi** (đối xứng Lock), session → REFUNDED,
    **idempotent** (phiên đã hoàn → no-op).
- Client: `walletRepo.refundDepositForShift`, `walletStore.refundForShiftAsync`.
- **Trigger:** `employer/dashboard` có `useEffect` quét ca của employer ở lifecycle
  `Cancelled`/`Expired` → tự gọi hoàn + toast. Chống gọi lặp bằng `refundedShiftsRef`.

---

## 3. Điểm partner CẦN nắm

- **Balance là server-authoritative** ở supabase mode. Đừng quay lại tính balance
  từ ledger client (sẽ tái phát lỗi 2.1). Mọi thay đổi tiền qua RPC (#7).
- **Hoàn cọc là client-driven** (dashboard employer quét khi mount). Nếu employer
  không mở dashboard, cọc chưa hoàn — RPC idempotent nên lần mở sau sẽ hoàn.
  → Nếu cần chắc chắn hơn: gọi `refund_deposit_for_shift` ngay sau `cancel_shift`
    (client), hoặc thêm cron/edge function server-side (chưa làm).
- **Lifecycle "Expired" là client-derived** theo đồng hồ (`getShiftLifecycleState`),
  KHÔNG persist vào DB. Ca hết hạn không ai làm tự rời "Ca đang hoạt động"
  (`isActiveDashboardShift`) — đây là ĐÚNG thiết kế, ca vẫn nằm ở "Ca đã đăng".
- **Chuỗi tiếng Việt mới đang hardcode** trong `DepositWalletConfirm`, phần QR của
  `WalletPanel`, toast hoàn cọc ở dashboard — CHƯA i18n hoá (`i18n/vi.ts`).

---

## 4. Việc còn lại / đề xuất (CHƯA làm)

1. **i18n hoá** các chuỗi mới ở mục 3 (nếu team giữ chuẩn i18n).
2. **UX ca kết thúc gần đây:** hiện ca `Expired`/`Cancelled` gần đây ở một mục
   riêng trên dashboard để employer không tưởng ca "biến mất" (chủ dự án đã hỏi;
   chờ quyết A=giữ nguyên / B=thêm mục). Xem cuối hội thoại session này.
3. **Hoàn cọc chắc chắn hơn:** gọi refund ngay khi huỷ ca + xét server-side sweep.
4. **Backend "Hạn mức huỷ ca"** (cancellation quota) — vẫn hoãn, ẩn ở prod. Xem
   `docs/HANDOFF_SESSION_2026-09-22.md`.

---

## 5. Chạy / test

```bash
npm run dev            # localhost:3000 (supabase mode, cần .env.local)
npx tsc --noEmit
npx eslint --quiet
npm run test:run       # 716 pass (3 handbook fail có sẵn)
npm run build          # 28 route
npm run test:payment   # 44 pass — cần .env.test.local (SERVICE_ROLE), ref enurvffmliyrivehppaq
```

## 6. Ràng buộc (giữ nguyên)
- Provider DUY NHẤT `CALE_MOCK`. Không tiền thật, không NH thật, không MoMo/PayOS.
  Két tên "Két bảo đảm CALE_MOCK". Mọi màn payment ghi "MÔ PHỎNG — KHÔNG CÓ GIAO
  DỊCH TIỀN THẬT". Tiền tệ dùng `đ`/`đồng` (cấm `VNĐ`/`₫`).
- KHÔNG sửa migration đã apply (0001–0015). Đổi DB → corrective migration mới.
  RPC: security definer, `search_path=''`, revoke public/anon + grant authenticated.
- KHÔNG commit `.env*`/key. AI KHÔNG push `main` (deploy prod) → người dùng push.
- Model két/luồng: Deposit (nạp) ví+két tăng; Lock (đăng ca) ví-−, két giữ;
  Complete két−payout ví worker+; Refund ví employer+, két giữ; Withdraw ví−, két giữ.
