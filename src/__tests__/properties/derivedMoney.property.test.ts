/**
 * Cluster 3 · Task 12.3 — FIX VERIFICATION for the derived-money reconciliation.
 *
 * Property 5 — "Money figures derived from one source".
 *
 * Validates: Requirements 1.5, 2.5
 *
 * ===========================================================================
 * WHAT THIS TEST ENCODES (the correct, post-fix behavior)
 * ===========================================================================
 * A demo economy has ONE ledger of money movement. Under the single derived
 * money source (`src/domain/finance.ts`, added by the fix), every money figure
 * a surface shows — wallet balance, total income, total paid, deposit /
 * guarantee amount — is a projection of that one ledger, so the figures
 * RECONCILE. This is the SAME reconciliation property the task-10 exploration
 * test pinned; for fix verification the "displayed figure" (LEFT-HAND) side now
 * reads from the real single source the surfaces use — `deriveEmployerPaidOut`
 * / `deriveWorkerIncome` from `@/domain/finance` — instead of the old inline
 * dashboard mirrors (Σ shift.depositAmount / Σ application.payoutAmount). The
 * RIGHT-HAND reconciliation target is unchanged: the REAL wallet
 * (`walletReleasedTotal` over the ledger / `walletStore.getBalance`). The two
 * identities it pins:
 *
 *   (A) CROSS-ROLE CONSERVATION.  Every đồng an employer "pays out" for a
 *       completed shift is a wage RELEASED to a worker and recorded once in
 *       the wallet ledger. So the employer's "Tổng đã chi trả"
 *       (`deriveEmployerPaidOut`) must equal the wallet's released wages
 *       (Σ `WorkerWageReleased` / `WorkerPartialRelease` credits).
 *
 *   (B) INCOME ↔ WALLET.  A worker's "Tổng thu nhập" (`deriveWorkerIncome`)
 *       must equal what their wallet ledger actually reflects
 *       (`walletStore.getBalance`) for a clean demo account.
 *
 * ===========================================================================
 * THE THREE INDEPENDENT SOURCES THE FIX UNIFIED (design's BUG 5)
 * ===========================================================================
 *   1. Worker dashboard  — summed `application.payoutAmount` (ONE position).
 *   2. Employer dashboard — summed `shift.depositAmount` (ALL positions).
 *   3. Wallet tile        — read the append-only ledger's running balance.
 *
 * These came from three different places and were never reconciled. The fix
 * routes surfaces (1) and (2) through `@/domain/finance.ts`, whose figures are
 * projections of the one ledger (source 3), removing the seam.
 *
 * ===========================================================================
 * WHY THE SAME SCENARIOS THAT DIVERGED NOW RECONCILE
 * ===========================================================================
 * A completed shift that filled only f of its p positions had
 *     depositAmount = wage × hours × p        (old employer "paid out")
 * but only
 *     f × (wage × hours)                       (wages actually released)
 * reached workers and the ledger. When f < p the deposit basis OVERSTATED the
 * released wages, so identity (A) broke; likewise a partially-released wage (a
 * resolved dispute) left the stale `payoutAmount` snapshot ABOVE what the
 * wallet held, so identity (B) broke. Now that `deriveEmployerPaidOut` reads
 * the wages the ledger RELEASED and `deriveWorkerIncome` reads the wages the
 * ledger CREDITED, both left-hand figures come from the one ledger → the very
 * scenarios that diverged on the unfixed code now reconcile → this test PASSES.
 *
 * ===========================================================================
 * IMPORTANT
 * ===========================================================================
 * - The seeded scenarios and the asserted equalities are IDENTICAL to the
 *   task-10 exploration test (income ↔ wallet balance; employer paid ↔
 *   released wages). Only the SOURCE of the left-hand (displayed) figure moved
 *   from the old dashboard mirrors to `@/domain/finance.ts`; the assertion
 *   semantics are unchanged.
 * - The wallet is seeded with the product's own logic
 *   (`walletStore.backfillFromHistory`) from the SAME confirmed applications,
 *   and the balance / released wages are read from the REAL `walletStore`.
 */

import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { useWalletStore } from '@/stores/walletStore';
import { calculateDeposit, hoursBetween } from '@/domain/deposit';
import {
  deriveEmployerPaidOut,
  deriveUserFinance,
  deriveWorkerIncome,
} from '@/domain/finance';
import {
  arbEconomy,
  EMP_ID,
  mkApp,
  mkShift,
  WRK_ID,
  type Economy,
} from '../generators/money';

// ---------------------------------------------------------------------------
// Wallet helpers (read from the REAL walletStore)
// ---------------------------------------------------------------------------

/** Empty the wallet store so `backfillFromHistory` (idempotent when the
 *  ledger is non-empty) actually runs. */
function resetWallet(): void {
  useWalletStore.setState({ wallets: [], ledger: [] });
}

/** Sum of wages the ledger records as RELEASED to workers (the money that
 *  actually moved). Read straight from `walletStore`. */
function walletReleasedTotal(): number {
  return useWalletStore
    .getState()
    .ledger.filter(
      (l) => l.kind === 'WorkerWageReleased' || l.kind === 'WorkerPartialRelease',
    )
    .reduce((acc, l) => acc + l.amount, 0);
}

/** Seed the ledger from confirmed history using the product's own backfill. */
function seedWalletFromHistory(eco: Economy): void {
  useWalletStore.getState().backfillFromHistory({
    applications: eco.applications.map((a) => ({
      id: a.id,
      shiftId: a.shiftId,
      workerId: a.workerId,
      status: a.status,
      payoutAmount: a.payoutAmount,
    })),
    shifts: eco.shifts.map((s) => ({
      id: s.id,
      employerId: s.employerId,
      title: s.title,
      // `backfillFromHistory` reads both per shift (skips Draft, credits the
      // employer's `depositAmount`); omitting them left `depositAmount`
      // undefined → NaN employer ledger amounts.
      status: s.status,
      depositAmount: s.depositAmount,
    })),
  });
}

afterEach(resetWallet);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 5 (Bug Condition): money figures derived from one source', () => {
  it('deterministic (A): employer "đã chi trả" overstates the wages the wallet actually released (under-filled completed shift)', () => {
    resetWallet();

    const wage = 50_000;
    const hours = hoursBetween('08:00', '12:00'); // 4

    // A completed 2-position shift where only 1 position was filled.
    const shift = mkShift('sh-under', {
      hourlyWage: wage,
      startTime: '08:00',
      endTime: '12:00',
      positionsTotal: 2,
      positionsFilled: 1,
      status: 'Completed',
      depositAmount: calculateDeposit(wage, hours, 2), // 400_000 (both positions)
    });
    const app = mkApp('app-under', {
      shiftId: 'sh-under',
      workerId: WRK_ID,
      status: 'Confirmed',
      payoutAmount: calculateDeposit(wage, hours, 1), // 200_000 (one position)
    });

    // Seed the wallet exactly as the app does — from confirmed history.
    seedWalletFromHistory({ shifts: [shift], applications: [app] });

    // LEFT-HAND / surface figures now come from the single derived source
    // (`@/domain/finance.ts`) — the same source the money surfaces read.
    const ledger = useWalletStore.getState().ledger;
    const paidOut = deriveEmployerPaidOut(ledger, EMP_ID, {
      shifts: [shift],
      applications: [app],
    }); // 200_000 (released wages for EMP_ID's shift)
    const income = deriveWorkerIncome(ledger, WRK_ID); // 200_000
    // RIGHT-HAND reconciliation targets — the REAL wallet, unchanged.
    const released = walletReleasedTotal(); // 200_000 (only the filled position)
    const workerBalance = useWalletStore.getState().getBalance(WRK_ID); // 200_000

    // Anchor: the worker dashboard income and the wallet AGREE (both derive
    // from the per-position payout). This isolates the employer figure as the
    // non-reconciling outlier.
    expect(released).toBe(income);
    expect(workerBalance).toBe(income);

    // RECONCILIATION (Property 5): the employer's "Tổng đã chi trả" is money
    // paid to workers, so it must equal the wages the ledger released. Both
    // sides now derive from the one ledger (`deriveEmployerPaidOut` reads the
    // released wages for EMP_ID's shift), so the deposit-basis overstatement
    // that broke this on the unfixed code (400_000) is gone → 200_000 === 200_000.
    expect(paidOut).toBe(released);
  });

  it('deterministic (B): a worker\'s "Tổng thu nhập" (Σ payoutAmount) overstates what the wallet ledger reflects (partial release)', () => {
    resetWallet();

    // Two confirmed apps; the worker dashboard sums their snapshot payoutAmount.
    const apps = [
      mkApp('app-a', {
        shiftId: 'sh-a',
        workerId: WRK_ID,
        status: 'Confirmed',
        payoutAmount: 300_000,
      }),
      mkApp('app-b', {
        shiftId: 'sh-b',
        workerId: WRK_ID,
        status: 'Confirmed',
        payoutAmount: 150_000,
      }),
    ];

    // The wallet ledger is the single source of truth for money that moved.
    // App A was only PARTIALLY released (a resolved dispute) → 200_000, not the
    // 300_000 snapshotted on the application. App B released in full.
    const wallet = useWalletStore.getState();
    wallet.credit(WRK_ID, 200_000, 'WorkerPartialRelease', { applicationId: 'app-a' });
    wallet.credit(WRK_ID, 150_000, 'WorkerWageReleased', { applicationId: 'app-b' });

    // LEFT-HAND / surface income now comes from the single derived source.
    // The seeded `apps` snapshots (Σ payoutAmount = 450_000) are still the
    // scenario and are passed through as the `applications` input, but income
    // is derived from the one ledger — not from those stale snapshots.
    const ledger = useWalletStore.getState().ledger;
    const income = deriveUserFinance(WRK_ID, {
      ledger,
      applications: apps,
      shifts: [],
    }).totalIncome; // 350_000 (ledger wage releases, not the 450_000 snapshots)
    // RIGHT-HAND reconciliation targets — the REAL wallet, unchanged.
    const balance = useWalletStore.getState().getBalance(WRK_ID); // 350_000 (ledger truth)
    const released = walletReleasedTotal(); // 350_000

    // Sanity: the wallet is internally consistent (balance == released wages).
    expect(balance).toBe(released);

    // RECONCILIATION (Property 5): the income a surface shows must equal what
    // the wallet ledger reflects for that account. Now that income derives
    // from the one ledger (via `deriveUserFinance(...).totalIncome`), the stale
    // payoutAmount snapshot (450_000) no longer drives it → 350_000 === 350_000.
    expect(income).toBe(balance);
  });

  it('property: for any seeded demo economy, employer "đã chi trả" equals the wallet\'s released wages', () => {
    fc.assert(
      fc.property(arbEconomy, (eco) => {
        resetWallet();
        seedWalletFromHistory(eco);

        // Employer surface now derives from the one ledger (release basis) via
        // `@/domain/finance.ts`, vs the wallet's released wages.
        const ledger = useWalletStore.getState().ledger;
        const paidOut = deriveEmployerPaidOut(ledger, EMP_ID, {
          shifts: eco.shifts,
          applications: eco.applications,
        });
        const released = walletReleasedTotal();

        resetWallet();

        // Holds now that both derive from the one ledger source: on the unfixed
        // code the deposit-based paid-out overstated any under-filled completed
        // shift; `deriveEmployerPaidOut` counts only wages the ledger released.
        return paidOut === released;
      }),
      { numRuns: 60 },
    );
  });
});
