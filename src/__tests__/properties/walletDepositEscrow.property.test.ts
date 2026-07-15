/**
 * Cluster 3 · Task 11 — PRESERVATION baseline test.
 *
 * Property 14 (Preservation) — "Wallet mutations + deposit/escrow".
 *
 * **Validates: Requirements 3.6, 3.7**
 *
 * ===========================================================================
 * WHAT THIS TEST ENCODES (observation-first baseline)
 * ===========================================================================
 * The Cluster 3 fix adds a READ-ONLY derived money layer
 * (`src/domain/finance.ts`) over the wallet store and the deposit / escrow
 * domain functions. That layer must not change ANY of them. This test records
 * the CURRENT behavior of the three modules the derived layer only reads, so
 * the fix can be proven not to regress them. It is written observation-first:
 * every invariant below was confirmed against the real modules and PASSES on
 * the UNFIXED code (that PASS is the success signal for a preservation test).
 *
 * It reuses the REAL functions + the REAL `walletStore` (never a duplicated
 * copy of their logic) and does NOT import the not-yet-existing
 * `src/domain/finance.ts`, so it can never fail as a compile error.
 *
 * ---------------------------------------------------------------------------
 * PART A — WALLET (`src/stores/walletStore.ts`) · Req 3.6
 * ---------------------------------------------------------------------------
 * Confirmed action set + guards on the store:
 *   - `credit(userId, amount, kind, ctx?)`  → appends `+Math.abs(amount)`.
 *   - `debit(userId, amount, kind, ctx?)`   → appends `-Math.abs(amount)`.
 *       (UNGUARDED primitive — the app only ever debits what the balance can
 *        cover, so the sequence generator bounds debits to the running balance
 *        to model real usage and keep the never-negative invariant meaningful.)
 *   - `topUp(userId, amount)`               → appends `+Math.abs(amount)`
 *        (`'UserTopUp'`).
 *   - `withdraw(userId, amount, note?)`     → returns
 *        `Result<WalletLedgerEntry, 'INVALID_AMOUNT' | 'INSUFFICIENT_BALANCE'>`.
 *        GUARDS (observed): rejects a non-finite / `<= 0` amount
 *        (`INVALID_AMOUNT`) and an amount above the balance
 *        (`INSUFFICIENT_BALANCE`); on rejection the balance + ledger are
 *        untouched. A valid amount appends `-amount` (`'UserWithdrawal'`).
 *   - `backfillFromHistory(input)`          → idempotent: a NO-OP once any
 *        ledger entry exists. Credits each `Confirmed` application's worker
 *        payout (`'WorkerWageReleased'`, `> 0`); intentionally does NOT debit
 *        the employer, so backfilled balances are never negative.
 *
 * Invariants asserted over random mutation sequences:
 *   - balance is NEVER negative;
 *   - the ledger is APPEND-ONLY (length never shrinks; prior entries keep
 *     their identity — same object reference — after each mutation);
 *   - the running balance EQUALS the sum of that user's ledger entries;
 *   - `withdraw`'s two guards hold (invalid + insufficient), with no mutation
 *     on rejection;
 *   - `backfillFromHistory` is idempotent (a second run leaves state identical
 *     to the first).
 *
 * ---------------------------------------------------------------------------
 * PART B — DEPOSIT (`src/domain/deposit.ts`) · Req 3.7
 * ---------------------------------------------------------------------------
 * `calculateDeposit(wage, hours, positions) === wage * hours * positions` for
 * all inputs — no rounding, no clamping, no guards (negative inputs pass
 * straight through). `hoursBetween` returns exact decimal hours for a valid
 * same-day range and `0` for equal / overnight / malformed / out-of-range
 * inputs (the real source of the `hours` factor in the deposit formula).
 *
 * ---------------------------------------------------------------------------
 * PART C — ESCROW (`src/domain/escrow.ts`) · Req 3.7
 * ---------------------------------------------------------------------------
 * `transitionEscrow(current, event)` matches the documented transition table
 * for every `(EscrowStatus, EscrowEvent)` pair (asserted exhaustively against
 * an independent oracle encoding the design's table): legal transitions land
 * on the right status, `NoShow` refunds any non-terminal status, terminal
 * statuses (`Released`, `Refunded`) never transition, and every illegal
 * `(state, event)` pair returns the current status unchanged.
 */

import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { useWalletStore } from '@/stores/walletStore';
import { calculateDeposit, hoursBetween } from '@/domain/deposit';
import {
  transitionEscrow,
  isTerminalEscrow,
  type EscrowEvent,
} from '@/domain/escrow';
import type { EscrowStatus } from '@/types';
import { arbEconomy, type Economy } from '../generators/money';

// ===========================================================================
// PART A — WALLET (Property 14 / Req 3.6)
// ===========================================================================

const U = 'wallet-user';

/** Deep clone of plain JSON data (wallets / ledger) for snapshot comparison. */
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Empty the wallet store so each property run starts from a clean slate. */
function resetWallet(): void {
  useWalletStore.setState({ wallets: [], ledger: [] });
}

/** The user's ledger entries (via the store's own selector). */
function ledgerFor(userId: string) {
  return useWalletStore.getState().forUser(userId);
}

/** Sum of a user's ledger amounts — the ledger-derived running balance. */
function ledgerSum(userId: string): number {
  return ledgerFor(userId).reduce((acc, l) => acc + l.amount, 0);
}

afterEach(resetWallet);

// --- mutation-sequence generator ------------------------------------------

type WalletCmd =
  | { op: 'credit'; amount: number }
  | { op: 'debit'; amount: number }
  | { op: 'topUp'; amount: number }
  | { op: 'withdraw'; amount: number };

const arbAmount = fc.integer({ min: 1, max: 2_000_000 });
// Withdraw amounts range wider than any single credit so overdraws (and thus
// the INSUFFICIENT_BALANCE guard) are sampled frequently.
const arbWithdrawAmount = fc.integer({ min: 1, max: 3_000_000 });

const arbWalletCmd: fc.Arbitrary<WalletCmd> = fc.oneof(
  fc.record({ op: fc.constant('credit' as const), amount: arbAmount }),
  fc.record({ op: fc.constant('debit' as const), amount: arbAmount }),
  fc.record({ op: fc.constant('topUp' as const), amount: arbAmount }),
  fc.record({ op: fc.constant('withdraw' as const), amount: arbWithdrawAmount }),
);

describe('Property 14 (Preservation) · Part A: wallet mutations (Req 3.6)', () => {
  it('property: random credit/debit/topUp/withdraw sequences preserve every invariant', () => {
    fc.assert(
      fc.property(fc.array(arbWalletCmd, { maxLength: 60 }), (cmds) => {
        resetWallet();
        const store = useWalletStore.getState();

        let model = 0; // expected balance
        let expectedEntries = 0; // expected ledger entry count for U

        for (const cmd of cmds) {
          const before = useWalletStore.getState().ledger;
          const beforeLen = before.length;

          if (cmd.op === 'credit') {
            store.credit(U, cmd.amount, 'WorkerWageReleased');
            model += Math.abs(cmd.amount);
            expectedEntries += 1;
          } else if (cmd.op === 'topUp') {
            store.topUp(U, cmd.amount);
            model += Math.abs(cmd.amount);
            expectedEntries += 1;
          } else if (cmd.op === 'debit') {
            // `debit` is unguarded; bound it to the available balance to model
            // how the app actually uses it (never overdrawing via debit).
            const applied = Math.min(cmd.amount, model);
            if (applied > 0) {
              store.debit(U, applied, 'EmployerDepositHeld');
              model -= applied;
              expectedEntries += 1;
            }
          } else {
            const r = store.withdraw(U, cmd.amount);
            if (cmd.amount > model) {
              // Over the balance → rejected, nothing changes.
              expect(r.ok).toBe(false);
              if (!r.ok) expect(r.error).toBe('INSUFFICIENT_BALANCE');
            } else {
              expect(r.ok).toBe(true);
              model -= cmd.amount;
              expectedEntries += 1;
            }
          }

          const after = useWalletStore.getState().ledger;

          // APPEND-ONLY: length never shrinks and every prior entry keeps its
          // exact identity (same object reference, never mutated in place).
          expect(after.length).toBeGreaterThanOrEqual(beforeLen);
          for (let i = 0; i < beforeLen; i += 1) {
            expect(after[i]).toBe(before[i]);
          }

          // NEVER NEGATIVE + balance tracks the model exactly.
          const balance = useWalletStore.getState().getBalance(U);
          expect(balance).toBeGreaterThanOrEqual(0);
          expect(balance).toBe(model);

          // Running balance EQUALS the sum of the user's ledger entries.
          expect(ledgerSum(U)).toBe(balance);
          expect(ledgerFor(U).length).toBe(expectedEntries);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('property: withdraw rejects invalid amounts (INVALID_AMOUNT), leaving balance + ledger intact', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.oneof(
          fc.constant(0),
          fc.integer({ min: -1_000_000, max: -1 }),
          fc.constant(Number.NaN),
          fc.constant(Number.POSITIVE_INFINITY),
          fc.constant(Number.NEGATIVE_INFINITY),
        ),
        (seed, badAmount) => {
          resetWallet();
          if (seed > 0) useWalletStore.getState().topUp(U, seed);

          const balBefore = useWalletStore.getState().getBalance(U);
          const lenBefore = useWalletStore.getState().ledger.length;

          const r = useWalletStore.getState().withdraw(U, badAmount);
          expect(r.ok).toBe(false);
          if (!r.ok) expect(r.error).toBe('INVALID_AMOUNT');

          expect(useWalletStore.getState().getBalance(U)).toBe(balBefore);
          expect(useWalletStore.getState().ledger.length).toBe(lenBefore);
        },
      ),
      { numRuns: 120 },
    );
  });

  it('property: withdraw rejects amounts above the balance (INSUFFICIENT_BALANCE), never going negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (seed, over) => {
          resetWallet();
          if (seed > 0) useWalletStore.getState().topUp(U, seed);

          const amount = seed + over; // strictly greater than the balance
          const balBefore = useWalletStore.getState().getBalance(U);
          const lenBefore = useWalletStore.getState().ledger.length;

          const r = useWalletStore.getState().withdraw(U, amount);
          expect(r.ok).toBe(false);
          if (!r.ok) expect(r.error).toBe('INSUFFICIENT_BALANCE');

          expect(useWalletStore.getState().getBalance(U)).toBe(balBefore);
          expect(useWalletStore.getState().getBalance(U)).toBeGreaterThanOrEqual(0);
          expect(useWalletStore.getState().ledger.length).toBe(lenBefore);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('property: withdrawing the exact balance drains to zero (never negative)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (seed) => {
        resetWallet();
        useWalletStore.getState().topUp(U, seed);

        const r = useWalletStore.getState().withdraw(U, seed);
        expect(r.ok).toBe(true);
        expect(useWalletStore.getState().getBalance(U)).toBe(0);
        expect(ledgerSum(U)).toBe(0);
      }),
      { numRuns: 60 },
    );
  });
});

// --- backfillFromHistory ----------------------------------------------------

/** Map a generated economy to the backfill input shape the store expects. */
function backfillInput(eco: Economy) {
  return {
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
    })),
  };
}

describe('Property 14 (Preservation) · Part A: backfillFromHistory (Req 3.6)', () => {
  it('property: backfill credits only confirmed worker payouts — never negative, ledger sum == balance', () => {
    fc.assert(
      fc.property(arbEconomy, (eco) => {
        resetWallet();
        useWalletStore.getState().backfillFromHistory(backfillInput(eco));

        const { wallets, ledger } = useWalletStore.getState();

        // No negative balances.
        for (const w of wallets) {
          expect(w.balance).toBeGreaterThanOrEqual(0);
        }

        // Every backfilled entry is a positive worker-wage credit (no employer
        // debit — the store deliberately skips it so wallets never go negative).
        for (const l of ledger) {
          expect(l.kind).toBe('WorkerWageReleased');
          expect(l.amount).toBeGreaterThan(0);
        }

        // Per user: balance == sum of that user's ledger entries.
        for (const w of wallets) {
          const sum = ledger
            .filter((l) => l.userId === w.userId)
            .reduce((acc, l) => acc + l.amount, 0);
          expect(w.balance).toBe(sum);
        }

        // Expected balances = per-worker sum of confirmed payouts (> 0).
        const expected = new Map<string, number>();
        for (const a of eco.applications) {
          if (a.status !== 'Confirmed') continue;
          const payout = a.payoutAmount ?? 0;
          if (payout <= 0) continue;
          expected.set(a.workerId, (expected.get(a.workerId) ?? 0) + payout);
        }
        for (const [userId, amt] of expected) {
          expect(useWalletStore.getState().getBalance(userId)).toBe(amt);
        }
        // Only credited workers get a wallet — no phantom (e.g. employer) rows.
        expect(new Set(wallets.map((w) => w.userId))).toEqual(
          new Set(expected.keys()),
        );
      }),
      { numRuns: 60 },
    );
  });

  it('property: backfillFromHistory is idempotent (a second run leaves state identical)', () => {
    fc.assert(
      fc.property(arbEconomy, (eco) => {
        resetWallet();
        const input = backfillInput(eco);

        useWalletStore.getState().backfillFromHistory(input);
        const afterFirstWallets = clone(useWalletStore.getState().wallets);
        const afterFirstLedger = clone(useWalletStore.getState().ledger);

        // Every generated economy has at least one confirmed positive payout,
        // so the first backfill populated the ledger (the precondition that
        // makes the second call a genuine no-op rather than a fresh run).
        expect(afterFirstLedger.length).toBeGreaterThan(0);

        // Second run — must change nothing.
        useWalletStore.getState().backfillFromHistory(input);
        expect(useWalletStore.getState().wallets).toEqual(afterFirstWallets);
        expect(useWalletStore.getState().ledger).toEqual(afterFirstLedger);
      }),
      { numRuns: 60 },
    );
  });
});

// ===========================================================================
// PART B — DEPOSIT (Property 14 / Req 3.7)
// ===========================================================================

describe('Property 14 (Preservation) · Part B: calculateDeposit (Req 3.7)', () => {
  it('property: calculateDeposit(wage, hours, positions) === wage * hours * positions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 24 }),
        fc.integer({ min: 0, max: 50 }),
        (wage, hours, positions) => {
          expect(calculateDeposit(wage, hours, positions)).toBe(
            wage * hours * positions,
          );
        },
      ),
      { numRuns: 300 },
    );
  });

  it('property: fractional hours (from hoursBetween) still yield the exact product', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000, max: 500_000 }),
        fc.integer({ min: 1, max: 20 }),
        (wage, positions) => {
          const hours = hoursBetween('08:00', '12:30'); // 4.5
          expect(hours).toBe(4.5);
          expect(calculateDeposit(wage, hours, positions)).toBe(
            wage * hours * positions,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('edge cases: a zero factor yields 0; negative inputs are NOT clamped (no guards)', () => {
    expect(calculateDeposit(50_000, 0, 3)).toBe(0);
    expect(calculateDeposit(50_000, 4, 0)).toBe(0);
    expect(calculateDeposit(0, 4, 3)).toBe(0);
    // Documents the absence of guards on calculateDeposit itself.
    expect(calculateDeposit(-50_000, 4, 3)).toBe(-600_000);
    expect(calculateDeposit(50_000, -4, 3)).toBe(-600_000);
  });
});

describe('Property 14 (Preservation) · Part B: hoursBetween guards (Req 3.7)', () => {
  it('valid same-day ranges return exact decimal hours', () => {
    expect(hoursBetween('09:00', '12:30')).toBe(3.5);
    expect(hoursBetween('08:00', '12:00')).toBe(4);
    expect(hoursBetween('00:00', '23:59')).toBeCloseTo(23.983333, 5);
  });

  it('equal / overnight / malformed / out-of-range inputs return 0', () => {
    expect(hoursBetween('10:00', '10:00')).toBe(0); // equal
    expect(hoursBetween('22:00', '02:00')).toBe(0); // overnight (unsupported)
    expect(hoursBetween('bad', '12:00')).toBe(0); // malformed
    expect(hoursBetween('08:00', 'nope')).toBe(0); // malformed
    expect(hoursBetween('24:00', '25:00')).toBe(0); // out of range
  });

  it('property: end strictly after start (same day) → (end-start)/60; otherwise 0', () => {
    const toHHmm = (m: number): string =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_439 }),
        fc.integer({ min: 0, max: 1_439 }),
        (a, b) => {
          const startMin = Math.min(a, b);
          const endMin = Math.max(a, b);
          const h = hoursBetween(toHHmm(startMin), toHHmm(endMin));
          if (endMin > startMin) {
            expect(h).toBe((endMin - startMin) / 60);
          } else {
            expect(h).toBe(0); // equal times
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ===========================================================================
// PART C — ESCROW (Property 14 / Req 3.7)
// ===========================================================================

const ALL_STATUSES: EscrowStatus[] = [
  'PendingDeposit',
  'Deposited',
  'InProgress',
  'Completed',
  'Released',
  'Disputed',
  'Refunded',
];

const ALL_EVENTS: EscrowEvent[] = [
  'Deposit',
  'WorkerCheckIn',
  'WorkerCheckOut',
  'EmployerConfirm',
  'EmployerReportIssue',
  'NoShow',
  'CancelShift',
  'AdminRelease',
  'AdminRefund',
];

/**
 * Independent oracle for the escrow transition table (from the design's
 * Property 3 / the module doc). Derived from the SPEC, not copied from the
 * implementation, so matching it proves the implementation follows the table.
 */
function expectedTransition(s: EscrowStatus, e: EscrowEvent): EscrowStatus {
  // Terminal states never transition.
  if (s === 'Released' || s === 'Refunded') return s;
  // NoShow is a catch-all for any non-terminal state.
  if (e === 'NoShow') return 'Refunded';
  switch (s) {
    case 'PendingDeposit':
      return e === 'Deposit' ? 'Deposited' : s;
    case 'Deposited':
      if (e === 'WorkerCheckIn') return 'InProgress';
      if (e === 'CancelShift') return 'Refunded';
      return s;
    case 'InProgress':
      return e === 'WorkerCheckOut' ? 'Completed' : s;
    case 'Completed':
      if (e === 'EmployerConfirm') return 'Released';
      if (e === 'EmployerReportIssue') return 'Disputed';
      return s;
    case 'Disputed':
      if (e === 'AdminRelease') return 'Released';
      if (e === 'AdminRefund') return 'Refunded';
      return s;
    default:
      return s;
  }
}

describe('Property 14 (Preservation) · Part C: transitionEscrow (Req 3.7)', () => {
  it('exhaustive: matches the documented transition table for every (status, event) pair', () => {
    for (const s of ALL_STATUSES) {
      for (const e of ALL_EVENTS) {
        expect(transitionEscrow(s, e)).toBe(expectedTransition(s, e));
      }
    }
  });

  it('property: matches the oracle over random (status, event) pairs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_STATUSES),
        fc.constantFrom(...ALL_EVENTS),
        (s, e) => {
          expect(transitionEscrow(s, e)).toBe(expectedTransition(s, e));
        },
      ),
      { numRuns: 200 },
    );
  });

  it('each documented legal transition holds', () => {
    expect(transitionEscrow('PendingDeposit', 'Deposit')).toBe('Deposited');
    expect(transitionEscrow('Deposited', 'WorkerCheckIn')).toBe('InProgress');
    expect(transitionEscrow('Deposited', 'CancelShift')).toBe('Refunded');
    expect(transitionEscrow('Deposited', 'NoShow')).toBe('Refunded');
    expect(transitionEscrow('InProgress', 'WorkerCheckOut')).toBe('Completed');
    expect(transitionEscrow('InProgress', 'NoShow')).toBe('Refunded');
    expect(transitionEscrow('Completed', 'EmployerConfirm')).toBe('Released');
    expect(transitionEscrow('Completed', 'EmployerReportIssue')).toBe('Disputed');
    expect(transitionEscrow('Disputed', 'AdminRelease')).toBe('Released');
    expect(transitionEscrow('Disputed', 'AdminRefund')).toBe('Refunded');
  });

  it('terminal states never transition under any event', () => {
    for (const s of ['Released', 'Refunded'] as EscrowStatus[]) {
      expect(isTerminalEscrow(s)).toBe(true);
      for (const e of ALL_EVENTS) {
        expect(transitionEscrow(s, e)).toBe(s);
      }
    }
  });

  it('NoShow refunds any non-terminal status; illegal (state,event) pairs are no-ops', () => {
    for (const s of ALL_STATUSES) {
      if (isTerminalEscrow(s)) {
        expect(transitionEscrow(s, 'NoShow')).toBe(s);
      } else {
        expect(transitionEscrow(s, 'NoShow')).toBe('Refunded');
      }
    }
    // A sample of illegal (state, event) pairs return the current state.
    expect(transitionEscrow('PendingDeposit', 'WorkerCheckOut')).toBe('PendingDeposit');
    expect(transitionEscrow('PendingDeposit', 'EmployerConfirm')).toBe('PendingDeposit');
    expect(transitionEscrow('InProgress', 'Deposit')).toBe('InProgress');
    expect(transitionEscrow('Completed', 'WorkerCheckIn')).toBe('Completed');
    expect(transitionEscrow('Disputed', 'Deposit')).toBe('Disputed');
  });
});
