/**
 * Preservation baseline — existing notification routing (Property 13).
 *
 * Spec: .kiro/specs/demo-logic-data-consistency
 *   - Property 13 (Preservation): "Existing notification routing."
 *   - Requirement 3.5: WHEN a non-check-in notification is tapped, or a
 *     notification that already routes correctly is tapped, THEN the system
 *     SHALL CONTINUE TO route to its existing destination without regression.
 *
 * WHAT THIS TEST DOES
 * -------------------
 * This is an OBSERVATION-FIRST preservation baseline written against the
 * UNFIXED code. It encodes the *current* behavior of `resolveNotificationTarget`
 * and is EXPECTED TO PASS as written. It records the routing baseline that the
 * deep-link fix (task 5.2) MUST NOT regress: that fix only ADDS worker
 * check-in-window kinds (`ShiftStartingSoon`, ...) and must keep everything
 * pinned here byte-for-byte identical.
 *
 * The four routing rules pinned below are the complete current contract of the
 * resolver EXCEPT for the check-in-window kinds the fix intentionally changes:
 *
 *   (1) An explicit `notification.link` always wins — returned verbatim,
 *       regardless of kind or role.
 *   (2) Wallet kinds (every kind in WALLET_KINDS) → walletHistoryLink(role)
 *       for the recipient role, with the `role ?? notification.role` fallback.
 *   (3) The mapped switch cases:
 *         - AutoReleaseSettled / ShiftCompletedConfirmed →
 *             employer → shiftLink('employer', shiftId)
 *             worker   → walletHistoryLink('worker')
 *         - WorkerPostPaymentRatingRequired →
 *             shiftId ? shiftLink('worker', shiftId) : '/worker/dashboard'
 *   (4) Genuinely context-less kinds → `undefined` via the `default` branch.
 *
 * IMPORTANT — check-in-window kinds are DELIBERATELY excluded here.
 * `ShiftStartingSoon` (and any other worker check-in-window kind) is the exact
 * behavior fix 5.2 changes from `undefined` → the worker shift-detail link.
 * Pinning it to `undefined` in this baseline would create a FALSE regression
 * signal when the fix lands. The `default → undefined` cases below use only
 * kinds that are unrelated to check-in and that the fix leaves untouched:
 * `ApplicationRejected`, `ReputationAdjusted`, `EmployerFeedbackReceived`,
 * `CancellationApproved`.
 */

import { describe, it, expect } from 'vitest';
import type { NotificationKind } from '@/types';
import {
  resolveNotificationTarget,
  walletHistoryLink,
  shiftLink,
} from '@/lib/notificationTarget';

describe('Preservation — existing notification routing (Property 13, Req 3.5)', () => {
  // -------------------------------------------------------------------------
  // Rule 1 — an explicit `notification.link` always wins, returned verbatim,
  // regardless of kind or role. Proven across a wallet kind, a mapped switch
  // kind, and a context-less default kind so the override precedence is pinned
  // ahead of every other branch.
  // -------------------------------------------------------------------------
  describe('explicit notification.link overrides everything (returned verbatim)', () => {
    it('wins over a wallet kind that would otherwise map to wallet history', () => {
      const link = '/worker/dashboard?modal=wallet&tx=abc123';
      const target = resolveNotificationTarget(
        { kind: 'UserTopUp', link },
        'worker',
      );
      expect(target).toBe(link);
    });

    it('wins over a mapped switch kind (AutoReleaseSettled)', () => {
      const link = '/employer/shifts/s1?highlight=ledger';
      const target = resolveNotificationTarget(
        { kind: 'AutoReleaseSettled', link, shiftId: 's1' },
        'employer',
      );
      expect(target).toBe(link);
    });

    it('wins over a context-less default kind (ApplicationRejected)', () => {
      const link = '/shifts/s9';
      const target = resolveNotificationTarget(
        { kind: 'ApplicationRejected', link },
        'worker',
      );
      expect(target).toBe(link);
    });

    it('is returned verbatim even when no role is supplied', () => {
      const link = '/admin/dashboard?tab=disputes';
      const target = resolveNotificationTarget({
        kind: 'DisputeOpened',
        link,
      });
      expect(target).toBe(link);
    });
  });

  // -------------------------------------------------------------------------
  // Rule 2 — wallet kinds resolve to the recipient's wallet history. Every
  // kind in WALLET_KINDS behaves identically. The role is taken from the
  // explicit `role` arg, falling back to `notification.role`.
  // -------------------------------------------------------------------------
  describe('wallet kinds → walletHistoryLink(role)', () => {
    const WALLET_KINDS: readonly NotificationKind[] = ['UserTopUp', 'UserWithdrawal'];

    for (const kind of WALLET_KINDS) {
      it(`${kind}: worker → /worker/dashboard?modal=wallet`, () => {
        const target = resolveNotificationTarget({ kind }, 'worker');
        expect(target).toBe('/worker/dashboard?modal=wallet');
        expect(target).toBe(walletHistoryLink('worker'));
      });

      it(`${kind}: employer → /employer/dashboard?modal=wallet`, () => {
        const target = resolveNotificationTarget({ kind }, 'employer');
        expect(target).toBe('/employer/dashboard?modal=wallet');
        expect(target).toBe(walletHistoryLink('employer'));
      });

      it(`${kind}: admin → /admin/dashboard`, () => {
        const target = resolveNotificationTarget({ kind }, 'admin');
        expect(target).toBe('/admin/dashboard');
        expect(target).toBe(walletHistoryLink('admin'));
      });

      it(`${kind}: no role → defaults to the worker wallet history`, () => {
        const target = resolveNotificationTarget({ kind });
        expect(target).toBe('/worker/dashboard?modal=wallet');
      });

      it(`${kind}: falls back to notification.role when the role arg is absent`, () => {
        const target = resolveNotificationTarget({ kind, role: 'employer' });
        expect(target).toBe('/employer/dashboard?modal=wallet');
      });
    }
  });

  // -------------------------------------------------------------------------
  // Rule 3 — the mapped switch cases.
  // -------------------------------------------------------------------------
  describe('mapped switch cases', () => {
    // AutoReleaseSettled + ShiftCompletedConfirmed share one branch:
    // employer → shift detail; worker (and any non-employer) → wallet history.
    for (const kind of ['AutoReleaseSettled', 'ShiftCompletedConfirmed'] as const) {
      it(`${kind}: employer with a shiftId → /employer/shifts/{id}`, () => {
        const target = resolveNotificationTarget(
          { kind, shiftId: 'shift_1' },
          'employer',
        );
        expect(target).toBe('/employer/shifts/shift_1');
        expect(target).toBe(shiftLink('employer', 'shift_1'));
      });

      it(`${kind}: worker → /worker/dashboard?modal=wallet`, () => {
        const target = resolveNotificationTarget(
          { kind, shiftId: 'shift_1' },
          'worker',
        );
        expect(target).toBe('/worker/dashboard?modal=wallet');
        expect(target).toBe(walletHistoryLink('worker'));
      });
    }

    describe('WorkerPostPaymentRatingRequired', () => {
      it('with a shiftId → the worker shift-detail link', () => {
        const target = resolveNotificationTarget(
          { kind: 'WorkerPostPaymentRatingRequired', shiftId: 'shift_3' },
          'worker',
        );
        expect(target).toBe('/shifts/shift_3');
        expect(target).toBe(shiftLink('worker', 'shift_3'));
      });

      it('without a shiftId → /worker/dashboard', () => {
        const target = resolveNotificationTarget(
          { kind: 'WorkerPostPaymentRatingRequired' },
          'worker',
        );
        expect(target).toBe('/worker/dashboard');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Rule 4 — genuinely context-less kinds fall through to `undefined`.
  //
  // These are deliberately NOT check-in-window kinds: the deep-link fix (5.2)
  // adds `ShiftStartingSoon` (and other check-in kinds) to the resolver, so
  // pinning those here would be a false regression. The kinds below are
  // unrelated to check-in and the fix leaves them exactly as they are today.
  // -------------------------------------------------------------------------
  describe('context-less kinds → undefined (default branch)', () => {
    const CONTEXT_LESS_KINDS: readonly NotificationKind[] = [
      'ApplicationRejected',
      'ReputationAdjusted',
      'EmployerFeedbackReceived',
      'CancellationApproved',
    ];

    for (const kind of CONTEXT_LESS_KINDS) {
      it(`${kind} → undefined for a worker`, () => {
        expect(resolveNotificationTarget({ kind }, 'worker')).toBeUndefined();
      });

      it(`${kind} → undefined for an employer`, () => {
        expect(resolveNotificationTarget({ kind }, 'employer')).toBeUndefined();
      });

      it(`${kind} → undefined even when a shiftId is present`, () => {
        expect(
          resolveNotificationTarget({ kind, shiftId: 'shift_5' }, 'worker'),
        ).toBeUndefined();
      });
    }
  });
});
