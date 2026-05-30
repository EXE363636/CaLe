# QA-Stabilization-Automation — Final Report

**Date:** 2026-05-30
**App:** CaLẻ / ShiftNow — Next.js 16 (App Router) + Zustand 5 + Tailwind v4, localStorage-only mock
**Run type:** Full-cycle stabilization (regression gate → fixes → regression automation → exploratory QA → baseline security → final validation)

---

## 1. Executive summary

A full-cycle QA stabilization pass was run end-to-end. The old-bug
regression gate was verified **green first** (no code edits), confirming
all 11 previously-fixed bug classes still hold. The Phase-2 manual-QA
fixes (past-shift block, lifecycle reconciliation, custom wallet
top-up, navbar, applicant grouping, badges) were verified already
implemented and intact from the prior QA-Fix-2 work. Two store-level
regression tests and a full access-control E2E suite were added to lock
contracts that were previously only covered indirectly. A read-only
exploratory pass across Worker/Employer/Admin found **one Medium bug**
(worker shift card showed the public "Đang tuyển" recruiting status
instead of the worker's own application status); it was fixed,
regression-tested, and re-verified. A baseline security/access-control
pass found **0 critical/high** issues and 2 deferred moderate
dependency advisories.

**Final state:** unit 405/405, build clean (28 routes), E2E 48/48,
exploratory 0 Critical/High/Medium open, security 0 Critical/High.

**Manual QA readiness: READY.**

## 2. Old bug regression gate result

**PASS.** All 11 old bug classes verified green via the passing
34-test E2E suite + code review (full detail in
`regression-before-qafix2.md` / `.json`). No old Critical/High
regression — new work proceeded without blockers.

## 3. Files changed (this session)

**Product code (1 file):**
- `src/components/shift/ShiftCard.tsx` — when the current worker has an active application on a listed shift, the card's primary badge now shows the worker's personal application status instead of the public "Đang tuyển" recruiting status (exploratory BUG-1 fix).

**Tests added (4 files):**
- `src/__tests__/qaStabilizationStoreGuards.test.ts` — 5 store-level guards (past-shift `simulateDeposit` block; Step 2b stale-Approved reconciliation + idempotency + future-shift no-op).
- `src/components/shift/ShiftCard.test.tsx` — 4 cases for the primary-badge fix.
- `src/components/shift/ShiftCardXss.test.tsx` — 1 XSS escaping regression.
- `e2e/17-access-control.spec.ts` — 14 access-control checks (unauth redirect ×8, wrong-role bounce ×5, cross-tenant 404 ×1).

**QA artifacts (UTF-8):** all under `qa-exploration/` (see §13).

_(Other modified files in `git status` — applicationStore, shiftStore, walletStore, NavBar, etc. — are uncommitted work from the prior QA-Fix-1 / QA-Fix-2 sessions, not changed in this session.)_

## 4. Bugs fixed mapped to latest manual QA

| Manual QA area | Status this session |
|----------------|---------------------|
| A. Past-shift posting blocked | Already implemented (QA-Fix-2); **re-verified** + new store-level regression test added |
| B. Lifecycle reconciliation for legacy data | Already implemented (runLifecycleSync Steps 0/2b); **re-verified** + new idempotency regression test added |
| C. Notification deep-link correctness | Already implemented (terminal-shift note + reconciled state); verified by `e2e/13` H2 + exploratory |
| D. Wallet custom top-up | Already implemented; verified by `e2e/16` |
| E. Navbar / layout | Already implemented; **re-verified** 0px overflow worker/employer/admin (exploratory) + `e2e/16` |
| F. Applicant grouping / counts | Already implemented ("Tình trạng đơn" + all buckets); **re-verified** on every employer shift detail (exploratory) |
| G. Status badge final pass | Already implemented; **+ NEW FIX**: worker card no longer shows "Đang tuyển" for an applied shift (BUG-1) |

## 5. Manual checklist coverage matrix A–M

Complete per-checkbox matrix in `checklist-coverage-matrix.md`. Summary:
- **A–M fully mapped**, every checkbox classified (E2E / Unit / Manual / Deferred / Not-covered).
- E2E-covered: A, C, D, E, F, G, H, I, J(partial), K, L(partial), M(partial).
- Unit/domain-covered: B, D, E, F, J, L, M + all dispute/checkout/auto-release/overlap contracts.
- Manual-only (visual niceties / positive variants of negative-asserted automated tests): a small set, listed in the matrix.
- Deferred: L "deep-link to conflict" (conflict shown inline; separate deep-link out of scope).
- **No hidden uncovered Critical/High items.**

## 6. Tests added / updated

| File | Tests | What it locks |
|------|-------|---------------|
| `src/__tests__/qaStabilizationStoreGuards.test.ts` | 5 | `simulateDeposit` PAST_SHIFT block (no escrow/wallet/timeline/publish write) + valid future deposit; Step 2b stale-Approved → Expired (neutral, no reputation change, 1 notification) + idempotent + future-shift untouched |
| `src/components/shift/ShiftCard.test.tsx` | 4 | Primary badge = personal status (not "Đang tuyển") for applied/approved shifts; "Đang tuyển" kept for non-applied; "Xem chi tiết" affordance retained |
| `src/components/shift/ShiftCardXss.test.tsx` | 1 | XSS payload renders inert (no script/img node, no execution) |
| `e2e/17-access-control.spec.ts` | 14 | Unauth → /login (8 routes); wrong-role bounce (5); cross-tenant employer 404 (1) |

The other 21 Phase-4 regression areas already had coverage (mapped in the coverage matrix) — e.g. past-shift domain (`shiftScheduling.test.ts`), repost (`e2e/09`), overlap (`phase10cStab1*` + `e2e/10`), timeline (`e2e/12`), wallet (`e2e/16`), disputes (`e2e/07`, `phase10cDispute*`), check-in window (`e2e/03`), attendance (`e2e/04`).

## 7. Unit test result

`npm run test:run` → **405 passed / 405** (32 files), exit 0.
(Baseline 395 → +10: 5 store-guard, 4 ShiftCard, 1 XSS.)

## 8. Build result

`npm run build` → exit 0, **exactly 28 routes** (unchanged — no new routes). Log: `qa-exploration/build-final.log`.

## 9. E2E result

`npx playwright test --project=chromium` → **48 passed / 48**, exit 0.
(Baseline 34 → +14 access-control.) Log: `qa-exploration/e2e-final.log`.

## 10. Exploratory QA result

Read-only Playwright probes across Worker/Employer/Admin against demo
seed data. **1 Medium bug (BUG-1)** found → fixed + regression-tested +
re-verified. **0 Critical, 0 High, 0 open.** Detail in `report.md` /
`bugs.json`. Key clean observations: 0px navbar overflow (all roles), no
raw i18n keys, 0 live attendance controls on terminal shifts,
"Tình trạng đơn" present everywhere, admin disputes expandable + badged.

## 11. Security / access-control result

`security-report.md` / `security-findings.json`. **0 Critical/High.**
- Access control: 14/14 E2E pass; `/employer/shifts/[id]` enforces real `notFound()` ownership guard; admin actions behind `RoleGuard`.
- XSS: 0 `dangerouslySetInnerHTML`; React escaping verified by regression test.
- PII / internal IDs: no worker PII or verification docs on public surfaces; dispute evidence owner/admin-scoped.

## 12. npm audit result

**2 moderate, 0 high, 0 critical.** Both are the postcss
`</style>` CSS-stringify advisory (GHSA-qx2v-qp2m-jg93) pulled
transitively via Next.js. **Deferred** — the only fix
(`npm audit fix --force`) downgrades Next.js to 9.3.3 (breaking,
violates the Next 16 invariant); not a runtime user vector in a
localStorage-only mock. Re-evaluate when a patched non-breaking Next.js
release ships.

## 13. Report file paths

- `qa-exploration/regression-before-qafix2.md` / `.json` — old-bug regression gate
- `qa-exploration/checklist-coverage-matrix.md` — A–M coverage matrix
- `qa-exploration/report.md` / `bugs.json` — exploratory QA
- `qa-exploration/security-report.md` / `security-findings.json` — security/access-control
- `qa-exploration/npm-audit.json` — raw audit
- `qa-exploration/e2e-phase1.log`, `e2e-final.log`, `e2e-accesscontrol.log`, `build-final.log` — run logs
- `qa-exploration/observations-phase5.json`, `probe-card-scoped.json` — probe outputs
- `qa-exploration/shots/` — exploratory screenshots
- `qa-exploration/explore.mjs`, `probe-card-scoped.mjs` — reusable read-only probe harnesses

## 14. Remaining deferred product decisions

- Auto-no-show with reputation penalty vs. current neutral `Expired` reconciliation (policy decision).
- `shiftStore.create` returning a bare `Shift` rather than a `Result` (publish/deposit gate is authoritative, so a past Draft is inert; a `create`-level guard would be a breaking signature change — deferred hardening).
- Admin `PartialRelease` / `ClosedInvalid` five-outcome dispute resolution (out of scope; two-outcome + request-more-evidence shipped).
- Server-side authorization (store actions don't re-check authz — UI is the documented boundary for the mock; required before a real deployment).
- Next.js/postcss dependency patch when a non-breaking release is available.

## 15. Remaining Medium/Low bugs

**None open.** The single Medium found (BUG-1) was fixed and re-verified.

## 16. Manual QA readiness verdict

# READY

All 15 readiness conditions met:
1. ✅ Old bug regression gate passes
2. ✅ No Critical/High bugs remain
3. ✅ No past-shift posting (domain + form + store guards; regression-tested)
4. ✅ No stale old notification state (reconciliation Steps 0/2b; regression-tested)
5. ✅ No duplicate lifecycle badges (single ShiftPhaseChip; verified)
6. ✅ No wallet contradiction (backfill + custom top-up; verified)
7. ✅ Navbar not broken (0px overflow all roles)
8. ✅ Old lifecycle data reconciles (idempotent runLifecycleSync)
9. ✅ Admin dispute visibility usable (badge + expandable detail + both sides)
10. ✅ Unit tests pass (405/405)
11. ✅ Build passes (28 routes)
12. ✅ E2E passes (48/48)
13. ✅ Checklist coverage matrix complete (A–M)
14. ✅ Exploratory QA report exists (0 open Critical/High/Medium)
15. ✅ Security/access-control report exists (0 Critical/High)
