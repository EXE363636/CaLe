# Kế hoạch chi tiết — BACKEND-MIGRATION-1 / Phase 1: Auth + Profile

**Ngày:** 2026-09-15 · **Bản:** v4 (sau review kiến trúc lần 3)
**Trạng thái:** Đã duyệt hướng; `cale-dev` Healthy. **Đang bắt đầu Bước 0** —
tạo migration trong repo trước, **chưa push cloud** cho tới khi local schema/RLS
tests đạt.
**Đọc kèm:** `docs/BACKEND_MIGRATION_PLAN.md`, `docs/PARTNER_IMPLEMENTATION_GUIDE.md`
(§2–3), `docs/SUPABASE_SECURITY_NOTE.md`.

> **Phạm vi Phase 1: CHỈ authentication + profile.** reputation / rating / boost /
> verification / ví — dời sang phase có bảng dữ liệu nguồn.

---

## 0. Baseline chính xác

Repo hôm nay (2026-09-15):
- **Unit:** **672/675 pass**; **3 fail đã biết** ở
  `src/__tests__/handbookContent.test.tsx` (Property 7 — đỏ **cố ý**, spec handbook
  đã hoãn, không phải regression).
- **E2E:** **112/112 pass** (chế độ localStorage).
- `tsc` sạch · build 28 route · lint 0 error (140 warning cũ).

→ Không dùng cụm "test xanh". Ràng buộc Phase 1: **giữ 672/675 unit (3 known
failures handbookContent) + E2E localStorage 112/112**, cộng test mới (mục 8).

---

## 1. Điều kiện review đã áp (v3 + v4)

| # (v4) | Điều kiện | Áp ở mục |
|---|---|---|
| 1 | E2E baseline **112/112** (không phải 112/0) | 0, 8, 10 |
| 2 | **Biến tường minh `NEXT_PUBLIC_DATA_MODE=local\|supabase`**; không tự chọn mode theo việc có URL/key. Prod chọn supabase mà thiếu key → throw | 2 |
| 3 | **Bảng `public_profiles` projection riêng** (không `security_invoker` view trên bảng gốc anon không đọc được) — chỉ dữ liệu an toàn, RLS SELECT cho anon/authenticated | 4, 6 |
| 4 | `verifications` hoãn → call-site submission/moderation verification tiếp tục localStorage; tách **`updateProfile()` async Supabase** khỏi hàm ghi field hoãn; **bỏ `updateUser()` blanket** | 3, 7 |
| 5 | Frontend/Vercel chỉ URL + publishable/anon key; **không** DB password / service_role ở `.env.local` app hay Vercel; migration qua **Supabase CLI đăng nhập/link tương tác**, không truyền secret qua chat | 12, 13 |
| 6 | Policy UPDATE có **cả `USING` và `WITH CHECK`**; admin authorization lấy từ trusted **`app_metadata`**, không `user_metadata` | 6 |
| 7 | Hydrate lấy **private `users` row của chính session** + **public profiles của người khác**; không SELECT toàn bộ bảng private `users` | 3, 4 |

(Các điều kiện v2/v3 trước đó vẫn giữ: prod không fallback; REVOKE bảng trước rồi
GRANT cột; hardening mọi `SECURITY DEFINER`; Phase 1 chỉ auth+profile; baseline
chính xác; E2E Supabase chỉ auth/profile/RLS; UX bất đồng bộ.)

---

## 2. Kiến trúc — data mode tường minh (điều kiện 2)

`getDataMode()` đọc **biến môi trường tường minh**, KHÔNG suy từ việc có URL/key:

| `NEXT_PUBLIC_DATA_MODE` | `NODE_ENV` | Kết quả |
|---|---|---|
| `supabase` | bất kỳ | `SupabaseUserRepo`; **thiếu URL/anon key → THROW** |
| `local` | ≠ production | `LocalStorageUserRepo` (Vitest, Playwright localStorage) |
| unset | ≠ production | mặc định `local` |
| bất kỳ ≠ `supabase` | production | **THROW** (prod bắt buộc `supabase`, không fallback) |

→ Test (không prod, mode `local`/unset) → giữ baseline mục 0. Component chạm auth /
profile-edit **có** thêm `await` + loading/error (mục 9) — không còn tuyên bố
"component không đổi một dòng".

---

## 3. Phạm vi dữ liệu + tách hàm ghi (điều kiện 4, 7)

**Supabase nguồn sự thật (Phase 1):**
- `users` (private): `id`, `role`, `email`, `phone`, `suspended`, `created_at`.
- Hồ sơ chủ-sửa: worker (`full_name`, `avatar_url`, `bio`, `skills`,
  `preferred_job_types`, `preferred_locations`); employer (`company_name`,
  `business_type`, `description`, `logo_url`, `employer_type`, `employer_type10a`,
  `understaffed_policy`).
- **`public_profiles`** (bảng projection riêng, mục 4) — bản chiếu chỉ dữ liệu an toàn.

**Hoãn — giữ đường localStorage hiện tại, hợp nhất vào `User` lúc hydrate:**
- reputation/rating/skill: `reputationScore`, `completedShiftCount`, `noShowCount`,
  `ratingsReceived`, `cancellationHistory`, `skillScores`, `protections`.
- verification/kiểm duyệt: `verifiedBusiness`, **`verifications`**, và **luồng
  type-change do admin duyệt** (VerificationsPanel).
- ví/boost: `boostCredits`, `walletBalance` (không tạo cột; UI đọc từ `walletStore`).

**Tách hàm ghi rõ ràng (điều kiện 4) — bỏ `updateUser()` blanket:**
| Hàm mới | Backend | Call-site |
|---|---|---|
| `updateProfile(id, patch)` **async** | Supabase (editable columns, server-first, error-handled) | `worker/profile:104` (patch), `employer/profile:50` (patch), `employer/profile:359` (employerType10A owner first-set) |
| `updateDeferredFields(id, patch)` **sync** (localStorage, như hôm nay) | localStorage | `worker/profile:152` (**verifications**), `admin/.../VerificationsPanel:150` (type-change moderation), và các đường reputation/boost/rating ở `applicationStore`/`shiftStore`/`adminStore` |
| `setSuspended(id, bool)` **async** | Supabase admin RPC (mục 6) | `adminStore` |
| `addUser` **async** | Supabase (qua signup) | `authStore.register` |

> Ghi chú interim: `employerType10A` là cột Supabase (owner set), nhưng luồng
> **admin duyệt type-change** (VerificationsPanel) là moderation → hoãn, tạm ghi
> localStorage; hợp nhất khi phase verification/moderation migrate. Ghi rõ để người
> sau không nhầm nguồn.

**Hydrate hợp nhất (điều kiện 7):**
- Lấy **`users` row của CHÍNH session** (RLS `auth.uid()=id`) — không SELECT toàn bảng.
- Lấy **`public_profiles`** của người khác cho các bề mặt hiển thị employer/ứng viên.
- Hợp nhất với field hoãn từ `cale.users` localStorage (theo `id`) → dựng `User[]`.
- `SCHEMA_VERSION` (**19**) **không bump** (shape localStorage không đổi).

---

## 4. Schema Phase 1

### `users` — RIÊNG TƯ
| Cột | Nguồn | Ghi |
|---|---|---|
| `id uuid PK` = `auth.users.id` | `auth.uid()` | — |
| `role text` check in ('worker','employer','admin') | `Role` | **server-only** (trigger) |
| `email citext unique` | `email` | qua Auth |
| `phone text` | `phone` | chủ (GRANT cột) |
| `suspended bool` default false | `suspended` | **admin RPC** |
| `created_at timestamptz` default now() | `createdAt` | — |

Bỏ `passwordHash`. RLS: chủ đọc/sửa dòng của mình; admin (từ `app_metadata`) toàn quyền.

### `worker_profiles` / `employer_profiles` — chỉ cột chủ-sửa
FK `user_id → users.id on delete cascade`. Chỉ các cột editable ở mục 3. RLS:
`UPDATE` chỉ dòng của mình (mục 6); **không mở SELECT bảng gốc cho người khác** —
người khác đọc qua `public_profiles`.

### `public_profiles` — BẢNG projection riêng (điều kiện 3)
Bảng thật (không phải view) chứa **chỉ dữ liệu an toàn**: `user_id`, `role`,
`display_name` (full_name/company_name), `avatar_url`/`logo_url`, `bio`/`description`,
`skills`, `preferred_job_types`, `business_type`. **Không** email/phone/`suspended`/
`verifications`/reputation/dữ liệu kiểm duyệt.
- Được **trigger `SECURITY DEFINER`** (hardened, mục 6) trên `worker_profiles`/
  `employer_profiles` giữ đồng bộ (insert/update).
- **RLS: `SELECT using (true)`** cho `anon` + `authenticated` (đọc công khai an toàn,
  không phụ thuộc quyền bảng gốc — giải đúng vấn đề `security_invoker`).
- Không GRANT INSERT/UPDATE/DELETE cho anon/authenticated (chỉ trigger ghi).

---

## 5. Auth flow

- **Đăng ký:** `supabase.auth.signUp` (metadata: role + profile) → **trigger**
  `on auth.users insert` (`SECURITY DEFINER`, hardened) tạo `users` + profile +
  `public_profiles`. **Role ép chỉ `worker|employer`**. Giữ validate hiện có
  (`RegisterInput`, employer bắt buộc `employerType10A` 4-shape, password ≥ 8).
- **Đăng nhập:** `signInWithPassword` → map `LoginError`
  (`INVALID_CREDENTIALS`/`SUSPENDED`), giữ chống enumeration.
- **Session:** `onAuthStateChange` listener refresh cache + đồng bộ đăng xuất đa tab.
- **Admin:** chỉ seed; quyền admin từ **`app_metadata.role`** (mục 6), không đăng ký.

---

## 6. RLS + phân quyền cột + hardening (điều kiện 3, 6)

**RLS bật cả 4 bảng** (`users`, 2 profiles, `public_profiles`).

**Phân quyền cột — REVOKE bảng trước rồi GRANT cột:**
```
REVOKE UPDATE ON public.users, public.worker_profiles, public.employer_profiles
  FROM authenticated;
GRANT UPDATE (phone) ON public.users TO authenticated;
GRANT UPDATE (full_name, avatar_url, bio, skills,
              preferred_job_types, preferred_locations)
  ON public.worker_profiles TO authenticated;
GRANT UPDATE (company_name, business_type, description, logo_url,
              employer_type, employer_type10a, understaffed_policy)
  ON public.employer_profiles TO authenticated;
```
`role`, `suspended` không bao giờ GRANT cho `authenticated`.

**Policy UPDATE có cả `USING` và `WITH CHECK` (điều kiện 6):**
```
create policy worker_profile_self_update on public.worker_profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```
(tương tự `users` self, `employer_profiles` self). `WITH CHECK` chặn đổi `user_id`
sang người khác.

**Admin authorization từ trusted `app_metadata` (điều kiện 6):**
```
-- chỉ dùng app_metadata (server-set), KHÔNG user_metadata (client sửa được)
(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
```
Dùng trong policy admin của `users`/profiles và trong RPC `admin_set_suspended`.

**Hardening MỌI `SECURITY DEFINER` (điều kiện 3, áp cho trigger signup, trigger
sync `public_profiles`, `admin_set_suspended`):**
- authorization + business checks bên trong.
- `set search_path = ''`; tên bảng **fully-qualified** (`public.users`…).
- `REVOKE EXECUTE ... FROM PUBLIC, anon;` chỉ `GRANT EXECUTE` cho đúng role.
- **RPC reputation/rating/boost: KHÔNG tạo ở Phase 1** (dời theo bảng nguồn).

---

## 7. Thay đổi theo file

| File | Thay đổi |
|---|---|
| `src/data/supabaseClient.ts` (mới) | client từ env; `getDataMode()` (đọc `NEXT_PUBLIC_DATA_MODE`, throw theo bảng mục 2); `onAuthStateChange` |
| `src/data/repos/userRepo.ts` (mới) | interface + `LocalStorageUserRepo` + `SupabaseUserRepo` (write server-first, error-handled) |
| `src/stores/userStore.ts` | thêm `updateProfile` async; giữ writer localStorage cho field hoãn (`updateDeferredFields`); `setSuspended`→admin RPC async; `addUser` async; **bỏ `updateUser` blanket** |
| `src/stores/authStore.ts` | `login`/`register` async + session |
| `src/app/login`, `register` | `await` + loading/error UI |
| `worker/profile:104`, `employer/profile:50`, `employer/profile:359` | → `updateProfile` async + loading/error UI |
| `worker/profile:152` (verifications), `admin/.../VerificationsPanel:150` | → `updateDeferredFields` (localStorage, giữ nguyên hành vi) |
| `AppHydrator.tsx` | nạp own `users` row + `public_profiles` async, hợp nhất field hoãn; loading gate + error UI |
| `supabase/migrations/*.sql` (mới) | 4 bảng + trigger signup + trigger sync `public_profiles` + RLS (USING+WITH CHECK) + REVOKE/GRANT cột + `admin_set_suspended` |
| seed script (dev) | đẩy 10 user demo → `cale-dev` |

**Không đổi ở Phase 1:** `applicationStore`, `shiftStore`, đường reputation/boost/
rating của `adminStore`. `SCHEMA_VERSION` không bump.

---

## 8. Chiến lược test

- **localStorage (giữ baseline mục 0):** Unit 672/675 (3 known failures) + E2E
  localStorage **112/112** — không sửa test cũ.
- **Structural/privilege (pgTAP, `npm run test:db` — cần Docker):**
  `supabase/tests/phase1_rls.test.sql` — RLS bật, `public_profiles` không có cột
  nhạy cảm, phân quyền cột, hàm là SECURITY DEFINER.
- **Behavioral RLS integration (anon/auth client THẬT trên `cale-dev`, KHÔNG cần
  Docker — `npm run test:rls:supabase`):** giả lập user A / B / admin —
  A đọc/sửa của mình được; A không đọc/sửa của B; anon chỉ đọc `public_profiles`;
  authenticated không đổi `role`/`suspended`; UPDATE chéo trả 0 dòng; admin RPC
  hoạt động, non-admin bị từ chối. **Full gate:** bắt buộc đủ URL + anon +
  service_role (local-only) — thiếu → INCOMPLETE (exit≠0), không PASS.
  Tạo user test bằng **Admin API `createUser({email_confirm:true})`** (trigger
  vẫn chạy, KHÔNG gửi email, không phụ thuộc Confirm Email), email domain hợp lệ.
  Luồng anon `signUp()` end-user kiểm RIÊNG ở bước auth/E2E — không trộn gửi email
  vào cổng RLS. Dùng `process.exitCode` (không `process.exit`) để Node đóng kết
  nối tự nhiên.
- **E2E Supabase thật (bước sau, `test:e2e:supabase`):** **chỉ** signup → login →
  session (refresh/logout) → sửa profile → RLS profile chặn chéo. **KHÔNG test shifts.**
- Sau mỗi bước: `tsc → build (28 route) → test:run → test:e2e`; đối chiếu baseline mục 0.

---

## 9. UX bất đồng bộ (điều kiện 7 v3)

- Data mode rõ ở dev (`local`/`supabase`).
- Loading: login/register, profile-edit, AppHydrator.
- Error: thất bại mạng/policy → thông báo tiếng Việt rõ; cache không đổi khi ghi lỗi.
- Session: `onAuthStateChange` đồng bộ đa tab.

---

## 10. Cổng nghiệm thu Phase 1

- [ ] Đăng ký/đăng nhập/đăng xuất + session refresh chạy.
- [ ] `public_profiles` chỉ phơi cột an toàn; email/phone/verifications/suspended
      không lộ cho anon/authenticated khác.
- [ ] Client không set `role`/`suspended`; UPDATE chéo bị `WITH CHECK` chặn; admin
      (app_metadata) làm được.
- [ ] Prod (`NEXT_PUBLIC_DATA_MODE=supabase`) thiếu key → throw; prod mode≠supabase → throw.
- [ ] Baseline giữ: 672/675 unit (3 known failures) + E2E localStorage **112/112**;
      + E2E Supabase (auth/profile/RLS) đạt.
- [ ] `tsc` sạch · build 28 route · lint 0 error.
- [ ] Cập nhật `HANDOFF.md` + doc schema per-table.

---

## 11. Nâng bản vá Next.js (trước public)

`next@16.2.6` → rà `npm audit` + advisory; nâng bản vá 16.x mới nhất (không nhảy
major); chạy lại safety grid (bất biến 28 route, đối chiếu baseline mục 0); ghi
version chốt vào `HANDOFF.md`.

---

## 12. Hạ tầng & bảo mật secret (điều kiện 5)

- **Hai project:** `cale-dev` (dev/test, Healthy) + `cale-prod` (production).
- **Email confirmation:** integration test **không phụ thuộc** trạng thái này
  (tự confirm qua service-role khi BẬT). Khuyến nghị vẫn ON ở `cale-prod`.
- **Frontend/Vercel chỉ chứa:** `NEXT_PUBLIC_DATA_MODE`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable/anon). **KHÔNG** database password,
  **KHÔNG** `service_role` trong `.env.local` app hay Vercel.
- **Migration:** dùng **Supabase CLI** với chủ dự án **đăng nhập/link tương tác**
  (`supabase login`, `supabase link`) — secret nằm trong phiên CLI trên máy chủ dự
  án, **không truyền qua chat**. Mình sẽ **không** hỏi password/service_role.

---

## 13. Bước 0 (đang làm) + thứ tự sau đó

**Bước 0 — tạo trong repo trước, CHƯA push cloud:**
1. `src/data/supabaseClient.ts` + `getDataMode()` (+ guard throw, `onAuthStateChange`).
2. `supabase/migrations/*.sql`: 4 bảng + `public_profiles` + trigger signup +
   trigger sync + RLS (USING+WITH CHECK) + REVOKE/GRANT cột + `admin_set_suspended`.
3. **Local schema/RLS tests đạt trước** (local Supabase). **Chỉ khi đạt** mới:
4. Hướng dẫn chủ dự án `supabase login` + `supabase link` (tương tác) → `supabase
   db push`; và đặt `NEXT_PUBLIC_DATA_MODE` + URL + anon key vào `.env.local`.

**Sau Bước 0:** userRepo → userStore (`updateProfile` async + hydrate hợp nhất) →
authStore (async+session) → sửa call-site profile/login + loading/error → AppHydrator
async → seed `cale-dev` → test tích hợp RLS + E2E Supabase → safety grid + docs →
(trước public) nâng bản vá Next.js.
