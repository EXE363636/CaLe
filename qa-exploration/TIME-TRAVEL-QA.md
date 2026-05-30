# Time-Travel QA Harness — QA-SYSTEM-1 Phase 2

**Goal:** Test time-based marketplace flows (12-hour auto-release,
shift start/end, check-in window, pending expiry, no-show
reconciliation, stale notifications) **without waiting in real time**.

## Why no app rewrite was needed

The app already exposes injectable time at the layer that owns each
time-based rule:

- `applicationStore.runLifecycleSync(nowIso?)` — the canonical
  orchestrator (shift roll-forward, pending expiry, stale-Approved
  reconciliation, 12h auto-release).
- `applicationStore.autoReleaseEligibleApplications(nowIso?)`.
- `domain/shiftScheduling.validateShiftFutureTiming(date, start, end, nowIso)`.
- `domain/timeGates.*` predicates take an explicit `now`.

So time-travel is achieved by **passing an advancing `nowIso`**, not by
mocking `Date.now` globally. Browser-level time-sensitive UI uses
Playwright's `page.clock.install({ time })` (already used in
`e2e/03`, `e2e/04`, `e2e/05`, `e2e/15`).

## Two complementary mechanisms

### 1. Domain/store time-travel (fast, deterministic) — preferred

`src/__tests__/timeTravelLifecycle.test.ts` ships a tiny harness:

```ts
const clock = makeClock('2026-05-28T13:00:00.000Z');
runLifecycle(clock);          // sync at "now"
clock.advanceHours(12);       // jump forward 12h — no real wait
runLifecycle(clock);          // re-sync; assert auto-release fired
```

Primitives:
- `makeClock(startIso)` → `{ nowIso(), nowMs(), advance(ms),
  advanceHours(h), advanceDays(d) }`.
- `runLifecycle(clock)` → `applicationStore.runLifecycleSync(clock.nowIso())`.

No `Date.now()`, no real timers, no `setTimeout`. Each scenario seeds
deterministic store state, advances the clock, re-runs lifecycle sync,
and asserts the reconciled state + wallet ledger + notifications.

### 2. Browser clock (E2E) — for UI-visible time gates

```ts
await page.clock.install({ time: new Date('2027-06-10T11:50:00') });
```

Used where the assertion is about rendered controls (check-in CTA
window, countdown), e.g. `e2e/03-checkin-window.spec.ts`.

## Run it

- `npm run test:time` — runs the time-travel + auto-release + store-guard
  suites (19 tests).
- Included in `npm run test:run` (full unit suite) and exercised
  indirectly by the clock-controlled E2E specs.

## Scenario coverage (QA-SYSTEM-1 Phase 3)

| Flow | Where | Mechanism |
|------|-------|-----------|
| F: checkout → held <12h → auto-release at 12h → idempotent | `timeTravelLifecycle.test.ts` | domain clock advance |
| G: dispute before 12h blocks auto-release across boundary | `timeTravelLifecycle.test.ts` | domain clock advance |
| D: approved-never-checked-in → neutral Expired past end | `timeTravelLifecycle.test.ts` + `qaStabilizationStoreGuards.test.ts` | domain clock advance |
| Auto-release predicate / idempotency / open-dispute lockout / no-timers | `phase10cAutoRelease.test.ts` | injected `nowIso` |
| B: check-in window (15m before … 5m after) | `e2e/03-checkin-window.spec.ts` | `page.clock` |
| Attendance during shift | `e2e/04-attendance.spec.ts` | `page.clock` |
| Checkout/confirm after shift end | `e2e/05-checkout-confirm.spec.ts` | `page.clock` |
| I: past-shift posting block | `e2e/15-past-shift.spec.ts` + `shiftScheduling.test.ts` | `page.clock` / injected `nowIso` |
