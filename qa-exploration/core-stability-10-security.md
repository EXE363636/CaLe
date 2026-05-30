# CORE-STABILITY-10 — Security / Access-Control Notes

**Date:** 2026-05-31
**Scope:** Unified shift lifecycle, role-aware attendance, checkout
lock, badge consistency. Mock-only Next.js 16 MVP (localStorage, no
backend).

## Summary

No new vulnerabilities introduced. The lifecycle unification is a pure
display/derivation change; it does not relax any authorization or time
gate. All access-control checks PASS. `npm audit` shows the same **2
moderate** transitive advisories (postcss via next) carried over and
deferred — no dependencies were added by CORE-STABILITY-10.

## Findings (all PASS)

- **CS10-SEC-1 Worker cannot trigger employer mark-present/absent** —
  `markPresentByEmployer` / `markNoShow` / `revertNoShowToPresent` are
  invoked only from the employer's RoleGuard'd shift-detail page, which
  404s unless `shift.employerId === currentUserId`. The worker dashboard
  exposes no such action. The store actions act on the application of
  the employer's own shift.
- **CS10-SEC-2 Employer cannot trigger worker check-in** — worker self
  check-in (`checkIn`) is a worker-only dashboard action that stamps the
  worker's own `checkInAt`. Employer `markPresentByEmployer` sets
  `markedPresentAt` (and status CheckedIn for escrow) but NEVER
  `checkInAt`, so an employer cannot impersonate the worker's self
  check-in nor unlock the worker's checkout.
- **CS10-SEC-3 Employer cannot mark attendance for another employer's
  shift** — the employer shift-detail page resolves the shift and
  returns `notFound()` when `shift.employerId !== currentUserId`, so the
  attendance actions are unreachable for a shift the employer does not
  own.
- **CS10-SEC-4 Direct action cannot bypass the checkout time gate** —
  `canCheckOut` enforces `now >= end` + `status === 'CheckedIn'` + own
  `checkInAt` in the domain layer; the dashboard button is gated by the
  same predicate. The new lifecycle badge is display-only and does not
  open any action path. A programmatic `checkOut` call still runs the
  store's own validation.
- **CS10-SEC-5 Notification deeplink cannot bypass the checkout time
  gate** — a deeplink only navigates to the detail/dashboard; the
  checkout availability is recomputed from the wall clock on every
  render, so an old "shift ended" notification cannot surface a checkout
  button before the actual end time, and a pre-start deeplink cannot
  surface checkout at all.
- **CS10-SEC-6 Lifecycle state cannot be spoofed via the client** — the
  lifecycle badge is derived from `(shift, applications, now)`; a user
  editing their localStorage can only change their own demo data (the
  universal mock-MVP limitation). The state is a pure projection, not a
  stored grant, so there is no privileged value to forge.

## Known limitations (by design — mock MVP)

- All authorization is client-side; a user can edit their own
  localStorage via devtools. Real server-side authorization is the
  Phase 1 backend deliverable (see `backend-migration-plan.md`).
- Clearing browser storage loses all runtime data (disclosed site-wide
  in the footer).

## Dependency audit

`npm audit`: **2 moderate** — `postcss <8.5.10` via `next`. Remediation
is a Next.js major downgrade, inappropriate for a stability pass. No
dependencies were added by this task. **Deferred**; not introduced here.
