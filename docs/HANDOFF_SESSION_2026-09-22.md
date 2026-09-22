# BÀN GIAO PHIÊN LÀM VIỆC — 2026-09-22

> Cho partner tiếp nhận. Đọc cùng `CLAUDE.md`, `HANDOFF.md`,
> `docs/HANDOFF_OUTCOME1_FINAL.md`. Repo: **EXE363636/CaLe**.
> Nhánh chính: `main` — **merge/push main = auto-deploy `cale.io.vn` (Vercel)**.

## 0. TL;DR
- Toàn bộ việc phiên này **đã merge vào `main` và deploy** production. `origin/main` ở `5cedfbf`.
- **Việc bàn giao chính cho partner:** làm **backend "Hạn mức huỷ ca" (cancellation quota)** — hiện đang **ẩn ở production** vì chưa có backend (chi tiết mục 3).
- Supabase ref: `enurvffmliyrivehppaq` (dev + prod **dùng chung 1 project**).

## 1. Đã ship phiên này (đều trên `main`, đã deploy)
| Hạng mục | Commit chính | Ghi chú |
|---|---|---|
| **Đăng ca phải thanh toán trước** (deposit-before-publish, CALE_MOCK) | `1d73b1d` | Điền form → giữ tiền cọc (mô phỏng) → **server publish ca** khi HELD. Thay luồng per-worker cũ. Migration **0010** (đã apply). |
| Fix 404 sau đăng ca | `d1d1f9a` | `refetchOne` nạp ca vào store trước khi điều hướng (ca publish server-side trong `confirm_deposit_session`). |
| Ẩn "hạn mức huỷ" ở supabase | `163f0e0` | Chưa có backend → luôn 5/5. Ẩn tile/modal/dialog theo `hasCapability('ratings')`. **(Việc bàn giao — mục 3)** |
| E2E chạy cổng riêng (3100) | `b130790` | Tránh tái dùng nhầm dev server 3000 (mode supabase) → e2e hết "đỏ giả". |
| Cập nhật liên hệ + bỏ "Made with care" | `ea82bf3` | Email `nguyenphuonganh98113@gmail.com`, hotline `0868325698` (Footer + support/privacy/terms/disputes). |
| Favicon CaLẻ (bộ favicon.io) | `a3dac67`, `d250cd4` | `favicon.ico` + `apple-icon.png` + android-chrome + `site.webmanifest`. (Đã bỏ file `icon.svg` con kiến sót lại.) |

> Ngoài ra phiên trước cùng ngày đã ship: **Google Analytics 4** (`G-8FJ6SRHVVZ`, qua `next/script`), **đổi tên hiển thị "CaLẻ / Now" → "CaLẻ"**, và đóng **Outcome 1** (employer confirm qua RPC + nhóm dashboard theo đồng hồ vòng đời).

## 2. Migration & DB
- **Migration mới: `supabase/migrations/20260922000010_corrective_deposit_before_publish.sql`** — ĐÃ apply lên ref (qua Supabase Dashboard → SQL Editor).
  - ADDITIVE (không sửa 0007/0008/0009 đã apply): thêm `create_deposit_session`, `confirm_deposit_session` (publish ca từ `shift_payload`), `release_deposit`; wrapper `employer_confirm_completion` nhả cọc theo shift khi Completed; `mock_payment_ledger.application_id` → nullable.
  - RPC: `security definer`, `search_path=''`, tên đầy đủ, revoke public/anon + grant authenticated, **amount tính server** (`compute_shift_amount + 10% phí`).
- Kiểm chứng: `npm run test:payment` = **32/32 pass** (per-worker + deposit flow, đã cleanup data).

## 3. ⭐ VIỆC BÀN GIAO: "Hạn mức huỷ ca" backend (cancellation quota)
**Hiện trạng:** đang **ẩn ở production** (`163f0e0`). Local/demo vẫn chạy đúng.

**Vì sao phải làm backend:** quota tính thuần client từ `worker.cancellationHistory` + `worker.reputationScore` (`src/domain/cancellationQuota.ts`). Ở supabase:
- `withdrawAsync` (`src/stores/applicationStore.ts`) huỷ qua RPC **nhưng KHÔNG ghi `cancellationHistory`**.
- User tải từ server không có mảng này → `quotaUsage([])` **luôn trả đầy (5/5), không giảm**.

**Luật quota** (`src/domain/cancellationQuota.ts`): 3 lần/7 ngày + 10 lần/30 ngày; uy tín ≥80 → +1/+2; ≥95 → +2/+4. Đếm: huỷ ngay đơn Pending/Approved, hoặc yêu cầu huỷ được employer duyệt. Cả 2 cửa sổ phải còn chỗ.

**Cần làm (gợi ý):**
1. Lưu **lịch sử huỷ** trên Supabase (cột/bảng) — RPC `withdraw` ghi 1 record khi huỷ (đúng luật "đếm gì / không đếm").
2. **Enforce quota server-side** (chặn huỷ khi hết hạn mức, cửa sổ trượt 7/30 ngày) — không tin client.
3. Cần **`reputationScore` thật** để cộng thưởng hạn mức → gắn với **hệ thống uy tín (ratings)** — hiện `capability ratings=false`, chưa migrate.
4. Bật lại UI: bỏ gate `hasCapability('ratings')` ở tile/modal/dialog quota trong `src/app/worker/dashboard/page.tsx` (hoặc thêm capability riêng `quota`).

> Đây là một phần của **hệ thống uy tín** (đang hoãn cùng: điểm uy tín, no-show, đánh giá). Xem `src/data/capabilities.ts` để biết cái gì đã/chưa có backend.

## 4. Quy trình & môi trường (bắt buộc nắm)
- **Deploy:** `git push origin main` → Vercel deploy `cale.io.vn` (~1–2 phút). Không có backend build khác.
- **Migration:** không commit secret. Apply bằng **Supabase CLI** (`supabase db push`, cần `login`+`link`) **hoặc** Dashboard SQL Editor (dán nội dung file migration → Run).
- **Env:** `.env.local` (3 biến `NEXT_PUBLIC_*`, mode `supabase`). `.env.test.local` (`SUPABASE_SERVICE_ROLE_KEY`, CHỈ để chạy `test:payment`/`test:attendance`/tool Node). **KHÔNG commit `.env*`/key.**
- **E2E:** giờ chạy cổng riêng `E2E_PORT=3100`. **Phải TẮT dev server** trước khi chạy e2e local (Next 16 chỉ cho 1 `next dev`/thư mục). CI không ảnh hưởng.
- **Gate trước khi commit:** `npx tsc --noEmit`; `npx eslint --quiet`; `npm run test:run`; `npm run build`; `npm run test:e2e`; `npm run test:payment` (sau khi apply migration, lên đúng ref); secret-scan; `git diff --check`.
- **Test baseline có sẵn:** `src/__tests__/handbookContent.test.tsx` **3 fail có sẵn từ trước** (bug-condition, không liên quan) — không phải regression.

## 5. Con trỏ nhanh
- Deposit flow: `supabase/migrations/20260922000010_*.sql`, `src/data/payments/{index,types}.ts`, `src/components/payment/MockPaymentSession.tsx`, `src/app/employer/shifts/new/page.tsx`.
- Quota (việc bàn giao): `src/domain/cancellationQuota.ts`, `src/stores/applicationStore.ts` (`withdrawAsync`), `src/app/worker/dashboard/page.tsx`.
- Capability model: `src/data/capabilities.ts`.
- Favicon: `src/app/favicon.ico`, `src/app/apple-icon.png`, `public/site.webmanifest`.

## 6. Trạng thái kiểm thử (cuối phiên)
tsc ✅ · eslint ✅ · build ✅ (28 route) · test:run ✅ 716 pass (3 handbook có sẵn) · e2e ✅ 112/112 · test:payment ✅ 32/32 · GA verify live ✅ · deploy `cale.io.vn` ✅.
