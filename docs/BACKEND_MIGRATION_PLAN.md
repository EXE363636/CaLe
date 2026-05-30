# CaLẻ — Backend Implementation Plan (BACKEND-MIGRATION-1)

**Date:** 2026-05-31
**Status:** PLAN ONLY. **No backend exists yet.** Implementation is
gated on explicit approval after this plan is reviewed.
**Audience:** project owner (non-technical) + the engineer who will
build it.

> Companion engineering doc: `qa-exploration/backend-migration-plan.md`
> (table-by-table detail, CORE-STABILITY-8/9 addenda). This file is the
> decision-friendly summary.

---

## 0. Current honest status

- **Backend implemented:** NO.
- **Current persistence:** the browser's **localStorage** only (mock).
  No server, no database, no real authentication. Stack today is just
  Next.js + React + Zustand.
- **Consequence:** data lives on one device/browser. Clearing the
  browser cache deletes everything. Two people cannot share data. This
  is fine for a demo and is stated to users in the site footer
  ("Dữ liệu demo đang lưu trên trình duyệt. Xóa cache sẽ mất dữ liệu.").

This plan describes how to add a real backend later. It does **not**
change the current app.

---

## 1. Can the backend run on a local machine during development?

**Yes.** A local backend is completely fine — and recommended — during
development. The developer runs the database and the API on their own
computer (e.g. a local Postgres instance, or a free Supabase project),
points the app at it with a configuration file, and tests everything
offline. Nothing has to be public while building.

## 2. Can it later be deployed to a server / cloud?

**Yes.** As long as the backend is built to read its database location
and secrets from **environment variables** (not hard-coded), the same
code that ran locally can be deployed to a cloud server with no code
change — you only swap the configuration values (database URL, secret
keys) for the production ones.

## 3. Backend options considered

| Option | What it is | Pros | Cons |
|---|---|---|---|
| **Supabase / Postgres** | Hosted Postgres database + built-in login + security rules + scheduled jobs | Fastest to a working product; login + security + scheduled jobs included; can run free locally | Ties some features to one vendor (still standard Postgres underneath) |
| **Next.js API routes + Postgres (Prisma)** | We write the server endpoints inside this same project + a Postgres database | Full control; one codebase | More to build by hand (login, security, scheduled jobs) |
| **Firebase** | Google's hosted app database + login | Easy login + realtime | Its data model fits our money/escrow + relational data poorly; cross-record transactions are awkward |

## 4. Recommendation (explained simply)

**Use Supabase (which is Postgres underneath).**

In plain terms: Supabase gives us, out of the box, the three hardest
pieces we would otherwise build by hand —

1. **A real database** to store users, shifts, applications, wallet,
   etc. that survives forever and is shared across everyone.
2. **A real login system** with proper password security.
3. **Security rules + scheduled jobs** so money and permissions are
   enforced on the server (where users can't tamper with them), and so
   shift timing (start/end, auto-pay after 12 hours) happens
   automatically even when nobody's browser is open.

It runs free on the developer's machine during building and deploys to
the cloud later by changing configuration only. Our app already keeps
all data access in one place (the Zustand "stores"), so swapping
localStorage for Supabase calls is a contained change, not a rewrite.

## 5. Required database tables

`users`, `worker_profiles`, `employer_profiles`, `shifts`,
`shift_drafts`, `applications`, `attendance_events`, `wallets`,
`wallet_transactions`, `escrow_deposits`, `notifications`, `disputes`,
`reviews`, `review_reports`, `schedule_blocks`, `worker_skill_scores`.

Notes:
- `schedule_blocks` carries a `kind` column (`busy` | `available`) — one
  table for both, not two (matches the current `ScheduleBlock.kind`).
- `worker_skill_scores` is one row per `(worker_id, category)` with
  `score`, `completed_count`, and `xp` (the XP is **server-computed** on
  shift confirmation — never sent by the client).
- `shifts` never stores Draft rows; unfinished postings live in
  `shift_drafts`.
- Column-level detail is in `qa-exploration/backend-migration-plan.md` §4.

## 6. Required server jobs (run automatically on a schedule)

1. **Close applications when a shift starts** — pending applicants who
   weren't approved by start time expire.
2. **Move a shift to "in progress"** when its start time arrives.
3. **End a shift** when its end time arrives.
4. **Auto-release wage after 12 hours** if the employer neither
   confirmed nor disputed.
5. **Refund unused slots** (and full deposit on an empty/expired shift,
   and on a "require full" understaffed auto-cancel).
6. **Expire abandoned drafts** if desired (housekeeping).

All jobs must be **idempotent** — running them twice produces the same
result, never a double payment or double refund. The current app already
uses idempotency markers (e.g. `shiftStartedNotifiedAt`,
notification `dedupeKey`) the server can mirror.

## 7. Required API groups

- **auth / user** — register, login, logout, current user, roles.
- **shifts / drafts** — create, edit, publish (deposit), cancel; draft
  save/restore/delete.
- **applications** — apply, approve, reject, cancel.
- **attendance** — worker check-in / check-out; employer mark-present /
  mark-absent / revert.
- **wallet / transactions** — top-up, withdraw, ledger.
- **notifications** — list, mark read.
- **disputes** — file, respond, admin resolve.
- **reviews** — submit, list, report.
- **schedule / availability** — busy + available blocks (CRUD, own only).
- **skills** — read skill scores / levels (XP write is server-only).

Every write is authorized on the server by session + role + resource
ownership (a worker can only touch their own application; an employer
only their own shift; admins only admin endpoints).

## 8. Migration order

| Phase | Scope |
|---|---|
| **Phase 1** | Database + authentication + user roles |
| **Phase 2** | Shifts + drafts + applications |
| **Phase 3** | Wallet / escrow (money leaves the client) |
| **Phase 4** | Lifecycle server jobs (start/end/auto-release/refunds) |
| **Phase 5** | Disputes / reviews / notifications |
| **Phase 6** | Schedule (availability) + skill recommendations |

Each phase ships behind the existing store interfaces, so the UI keeps
working while the persistence layer is swapped underneath it.

## 9. Risks (why this matters)

- **Money logic cannot stay on the client.** Deposits, withdrawals,
  refunds, and escrow must be decided and recorded on the server.
  Today's client guards are a convenience, not a safeguard.
- **Permissions cannot rely on the frontend.** A user can edit their own
  browser storage (including their role/wallet) via devtools. The server
  must be the source of truth for who can do what.
- **localStorage cannot support real users.** No sharing across devices,
  no durability, lost on cache clear.
- **Lifecycle cannot depend on a browser being open.** Shift start/end
  and the 12-hour auto-release must run on a server schedule, not only
  when someone happens to load a page.

## 10. Deliverables

- `docs/BACKEND_MIGRATION_PLAN.md` (this file — owner-friendly summary).
- `qa-exploration/backend-migration-plan.md` (engineering detail:
  per-table columns, indexes, CORE-STABILITY-8/9 addenda).
- No backend code is written in this task. Implementation begins only
  after this plan is approved.
