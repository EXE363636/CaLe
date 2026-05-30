# CORE-STABILITY-7 — Security / Pentest Notes

**Date:** 2026-05-30
**Scope:** New surfaces — notification deeplinks, wallet top-up /
withdraw / deposit-draft, numeric fields, attendance reversal, feedback
report. Mock-only Next.js 16 MVP (localStorage, no backend).

## Summary

No new vulnerabilities introduced. New money-handling, attendance, and
free-text surfaces are guarded, ownership-checked, and output-escaped.
`npm audit` shows **2 moderate** transitive advisories (postcss via
next) carried over from CS6 and deferred (the fix is a Next.js major
downgrade).

## Findings (all PASS)

- **CS7-SEC-1 Notification privacy** — every notification surface filters
  by recipient `userId`; wallet/dispute/application deeplinks open only
  the authenticated user's own dashboard modal and read only their slice.
- **CS7-SEC-2 Wallet authorization** — top-up/withdraw act on the
  authenticated user's own wallet; the store withdraw guard
  (`INSUFFICIENT_BALANCE` / `INVALID_AMOUNT`) cannot be bypassed by a
  direct call; unauthenticated users are redirected off role-guarded
  dashboards. (`e2e/20` Part 8.)
- **CS7-SEC-3 Draft isolation** — `Draft` shifts are excluded from the
  public listing (`domain/filter` requires `Published`/`FullyBooked` +
  `Deposited` escrow), so workers / other employers never see an unpaid
  draft.
- **CS7-SEC-4 Deposit guard (no bypass / no ghost shift)** —
  `simulateDeposit` checks balance before any mutation; an underfunded
  attempt publishes nothing. (`e2e/21` Part 2, `e2e/20` Part 4.)
- **CS7-SEC-5 Attendance authorization** — mark-present/absent and the
  new absent→present reversal are gated by `RoleGuard role="employer"` +
  `shift.employerId === currentUserId` (the detail page 404s on
  ownership mismatch). A worker cannot self-mark; an employer cannot act
  on another employer's shift.
- **CS7-SEC-6 Feedback report XSS** — report reason/note and feedback
  comments render as escaped React text; an `<img onerror>` payload does
  not execute. (`e2e/21` Part 9.)
- **CS7-SEC-7 Numeric field injection** — phone fields strip non-digits
  on input + validate via `isValidVNPhone`; amount/headcount strip to
  digits, so a malicious string is reduced to inert digits before the
  store. (`coreStability7` sanitizers, `e2e/21` Part 4.)

## Attendance reversal safety (Part 5.5)

The absent→present reversal is **blocked with `DISPUTE_OPEN`** when the
application has a non-terminal dispute — the correction must go through
admin resolution. This is the documented safe behavior: the reversal
never silently mutates escrow/payment while a dispute is open. When
allowed, the reversal restores reputation (clamped), reclaims the boost
credit (never below 0), re-fills the position, and restores escrow to
`InProgress` — no duplicate payment, no premature release.

## Dependency audit

`npm audit`: **2 moderate** — `postcss <8.5.10` (GHSA-qx2v-qp2m-jg93)
pulled transitively by `next`. Remediation downgrades `next` to 9.x (a
major breaking change), inappropriate for a stability pass. **Deferred**
for a coordinated upgrade; not introduced by this task.

## Known limitations (by design — mock MVP)

- All authorization is client-side; a user can edit their own
  localStorage via devtools. Acceptable for a no-backend demo; real
  server-side authz remains a known pre-existing deferred item.
- Review reports are visible to any admin (no per-admin scoping) —
  acceptable for the MVP admin role.
