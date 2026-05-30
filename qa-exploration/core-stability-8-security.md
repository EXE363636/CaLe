# CORE-STABILITY-8 — Security / Pentest Notes

**Date:** 2026-05-30
**Scope:** Draft architecture, lifecycle, attendance, refund policy.
Mock-only Next.js 16 MVP (localStorage, no backend).

## Summary

No new vulnerabilities introduced. Draft isolation, attendance
authorization, refund authorization, and direct-store-bypass guards all
PASS. `npm audit` shows **2 moderate** transitive advisories (postcss
via next) carried over and deferred.

## Findings (all PASS)

- **CS8-SEC-1 Draft visibility** — drafts are employer-scoped and never
  enter the public listing; a worker's job list cannot show a draft
  (`e2e/22` worker-never-sees-draft).
- **CS8-SEC-2 Draft access control** — the draft list + restore are
  scoped to the authenticated employer (`forEmployer`); no cross-employer
  draft surface exists.
- **CS8-SEC-3 Attendance authorization** — worker cannot trigger
  employer actions and vice-versa; the employer detail page is
  RoleGuard'd + 404s on shift-ownership mismatch; employer mark-present
  no longer stamps the worker's `checkInAt`, so it cannot impersonate a
  worker self check-in.
- **CS8-SEC-4 Refund authorization** — refunds are issued only by
  lifecycle/system paths or admin dispute resolution, never by a
  worker/guest request. Deposit + contact guards run before any mutation
  in `simulateDeposit`.
- **CS8-SEC-5 Direct store bypass** — `discardDraftShift` refuses
  non-Draft shifts; `simulateDeposit` enforces past-shift, verification,
  contact, and balance guards in-store.
- **CS8-SEC-6 Notification deeplink privacy** — refund/expiry/auto-cancel
  notifications are recipient-scoped and only open the recipient's own
  dashboard surfaces.
- **CS8-SEC-7 XSS in draft fields** — draft fields render as escaped
  React text; numeric phone is digit-sanitized on input.

## Known limitations (by design — mock MVP)

- All authorization is client-side; a user can edit their own
  localStorage via devtools. Real server-side authorization is the
  Phase 1 backend deliverable (see `backend-migration-plan.md`).
- Clearing browser storage loses all runtime data (documented in
  `backend-readiness-plan.md` §2). This is expected for the demo and is
  the central motivation for the backend migration plan.

## Dependency audit

`npm audit`: **2 moderate** — `postcss <8.5.10` via `next`. Remediation
is a Next.js major downgrade, inappropriate for a stability pass.
**Deferred**; not introduced by this task.
