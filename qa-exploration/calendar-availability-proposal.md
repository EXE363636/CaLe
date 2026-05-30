# Calendar Availability Recommendation — Proposed Scope (DEFERRED)

**Date:** 2026-05-30
**Decision:** Documented proposal only. NOT implemented in
NAV-INTENT-DEEPLINK-FIX-1 — it is bigger than a small, safe MVP and
touches business logic, so per the task instruction it is deferred.

## Current model assessment

- `ScheduleBlock` (`src/types/index.ts`) is a worker-owned **busy
  block** (`{ id, userId, date, startTime, endTime, title }`).
- `src/stores/scheduleStore.ts` CRUDs busy blocks; persisted under
  `STORAGE_KEYS.scheduleBlocks`.
- `src/domain/scheduleConflict.ts` uses busy blocks to BLOCK
  conflicting applications (`hasScheduleConflict`).
- `src/domain/conflict.ts` separately blocks against approved shifts.
- **There is no availability/free-time concept and no
  availability-based shift recommendation.** The calendar models busy
  time only.

So the product idea ("calendar supports busy AND free time; recommend
shifts matching free schedule") is a genuinely new capability.

## Proposed minimal data model

- Extend `ScheduleBlock` with a discriminator `kind: 'busy' | 'available'`
  (default `'busy'` for back-compat; legacy records round-trip as busy).
  Avoids a second store/key.
- Optional later: `recurrence?: 'none' | 'weekly'` for recurring
  availability (phase 2 — adds materialization complexity).

## Proposed worker UI

1. On `/worker/schedule`, a toggle to add a block as **Bận (busy)** or
   **Rảnh (available)**; available blocks render in a distinct colour +
   legend entry.
2. On `/shifts`, a filter/sort chip **"Phù hợp lịch rảnh"** that
   prioritizes shifts fitting inside an available block.

## Proposed matching logic (pure domain, testable)

`suggestShiftsForAvailability(shifts, availableBlocks, busyBlocks, approvedRanges, prefs)`:
1. Shift must fit **inside** an available block (same date,
   `block.start <= shift.start` and `shift.end <= block.end`).
2. Shift must **not** overlap any busy block / approved / active job
   (reuse `hasScheduleConflict` + `domain/conflict.ts`).
3. Prioritize worker `preferredLocations`, then tightest time fit.
4. No AI / no external service — a deterministic sort, fully unit-testable.

## Tasks (if greenlit)

1. Types + back-compat migration (`kind` default `'busy'`).
2. `scheduleStore` add/edit accept `kind`; persistence round-trip test.
3. `domain/availabilityMatch.ts` pure matcher + property tests.
4. `/worker/schedule` UI: kind toggle + legend + colour.
5. `/shifts` "Phù hợp lịch rảnh" filter/sort wired to the matcher.
6. E2E: add availability → shift list prioritizes a fitting shift.

## Risks

- **Back-compat**: existing `ScheduleBlock`s must default to `'busy'`
  or they'd be misread as availability (data-safety risk).
- **Conflict-gate interaction**: availability blocks must NOT be fed
  into `hasScheduleConflict` (only busy blocks block applications) —
  mixing them would wrongly block valid applications (business-logic
  risk).
- **Scope**: recurring availability materialization across weeks is a
  separate, larger phase; keep MVP single-date only.
- **Route invariant**: must stay within the existing
  `/worker/schedule` + `/shifts` routes (no new route; 28-route
  invariant).

## Recommendation

Defer to a dedicated spec/phase. It is not a small change and carries
real data-safety + business-logic risks that warrant requirements +
design + property tests rather than an inline MVP bolted onto an intent
fix.
