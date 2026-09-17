# HANDOFF.md — CaLẻ / Now

> Bàn giao trạng thái để một Claude Agent (máy khác) tiếp tục mà không cần scan
> lại repo. Đọc cùng `CLAUDE.md`. Kết quả kiểm tra dưới đây là **thực tế đã
> chạy**, không chỉ dựa tài liệu cũ.
>
> **Ngày kiểm tra:** 2026-09-15 (đây là "hôm nay" trong môi trường — quan trọng
> cho các lỗi test theo thời gian bên dưới).

---

## 0000. Phiên P0 — smoke prod + sửa lỗi luồng thật (2026-09-17)

> Branch: **`fix/p0-signup-error-handling`** (2 commit trên `d3d7409`, **CHƯA push**
> — push `main` = auto-deploy `cale.io.vn`). Chạy trên Supabase **production**
> (project `enurvffmliyrivehppaq`), `.env.local` = supabase mode, confirm email TẮT.

**Đã làm & xác minh thật (localhost ↔ Supabase prod):**
- **P0.1 đăng ký công khai** — Worker `ngochung69223+w1@gmail.com`
  (uid `be306efe-6db9-497d-82d6-1c675c886ff3`) + Employer `ngochung69223+e1@gmail.com`
  (uid `a42eab12-a7a0-45b6-a2e7-823c303b8f2e`), mật khẩu `CaleTest2026!`. Đăng ký →
  **tự đăng nhập** → dashboard đúng vai + hồ sơ (chứng tỏ trigger tạo `public.users`
  + bảng profile). **Là tài khoản test THẬT trong DB prod.**
- **P0.2 xử lý lỗi đăng ký** (commit **`98e8510`**) — `register()` supabase không còn
  nuốt mọi lỗi thành `INVALID_INPUT`. Thêm `mapSignUpError()` (theo `error.code` →
  `status` → message): EMAIL_TAKEN / INVALID_EMAIL / WEAK_PASSWORD / RATE_LIMITED /
  BACKEND_ERROR (mặc định lỗi lạ = BACKEND_ERROR, chỉ trả enum, không lộ JWT/key).
  errorMap + vi.ts + 6 unit test.
- **P0.3 luồng 2 tài khoản** (commit **`2c4e10a`**) — publish→see→apply→approve→worker
  thấy "Đã duyệt"→withdraw→cancel đều chạy. **Sửa 2 bug phát hiện trong luồng:**
  1. Employer chỉ thấy số đếm đơn, KHÔNG có card ứng viên/nút Duyệt-Từ chối
     (`users.find(workerId)` rỗng). → `refetchForShift/Shifts` overlay
     `loadPublicProfiles` của worker ứng tuyển vào userStore.
  2. Worker mở ca đã ứng tuyển nhưng ca rời `public_shifts` (đã huỷ/đầy/hết hạn) →
     **404**. → sau `refetchForWorker`, nạp ca còn thiếu qua `refetchOne`
     (RPC `get_shift_detail` cấp quyền worker-có-đơn). Cả 2 chỉ ở client/store,
     KHÔNG đụng migration/RPC.
- **P0.5 giao diện mobile (375px)** — landing / đăng ký / dashboard / chi tiết ca /
  form đăng ca: KHÔNG trang nào tràn ngang, input ≥40px. Đạt.

**Grid:** tsc 0, lint 0, unit **702 pass / 3 fail** (đúng 3 handbook đỏ cố ý §3.2).

**CÒN LẠI / bàn giao cho người tiếp:**
- **P0.4 Admin — CHƯA làm.** Backend đủ: `supabase/functions/admin-users` có
  `create` / `setSuspended` (chặn `CANNOT_SUSPEND_SELF`/`ADMIN`) / `delete`
  (chặn **`CANNOT_DELETE_SELF`** dòng 183, chặn xoá admin, chỉ xoá user không lịch sử),
  caller phải admin. **Chặn test: cần tài khoản admin** → chạy `npm run admin:bootstrap`
  (yêu cầu `SUPABASE_SERVICE_ROLE_KEY` trong `.env.local` — chỉ ở Node, KHÔNG vào chat/commit)
  hoặc `npm run test:admin` (integration backend). Agent không có service_role.
- **Merge/deploy:** 2 commit P0.2+P0.3 đang trên branch, chờ review trước khi push `main`.
- **Quan sát (chưa chặn):** (a) sau signup, `role` KHÔNG ở `app_metadata` của JWT — chỉ ở
  `user_metadata` + cột `public.users.role` (routing/hồ sơ vẫn đúng; nên xác nhận admin RLS
  `is_admin()` khi làm P0.4). (b) dashboard worker không liệt kê ca terminal (đã huỷ) —
  lựa chọn hiển thị, không phải bug 404. (c) vài link footer/card <44px tap (WCAG, để P1).
- **Dữ liệu test trong prod:** 2 tài khoản trên + 1 ca "Phục vụ tiệc cưới cuối tuần"
  (id `3e4048d8-10c3-4f74-9422-9c49afd61ed3`, đã Cancelled) + đơn ứng tuyển. Xoá qua Admin
  khi cần (đừng khôi phục seed demo).

---

## 000. Tổng vệ sinh trước public + Runtime Capability model (2026-09-16)

**Nguồn sự thật capability:** [`src/data/capabilities.ts`](src/data/capabilities.ts).
`capabilities()` / `hasCapability(key)` trả về map theo data mode. UI/hydrator đọc
map này để render/ẩn/để-rỗng — KHÔNG mỗi trang tự đoán. Khi thêm backend mới cho
một tính năng, chỉ cần bật cờ ở đây.

| Capability | supabase (prod) | local (demo) | Ghi chú |
|---|---|---|---|
| authProfiles, shifts, applications, adminUsers | ✅ | ✅ | đã nối Supabase thật |
| payments, wallet | ❌ | ✅ | chưa có backend thanh toán |
| disputes, verifications, ratings, notifications, boost, schedule | ❌ | ✅ | chưa migrate |

**Hydration (AppHydrator):**
- supabase: KHÔNG hydrate seed. Chạy `cleanupLegacyBusinessData()` rồi khởi tạo
  RỖNG mọi deferred slice; users/shifts/applications nạp từ server (`restoreAuth` +
  `refetchPhase2Supabase`).
- local: giữ nguyên hydrate seed + `runLifecycleSync` (baseline test cũ).

**localStorage ở supabase:** `write()` trong [`persistence.ts`](src/data/persistence.ts)
no-op cho mọi key `cale.*` → không ghi dữ liệu nghiệp vụ/auth. Session do Supabase
quản lý ở key `sb-*` riêng. `cleanupLegacyBusinessData()` xoá đúng allowlist
(`Object.values(STORAGE_KEYS)`), có version marker `cale.cleanupVersion`, KHÔNG đụng
`sb-*`/theme/locale → reload vẫn giữ đăng nhập. **Không dùng `localStorage.clear()`.**

**Đã ẩn ở supabase (UI):** hộp demo login + seed creds, snapshot dev tools, ví/nạp/rút/
cọc/escrow CTA, tiền cọc/đã chi trả (stat), badge/tab tranh chấp + xác minh (admin),
điểm uy tín/đánh giá/kỹ năng-XP (worker dashboard + profile + landing hero), chuông
thông báo + cột notifications, nút mô phỏng No-show/Yêu cầu thay thế/Xuất-CSV (employer),
badge xác minh trên navbar/mobile. Admin analytics + user list refetch từ Supabase thật.

**Shift draft:** vẫn local-only (component state cho form). Đồng bộ draft đa thiết bị →
phase sau. Reputation/rating, ví/thanh toán, tranh chấp, xác minh, boost, thông báo:
local-only, để pha sau khi có bảng Supabase + RPC.

**Test:** [`src/__tests__/supabaseCleanupCapabilities.test.ts`](src/__tests__/supabaseCleanupCapabilities.test.ts)
+ [`src/__tests__/productionCleanupSupabase.test.tsx`](src/__tests__/productionCleanupSupabase.test.tsx).

---

## 00. BACKEND-MIGRATION-1 · Phase 2 (Shifts + Applications) — ĐANG DỞ (checkpoint)

> Checkpoint bàn giao. **Slices 1–3 xong (data layer + hydration), UI CHƯA wire.**
> Branch: `wip/phase2-slices-1-3`. Đọc `docs/PHASE_2_PLAN.md` (v2.1) để hiểu scope.

**Backend Phase 2 (đã push `main` + apply cale-dev):**
- Migration + behavioral test đã ở commit **`7015a23`** (đã push `main`), migration
  `supabase/migrations/20260915000004_phase2_shifts_applications.sql` **đã apply lên
  `cale-dev`** (`supabase db push` thành công).
- Behavioral test `npm run test:rls:phase2` (`scripts/phase2-rls-integration.mjs`) đạt
  **78/78** trên cale-dev, cleanup 7 user test thành công.

**Slices 1–3 (checkpoint này, branch `wip/phase2-slices-1-3`):**
- **Slice 1 — repos:** `src/data/repos/shiftRepo.ts`, `src/data/repos/applicationRepo.ts`
  (mapper row snake→domain camel, reads + gọi RPC). `getShiftDetail` đọc `public_shifts`
  TRƯỚC (anon xem được ca công khai), rồi mới RPC cho owner/worker-có-đơn/admin.
  Map an toàn (row lỗi không crash cả list); map `timeline`; `custom_job_type_name`.
- **Slice 2 — async wrappers + refetch (KHÔNG optimistic):**
  - `shiftStore`: `publishAsync`, `editAsync`, `cancelAsync`, `refetchOne`,
    `refetchEmployer`, `refetchPublic`.
  - `applicationStore`: `applyAsync`, `withdrawAsync`, `approveAsync`, `rejectAsync`,
    `approveCancellationRequestAsync`, `rejectCancellationRequestAsync`,
    `refetchForWorker`, `refetchForShift`, `refetchForShifts`.
  - Mỗi wrapper: **supabase mode** → repo (RPC) + chờ server + refetch cache; **local
    mode** → gọi method SYNC cũ (hành vi/test không đổi). Giữ error code cho UI.
- **Slice 3 — AppHydrator supabase:** nạp `public_shifts` + ca/đơn theo vai (employer:
  `refetchEmployer` + `refetchForShifts`; worker: `refetchForWorker`) thay seed
  localStorage cho 2 slice này; overlay `public_profiles` của employer vào `userStore`
  (tên NTD cho worker) qua `userRepo.loadPublicProfiles` (giải nốt public-profiles-of-
  others hoãn từ Phase 1).

**File đã đổi trong checkpoint:** `src/data/repos/shiftRepo.ts` (mới),
`src/data/repos/applicationRepo.ts` (mới), `src/data/repos/userRepo.ts` (+loadPublicProfiles),
`src/stores/shiftStore.ts` (+wrappers/refetch), `src/stores/applicationStore.ts`
(+wrappers/refetch), `src/components/layout/AppHydrator.tsx` (nạp shifts/apps/public_profiles).

**Kết quả local (checkpoint):** `tsc` **0**, `build` **28 routes**, `lint` **0 error**,
unit **680/683** (3 known fail handbook §3.2), E2E **112/112**.

**⚠ QUAN TRỌNG — luồng người dùng CHƯA hoàn thành:** supabase mode đã có data layer +
hydration, **NHƯNG UI vẫn gọi các method SYNC cũ** (create/simulateDeposit/apply/approve/
reject/cancel/edit/withdraw), CHƯA gọi các wrapper `*Async`. Vì vậy ở supabase mode luồng
Employer–Worker **chưa chạy end-to-end** — đó là việc của Slice 4 (UI).

**Slice 4 tiến độ (2026-09-16, đã commit lên `main`):**
- ✅ **A** `src/app/employer/shifts/new/page.tsx` → `publishAsync` (supabase: giữ payload
  chờ + `client_request_id` idempotent, "cọc mô phỏng" = `publish_shift` INSERT thẳng
  Published; local giữ create+simulateDeposit). Nút cọc có loading chống double-click.
- ✅ **B** `src/app/shifts/[id]/page.tsx` → `handleApply` = `await applyAsync`.
- ✅ **C** `src/app/employer/shifts/[id]/page.tsx` → `handleApprove`=`approveAsync`,
  `handleConfirmReject`=`rejectAsync` (dùng `actionLoading` chống double-click).
- Local grid sau A–C: tsc 0, build 28, lint 0, unit 680/683, E2E 112/112.
- ✅ **Đã verify UI thật trên cale-dev:** worker Supabase đăng nhập → `/shifts` hiển thị
  ca công khai từ `public_shifts` + **tên NTD từ `public_profiles`** (hydration Slice 3
  chạy đúng trong UI thật).

**✅ BLOCKER verification ĐÃ GIẢI (2026-09-16, quyết định chủ dự án):** nới gate
verification **CHỈ ở supabase mode** theo `PHASE_2_PLAN §4.4` (verification không phải
security gate; RPC không enforce — 78/78). Local mode giữ nguyên. KHÔNG migrate verification.
- Employer publish: `src/app/employer/shifts/new/page.tsx` `handleSubmit` bỏ readiness
  gate khi `getDataMode()==='supabase'`.
- Worker apply: `src/app/shifts/[id]/page.tsx` truyền `workerVerifications=['phone','id','student']`
  ở supabase mode để `ApplicationActions` không chặn.
- **Verify render thật cale-dev:** trang tạo ca hiện form (không còn block); worker thấy
  `/shifts` + tên NTD. (Interactive click bị chặn bởi preview pane ẩn/không paint trong
  phiên agent — cần cửa sổ hiện để click; RPC layer đã proven 78/78.)

**✅ F (edit/cancel/withdraw/cancellation) — ĐÃ WIRE:**
- Employer: `handleCancelShift`→`cancelAsync` (supabase branch), `handleApproveCancellation`
  →`approveCancellationRequestAsync`, `handleRejectCancellation`→`rejectCancellationRequestAsync`
  (`src/app/employer/shifts/[id]/page.tsx`).
- Worker withdraw: `handleCancelConfirm`→`withdrawAsync` ở `worker/dashboard/page.tsx` +
  `shifts/[id]/page.tsx` (branch supabase, trạng thái mới CancellationRequested/CancelledByWorker).
- **`editAsync` CHƯA wire** — trang employer detail không có call-site edit đơn giản (edit
  shift qua flow khác). **Đẩy sang W6** (ưu tiên publish→apply→approve trước, đúng chỉ đạo).

**✅ G (refetch-on-focus) — ĐÃ THÊM:** `AppHydrator` có listener `visibilitychange`/`focus`
→ `refetchPhase2Supabase()` (supabase mode) để 2 máy đồng bộ không cần reload; loading +
chống double-click ở các nút đã thêm (guard `if (loading/actionLoading) return`).

**Local grid sau A–G:** tsc 0, build 28, lint 0, unit 680/683, E2E 112/112.

**Còn lại (H + W6):**
- **H.** E2E Supabase 2 browser tự động (`test:e2e:supabase`) — CHƯA viết; cần chạy trên
  cale-dev (service_role chỉ ở Node setup/cleanup). Manual 2-browser verify publish→apply→
  approve→worker thấy: **code sẵn sàng**, chỉ cần cửa sổ preview hiện để click (phiên agent
  bị pane ẩn chặn interactive).
- **W6.** Wire `editAsync` (sửa ca) + các thao tác phụ còn lại.

Ràng buộc: **KHÔNG** làm payment/GPS/OTP/rating/Boost/pricing/location/Cẩm nang, không
chỉnh UI ngoài phạm vi. Không optimistic update. Giữ baseline local xanh. Migration đã
apply → chỉ corrective mới. Không commit env/secret.

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
