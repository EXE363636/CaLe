# HANDOFF.md — CaLẻ / Now

> Bàn giao trạng thái để một Claude Agent (máy khác) tiếp tục mà không cần scan
> lại repo. Đọc cùng `CLAUDE.md`. Kết quả kiểm tra dưới đây là **thực tế đã
> chạy**, không chỉ dựa tài liệu cũ.
>
> **Ngày kiểm tra:** 2026-09-15 (đây là "hôm nay" trong môi trường — quan trọng
> cho các lỗi test theo thời gian bên dưới).

---

## 0. BACKEND-MIGRATION-1 · Phase 1 (Auth + Profile) — HOÀN TẤT (2026-09-15)

> Cập nhật quan trọng nhất. Phần dưới (§1 trở đi) phần lớn là lịch sử tiền-backend.

**Đã làm + đã push lên `main` (GitHub `EXE363636/CaLe`) — 4 commit:**
| Commit | Nội dung |
|---|---|
| `fc7cd46` | Bước 0 — scaffold Supabase + migration schema/RLS + RLS integration test |
| `ddc9e95` | Slice 1+2 — `userRepo` + profile writes + `authStore`/session |
| `cbcd82b` | Slice 3 — `AppHydrator` hybrid + pin E2E local mode |
| `33a1298` | Corrective — siết 7 guardrail auth/session/hydrate |

**Migration đã push lên `cale-dev`** (3 file trong `supabase/migrations/`): `users`,
`worker_profiles`, `employer_profiles`, bảng projection `public_profiles`; RLS
(USING+WITH CHECK); REVOKE UPDATE bảng → GRANT cột; trigger signup ép role
(worker|employer) + sync `public_profiles`; `admin_set_suspended`; `is_admin()` từ
**trusted `app_metadata`**; GRANT bảng cho `service_role` (0002); KHÓA
`employer_type`/`employer_type10a` (0003).

**Kết quả kiểm tra:**
| Kiểm tra | Kết quả |
|---|---|
| unit (`test:run`) | **680 / 683** (3 fail = handbook đỏ cố ý §3.2) |
| E2E local (`test:e2e`) | **112 / 112** |
| build | **28 routes** |
| RLS integration (`test:rls:supabase`, cale-dev) | **20 / 20** |
| tsc / lint | sạch / 0 error (còn warning cũ) |

**Kiểm thử E2E Supabase UI (đăng ký → đăng nhập → session restore → sửa hồ sơ →
reload → logout/account-switch): hiện là KIỂM THỬ THỦ CÔNG** (chạy tay qua trình
duyệt trên `cale-dev`), **CHƯA phải suite tự động**. Cần viết spec Playwright chạy
trên cale-dev (`test:e2e:supabase`) ở phase sau. Bộ tự động hiện có chỉ là RLS
integration (không qua UI).

**Cấu hình / môi trường:**
- `cale-dev` **đang BẬT email confirmation** → đăng ký không auto-login, hiện màn
  "kiểm tra email" (nhánh này đã xử lý đúng). Integration test tự confirm qua
  service-role (local-only).
- Data mode chọn bằng biến tường minh `NEXT_PUBLIC_DATA_MODE=local|supabase`
  (`.env.local`). Prod bắt buộc `supabase`, thiếu key → throw (không fallback).

**Còn hoãn / nợ kỹ thuật (KHÔNG chặn auth/profile — xử lý ở phase sau):**
- Field HOÃN chưa migrate (vẫn localStorage đến phase bảng nguồn): reputation,
  ratings, boostCredits, verifications, verifiedBusiness, walletBalance, skillScores.
  Ở supabase mode chúng mang **giá trị mặc định** (uy tín 100...) — đúng thiết kế.
- `public_profiles`-of-others: hoãn Phase 2 (chưa có dữ liệu cross-user thật).
- **Footer "Dữ liệu demo đang lưu trên trình duyệt" CHƯA đúng theo data mode** —
  ở supabase mode hồ sơ user đã ở server; cần chỉnh câu chữ theo mode.
- **Cần nâng bản vá bảo mật Next.js** (`16.2.6`) trước khi public (rà `npm audit`
  + advisory, nâng patch 16.x, chạy lại safety grid).

**BẢO MẬT — tuyệt đối:** KHÔNG commit `service_role` key hay bất kỳ file env local
(`.env.local`, `.env.test.local`) vào git. Chúng đã được `.gitignore`; chỉ 3 biến
`NEXT_PUBLIC_*` được đặt ở `.env.local`/Vercel. Migration dùng Supabase CLI
đăng nhập/link tương tác (secret không qua chat/commit). Xem
`docs/SUPABASE_SECURITY_NOTE.md`.

**Bước kế tiếp:** Phase 2 — Shifts + drafts + applications (xem `docs/PHASE_2_PLAN.md`).
Ví/escrow/rating/reputation/verification vẫn để phase sau.

---

## 1. Trạng thái tổng quan

- **Giai đoạn:** Phase 1 backend (auth + profile) đã lên Supabase (§0). Các domain
  khác (shifts/applications/ví...) vẫn localStorage/mock — migrate dần theo phase.
- Trước đó hoàn thành **CORE-STABILITY-10** (hợp nhất lifecycle ca làm về một nguồn sự thật, badge nhất quán). Xem lịch sử phase trong `docs/KIRO_HANDOFF_CURRENT_STATE.md`.
- Bước kế tiếp theo kế hoạch: **Phase 2 (shifts + applications)**.

---

## 2. Kết quả kiểm tra thực tế (2026-09-15)

| Kiểm tra | Kết quả |
|---|---|
| `npm run build` | ✅ **Sạch, đúng 28 route** |
| `npx tsc --noEmit` (code sản phẩm `src/`) | ✅ Sạch |
| `npx tsc --noEmit` (file test) | ⚠️ Có lỗi type ở 2 file property test (generator thiếu field) |
| `npx tsc --noEmit` (toàn bộ, gồm test) | ✅ Sạch (đã sửa generator thiếu field) |
| `npx vitest run` (unit) | ✅ **672 pass / 3 fail** — 3 fail còn lại là test đỏ CỐ Ý (§3.2, đã quyết hoãn) |
| `npx playwright test` (E2E) | ✅ **112 pass / 0 fail** — đã sửa 3 nợ fixture/selector E2E có sẵn (xem QA report §E2E) |

> Lưu ý: tài liệu cũ ghi "544 pass" đã lỗi thời — số test là 675.
>
> **Cập nhật xanh-hoá test (2026-09-15):** đã xử lý 17/20 fail (§3.1, §3.3, §3.4,
> §3.5) — chỉ đụng file test + baseline, KHÔNG đụng code sản phẩm. Type-check
> toàn bộ đã sạch. Xem trạng thái từng mục trong §3.

---

## 3. Các lỗi/vấn đề đã phát hiện (đã truy nguyên gốc rễ)

**Kết luận chính: KHÔNG có bug sản phẩm Critical/High chặn backend.** Build sạch,
type-check code sản phẩm sạch. 20 test fail được phân loại như sau (✅ = đã sửa
xong ngày 2026-09-15, chỉ đụng test):

### 3.1 — ✅ ĐÃ SỬA — Test giòn theo thời gian (12 fail) — KHÔNG phải bug sản phẩm
> **Cách đã làm:** freeze đồng hồ bằng `vi.useFakeTimers()` +
> `vi.setSystemTime(new Date(NOW_ISO))` trong `beforeEach` (afterEach dùng
> `vi.useRealTimers()`) ở `phase10aFix8.test.ts` (toàn file) và
> `phase10aFix7.test.ts` (scoped trong describe store orchestration). Không đụng
> code sản phẩm.
- **File:** `src/__tests__/phase10aFix8.test.ts` (10/10), `phase10aFix7.test.ts` (2/13).
- **Gốc rễ:** test tạo ca quanh mốc cứng `NOW_ISO = 2026-06-01`, nhưng gọi `useShiftStore.getState().cancel(shiftId, reason)` **không truyền tham số đồng hồ thứ 3**. Nên `cancel` dùng `nowIso()` = hôm nay thật (2026-09-15). Ca (giữa 2026) đã quá giờ bắt đầu → `cancel` trả `TOO_LATE_STARTED` và thoát **trước khi** chạy logic bảo vệ worker (`applyEmployerCancellationSideEffects`). Vì vậy `protections` = undefined, reputation không +2, quota không hoàn.
- **Bằng chứng code sản phẩm ĐÚNG:** `shiftStore.cancel(shiftId, reason, when?)` (khoảng dòng 536) có gate `if (nowMs >= startMs) return TOO_LATE_STARTED`. Logic bảo vệ nằm ở `applyEmployerCancellationSideEffects` (~dòng 760) và chỉ chạy khi không bị gate chặn.
- **Cách sửa (chỉ đụng test):** truyền `NOW_ISO` vào lời gọi `cancel(shift.id, reason, NOW_ISO)`, hoặc freeze clock bằng `vi.setSystemTime(new Date(NOW_ISO))` trong `beforeEach`. **Không sửa code sản phẩm.**

### 3.2 — ⏸️ HOÃN (quyết định 2026-09-15) — Test "đỏ" cố ý cho spec chưa làm (3 fail) — không phải lỗi
- **File:** `src/__tests__/handbookContent.test.tsx` (3/3).
- **Bản chất:** đây là exploration/bug-condition test được viết ĐỂ FAIL trên code hiện tại, mã hoá hành vi mong muốn của spec `visual-a11y-polish-round-2` (chưa triển khai): đổi nhãn menu "Bắt đầu nhanh" → "Cẩm nang", thêm nội dung cẩm nang thực hành cho cả worker + employer (`src/i18n/vi.ts` khoá `nav.label.userGuide`, trang `src/app/user-guide/page.tsx`).
- **Hành động:** hoặc triển khai spec đó, hoặc để nguyên (đây là việc pending, không phải regression).

### 3.3 — ✅ ĐÃ SỬA — Input test `backfillFromHistory` thiếu field (2 fail + lỗi tsc)
- **File:** `walletDepositEscrow.property.test.ts` (2/17) + lỗi tsc ở `derivedMoney.property.test.ts`.
- **Gốc rễ thực tế (khác chẩn đoán cũ):** không phải `arbEconomy` — mà helper `backfillInput`/`seedWalletFromHistory` trong test map shift **chỉ `{id, employerId, title}`**, bỏ `status` + `depositAmount` mà store yêu cầu. `backfillFromHistory` đọc `shift.depositAmount` undefined → `NaN`. Đồng thời store đã tiến hoá để **mô phỏng cả vòng đời cọc của employer** (`UserTopUp` + `EmployerDepositHeld` + `EmployerUnusedRefund`), nên baseline preservation cũ (chỉ `WorkerWageReleased`) đã lỗi thời.
- **Cách đã làm:** thêm `status` + `depositAmount` vào input map ở cả 2 file; cập nhật assertion + docstring của `walletDepositEscrow` cho khớp hành vi employer hiện tại; thêm guard `Number.isFinite` chống tái phát NaN. Không đụng code sản phẩm.

### 3.4 — ✅ ĐÃ QUYẾT + SỬA — copy employer "người lao động" (2 fail)
- **File:** `src/__tests__/properties/attendanceStatePreservation.property.test.ts` (2/6).
- **Quyết định (chủ dự án, 2026-09-15):** chuẩn hoá **"người lao động"**. Cơ sở: i18n dùng "người lao động" **102 lần**, "người làm" **0 lần** — toàn app đã thống nhất; test baseline + câu chữ CLAUDE.md là phần lỗi thời.
- **Cách đã làm:** cập nhật `EMPLOYER_COPY_BASELINE` (4 khoá `attendance.copy.employer.*`) sang "người lao động"; cập nhật câu chữ CLAUDE.md §1 (vai trò) + §5 #9 cho khớp. Không đổi i18n.

### 3.5 — ✅ ĐÃ SỬA — Preservation: footer link `/employer/payments` (1 fail)
- **File:** `src/__tests__/escrowStatusStringsPreservation.test.tsx` (1/18).
- **Gốc rễ:** Footer đã được tái cấu trúc có chủ đích — link employer "Giữ tiền ca làm" giờ trỏ `/user-guide#employer-payments` (anchor user-guide), không còn `/employer/payments`. Route `/employer/payments` **vẫn resolve và vẫn được NavBar link** (test NavBar vẫn pass) → không phải orphan.
- **Cách đã làm:** cập nhật test Footer để assert href mới `/user-guide#employer-payments` (giữ regression guard có ý nghĩa). Không đụng Footer.

---

## 4. Phần nào đã ổn (không cần đụng)

- Build production sạch, đúng 28 route (bất biến).
- Type-check code sản phẩm sạch.
- Lifecycle ca làm một nguồn sự thật (`shiftLifecycleState.ts` + `ShiftLifecycleBadge`) — đã hợp nhất ở CORE-STABILITY-10.
- Kiến trúc phân lớp rõ: domain thuần / store / component / persistence. 655/675 unit test xanh.
- Logic bảo vệ worker khi employer huỷ ca (`applyEmployerCancellationSideEffects`) — code đúng, chỉ test gọi sai clock.

---

## 5. Việc "vệ sinh" — ✅ ĐÃ DỌN (2026-09-15)

1. ✅ **`src/app/layout.tsx`:** đã bỏ `<Script src="http://localhost:8400/live.js">` (impeccable-live) + import `Script` không dùng.
2. ✅ **`src/components/layout/AppHydrator.tsx`:** đã bỏ hack `localStorage.clear()` + reload theo cờ `seed_wiped_v10`. An toàn vì `loadAll()` (`persistence.ts`) đã tự reseed khi lệch `SCHEMA_VERSION` — hack này thừa và còn ép reload thêm 1 lần với browser mới.
3. ✅ **`src/app/employer/dashboard/page.tsx.bak`:** đã xoá (backup cũ, không import ở đâu; `page.tsx` thật vẫn nguyên).

**Kiểm chứng sau dọn:** `tsc --noEmit` sạch, `npm run build` sạch **đúng 28 route** (`/employer/payments` vẫn còn), test vẫn 672/675 (3 fail là §3.2 hoãn). Lưu ý: `npm run lint` vẫn còn 2 lỗi `no-explicit-any` **có sẵn từ trước** ở `walletStore.ts:284-285` (`(shift as any).createdAt/updatedAt` trong `backfillFromHistory`) — không thuộc đợt dọn này.

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
- ~~**Bộ test đang đỏ** → chưa có lưới an toàn "test xanh" để migrate.~~ ✅ Đã xanh hoá (672/675, 3 fail còn lại là §3.2 đỏ cố ý đã hoãn); type-check sạch. Lưới an toàn đã sẵn sàng cho migration.

---

## 8. Bước tiếp theo nên làm (theo thứ tự đề xuất)

1. ✅ **ĐÃ XONG — Xanh hoá bộ test** (2026-09-15): §3.1, §3.3, §3.4, §3.5 đã sửa (chỉ đụng test/baseline/CLAUDE.md, không đụng code sản phẩm); type-check sạch. §3.2 đã quyết **hoãn** (3 test đỏ cố ý, là feature content chưa làm — không phải regression).
2. ✅ **ĐÃ XONG — Dọn vệ sinh** (§5): đã bỏ script `live.js` + import thừa, bỏ hack `seed_wiped_v10`, xoá file `.bak`. Build sạch 28 route.
3. ✅ **ĐÃ XONG — QA thủ công** (2026-09-15) theo `docs/CURRENT_TODO.md` mục 1. Chạy trên giao diện thật 3 vai, tạo ca mới kiểm trọn vòng đời. **Không lỗi Critical/High.** Kết quả: `docs/QA_MANUAL_RESULTS_2026-09-15.md`. Phát hiện Low (nhất quán copy "người làm"→"người lao động") đã **quét chuẩn hoá xong** trên 22 file `src/` + đồng bộ 3 E2E spec; tsc sạch, unit 672/675, build 28 route.
4. **BACKEND-MIGRATION-1** — điều kiện tiền đề (test xanh + QA xong) đã đủ; **chỉ còn chờ chấp thuận rõ ràng**. Bắt đầu Phase 1 (users/auth/RLS), **không migrate ví/escrow trước**. ← **bước kế tiếp**

---

## 9. Ràng buộc khi làm (nhắc lại từ CLAUDE.md)

- Không viết lại app từ đầu; không thêm tính năng mới (chat/agency/AI) trước khi core+backend ổn.
- Không dùng polling/setTimeout cho lifecycle.
- Tiền tệ chữ thường `đ`/`đồng` (cấm `VNĐ`/`₫`); gắn nhãn "mô phỏng/prototype" đúng sự thật.
- Bump `SCHEMA_VERSION` khi đổi shape persistence.
- Git đã init + có remote `origin` (GitHub). Commit/push chỉ khi được yêu cầu;
  **không** commit `service_role`/env local; không lộ secret Supabase.
