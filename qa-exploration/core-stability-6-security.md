# CORE-STABILITY-6 — Security / Pentest Notes

**Date:** 2026-05-30
**Scope:** New surfaces in this task — wallet **withdrawal**, employer
**deposit guard**, notification timestamp/dedup, same-route intents.
Mock-only Next.js 16 MVP (localStorage, no backend).

## Summary

No new vulnerabilities introduced. All new money-handling and text
surfaces are guarded and output-escaped. `npm audit` shows **2 moderate**
transitive advisories (postcss via next) carried over and deferred —
the fix is a Next.js major downgrade, inappropriate for a stability pass.

## Findings

### CS6-SEC-1 — Withdrawal requires authentication (PASS)

A guest hitting `/worker/dashboard` is redirected to `/login`; the
"Rút tiền" control is never reachable without a session.
Test: `e2e/20-core-stability-6.spec.ts` Part 8 (unauthenticated
redirect, `Rút tiền` count 0).

### CS6-SEC-2 — Withdrawal note XSS is inert (PASS)

A note of `<img src=x onerror="window.__cs6xss=1">` is persisted and
rendered by React as escaped text. The handler never fires
(`window.__cs6xss` undefined) and no `img[src="x"]` element is created;
the literal payload is visible as text in the ledger.
Test: `e2e/20-core-stability-6.spec.ts` Part 8 (XSS payload inert).

### CS6-SEC-3 — Withdrawal amount integrity (PASS)

`walletStore.withdraw` rejects `0`, negative, `NaN`, `Infinity`
(`INVALID_AMOUNT`) and over-balance (`INSUFFICIENT_BALANCE`) with **no**
ledger mutation. A worker cannot drive their balance negative.
Test: `src/__tests__/coreStability6.test.ts` (withdrawal guards).

### CS6-SEC-4 — Deposit integrity, no ghost shift (PASS)

`simulateDeposit` guards `balance < depositAmount` **before** any
mutation. An underfunded attempt yields the localized error and leaves
**no** `Published` ghost shift in storage.
Test: `e2e/20-core-stability-6.spec.ts` Part 4 (no ghost shift assert).

## Dependency audit

`npm audit`: **2 moderate** — `postcss <8.5.10` (GHSA-qx2v-qp2m-jg93,
XSS via unescaped `</style>` in CSS stringify output) pulled transitively
by `next`. The advised remediation (`npm audit fix --force`) downgrades
`next` to 9.x — a major breaking change. This is **build-time CSS
tooling only**, not an app runtime input path. **Deferred** for a
coordinated Next/postcss upgrade; not introduced by this task.

## Known limitations (by design — mock MVP)

- All authorization is client-side; there is no server. A user can edit
  their own localStorage wallet/ledger via devtools. Acceptable for a
  no-backend demo; real server-side authz remains a known pre-existing
  deferred item.
