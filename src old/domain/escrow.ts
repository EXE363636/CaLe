/**
 * Escrow state machine for the simulated payment lifecycle of a shift.
 *
 * The MVP has no real payment processing; this module is a pure
 * deterministic transition function that drives the `EscrowStatus` of
 * every `Shift` (and, by extension, the `escrowStatus` field shown on
 * the listing and dashboards).
 *
 * Legal transitions (Property 3 from the design):
 *   PendingDeposit -Deposit→         Deposited
 *   Deposited      -WorkerCheckIn→   InProgress
 *   Deposited      -CancelShift→     Refunded
 *   Deposited      -NoShow→          Refunded
 *   InProgress     -WorkerCheckOut→  Completed
 *   InProgress     -NoShow→          Refunded
 *   Completed      -EmployerConfirm→ Released
 *   Completed      -EmployerReportIssue→ Disputed
 *   Disputed       -AdminRelease→    Released
 *   Disputed       -AdminRefund→     Refunded
 *
 * `NoShow` additionally acts as a catch-all for any *non-terminal*
 * state: applying `NoShow` to a non-terminal status always lands on
 * `Refunded`. Terminal statuses (`Released`, `Refunded`) never
 * transition under any event.
 *
 * For any illegal `(state, event)` pair the function returns the
 * current state unchanged. Callers can therefore use a single call
 * site without pre-validating the event.
 */

import type { EscrowStatus } from '@/types';

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type EscrowEvent =
  | 'Deposit'
  | 'WorkerCheckIn'
  | 'WorkerCheckOut'
  | 'EmployerConfirm'
  | 'EmployerReportIssue'
  | 'NoShow'
  | 'CancelShift'
  | 'AdminRelease'
  | 'AdminRefund';

// ---------------------------------------------------------------------------
// Terminal predicate
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the status is terminal — i.e. no further
 * transitions are permitted out of it under any event.
 */
export function isTerminalEscrow(s: EscrowStatus): boolean {
  return s === 'Released' || s === 'Refunded';
}

// ---------------------------------------------------------------------------
// Transition function
// ---------------------------------------------------------------------------

/**
 * Computes the next escrow status from `current` after applying
 * `event`. Returns `current` unchanged for illegal `(state, event)`
 * pairs, including any event applied to a terminal state.
 */
export function transitionEscrow(
  current: EscrowStatus,
  event: EscrowEvent
): EscrowStatus {
  // Terminal states never transition.
  if (isTerminalEscrow(current)) {
    return current;
  }

  // `NoShow` is a catch-all for any non-terminal state.
  if (event === 'NoShow') {
    return 'Refunded';
  }

  switch (current) {
    case 'PendingDeposit':
      if (event === 'Deposit') return 'Deposited';
      return current;

    case 'Deposited':
      if (event === 'WorkerCheckIn') return 'InProgress';
      if (event === 'CancelShift') return 'Refunded';
      return current;

    case 'InProgress':
      if (event === 'WorkerCheckOut') return 'Completed';
      return current;

    case 'Completed':
      if (event === 'EmployerConfirm') return 'Released';
      if (event === 'EmployerReportIssue') return 'Disputed';
      return current;

    case 'Disputed':
      if (event === 'AdminRelease') return 'Released';
      if (event === 'AdminRefund') return 'Refunded';
      return current;

    default:
      // Exhaustiveness guard — every non-terminal status is handled above.
      return current;
  }
}
