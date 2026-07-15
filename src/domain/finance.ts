/**
 * Derived money source for the CaLẻ / ShiftNow MVP (Cluster 3 · BUG 5).
 *
 * **Single source of truth for every money figure a surface shows** —
 * wallet balance, worker total income, employer total paid-out,
 * guaranteed / deposit-held amount, and recent transactions. Every figure
 * is a *projection of the one wallet ledger* (plus the shift records for
 * escrow / employer attribution), so the numbers **reconcile by
 * construction** across the worker dashboard, employer dashboard, and the
 * wallet panel (Req 2.5, Property 5).
 *
 * ---------------------------------------------------------------------------
 * WHY THIS MODULE EXISTS
 * ---------------------------------------------------------------------------
 * Before this module, three surfaces rolled their own money math from three
 * independent bases that could not agree (design's BUG 5):
 *
 *   1. Worker dashboard  — `totalEarnings = Σ application.payoutAmount`
 *                          (a per-application *snapshot*, one position each).
 *   2. Employer dashboard — `totalPaidOut = Σ shift.depositAmount`
 *                          (a per-shift *deposit* basis, ALL positions).
 *   3. Wallet tile        — `walletStore.getBalance(userId)`
 *                          (the append-only *ledger* running balance).
 *
 * A completed shift that filled only `f` of its `p` positions has
 * `depositAmount = wage × hours × p` but only `f × (wage × hours)` was ever
 * released to workers and recorded in the ledger; a partially-released wage
 * (a resolved dispute) leaves the stale `payoutAmount` snapshot above what
 * the wallet actually holds. So the deposit / snapshot bases *overstate* the
 * money that actually moved. This module makes the **ledger** the single
 * basis for the money that moved, and the **shift escrow** the single basis
 * for money currently held, so:
 *
 *   - employer `totalPaid`  == the wages the ledger actually RELEASED for
 *                              that employer's shifts (cross-role
 *                              conservation — identity A of the task-10
 *                              exploration test), and
 *   - worker  `totalIncome` == the wages the ledger actually CREDITED to the
 *                              worker, which reconciles with `walletBalance`
 *                              for a clean account (income ↔ wallet —
 *                              identity B of the task-10 test).
 *
 * ---------------------------------------------------------------------------
 * PURITY & SCOPE (Property 14 preservation)
 * ---------------------------------------------------------------------------
 * Every function here is PURE and READ-ONLY: it accepts the ledger /
 * applications / shifts as inputs and returns numbers + a fresh transaction
 * array. It NEVER mutates its inputs (arrays are copied before sorting) and
 * it NEVER touches `walletStore` mutations/guards/`backfillFromHistory`,
 * `calculateDeposit`, or `transitionEscrow`. It only *reads* the data those
 * modules produce. Accepting data as inputs (rather than reaching into a
 * store) also keeps React surfaces reactive — they pass the store slices
 * they already subscribe to, so the figures recompute when the ledger moves.
 */

import type {
  Application,
  EscrowStatus,
  Shift,
  WalletLedgerEntry,
  WalletLedgerEntryKind,
} from '@/types';

// ---------------------------------------------------------------------------
// Ledger / escrow classification constants
// ---------------------------------------------------------------------------

/**
 * Ledger kinds that represent a wage RELEASED to a worker (money that
 * actually moved from held escrow to a worker's wallet). Summing these is
 * the single basis for both the worker's `totalIncome` and the employer's
 * `totalPaid`, so the two roles reconcile against one another and against
 * the wallet balance.
 *
 * `WorkerWageReleased`  — a full wage release (normal completion / backfill).
 * `WorkerPartialRelease` — a partial release from a resolved dispute.
 */
export const WAGE_RELEASE_KINDS: readonly WalletLedgerEntryKind[] = [
  'WorkerWageReleased',
  'WorkerPartialRelease',
];

/**
 * Escrow statuses in which a shift's deposit is CURRENTLY held (the
 * "simulated hold"). `PendingDeposit` has no hold yet; `Released` and
 * `Refunded` are terminal (the money left escrow), so neither counts toward
 * the guaranteed / held figure.
 */
export const HELD_ESCROW_STATUSES: readonly EscrowStatus[] = [
  'Deposited',
  'InProgress',
  'Completed',
  'Disputed',
];

/** True when a ledger entry represents a wage released to a worker. */
export function isWageReleaseKind(kind: WalletLedgerEntryKind): boolean {
  return WAGE_RELEASE_KINDS.includes(kind);
}

/** True when a shift's escrow is currently holding its deposit. */
export function isHeldEscrowStatus(status: EscrowStatus): boolean {
  return HELD_ESCROW_STATUSES.includes(status);
}

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

/**
 * Read-only inputs for the derived money computation. All three come
 * straight from the existing stores (`walletStore.ledger`,
 * `applicationStore.applications`, `shiftStore.shifts`); nothing is mutated.
 */
export interface FinanceInputs {
  /** The append-only wallet ledger (every user's entries). */
  ledger: readonly WalletLedgerEntry[];
  /**
   * Applications — used only as a fallback join to attribute a wage-release
   * entry to its shift (and thus its employer) when the entry carries an
   * `applicationId` but no `shiftId`. Never used as a money basis.
   */
  applications: readonly Application[];
  /**
   * Shifts — used to map a released wage back to the owning employer and to
   * derive the currently-held escrow (guaranteed) figure.
   */
  shifts: readonly Shift[];
}

/**
 * The one derived money view for a single user. Each figure is a projection
 * of the ledger / shifts, so they reconcile with each other and with
 * `walletStore.getBalance`. Figures that do not apply to the user's role are
 * naturally `0` (a worker owns no shifts, so `totalPaid` / `guaranteed` are
 * `0`; an employer receives no wage-release credits, so `totalIncome` is
 * `0`).
 */
export interface UserFinance {
  userId: string;
  /**
   * Wallet balance = Σ of every ledger entry for this user. Equal to
   * `walletStore.getBalance(userId)` by the wallet's own invariant
   * (balance == sum of the user's ledger entries).
   */
  walletBalance: number;
  /**
   * Worker total income = Σ wage-release credits to this user. Reconciles
   * with `walletBalance` for a clean account (one with only wage releases).
   */
  totalIncome: number;
  /**
   * Employer total paid-out = Σ wage-release wages released for shifts this
   * user owns, taken from the ledger (NOT `Σ shift.depositAmount`). Equal to
   * the wages workers actually received for the employer's shifts.
   */
  totalPaid: number;
  /**
   * Guaranteed / deposit-held = Σ `depositAmount` for this user's shifts
   * whose escrow is currently holding funds (the "simulated hold"). `0` for
   * a worker.
   */
  guaranteed: number;
  /** This user's ledger entries, projected newest-first. */
  recentTransactions: WalletLedgerEntry[];
}

// ---------------------------------------------------------------------------
// Pure derivations — each is a projection of the ledger / shifts
// ---------------------------------------------------------------------------

/**
 * Wallet balance for `userId` = the signed sum of every ledger entry that
 * belongs to them. This equals `walletStore.getBalance(userId)` because the
 * store maintains `balance == Σ user's ledger entries` on every mutation
 * (see the wallet preservation test).
 */
export function deriveWalletBalance(
  ledger: readonly WalletLedgerEntry[],
  userId: string,
): number {
  return ledger.reduce(
    (acc, entry) => (entry.userId === userId ? acc + entry.amount : acc),
    0,
  );
}

/**
 * Worker total income for `userId` = the sum of wage-release credits recorded
 * against them in the ledger. This is the money the worker actually received,
 * so it reconciles with `deriveWalletBalance` for a clean account.
 */
export function deriveWorkerIncome(
  ledger: readonly WalletLedgerEntry[],
  userId: string,
): number {
  return ledger.reduce(
    (acc, entry) =>
      entry.userId === userId && isWageReleaseKind(entry.kind)
        ? acc + entry.amount
        : acc,
    0,
  );
}

/**
 * Employer total paid-out for `employerId` = the sum of wage-release wages in
 * the ledger whose entry maps to a shift this employer owns. This is what
 * workers actually received for the employer's shifts, so it reconciles with
 * the workers' income — unlike the old `Σ shift.depositAmount`, which counts
 * positions no wage was ever released for.
 *
 * Each wage-release entry is attributed to a shift by its `shiftId`, falling
 * back to `applicationId → application.shiftId` when the entry carries only
 * the application reference.
 */
export function deriveEmployerPaidOut(
  ledger: readonly WalletLedgerEntry[],
  employerId: string,
  refs: { shifts: readonly Shift[]; applications: readonly Application[] },
): number {
  const shiftById = new Map(refs.shifts.map((s) => [s.id, s]));
  const applicationById = new Map(refs.applications.map((a) => [a.id, a]));

  const shiftIdForEntry = (entry: WalletLedgerEntry): string | undefined => {
    if (entry.shiftId) return entry.shiftId;
    if (entry.applicationId) {
      return applicationById.get(entry.applicationId)?.shiftId;
    }
    return undefined;
  };

  return ledger.reduce((acc, entry) => {
    if (!isWageReleaseKind(entry.kind)) return acc;
    const shiftId = shiftIdForEntry(entry);
    if (!shiftId) return acc;
    const shift = shiftById.get(shiftId);
    if (!shift || shift.employerId !== employerId) return acc;
    return acc + entry.amount;
  }, 0);
}

/**
 * Guaranteed / deposit-held for `employerId` = Σ `depositAmount` for the
 * employer's non-Draft shifts whose escrow is currently holding funds. This
 * is the "simulated hold" — money held right now, not the cumulative amount
 * ever deposited.
 */
export function deriveHeldEscrow(
  shifts: readonly Shift[],
  employerId: string,
): number {
  return shifts.reduce((acc, shift) => {
    if (shift.employerId !== employerId) return acc;
    if (shift.status === 'Draft') return acc;
    if (!isHeldEscrowStatus(shift.escrowStatus)) return acc;
    return acc + shift.depositAmount;
  }, 0);
}

/**
 * Cumulative deposit basis for `employerId` = Σ `depositAmount` over the
 * employer's non-Draft shifts. This mirrors the employer dashboard's current
 * "Tổng đã đảm bảo" (total guaranteed) tile so a surface can preserve that
 * exact cumulative meaning while still sourcing the number from the one
 * derived module. Distinct from `deriveHeldEscrow`, which is the
 * currently-held subset.
 */
export function sumDepositBasis(
  shifts: readonly Shift[],
  employerId: string,
): number {
  return shifts.reduce(
    (acc, shift) =>
      shift.employerId === employerId && shift.status !== 'Draft'
        ? acc + shift.depositAmount
        : acc,
    0,
  );
}

/**
 * This user's ledger entries, projected newest-first (by `occurredAt`). The
 * input ledger is never mutated — a copy is sorted. Pass `limit` to cap the
 * number of entries returned; omit it to return them all.
 */
export function projectRecentTransactions(
  ledger: readonly WalletLedgerEntry[],
  userId: string,
  limit?: number,
): WalletLedgerEntry[] {
  const mine = ledger
    .filter((entry) => entry.userId === userId)
    .slice()
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return typeof limit === 'number' ? mine.slice(0, Math.max(0, limit)) : mine;
}

// ---------------------------------------------------------------------------
// Cohesive per-user view
// ---------------------------------------------------------------------------

/**
 * Derive every money figure for `userId` from the one ledger (plus shifts for
 * escrow / employer attribution). All figures are projections of the same
 * data, so they reconcile with each other and with `walletStore.getBalance`.
 *
 * @param userId  The user (worker or employer) to derive figures for.
 * @param inputs  Read-only ledger / applications / shifts from the stores.
 * @param options `recentLimit` caps `recentTransactions`; omit for all.
 */
export function deriveUserFinance(
  userId: string,
  inputs: FinanceInputs,
  options?: { recentLimit?: number },
): UserFinance {
  const { ledger, applications, shifts } = inputs;
  return {
    userId,
    walletBalance: deriveWalletBalance(ledger, userId),
    totalIncome: deriveWorkerIncome(ledger, userId),
    totalPaid: deriveEmployerPaidOut(ledger, userId, { shifts, applications }),
    guaranteed: deriveHeldEscrow(shifts, userId),
    recentTransactions: projectRecentTransactions(
      ledger,
      userId,
      options?.recentLimit,
    ),
  };
}
