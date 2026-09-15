# Kế hoạch chi tiết — BACKEND-MIGRATION-1 / Phase 2: Shifts + Applications

**Ngày:** 2026-09-15 · **Bản:** v2.1 (review 2 — 5 điểm cuối)
**Trạng thái:** Hướng đã duyệt; CHƯA viết migration/code. Có thể commit plan sau khi
v2.1 được duyệt.
**Đọc kèm:** `docs/BACKEND_MIGRATION_PLAN.md` (§5–8), `docs/PHASE_1_PLAN.md`,
`docs/SUPABASE_SECURITY_NOTE.md`, `HANDOFF.md` §0.

> Kế thừa guardrail Phase 1: thay lưu trữ dưới interface store; RLS + `SECURITY
> DEFINER` hardened (search_path='', fully-qualified, REVOKE EXECUTE PUBLIC/anon);
> data mode tường minh, **prod không fallback local**; behavioral RLS + E2E thật;
> **không commit secret/env local**.

---

## 0. Thay đổi v1 → v2

**Quyết định đã chốt (5 câu hỏi v1):**
1. Tách demo/prod **theo PROJECT**; `cale-prod` rỗng, **không** cột `is_demo`.
2. Draft giữ **localStorage** (không lên Supabase).
3. Có **seed QA cố định** trên `cale-dev` bằng script guarded; **dữ liệu E2E tạo
   tạm + cleanup sau mỗi lần chạy**.
4. `positions_filled` tăng khi approve — nhưng là **invariant đầy đủ** (mục 4.1).
5. **Tự động hóa `test:e2e` ngay trong Phase 2**; `service_role` chỉ dùng ở Node
   setup/cleanup, **không** vào browser/Vercel.

**9 sửa (v2) đã áp:** partial unique index (§5), `FOR UPDATE` khóa row (§4.2),
không DELETE server shift + mọi mutation qua RPC (§4.3), không "server-authoritative"
giả cho verification/reputation/wallet (§4.4), chỉ tạo cột Phase 2 thật dùng (§3.2),
timezone Asia/Ho_Chi_Minh ở server (§4.5), `public_shifts` không copy tên (join
`public_profiles`) + allowlist trạng thái (§3.3), chiến lược refresh đa người dùng
(§8), quy trình migration không-Docker (§12).

**5 điểm cuối (v2.1):** Draft KHÔNG tạo row Supabase — publish INSERT thẳng `Published`
qua `publish_shift(payload, client_request_id)` idempotent (§2, §4.4, §6); core column
NOT NULL + CHECK allowlist/enum + wage/time (§3.1, §3.2); read model `get_shift_detail`
cho ca không còn public (§3.4); `cancel_shift` xác định trạng thái MỌI application (§4.6);
repost gộp vào `publish_shift` + Notifications vẫn localStorage (E2E không dựa
notification) (§4.4, §8, §13).

---

## 1. Baseline (đầu Phase 2)
Phase 1 auth/profile + RLS đã lên `cale-dev`. Local grid: unit **680/683** (3 known
handbook), E2E local **112/112**, build 28 routes, RLS integration **20/20**. Giữ
nguyên baseline sau mỗi bước; không sửa test cũ (chỉ thêm `await` cho hàm async).

---

## 2. Phạm vi

**TRONG:** `shifts` + `applications` trên Supabase; worker xem ca thật + apply/withdraw;
employer tạo/sửa/**hủy (không xóa)** ca của mình + xem + approve/reject ứng viên;
`public_shifts` projection an toàn; RLS + RPC + constraint kiểm soát quyền + chuyển
trạng thái; chống đơn trùng (partial unique); behavioral RLS A/B + E2E employer–worker
thật (tự động).

**NGOÀI (giữ nguyên, phase sau):** ví/escrow/cọc thật (Phase 3 — publish/cọc Phase 2
chỉ **mô phỏng**, không tiền thật); attendance (check-in/out); rating/reputation/
verification; server jobs thời gian (auto-expire/start/end/auto-release — Phase 4);
**notifications backend** (vẫn localStorage — §13).

**Draft (điểm 1 v2.1 — hết mâu thuẫn):** Draft CHỈ ở localStorage; **Supabase TUYỆT
ĐỐI không có row `status='Draft'`**.
- Ở supabase mode: form giữ payload chờ trong component/local draft (không tạo row
  server nào). Khi user xác nhận **"publish / cọc mô phỏng"** → gọi **một RPC**
  `publish_shift(payload, client_request_id)` **INSERT thẳng row `Published`**
  (không qua trạng thái Draft/PendingDeposit trên server). `createdShiftId` **chỉ có
  sau khi RPC thành công**.
- `client_request_id` **unique theo employer** (`unique (employer_id,
  client_request_id)`) → retry / double-click không tạo hai ca.
- Chuỗi cũ `createShift → Draft → simulateDeposit` **chỉ giữ cho local mode**
  (demo/test offline). Interface `shiftStore` giữ, nhưng ở supabase mode ánh xạ sang
  `publish_shift`.

**Lifecycle theo đồng hồ ở Phase 2:** chỉ **suy diễn để HIỂN THỊ** qua
`getShiftLifecycleState(...)` (read-only) — **KHÔNG client ghi Supabase** (server jobs
Phase 4). Chỉ user-initiated transitions mới ghi (create/edit/cancel/apply/approve/
reject/withdraw).

---

## 3. Schema Phase 2

### 3.1 `shifts` (RLS bật) — NOT NULL + CHECK (điểm 2)
Map từ `interface Shift`. **NOT NULL** cho cột nghiệp vụ bắt buộc:
`id uuid PK default gen_random_uuid()`, `employer_id uuid NOT NULL FK → users.id`,
`title NOT NULL`, `description NOT NULL default ''`, `requirements NOT NULL default ''`,
`job_type text NOT NULL`, `custom_job_type_name text`, `location text NOT NULL`,
`district text`, `date date NOT NULL`, `start_time time NOT NULL`,
`end_time time NOT NULL`, `hourly_wage int NOT NULL`, `positions_total int NOT NULL`,
`positions_filled int NOT NULL default 0`, `status text NOT NULL`,
`escrow_status text NOT NULL`, `deposit_amount int NOT NULL default 0`,
`created_at timestamptz NOT NULL default now()`, `updated_at timestamptz NOT NULL
default now()`; public-safe (`workplace_image_label`, `workplace_notes`,
`requires_verified_document_on_arrival bool NOT NULL default false`,
`evidence_requirement text`); **riêng tư** (`on_site_contact_name`,
`on_site_contact_phone`); audit (`cancelled_at`, `cancelled_by`,
`employer_cancellation_reason`, `reposted_from_shift_id uuid`, `timeline jsonb NOT
NULL default '[]'`); **idempotency** `client_request_id text NOT NULL`.

**Constraint:**
- `unique (employer_id, client_request_id)` — chống tạo trùng khi retry/double-click.
- `CHECK positions_total >= 1`, `positions_filled >= 0`,
  `positions_filled <= positions_total`.
- `CHECK hourly_wage > 0`.
- `CHECK end_time > start_time` — **Phase hiện tại KHÔNG hỗ trợ ca qua đêm**, giữ
  đúng behavior hiện có (từ chối end ≤ start).
- **CHECK allowlist `status`** ∈ ShiftStatus (`'Draft'` KHÔNG bao giờ tồn tại trên
  server — có thể LOẠI khỏi allowlist server để bảo đảm; allowlist server:
  `'Published','FullyBooked','InProgress','AwaitingConfirmation','Completed',
  'Cancelled','Expired'`).
- **CHECK allowlist `escrow_status`** ∈ EscrowStatus
  (`'PendingDeposit','Deposited','InProgress','Completed','Released','Disputed',
  'Refunded'`).
- `deposit_amount`/`escrow_status`: **trạng thái mô phỏng** (không sổ tiền thật);
  RPC publish set `escrow_status='Deposited'` (mô phỏng), thay bằng escrow thật Phase 3.
- **Không tạo** cột money thật (ledger…) — Phase 3.

### 3.2 `applications` (RLS bật) — CHỈ cột Phase 2 + NOT NULL/CHECK (sửa #5, điểm 2)
`id uuid PK default gen_random_uuid()`, `shift_id uuid NOT NULL FK → shifts.id`,
`worker_id uuid NOT NULL FK → users.id`, **`status text NOT NULL`** (bắt buộc — nếu
nullable, partial unique có thể bị bypass bằng NULL), `applied_at timestamptz NOT NULL
default now()`, `approved_at`, `rejection_reason`, `cancellation_requested_at`,
`cancellation_reason_note`, `pre_cancellation_status`, `expired_at`, `expired_reason`,
`payout_amount int` — **chỉ giữ vì UI cần hiển thị số tiền THỎA THUẬN snapshot lúc
approve** (`hourly_wage * số giờ`); **server-only** (chỉ RPC approve ghi); **KHÔNG
gọi là "đã thanh toán"** (mức dự kiến; tiền thật Phase 3).

**Constraint:**
- **CHECK allowlist `status`** ∈ ApplicationStatus (`'Pending','Approved','Rejected',
  'CancelledByWorker','CancelledByEmployer','Expired','CancellationRequested',
  'NoShow','CheckedIn','CheckedOut','Confirmed','Disputed'`).
- **CHECK `payout_amount >= 0`** khi không null.
- Partial unique index — §5.
- **KHÔNG tạo sẵn** cột attendance (`check_in_at`/`check_out_at`/`checkout_checklist`),
  dispute, rating, `no_show_at`… của phase sau → thêm bằng **migration corrective mới**
  khi phase đó tới (không phá schema hiện tại).

### 3.3 `public_shifts` — projection CÔNG KHAI (sửa #7)
- **KHÔNG copy `employer_display_name`** (tránh stale khi employer sửa profile).
  Chỉ lưu `employer_id`; client đọc tên qua `public_profiles` (đã anon-readable từ
  Phase 1) join theo `employer_id`. → không cần trigger đồng bộ tên, không stale.
- Cột an toàn: `id`, `employer_id`, `title`, `description`, `requirements`, `job_type`,
  `custom_job_type_name`, `location`, `district`, `date`, `start_time`, `end_time`,
  `hourly_wage`, `positions_total`, `positions_filled`, `status`,
  `workplace_image_label`, `workplace_notes`, `evidence_requirement`,
  `requires_verified_document_on_arrival`, `created_at`. **KHÔNG** `on_site_contact_*`,
  `escrow_status`, `deposit_amount`, `timeline`, dữ liệu kiểm duyệt.
- **Allowlist trạng thái public** (chỉ ca đang hiển thị được vào `public_shifts`):
  `Published`, `FullyBooked`. **Loại**: `Draft` (không có trên server), `Cancelled`,
  `Expired`, `InProgress`/`AwaitingConfirmation`/`Completed` (không còn tuyển →
  không liệt kê ở listing công khai; chi tiết ca vẫn xem qua RPC/policy nếu cần).
  → Trigger `SECURITY DEFINER` trên `shifts`: upsert vào `public_shifts` khi status ∈
  allowlist, xóa khỏi `public_shifts` khi rời allowlist.
- `on_site_contact_*`: chỉ lộ cho worker **đã Approved** ca đó — qua RPC
  `get_shift_detail` (§3.4), không đưa vào listing công khai.
- RLS: `SELECT using (true)` cho anon + authenticated; không GRANT ghi.

### 3.4 `get_shift_detail(shift_id)` — read model cho ca KHÔNG còn public (điểm 3)
`public_shifts` xóa ca khi rời allowlist (Cancelled/Completed/Expired/…), nhưng
employer sở hữu và worker **từng ứng tuyển** vẫn cần mở trang chi tiết. Giải bằng
**RPC `get_shift_detail(shift_id)`** (`SECURITY DEFINER`, hardened) trả dữ liệu theo
người gọi:
- **owner (employer) / admin:** đọc đầy đủ (gồm `on_site_contact_*`).
- **worker có application của ca:** đọc phần **public-safe** của ca.
- **`on_site_contact_*`** chỉ trả cho worker có trạng thái **giữ chỗ / đã Approved**
  (Approved/CancellationRequested/CheckedIn/CheckedOut/Confirmed).
- **anon / người không liên quan:** bị chặn (trả rỗng/lỗi `NOT_AUTHORIZED`).

(Ca CÒN public vẫn đọc qua `public_shifts`; `get_shift_detail` phủ cả hai để một
đường vào duy nhất cho trang chi tiết.) Behavioral test cho từng vai ở §9.

---

## 4. RLS + RPC + constraint

### 4.1 Invariant `positions_filled` (quyết định #4 — đầy đủ)
`positions_filled` = **số application đang GIỮ CHỖ** của ca. Giữ chỗ =
`Approved`, `CancellationRequested`, `CheckedIn`, `CheckedOut`, `Confirmed`
(các trạng thái "đang chiếm slot"). Ở Phase 2 chỉ có tới `Approved`/
`CancellationRequested`; phần attendance sau vẫn phải giữ đúng invariant.
- **+1** khi approve (`Pending → Approved`).
- **−1** khi một đơn đang giữ chỗ rời giữ chỗ hợp lệ: worker hủy hợp lệ đơn
  `Approved` (`→ CancelledByWorker`), employer duyệt cancellation request
  (`CancellationRequested → CancelledByWorker`), employer hủy ca (tất cả về
  terminal).
- **`CancellationRequested` VẪN giữ chỗ** (chưa duyệt hủy → chưa nhả slot).
- **Bất biến DB:** không bao giờ âm, không vượt `positions_total` (CHECK §3.1 +
  kiểm trong RPC dưới khóa row).

### 4.2 Chống overbook/đếm sai khi đồng thời (sửa #2)
Mọi RPC đổi `positions_filled` (approve, worker-cancel Approved, approve/reject
cancellation-request, cancel-shift) phải trong **một transaction**:
`SELECT ... FROM public.shifts WHERE id = <shift> FOR UPDATE;` (khóa row) → kiểm
trạng thái/số chỗ → cập nhật `positions_filled` + status. Hai employer action đồng
thời được **tuần tự hóa**, không overbook / lệch đếm.

### 4.3 Quyền: mọi mutation qua RPC, KHÔNG ghi bảng trực tiếp (sửa #3)
- **`REVOKE INSERT/UPDATE/DELETE ON public.shifts, public.applications FROM
  authenticated`** — không ghi trực tiếp. `authenticated` chỉ:
  - `SELECT` theo scope (RLS): employer đọc ca của mình + đơn thuộc ca của mình;
    worker đọc đơn của mình; mọi người đọc `public_shifts`.
  - `EXECUTE` các RPC cần thiết.
- **Không có DELETE server shift** — ca chỉ chuyển `Cancelled` (giữ audit). Draft
  vốn local nên "xóa nháp" không đụng server.
- (Không dùng phương án GRANT cột trực tiếp; nếu sau này cần, phải liệt kê chính xác
  cột và **tuyệt đối không** `status`/`employer_id`/`positions_filled`.)

### 4.4 RPC chỉ enforce dữ liệu server hiện có (sửa #4 — trung thực)
Phase 2 CHƯA có bảng nguồn verification/reputation/wallet ⇒ RPC **chỉ** enforce:
`role`, `suspended`, **ownership**, **thời gian** (§4.5), **trạng thái hợp lệ**,
**số chỗ**, **uniqueness**.
- **Verification / reputation / wallet KHÔNG phải security gate ở supabase mode** —
  vẫn chỉ là gợi ý UX phía client (deferred), sẽ thành gate thật khi bảng nguồn
  migrate (phase sau).
- **UI KHÔNG được tuyên bố** các điều kiện đó "đã được backend đảm bảo".
- **Publish/cọc phải ghi rõ CHƯA có thanh toán thật** (mô phỏng).

**Danh sách RPC (SECURITY DEFINER, hardened):**
- **`publish_shift(payload jsonb, client_request_id text, reposted_from_shift_id
  uuid default null)`** — employer: INSERT **thẳng** row `status='Published'`,
  `escrow_status='Deposited'` (cọc mô phỏng). Idempotent qua
  `unique (employer_id, client_request_id)` — gọi lại cùng id trả về ca đã tạo, KHÔNG
  tạo ca thứ hai. **Không có bước Draft/PendingDeposit trên server.** Khi
  `reposted_from_shift_id` có: set cột đó + ghi audit timeline (`'Reposted'` trên ca
  mới, `'CreatedFromRepost'` trên ca nguồn nếu nguồn thuộc cùng employer) → gộp
  `repostFromShift` vào đây, KHÔNG cần RPC repost riêng (điểm 5).
- `edit_shift(shift_id, patch)` — employer sở hữu: kiểm chuyển trạng thái hợp lệ
  (không sửa ca đã Cancelled/Expired); giữ time/wage CHECK.
- `cancel_shift(shift_id, reason)` — employer sở hữu: xác định trạng thái MỌI
  application + reset đếm dưới `FOR UPDATE` (§4.6).
- `apply(shift_id)` — worker: role=worker, không suspended, ca ∈ allowlist tuyển +
  còn chỗ + chưa tới giờ bắt đầu (§4.5) + chưa có đơn "đang mở" (partial unique) →
  tạo `Pending`.
- `withdraw(application_id)` — worker: đơn của mình; `Pending → CancelledByWorker`
  (hoặc `Approved → …` theo luật hủy hiện có, dưới `FOR UPDATE`, −1 nếu đang giữ chỗ).
- `approve(application_id)` — employer sở hữu ca: `FOR UPDATE` shift → còn chỗ →
  `Pending → Approved`, `positions_filled +1`, snapshot `payout_amount`.
- `reject(application_id, reason)` — employer sở hữu ca: `Pending → Rejected`
  (reason bắt buộc; không đụng `positions_filled`).
- `approve_cancellation_request` / `reject_cancellation_request` — employer sở hữu ca
  (dưới `FOR UPDATE`, cập nhật giữ-chỗ đúng §4.1).
- `get_shift_detail(shift_id)` — read model theo vai (§3.4).
- **local mode:** chuỗi `create_shift → Draft → simulateDeposit` giữ NGUYÊN ở
  `shiftStore` cho demo/test offline; ở supabase mode `shiftStore.create/repost` ánh
  xạ sang `publish_shift` (không tạo Draft server).
- Mọi RPC: authorization + business checks bên trong; `search_path=''`; fully-qualified;
  `REVOKE EXECUTE FROM PUBLIC, anon` + `GRANT EXECUTE TO authenticated`.

### 4.5 Timezone (sửa #6)
`date`/`start_time`/`end_time` là **giờ Việt Nam (Asia/Ho_Chi_Minh)**. Mọi RPC
apply/approve/publish/cancel kiểm thời điểm bằng **giờ server đổi sang
Asia/Ho_Chi_Minh**, ví dụ so `(date + start_time)` với `timezone('Asia/Ho_Chi_Minh',
now())` — **KHÔNG** dựa `Date.now()` client, **KHÔNG** chỉ dựa status đã persist.
(Client vẫn dùng `getShiftLifecycleState` để hiển thị, nhưng quyết định cho-phép hành
động là ở server.)

### 4.6 `cancel_shift` — xác định trạng thái MỌI application (điểm 4)
Trong **một transaction, dưới `SELECT ... FOR UPDATE` row shift**, `cancel_shift`
phải giải quyết dứt điểm mọi đơn (không để Pending treo):
- `Pending` → **`Expired`**, `expired_reason = 'SHIFT_CANCELLED'`, `expired_at = now`.
- `Approved` / `CancellationRequested` (và mọi trạng thái **giữ chỗ**:
  CheckedIn/CheckedOut/Confirmed nếu có ở phase sau) → **`CancelledByEmployer`**.
- `Rejected` / `CancelledByWorker` → **giữ nguyên** (đã terminal).
- `positions_filled → 0` trong cùng transaction; shift `status='Cancelled'`,
  `cancelled_at/cancelled_by='employer'/employer_cancellation_reason` + audit timeline.
- **Không penalize/không đụng tiền** ở Phase 2 (penalty/hoàn cọc là mô phỏng/phase sau).
- **Test:** kiểm cả (a) trạng thái từng application sau cancel, (b) invariant số chỗ
  (`positions_filled = 0`, không âm).

---

## 5. Chống đơn trùng — partial unique index (sửa #1)
Code hiện cho phép **apply lại sau `Rejected` hoặc `CancelledByWorker`**. Vì vậy KHÔNG
dùng UNIQUE thường mà:
```
create unique index applications_open_uniq
  on public.applications (shift_id, worker_id)
  where status not in ('Rejected', 'CancelledByWorker');
```
→ chỉ chặn **đơn chưa kết thúc** (Pending/Approved/CancellationRequested/…), tương
đương hành vi hiện tại. RPC `apply` bắt lỗi unique → `ALREADY_APPLIED`.
**Test bổ sung:** (a) bị reject → apply lại được; (b) đang Pending/Approved → apply
trùng bị chặn; (c) đã CancelledByWorker → apply lại được.

---

## 6. Thay đổi store (giữ interface đọc, ghi async)
- `src/data/repos/shiftRepo.ts`, `applicationRepo.ts` (mới) — local + supabase; supabase
  gọi RPC (server-first), `.select()` xác nhận số dòng.
- `shiftStore.create` + `repostFromShift` → ở supabase mode ánh xạ **`publish_shift`**
  (INSERT thẳng Published, không Draft server; repost = publish kèm
  `reposted_from_shift_id`). `edit/cancel` → `edit_shift`/`cancel_shift`.
  `applicationStore.apply/cancelByWorker/approve/reject/approve|rejectCancellationRequest`
  → async (RPC). `checkIn/checkOut/confirmCompletion` **không đổi** (phase sau).
- Call-site (trang employer tạo/sửa/hủy ca + duyệt ứng viên; trang worker apply/withdraw)
  thêm `await` + loading/error UI. Số call-site rộng — liệt kê đầy đủ khi code.
- Ở supabase mode, shifts/apps nạp **chỉ từ Supabase** (bỏ hybrid-seed 2 slice này);
  local mode giữ seed.

---

## 7. UUID + Seed/Demo (điểm nhấn — không để giả như production)
### 7.1 UUID
PK `uuid default gen_random_uuid()`; FK uuid; app coi id là string mờ (không đổi type);
**bỏ `newPrefixedId` cho row Supabase** (DB sinh, `insert().select().single()`). Seed
shifts localStorage (id `shift_...`) không hợp lệ supabase mode → supabase mode nạp
shifts/apps chỉ từ Supabase.

### 7.2 Tách demo/prod theo PROJECT (quyết định #1)
- **`cale-prod`: RỖNG, không seed, không `is_demo`.** Employer thật đăng ca thật.
- **`cale-dev`: seed QA CỐ ĐỊNH** bằng script dev-only idempotent (tạo employer demo
  thật + ca của họ). **Guard cứng: từ chối chạy nếu project ref ≠ cale-dev.**
- **Dữ liệu E2E: tạo TẠM + cleanup sau mỗi lần chạy** (như Phase 1 RLS test) — tách
  khỏi seed QA cố định.
- Local mode (localStorage) vẫn là demo/prototype; footer sẽ nói đúng theo data mode
  (nợ Phase 1).

---

## 8. Refresh đa người dùng (sửa #8)
Không chỉ hydrate một lần. Cơ chế Phase 2:
- **Sau mỗi mutation**: refetch cache liên quan (vd approve → refetch applications của
  ca + shift).
- **Khi tab focus / điều hướng**: refetch listing/đơn liên quan (`visibilitychange` +
  route change). (Realtime Supabase là nâng cấp tùy chọn về sau — Phase 2 dùng refetch
  cho đơn giản/tin cậy.)
- **E2E hai browser phải chứng minh:** employer approve ở browser A → worker ở browser
  B **thấy Approved sau cơ chế refresh đã chọn** (refocus/điều hướng), không cần reload
  thủ công ngoài cơ chế đó.
- **Phạm vi đồng bộ Phase 2 = trạng thái CA/ĐƠN qua refetch.** Notifications **vẫn
  localStorage** (chưa backend) → hai máy KHÔNG nhận notification realtime. **E2E
  KHÔNG được dựa vào notification** để xác nhận; chỉ assert trạng thái ca/đơn sau
  refetch (§13).

---

## 9. Chiến lược test (quyết định #5 — tự động hóa E2E)
- **Local (giữ baseline):** unit 680/683 + E2E local 112/112 (local mode); không sửa
  test cũ.
- **Behavioral RLS integration (cale-dev, mở rộng `test:rls:supabase`):** A/B — worker
  A không đọc/sửa đơn của B; employer chỉ thấy/duyệt đơn thuộc ca của mình; partial
  unique (reject→re-apply được; Pending/Approved→chặn trùng; CancelledByWorker→re-apply
  được); client không ghi bảng trực tiếp (chỉ RPC); `public_shifts` chỉ cột an toàn +
  allowlist trạng thái; `positions_filled` đúng invariant kể cả đồng thời (approve song
  song không overbook). **Thêm:**
  - `publish_shift` idempotent: gọi lại cùng `client_request_id` → 1 ca; KHÔNG có row
    `status='Draft'` nào trên server.
  - `get_shift_detail` theo vai: owner/admin đầy đủ; worker-có-đơn thấy public-safe;
    `on_site_contact_*` chỉ cho worker giữ chỗ/Approved; anon/không liên quan bị chặn
    (kể cả ca đã Cancelled/Expired).
  - `cancel_shift`: Pending→Expired(SHIFT_CANCELLED), giữ-chỗ→CancelledByEmployer,
    Rejected/CancelledByWorker giữ nguyên, `positions_filled=0`.
- **E2E employer–worker THẬT, TỰ ĐỘNG (`test:e2e:supabase`, cale-dev):** hai ngữ cảnh
  trình duyệt — employer tạo ca → worker thấy ca công khai → apply → employer approve →
  worker thấy Approved (qua cơ chế refresh §8) → withdraw/reject path.
  **`service_role` CHỈ ở Node setup/cleanup** (tạo/confirm/xóa user + seed tạm),
  **KHÔNG** đưa vào browser context hay Vercel.
- Sau mỗi bước: `tsc → build (28 route) → test:run → test:e2e`.

---

## 10. Trung thực UI
- Publish/cọc = **"mô phỏng"**, ghi rõ **chưa có thanh toán thật**.
- `payout_amount` hiển thị là **mức thỏa thuận/dự kiến**, KHÔNG phải "đã thanh toán".
- UI không tuyên bố verification/reputation/wallet "đã được backend đảm bảo".
- Sửa **footer** phân biệt local-demo vs supabase-thật. Tiền tệ `đ`/`đồng`.

---

## 11. Cổng nghiệm thu Phase 2
- [ ] Employer publish ca (INSERT thẳng Published, **không row Draft server**);
      `publish_shift` idempotent theo `client_request_id`; sửa/**hủy (không xóa)** ca
      của mình; RLS chặn ca người khác.
- [ ] Core column NOT NULL + CHECK (status/escrow enum allowlist; `hourly_wage > 0`;
      `end_time > start_time`; `payout_amount >= 0`); không ca qua đêm.
- [ ] `get_shift_detail` đúng theo vai (owner/admin/worker-có-đơn/anon) kể cả ca đã
      rời public; `on_site_contact_*` chỉ cho worker giữ chỗ/Approved.
- [ ] `cancel_shift` xác định trạng thái MỌI application (không Pending treo) +
      `positions_filled=0` dưới `FOR UPDATE`.
- [ ] Worker xem `public_shifts` an toàn; apply/withdraw; không đọc đơn người khác.
- [ ] Employer duyệt/từ chối đơn thuộc ca của mình; không ca người khác.
- [ ] Partial unique: reject→apply lại được; Pending/Approved→chặn trùng.
- [ ] `positions_filled` đúng invariant §4.1, không âm/không vượt, đúng khi approve
      đồng thời (`FOR UPDATE`).
- [ ] Mọi mutation qua RPC; `authenticated` không INSERT/UPDATE/DELETE trực tiếp.
- [ ] RPC kiểm thời gian theo Asia/Ho_Chi_Minh ở server.
- [ ] `public_shifts` không lộ `on_site_contact_*`/escrow/deposit; tên employer không
      stale (join `public_profiles`); allowlist trạng thái đúng.
- [ ] Refresh đa người dùng: E2E 2 browser chứng minh approve → worker thấy.
- [ ] **`cale-prod` rỗng, không demo**; seed QA chỉ chạy được ở `cale-dev`; E2E data
      cleanup sau mỗi lần chạy.
- [ ] Baseline giữ; RLS integration + E2E Supabase tự động đạt.
- [ ] Cập nhật `HANDOFF.md`.

---

## 12. Quy trình migration (KHÔNG Docker — sửa #9)
Máy hiện không có Docker ⇒ **bỏ bước "local schema/RLS test trước khi push"**. Quy
trình đúng:
1. **Static review** migration (đọc kỹ SQL, đối chiếu plan).
2. **Push migration MỚI lên `cale-dev`** (`supabase db push`).
3. Chạy **behavioral integration + E2E** trên `cale-dev`.
4. Nếu lỗi → tạo **migration corrective MỚI** (không sửa migration đã apply).

Thứ tự triển khai: migration (shifts/applications + partial unique + CHECK +
public_shifts + trigger + RPC + RLS + REVOKE ghi trực tiếp) → repos → stores async +
call-site/UI → AppHydrator supabase nạp shifts/apps + refresh §8 → seed QA guarded +
E2E tạm/cleanup → behavioral RLS + E2E tự động → full grid → cập nhật HANDOFF.

**KHÔNG** trong Phase 2: ví/escrow/rating/reputation/verification, attendance, server
jobs thời gian, DELETE server shift, gate tiền/uy tín/verify ở Supabase.

---

## 13. Điểm còn lệch đã đóng (điểm 5)
- **`repostFromShift`:** KHÔNG cần RPC riêng — gộp vào `publish_shift(..., reposted_
  from_shift_id)` (INSERT ca mới + audit timeline hai đầu). §4.4/§6.
- **Notifications:** vẫn **localStorage** ở Phase 2 (chưa có backend). Hệ quả: hai
  máy KHÁC NHAU **không nhận notification realtime**. Phase 2 **chỉ đảm bảo trạng
  thái ca/đơn đồng bộ qua refetch** (§8); **E2E không được dựa vào notification**.
  Notification backend (+ realtime nếu cần) để **phase sau**.
