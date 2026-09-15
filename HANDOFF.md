# HANDOFF.md — CaLẻ / Now

> Bàn giao trạng thái để một Claude Agent (máy khác) tiếp tục mà không cần scan
> lại repo. Đọc cùng `CLAUDE.md`. Kết quả kiểm tra dưới đây là **thực tế đã
> chạy**, không chỉ dựa tài liệu cũ.
>
> **Ngày kiểm tra:** 2026-09-15 (đây là "hôm nay" trong môi trường — quan trọng
> cho các lỗi test theo thời gian bên dưới).

---

## 1. Trạng thái tổng quan

- **Giai đoạn:** demo frontend hoàn chỉnh (localStorage, mock). **Chưa có backend.**
- Vừa hoàn thành **CORE-STABILITY-10** (hợp nhất lifecycle ca làm về một nguồn sự thật, badge nhất quán). Xem lịch sử phase trong `docs/KIRO_HANDOFF_CURRENT_STATE.md`.
- Bước kế tiếp theo kế hoạch: QA thủ công → BACKEND-MIGRATION-1 (Supabase).

---

## 2. Kết quả kiểm tra thực tế (2026-09-15)

| Kiểm tra | Kết quả |
|---|---|
| `npm run build` | ✅ **Sạch, đúng 28 route** |
| `npx tsc --noEmit` (code sản phẩm `src/`) | ✅ Sạch |
| `npx tsc --noEmit` (file test) | ⚠️ Có lỗi type ở 2 file property test (generator thiếu field) |
| `npx vitest run` (unit) | ⚠️ **655 pass / 20 fail** (6 file) |

> Lưu ý: tài liệu cũ ghi "544 pass" đã lỗi thời — số test đã tăng lên 675.

---

## 3. Các lỗi/vấn đề đã phát hiện (đã truy nguyên gốc rễ)

**Kết luận chính: KHÔNG có bug sản phẩm Critical/High chặn backend.** Build sạch,
type-check code sản phẩm sạch. 20 test fail được phân loại như sau:

### 3.1 — Test giòn theo thời gian (12 fail) — KHÔNG phải bug sản phẩm
- **File:** `src/__tests__/phase10aFix8.test.ts` (10/10), `phase10aFix7.test.ts` (2/13).
- **Gốc rễ:** test tạo ca quanh mốc cứng `NOW_ISO = 2026-06-01`, nhưng gọi `useShiftStore.getState().cancel(shiftId, reason)` **không truyền tham số đồng hồ thứ 3**. Nên `cancel` dùng `nowIso()` = hôm nay thật (2026-09-15). Ca (giữa 2026) đã quá giờ bắt đầu → `cancel` trả `TOO_LATE_STARTED` và thoát **trước khi** chạy logic bảo vệ worker (`applyEmployerCancellationSideEffects`). Vì vậy `protections` = undefined, reputation không +2, quota không hoàn.
- **Bằng chứng code sản phẩm ĐÚNG:** `shiftStore.cancel(shiftId, reason, when?)` (khoảng dòng 536) có gate `if (nowMs >= startMs) return TOO_LATE_STARTED`. Logic bảo vệ nằm ở `applyEmployerCancellationSideEffects` (~dòng 760) và chỉ chạy khi không bị gate chặn.
- **Cách sửa (chỉ đụng test):** truyền `NOW_ISO` vào lời gọi `cancel(shift.id, reason, NOW_ISO)`, hoặc freeze clock bằng `vi.setSystemTime(new Date(NOW_ISO))` trong `beforeEach`. **Không sửa code sản phẩm.**

### 3.2 — Test "đỏ" cố ý cho spec chưa làm (3 fail) — không phải lỗi
- **File:** `src/__tests__/handbookContent.test.tsx` (3/3).
- **Bản chất:** đây là exploration/bug-condition test được viết ĐỂ FAIL trên code hiện tại, mã hoá hành vi mong muốn của spec `visual-a11y-polish-round-2` (chưa triển khai): đổi nhãn menu "Bắt đầu nhanh" → "Cẩm nang", thêm nội dung cẩm nang thực hành cho cả worker + employer (`src/i18n/vi.ts` khoá `nav.label.userGuide`, trang `src/app/user-guide/page.tsx`).
- **Hành động:** hoặc triển khai spec đó, hoặc để nguyên (đây là việc pending, không phải regression).

### 3.3 — Generator test thiếu field (2 fail) — rủi ro thực tế thấp
- **File:** `src/__tests__/properties/walletDepositEscrow.property.test.ts` (2/17).
- **Gốc rễ:** generator fast-check tạo object shift **thiếu `depositAmount` / `status`** (chính là lỗi `tsc` ở file test). `walletStore.backfillFromHistory` làm số học với `undefined` → `balance: NaN`.
- **Đánh giá:** dữ liệu thật luôn có `depositAmount` (mọi shift tạo qua UI đều set). Nên đây là lỗi generator, không phải bug dữ liệu thật. **Cải thiện đề xuất:** sửa generator cho đủ field; cân nhắc thêm guard phòng thủ trong `backfillFromHistory` (coalesce `depositAmount ?? 0`).

### 3.4 — CẦN QUYẾT ĐỊNH: copy employer "Người làm" vs "Người lao động" (2 fail)
- **File:** `src/__tests__/properties/attendanceStatePreservation.property.test.ts` (2/6).
- **Chi tiết:** test kỳ vọng copy employer = "**Người làm** đã check-in..." / "...chờ **người làm** check-out.", nhưng i18n hiện trả "**Người lao động**".
- **Vì sao cần người quyết:** quy ước copy theo vai trò (CLAUDE.md §5 nguyên tắc #9, và `docs/KIRO_HANDOFF_CURRENT_STATE.md`) nói **màn employer dùng "người làm"**. Nếu quy ước còn hiệu lực → đây là **regression copy thật** (sửa `src/i18n/vi.ts` các khoá `attendance.copy.employer.*` về "người làm"). Nếu đã cố ý đổi sang "người lao động" → cập nhật lại baseline test.

### 3.5 — Preservation: footer link `/employer/payments` (1 fail) — nhẹ
- **File:** `src/__tests__/escrowStatusStringsPreservation.test.tsx` (1/18).
- **Chi tiết:** invariant "Footer giữ href `/employer/payments`" bị lệch — Footer hiện chỉ nhắc `/employer/payments` trong comment, không còn link thực. Route `/employer/payments` vẫn resolve (có trong 28 route build).
- **Hành động:** rà lại `src/components/layout/Footer.tsx` — khôi phục link nếu invariant còn đúng, hoặc cập nhật test nếu link đã cố ý bỏ.

---

## 4. Phần nào đã ổn (không cần đụng)

- Build production sạch, đúng 28 route (bất biến).
- Type-check code sản phẩm sạch.
- Lifecycle ca làm một nguồn sự thật (`shiftLifecycleState.ts` + `ShiftLifecycleBadge`) — đã hợp nhất ở CORE-STABILITY-10.
- Kiến trúc phân lớp rõ: domain thuần / store / component / persistence. 655/675 unit test xanh.
- Logic bảo vệ worker khi employer huỷ ca (`applyEmployerCancellationSideEffects`) — code đúng, chỉ test gọi sai clock.

---

## 5. Việc "vệ sinh" nên dọn trước backend (không khẩn cấp)

1. **`src/app/layout.tsx` (~dòng 66):** đang nhúng `<Script src="http://localhost:8400/live.js">` — script "impeccable-live" (design tooling trong `.kiro/skills/impeccable`). **Phải bỏ** trước khi deploy thật (nằm giữa comment `impeccable-live-start`/`end`).
2. **`src/components/layout/AppHydrator.tsx` (~dòng 42):** hack tự `localStorage.clear()` + reload một lần theo cờ `seed_wiped_v10`. Hack di trú dữ liệu cũ — cân nhắc bỏ khi migrate.
3. **`src/app/employer/dashboard/page.tsx.bak`:** file backup bỏ quên — nên xoá.

---

## 6. Kế hoạch backend + estimate

**Lựa chọn khuyến nghị:** **Supabase (Postgres)** — có sẵn DB + auth + RLS + scheduled jobs. Chi tiết: `docs/BACKEND_MIGRATION_PLAN.md` (chủ dự án) và `qa-exploration/backend-migration-plan.md` (kỹ thuật, per-table).

**Vì sao nhanh:** đây là **thay lớp lưu trữ dưới interface store có sẵn, không viết lại**. Mọi truy cập dữ liệu đã gom trong Zustand store; logic nghiệp vụ ở `src/domain/` thuần (server tái dùng); đã có sẵn idempotency markers (`shiftStartedNotifiedAt`, `dedupeKey`...) để server mirror.

### Estimate (1 dev full-stack có kinh nghiệm Next.js + Supabase, full-time)

| Phase | Nội dung | Ước lượng |
|---|---|---|
| 1 | DB + auth + roles (RLS) | 3–5 ngày |
| 2 | Shifts + drafts + applications | 4–6 ngày |
| 3 | Wallet / escrow (tiền rời client) ⚠️ rủi ro nhất | 5–8 ngày |
| 4 | Server jobs (start/end/auto-release 12h/refund) | 4–6 ngày |
| 5 | Disputes / reviews / notifications | 3–5 ngày |
| 6 | Schedule + skill scores | 2–3 ngày |

**Tổng: ~3–5 tuần** cho MVP backend chạy được; **~6–8 tuần** nếu tính test tích hợp + xử lý kỹ edge case tiền/escrow + deploy production.

### Thứ tự bảng (an toàn trước, tiền sau cùng)
`users`/profiles → `shifts`/`shift_drafts` → `applications` → `attendance_events`
→ `notifications` → **`wallet`/ledger/escrow (LÀM SAU CÙNG)** → `disputes`/`reviews`
→ `schedule_blocks` → `worker_skill_scores`.

Mỗi phase ship **sau interface store hiện tại** để UI tiếp tục chạy trong khi thay lớp lưu trữ.

### Server jobs bắt buộc (chạy theo schedule, phải idempotent)
1. Đóng application khi ca bắt đầu (pending chưa duyệt → expired).
2. Chuyển ca sang "đang diễn ra" khi tới giờ bắt đầu.
3. Kết thúc ca khi tới giờ kết thúc.
4. Auto-release lương sau 12h nếu employer không xác nhận/khiếu nại.
5. Hoàn cọc slot không dùng (+ hoàn đủ khi ca rỗng/hết hạn, + auto-cancel "RequireFull").
6. (Tuỳ chọn) dọn draft bỏ hoang.

---

## 7. Rủi ro

- **Tiền không được ở client (Phase 3–4 là nơi nguy hiểm nhất).** Cọc/rút/hoàn/escrow phải quyết định + ghi ở server. Guard client hiện tại chỉ là tiện ích, không phải rào an toàn. Mọi job phải idempotent — **tuyệt đối không double-pay/double-refund**.
- **Phân quyền không được dựa frontend.** User sửa được localStorage (kể cả role/ví) qua devtools. Server phải là nguồn sự thật về quyền (worker chỉ đụng application của mình, employer chỉ ca của mình, admin chỉ endpoint admin).
- **Lifecycle không được phụ thuộc trình duyệt mở.** Start/end + auto-release 12h phải chạy trên server schedule, không chỉ khi ai đó load trang.
- **Bí mật Supabase:** KHÔNG lộ `service_role` key ra frontend/log/chat. Chỉ dùng env var. Đọc `docs/SUPABASE_SECURITY_NOTE.md` trước khi cấu hình.
- **Bộ test đang đỏ** → chưa có lưới an toàn "test xanh" để migrate. Nên xanh hoá test trước (mục 8).

---

## 8. Bước tiếp theo nên làm (theo thứ tự đề xuất)

1. **Xanh hoá bộ test trước tiên** (để có lưới an toàn cho migration):
   - Sửa 12 test giòn thời gian (§3.1) — truyền clock vào `cancel(...)`, hoặc freeze `vi.setSystemTime`. Chỉ đụng test.
   - Quyết định §3.4 (copy "người làm" vs "người lao động") và sửa i18n **hoặc** baseline test cho khớp.
   - Rà §3.5 (footer link) — khôi phục link hoặc cập nhật test.
   - Sửa generator §3.3 cho đủ field; cân nhắc guard trong `backfillFromHistory`.
   - Quyết định §3.2 (spec handbook `visual-a11y-polish-round-2`): làm hoặc hoãn.
2. **Dọn vệ sinh** (§5): bỏ script `live.js`, cân nhắc hack `seed_wiped_v10`, xoá file `.bak`.
3. **QA thủ công** theo `docs/CURRENT_TODO.md` mục 1 (lifecycle nhất quán, copy theo vai trò, màu badge trên giao diện thật).
4. **BACKEND-MIGRATION-1** — chỉ bắt đầu sau khi test xanh + QA xong + được chấp thuận rõ ràng. Bắt đầu Phase 1 (users/auth/RLS), **không migrate ví/escrow trước**.

---

## 9. Ràng buộc khi làm (nhắc lại từ CLAUDE.md)

- Không viết lại app từ đầu; không thêm tính năng mới (chat/agency/AI) trước khi core+backend ổn.
- Không dùng polling/setTimeout cho lifecycle.
- Tiền tệ chữ thường `đ`/`đồng` (cấm `VNĐ`/`₫`); gắn nhãn "mô phỏng/prototype" đúng sự thật.
- Bump `SCHEMA_VERSION` khi đổi shape persistence.
- Không auto-commit (repo chưa init git); không lộ secret Supabase.
