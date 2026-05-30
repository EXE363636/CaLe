# CORE-STABILITY-9 — Security / Pentest Notes

**Date:** 2026-05-31
**Scope:** Role-aware attendance copy, checkout timing lock, attendance
state machine, skill XP/levels, availability blocks + recommendations,
backend status note. Mock-only Next.js 16 MVP (localStorage, no backend).

## Summary

No new vulnerabilities introduced. Skill-XP integrity, availability
ownership, XSS inertness, and attendance-state-bypass guards all PASS.
`npm audit` shows **2 moderate** transitive advisories (postcss via
next) carried over and deferred.

## Findings (all PASS)

- **CS9-SEC-1 Skill XP integrity** — XP is never a form field. It is
  computed by `awardSkillXp` inside `confirmCompletion` (a store action
  driven by the employer's confirm + the worker's confirmed shift), so a
  worker cannot inflate their level through any UI. The only way to
  change XP via devtools is editing one's own localStorage — the
  universal mock-MVP limitation, and the backend plan makes XP
  server-computed (§11.2).
- **CS9-SEC-2 Availability ownership** — schedule blocks (busy and
  available) are created/edited/removed through `scheduleStore` with an
  `OWNER_MISMATCH` guard on `update`/`remove`; the schedule page reads
  `forUser(currentUserId)`. A worker cannot read or mutate another
  worker's availability.
- **CS9-SEC-3 Recommendation privacy** — `suggestShiftsForWorker` runs
  purely client-side over the signed-in worker's own blocks + the public
  shift list; it surfaces no other user's data. Excluded shifts (busy /
  approved overlap) simply drop out of the ranking.
- **CS9-SEC-4 XSS in availability notes / skill labels** — block titles
  /notes and skill category labels render as escaped React text (no
  `dangerouslySetInnerHTML`); match-label pills are derived from a
  fixed Vietnamese vocabulary, not user input.
- **CS9-SEC-5 Attendance state bypass** — the attendance state is a pure
  projection (`deriveAttendanceState`) and the checkout gate
  (`canCheckOut`) enforces self-check-in + the end-window in the store
  action, so navigating directly to a route or flipping UI state cannot
  unlock check-out early or fabricate a presence state. Employer
  mark-present still cannot stamp the worker's `checkInAt` (CS8 Part 4).
- **CS9-SEC-6 Role-correct copy** — attendance copy is keyed by viewer
  role; the employer surface never renders worker-addressed strings and
  vice-versa, removing a class of social-engineering / confusion bugs.

## Known limitations (by design — mock MVP)

- All authorization is client-side; a user can edit their own
  localStorage via devtools. Real server-side authorization (incl.
  server-computed skill XP and availability RLS) is the Phase 1 backend
  deliverable (see `backend-migration-plan.md` §7, §11).
- Clearing browser storage loses all runtime data — now disclosed
  site-wide in the footer (Part 6).

## Dependency audit

`npm audit`: **2 moderate** — `postcss <8.5.10` via `next`. Remediation
is a Next.js major downgrade, inappropriate for a stability pass. No
dependencies were added by this task. **Deferred**; not introduced here.
