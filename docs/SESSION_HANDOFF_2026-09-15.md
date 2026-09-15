# Bàn giao session 2026-09-15 → điểm partner tiếp nối

> Ghi lại **session vừa rồi làm gì** và **partner bắt đầu từ đâu tiếp**.
> Chi tiết sâu hơn: `PARTNER_HANDOFF_CHECKLIST.md` (onboarding) +
> `PARTNER_IMPLEMENTATION_GUIDE.md` (cách làm backend).

## 1. Session này đã làm gì (đã commit — `dafa10d` trên `main`)

1. **Xanh hoá bộ test unit** (655→**672/675 pass**). Chỉ đụng test/baseline,
   KHÔNG đụng code sản phẩm:
   - Freeze clock (`vi.setSystemTime`) cho 12 test giòn thời gian (`phase10aFix7/8`).
   - Sửa input `backfillFromHistory` thiếu `status`/`depositAmount` (gây `NaN`) +
     cập nhật baseline preservation theo hành vi employer-ledger hiện tại + guard NaN.
   - Cập nhật baseline attendance/footer cho khớp trạng thái thật.
   - 3 fail còn lại = test đỏ **cố ý** cho spec handbook chưa làm (đã quyết **hoãn**).
2. **Quyết định copy** (chủ dự án): chuẩn hoá **"người lao động"** (i18n đã dùng
   102 lần / "người làm" 0 lần).
3. **Dọn vệ sinh trước deploy:** bỏ `<Script live.js>` + import thừa (`layout.tsx`);
   bỏ hack `seed_wiped_v10` (`AppHydrator`); xoá `employer/dashboard/page.tsx.bak`;
   dọn 2 lỗi lint `any` trong `walletStore`.
4. **Chuẩn hoá copy** "người làm" → "người lao động" trên **22 file** component/
   store/page (i18n đã chuẩn sẵn; giữ nguyên chuỗi test-input).
5. **QA thủ công** trên giao diện thật, 3 vai, **tạo ca mới chạy trọn vòng đời**
   (đăng ca → mô phỏng cọc → duyệt → check-in). **Không lỗi Critical/High.**
   Báo cáo: `docs/QA_MANUAL_RESULTS_2026-09-15.md`.
6. **Xanh hoá E2E** (Playwright): 20/92 → **112/0 pass**. Sửa 3 nợ fixture/selector
   CÓ SẴN (không đụng code sản phẩm): `SCHEMA_VERSION` fixture 11→19; selector nút
   deposit "Xác nhận đã thanh toán" → "Mô phỏng đảm bảo thanh toán"; baseline số
   nav link employer 6→7 (đã thêm link "Cẩm nang làm việc").

## 2. Trạng thái chốt (lưới an toàn đầy đủ)
| Kiểm tra | Kết quả |
|---|---|
| `npx tsc --noEmit` | ✅ sạch |
| `npm run build` | ✅ 28 route |
| `npm run test:run` (unit) | ✅ 672/675 (3 fail = handbook §3.2 hoãn) |
| `npm run test:e2e` (E2E) | ✅ 112/0 |
| `npm run lint` | ✅ 0 error |
| Git | commit `dafa10d` trên `main` |

→ Ba tiền đề backend đã đủ: **test xanh + dọn vệ sinh + QA (không Critical/High)**.

## 3. Partner bắt đầu từ đâu tiếp (theo ưu tiên)

**① (Chính) BACKEND-MIGRATION-1 — Phase 1: users / auth / RLS.**
Đây là track chính, mọi thứ đã sẵn sàng, **chỉ còn chờ chủ dự án chấp thuận**.
- Cách làm: `PARTNER_IMPLEMENTATION_GUIDE.md` §2–3 (setup Supabase → users/auth/
  RLS bằng kỹ thuật "thay lưu trữ dưới interface store").
- Scope đầy đủ: `docs/BACKEND_MIGRATION_PLAN.md`.
- Nhớ: **tiền/escrow làm CUỐI CÙNG** (Phase 3–4), không migrate trước.

**② (Tuỳ chọn, song song) Spec handbook `visual-a11y-polish-round-2`.**
3 test đỏ cố ý trong `src/__tests__/handbookContent.test.tsx`: đổi nhãn menu
"Bắt đầu nhanh" → "Cẩm nang" + viết nội dung cẩm nang thực hành cho worker &
employer (`src/app/user-guide/page.tsx`, `src/i18n/vi.ts`). Việc nhỏ, cần định
hướng nội dung từ chủ dự án. Không phải regression, không chặn backend.

**③ (Nhỏ, không gấp) Dọn lint warning cũ** (vd `<img>` → `next/image`).

## 4. Cần lưu ý khi tiếp nối
- **Giữ test xanh là hợp đồng:** sau mỗi thay đổi chạy tsc → build → unit → e2e.
- Đổi shape persistence → bump `SCHEMA_VERSION` (`src/data/persistence.ts`, hiện
  **19**) **và** đồng bộ `e2e/fixtures/constants.ts` (bài học từ session này: hai
  chỗ lệch nhau làm sập 78 E2E).
- Ràng buộc bất biến: `PARTNER_HANDOFF_CHECKLIST.md` §D.
- Tài liệu engineering per-table (`qa-exploration/backend-migration-plan.md`)
  được nhắc trong CLAUDE.md nhưng **không tồn tại** — tự dựng lại từ
  `src/types/index.ts` khi làm schema.
