# Backend Migration Plan — CORE-STABILITY-8 Part 6

**Date:** 2026-05-30
**Status:** Plan only. **No backend was built.** Implementation is
gated on explicit approval.

> **PRODUCT-UX-FIX-BACKEND-PREP-1 (2026-05-31):** re-verified — the
> project still has **no backend** (dependencies are only next / react /
> react-dom / zustand; no API routes, no DB). Persistence remains
> localStorage-only. An owner-friendly summary of this plan now lives at
> `docs/BACKEND_MIGRATION_PLAN.md` (BACKEND-MIGRATION-1). This document
> stays the engineering reference (per-table columns + CS8/CS9 addenda).

## 1. Why localStorage is insufficient

localStorage is per-browser, per-device, client-controlled, and cleared
with site data. It cannot provide: durability, cross-device sync,
multi-user shared truth, server-enforced authorization, trustworthy
money handling, or clock-driven lifecycle jobs. A user can edit their
own wallet/role via devtools. Acceptable for a demo; unacceptable for
real money + labor.

## 2. Backend stack options

- **Supabase (Postgres + Auth + RLS + Edge Functions + cron)** —
  fastest path: managed Postgres, built-in auth, row-level security for
  authorization, scheduled functions for lifecycle jobs.
- **Firebase (Firestore + Auth + Cloud Functions)** — easy auth/realtime
  but document model fits the relational shift/application/escrow data
  less well; transactions across collections are awkward for escrow.
- **Custom Node/Next API routes + Postgres (Prisma) + a job runner** —
  most control, most work; keeps everything in the existing Next.js repo.

## 3. Recommended choice

**Supabase / Postgres.** It maps cleanly onto the relational data, gives
real auth + password hashing for free, enforces authorization in the DB
(RLS) so a compromised client can't bypass rules, and provides scheduled
functions for the lifecycle/auto-release/refund jobs — exactly the
server-side guarantees the MVP lacks. The frontend already centralizes
its data access in Zustand stores, so swapping the persistence layer for
Supabase calls is contained.

## 4. Required database tables

| Table | Notes |
|---|---|
| `users` | id, role, email (unique), phone, password_hash (bcrypt/argon2), suspended, created_at |
| `worker_profiles` | user_id FK, full_name, skills, preferred_*, reputation_score, completed_shift_count, no_show_count |
| `employer_profiles` | user_id FK, company_name, business_type, employer_type, verified_business, boost_credits, understaffed_policy |
| `shifts` | id, employer_id FK, title…, date/time, hourly_wage, positions_total/filled, status, escrow_status, deposit_amount, on_site_contact_name/phone (NOT NULL for published), timestamps. **No Draft rows.** |
| `shift_drafts` | id, employer_id FK, all form fields (nullable), saved_at, updated_at |
| `applications` | id, shift_id FK, worker_id FK, status, applied/approved/check_in/check_out/confirmed timestamps, marked_present_at, marked_present_by, payout_amount |
| `attendance_events` | id, application_id FK, kind (`WorkerCheckIn`/`EmployerMarkPresent`/`WorkerCheckOut`/`MarkAbsent`/`RevertToPresent`), actor_id, occurred_at |
| `wallet_accounts` | user_id PK, balance, updated_at |
| `wallet_transactions` | id, user_id FK, kind, amount (signed), shift_id?, application_id?, note, occurred_at |
| `escrow_holds` (deposits) | id, shift_id FK, amount, status (Held/Released/Refunded/Partial), created/settled_at |
| `notifications` | id, user_id FK, kind, title, body, link, read, dedupe_key (unique per user), created_at |
| `disputes` | id, shift_id, application_id, raised_by, category, reason, evidence, status, resolution_note, timestamps |
| `reviews` | employer_feedback + worker ratings (or two tables), with full timestamps |
| `review_reports` | id, target_kind, target_review_id, reported_by, reason, note, status, created_at |
| `verification_documents` | metadata only (no real files in MVP), per worker/employer |
| `schedule_blocks` / `availability_blocks` | worker busy / (future) available time |

Indexes on FKs + `(user_id, dedupe_key)` unique on notifications +
`(shift_id, status)` on applications.

## 5. Server-side jobs

A scheduled runner (Supabase cron / queue) executes the same rules the
client `runLifecycleSync` does today, authoritatively:

- **lifecycle sync** — roll shift status forward by wall clock.
- **shift start/end** — Published → InProgress at start; → Awaiting/
  Expired at end.
- **pending application expiry** — expire un-approved Pending at start.
- **12h auto-release** — settle un-confirmed checked-out applications.
- **no-show review** — surface absent/no-show.
- **refund unused slots** — on completion, refund employer for unused
  positions; on empty expiry, refund full deposit; RequireFull
  understaffed → auto-cancel + full refund.

All jobs are **idempotent** (audit-marker columns) — exactly mirroring
the client idempotency hooks (`shiftStartedNotifiedAt`,
`expiredEmptyNotifiedAt`, dedupe keys) so behavior is identical.

## 6. API endpoints needed

`/auth/*` (register/login/logout); `/shifts` CRUD + `/shifts/:id/deposit`
+ `/shifts/:id/cancel`; `/drafts` CRUD; `/applications/*`
(apply/approve/reject/check-in/check-out/mark-present/mark-absent/
revert); `/wallet/*` (top-up/withdraw/ledger); `/disputes/*`;
`/reviews/*` + `/reports/*`; `/notifications/*`. Every mutation is
server-authorized by session + role + resource ownership.

## 7. Auth and role authorization

- Real password hashing (argon2/bcrypt), JWT/session cookies.
- Authorization enforced server-side (RLS policies):
  - workers can only act on their own applications;
  - employers can only act on their own shifts/drafts/wallet;
  - admins gated to admin endpoints;
  - wallet refunds/credits are issued only by server jobs or
    authorized admin actions — never by a client request.

## 8. Migration order

- **Phase 1** — Backend schema + auth + persistence (read/write parity
  with the current stores; client swaps localStorage for API).
- **Phase 2** — wallet/escrow server-side (money leaves the client).
- **Phase 3** — lifecycle server jobs (status/auto-release/refunds).
- **Phase 4** — disputes/reviews/reports server-side.
- **Phase 5** — availability/recommendations.

## 9. Risks

- **Money logic cannot stay client-side** — deposit/withdraw/refund/
  escrow must be server-authoritative; the client guards are a UX
  convenience only.
- **localStorage role switching is unsafe** — the demo lets a user
  switch roles by editing `cale.auth`; real auth must bind role to a
  verified session.
- **Notifications need server persistence** — cross-device delivery +
  dedupe must live server-side (unique `(user_id, dedupe_key)`).
- **Lifecycle timing** — the client only refreshes on page load; a
  server cron is required so transitions happen even when no one is
  looking.

## 10. Deliverable

This document. Companion: `backend-readiness-plan.md` (Part 0). No
backend implementation performed.

## 11. CORE-STABILITY-9 addendum (2026-05-31)

CORE-STABILITY-9 added four client-side concepts that the backend must
absorb when built. None of them changes the recommendation in §3 — they
slot into the existing tables/jobs.

### 11.1 Attendance state machine (`src/domain/attendanceState.ts`)

The client now derives a single canonical attendance state
(`ApprovedNotStarted`, `WorkerCheckedInEarly`,
`WorkerCheckedInInProgress`, `EmployerMarkedPresentOnly`,
`BothConfirmedPresent`, `NoShow`, `AwaitingCheckout`, `CheckedOut`,
`AwaitingEmployerConfirmation`, `Disputed`, `Completed`) from the
application status + `checkInAt` (worker self) + `markedPresentAt`
(employer) + the wall clock, and maps it to ROLE-AWARE copy.

- **Backend:** the state is a PURE projection — do NOT store it as a
  column (it would drift). Derive it server-side from the same
  `applications` fields + `attendance_events` rows already planned in
  §4. Expose it as a computed field / view. Role-aware copy stays in the
  client i18n layer.
- **Invariant to enforce server-side:** check-out requires the worker's
  own `check_in_at` (an employer mark-present alone must never unlock
  check-out). The 11-state matrix is the test oracle.

### 11.2 Worker skill progression / XP (`src/domain/skillProgression.ts`)

Per-category `WorkerSkillScore` gained an optional `xp` field plus a
level model (1–5, thresholds 0/50/120/250/500). XP is awarded on
`confirmCompletion` (+10 completed, +5 5★, +3 4★, +2 no-dispute, 0 if
disputed).

- **Backend:** add `xp INTEGER NOT NULL DEFAULT 0` to the
  `worker_skill_scores` table (split out of `worker_profiles.skills`:
  `(worker_id, category, score, completed_count, xp, last_updated_at)`).
- **XP must be server-computed** on shift confirmation — never accepted
  from the client (a worker editing devtools must not be able to inflate
  level). The award is a side effect of the confirm/auto-release job.

### 11.3 Availability blocks (`ScheduleBlock.kind`)

`schedule_blocks` rows gained `kind ENUM('busy','available') NOT NULL
DEFAULT 'busy'`. Busy blocks gate applications (conflict); available
blocks are non-blocking hints used for recommendations.

- **Backend:** single table with the `kind` column (matches §4's
  "schedule_blocks / availability_blocks" line — collapse to ONE table
  with `kind`). RLS: a worker may only read/write their OWN blocks.

### 11.4 Recommendation scores (`src/domain/availabilityMatch.ts`)

A rule-based (NOT AI) weighted scorer ranks public shifts for a worker:
time-fit 40% (shift fits inside an available block), location 25%,
skill 25%, wage 10%; shifts overlapping a busy block or an
approved/active job are excluded. Labels: Rất phù hợp ≥75, Phù hợp ≥50,
else Cần cân nhắc.

- **Backend:** compute on read (a `GET /shifts?sort=availability`
  endpoint or a SQL/Edge function), not stored. The weights are config.
  No personal data leaves the device beyond what the shift query already
  needs. If recommendation volume grows, precompute nightly into a
  `shift_recommendations(worker_id, shift_id, score, fits_availability)`
  materialized cache — but the MVP scorer is cheap enough to run inline.

### 11.5 Honest backend-status note (Part 6)

The site footer now states, site-wide: "Dữ liệu demo đang lưu trên
trình duyệt. Xóa cache sẽ mất dữ liệu." This is the truthful status
until Phase 1 of §8 ships. No partial/hidden backend exists.

