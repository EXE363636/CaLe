# Staff-Supply / Agency Concept — Proposed Scope (DEFERRED)

**Date:** 2026-05-30
**Task:** CORE-STABILITY-6 Part 5
**Decision:** Documented proposal only. **NOT implemented.** Per the
task instruction, do not touch the auth/role model in a stability pass.
This is a genuinely new business capability that warrants its own spec
(requirements → design → property tests), not an inline change.

## Current model assessment

- `BaseUser.role` is a closed union: **`'worker' | 'employer' | 'admin'`**
  (`src/types/index.ts`, `Worker.role = 'worker'`, `Employer.role =
  'employer'`).
- There is **no organisation / team / agency entity**. A worker is a
  single natural person; an employer is a single account
  (`EmployerType = 'individual' | 'business'`, but still one login).
- Applications, escrow, wallet, reputation, and disputes are all keyed
  to a single `workerId` ↔ single `employerId` relationship.
- There is **no concept of a third party that supplies workers** (an
  agency/labour broker) or of one account managing many workers.

So "staff-supply" (an agency that holds a roster of workers and fulfils
employer shifts on their behalf, possibly taking a margin) is a new
top-level actor that the current model cannot express.

## Why it is deferred (risk analysis)

A staff-supply actor changes invariants that the entire stability suite
relies on:

1. **Auth/role model** — needs a new role (`'agency'`) or an org layer
   above users. Touching the role union ripples into every route guard,
   every `loginAs`, every store selector, and the 28-route invariant.
2. **Escrow ownership** — who is paid: the worker, or the agency that
   then pays the worker? The escrow → wallet → ledger chain currently
   assumes the worker is the payee. A margin/split breaks the
   single-payee assumption that `walletStore` + `phase10cAutoRelease`
   depend on.
3. **Reputation & disputes** — disputes are two-party (worker ↔
   employer). An agency-supplied worker makes it three-party (employer
   ↔ agency ↔ worker), which the dispute state machine and admin
   resolution flow do not model.
4. **Verification** — agencies would need their own KYC/verification
   shape distinct from `WorkerVerificationDocument` /
   `EmployerVerificationDocument`.

Each of these is exactly the kind of business-logic change the
stability task forbids touching without a fix-confirmed bug.

## Proposed scope (if greenlit as its own phase)

1. **Data model**
   - New `Agency extends BaseUser { role: 'agency'; roster: string[] }`
     or an `Organization` entity with `members: { userId, orgRole }[]`.
   - `Application` gains optional `suppliedByAgencyId?: string`.
   - Escrow gains an optional split descriptor
     `{ workerShare, agencyShare }` (default 100% worker for
     back-compat).
2. **Fulfilment flow** — agency views open employer shifts, assigns a
   roster worker, worker confirms; from then the existing lifecycle
   (check-in → check-out → confirm → release) runs, but release splits
   the payout.
3. **Reputation** — agency carries its own aggregate reputation; the
   assigned worker still earns individual reputation.
4. **Disputes** — extend the dispute party model to allow the agency as
   a third participant (or keep two-party but route agency-supplied
   disputes to the agency as the worker's representative).
5. **Verification** — `AgencyVerificationDocument` shape + admin
   verification queue entry.

## Tasks (dedicated spec)

1. Requirements doc — actors, fulfilment, payout split, dispute parties.
2. Design doc — role/org model migration + back-compat (every existing
   record defaults to "no agency").
3. `domain/escrowSplit.ts` pure splitter + property tests
   (sum-of-shares invariant, no rounding leak).
4. Auth/route-guard updates for the new role.
5. Agency dashboard route (would breach the 28-route invariant — needs
   explicit sign-off).
6. E2E: agency assigns worker → shift completes → split payout lands in
   both wallets with correct ledger lines.

## Risks

- **Role-union change** = broad blast radius across guards/stores/tests.
- **Escrow split** = money-handling correctness; must be property-tested
  to guarantee `workerShare + agencyShare === gross` with no rounding
  leak.
- **Three-party disputes** = a materially more complex state machine.
- **Route invariant** = a new agency dashboard breaks the fixed 28-route
  count.

## Recommendation

**Defer to a dedicated spec/phase.** Staff-supply is a new top-level
actor with money-split and multi-party-dispute implications. It is not a
small, safe change and directly conflicts with the stability task's "do
not change business logic / role model" guardrail. Captured here so the
idea is not lost; implementation gated on its own requirements + design
+ property-test cycle.
