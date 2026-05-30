# Backend Readiness Plan — CORE-STABILITY-8 Part 0

**Date:** 2026-05-30
**App:** CaLẻ / ShiftNow — localStorage-only Next.js 16 MVP (mock, no backend).

## 1. What is stored in localStorage today

All app state is persisted client-side under the `cale.` namespace
(`src/data/persistence.ts`, `STORAGE_KEYS`, `SCHEMA_VERSION = 11`):

| Key | Slice |
|---|---|
| `cale.auth` | current user pointer + last-activity |
| `cale.users` | workers / employers / admins (incl. `passwordHash: "mock-hash:…"`) |
| `cale.shifts` | shifts + escrow status + timeline |
| `cale.shiftDrafts` | saved create-shift form snapshots (CORE-STABILITY-8) |
| `cale.applications` | applications + attendance fields |
| `cale.ratings` | employer → worker ratings |
| `cale.employerFeedback` | worker → employer reviews |
| `cale.reviewReports` | review reports |
| `cale.notifications` | in-app notifications |
| `cale.disputes` | disputes |
| `cale.boostLedger` | boost-credit ledger |
| `cale.wallets` / `cale.walletLedger` | wallet balances + ledger |
| `cale.scheduleBlocks` | worker busy blocks |
| `cale.workerVerifications` / `cale.employerVerifications` | verification docs (mock) |
| `cale.employerTypeChangeRequests` | type-change requests |

## 2. What is lost when browser cache/storage is cleared

**Everything.** Clearing site data / localStorage wipes all of the
above. On next load `loadAll()` detects the missing/old
`cale.schemaVersion` and reseeds the bundled demo JSON — so the app is
never broken, but **all runtime data (new shifts, applications, wallet
transactions, disputes, reviews, drafts) is permanently lost** and the
account reverts to the demo seed.

This is also per-browser and per-device: there is no cross-device sync,
no shared truth between two users, and no durability.

## 3. Acceptability

- **localStorage is acceptable ONLY for the demo / mock mode.** It lets
  the product be explored end-to-end with deterministic seed data and
  no infrastructure.
- **localStorage is NOT acceptable for real deployment.** It cannot
  provide durability, multi-device sync, multi-user shared truth,
  server-enforced authorization, or trustworthy money handling.
- **Production requires:** a backend database, real authentication +
  password hashing, **server-side authorization** (a client cannot be
  trusted to enforce role/ownership rules), and **server-side lifecycle
  jobs** (shift start/end transitions, pending-application expiry,
  12-hour auto-release, unused-slot refunds) that run on a clock the
  client does not control.

## 4. Backend is NOT implemented in this pass

This pass keeps the mock architecture. The plan below + the companion
`backend-migration-plan.md` describe the path; no backend code was
written.

## 5. Backend readiness plan (summary)

### Data models
See `backend-migration-plan.md` §4 for the full table list (users,
worker/employer profiles, shifts, shift_drafts, applications,
attendance_events, wallet_accounts, wallet_transactions, deposits/escrow,
notifications, disputes, reviews, review_reports, verification metadata,
schedule/availability blocks).

### API boundaries
- **Auth**: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`,
  session/JWT middleware.
- **Shifts**: CRUD + `POST /shifts/:id/deposit` (server computes deposit,
  debits escrow atomically), `POST /shifts/:id/cancel`.
- **Drafts**: CRUD under the authenticated employer only.
- **Applications**: apply / approve / reject / check-in / check-out /
  mark-present / mark-absent / revert — each server-authorized by role +
  shift ownership.
- **Wallet**: top-up / withdraw / ledger read — server-guarded balance.
- **Disputes / reviews / reports**: create / resolve, admin-scoped.

### Server jobs (cron / queue)
- lifecycle sync (status roll-forward), shift start/end transitions,
  pending-application expiry, 12-hour auto-release, no-show review,
  unused-slot + empty-expiry refunds, RequireFull understaffed
  auto-cancel. **All money/lifecycle logic moves server-side.**

### Migration order
Phase 1 schema + auth + persistence → Phase 2 wallet/escrow server-side
→ Phase 3 lifecycle server jobs → Phase 4 disputes/reviews → Phase 5
availability/recommendations.

## 6. Frontend invariants that must be fixed BEFORE backend

These were the focus of CORE-STABILITY-8 so the client contract is
clean before a server takes over:

1. **Draft ≠ real shift** (done): drafts live in their own store/table
   (`shift_drafts`), never in the public shift lifecycle. The backend
   `shifts` table stays free of `Draft` rows.
2. **Lifecycle is one engine** (done): `runLifecycleSync` is the single
   source of truth, invoked on every relevant mount + AppHydrator. The
   server job will mirror exactly these rules.
3. **Attendance is a two-sided state machine** (done): employer
   mark-present ≠ worker self check-in; check-out requires the worker's
   own check-in. The backend `attendance_events` table records each
   side independently.
4. **Required contact for publish** (done): publish/deposit is blocked
   without an on-site contact — the server will enforce the same.
5. **Refund policy is explicit** (done): empty-expiry full refund,
   unused-slot refund on completion, RequireFull auto-cancel. The server
   escrow ledger will be the authority; the client logic documents the
   intended rules.
6. **Money guards live in the store, not just the UI** (done):
   withdraw / deposit / draft-publish guards already reject direct
   calls — these become server-side checks 1:1.

Once these invariants are stable (this pass), the backend can implement
the same contracts authoritatively without re-litigating product rules.
