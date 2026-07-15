/**
 * BUG 4 — check-in notification deep-link (EXPLORATION / bug-condition check).
 *
 * Spec: .kiro/specs/demo-logic-data-consistency
 *   - Property 2 (Bug Condition): "Check-in notification deep-links to an
 *     actionable surface."
 *   - Requirements 1.4 (defect) / 2.4 (expected).
 *
 * WHAT THIS TEST DOES
 * -------------------
 * This is a bug-condition EXPLORATION test written against the UNFIXED code.
 * It encodes the *expected* (correct) behavior, so it is EXPECTED TO FAIL now.
 * The failure is the success signal: it surfaces the counterexample that
 * proves the bug exists. The SAME test later validates the fix (tasks 5.2/5.3)
 * — do NOT weaken it to make it pass here.
 *
 * Property 2 has two halves; both are currently broken:
 *
 *   (A) The resolver must map a worker check-in notification (`ShiftStartingSoon`)
 *       carrying a `shiftId` to the worker shift-detail link. Today
 *       `resolveNotificationTarget` has no case for `ShiftStartingSoon`, so it
 *       falls through to `return undefined` — tapping the notification has no
 *       target and the worker cannot act.
 *
 *   (B) The deep-link target (the worker shift-detail page,
 *       `src/app/shifts/[id]/page.tsx`) must host the matching check-in/check-out
 *       action so the worker can act in place. Today that CTA lives ONLY on
 *       `/worker/dashboard` (in `UpcomingShiftCard`, gated by
 *       `canCheckIn`/`canCheckOut` and labeled `btn.checkIn`/`btn.checkOut`);
 *       the shift-detail page imports none of them.
 *
 * The (B) check is a lightweight source-structural assertion rather than a full
 * page render: `src/app/shifts/[id]/page.tsx` is a heavy client component
 * (React 19 `use(params)`, multiple Zustand stores, `useLifecycleSync`,
 * `notFound()`), and the design's testing strategy explicitly allows
 * *documenting* whether the CTA exists there vs only on the dashboard. The
 * marker set (`canCheckIn` / `canWorkerCheckIn` / `btn.checkIn`) matches exactly
 * what fix 5.2/5.3 says it will add ("reusing canCheckIn / canCheckOut and the
 * same handler the dashboard uses").
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolveNotificationTarget,
  shiftLink,
} from '@/lib/notificationTarget';

// The worker shift-detail page source. Vitest runs from the project root, so
// resolve against `process.cwd()`.
const WORKER_SHIFT_DETAIL_PATH = join(
  process.cwd(),
  'src',
  'app',
  'shifts',
  '[id]',
  'page.tsx',
);

describe('BUG 4 — check-in notification deep-link (Property 2, Req 1.4/2.4)', () => {
  // (A) Resolver → worker shift-detail link.
  it('resolves a worker ShiftStartingSoon notification (with shiftId) to the worker shift-detail link', () => {
    const shiftId = 's1';
    const target = resolveNotificationTarget(
      { kind: 'ShiftStartingSoon', shiftId },
      'worker',
    );

    // Expected once fixed: the worker shift-detail link for that shift.
    // Use the app's own helper so the assertion tracks the real link shape
    // (`/shifts/{shiftId}`) rather than hard-coding it.
    expect(target).toBe(shiftLink('worker', shiftId));
    expect(target).toBe('/shifts/s1');
    // UNFIXED counterexample: `resolveNotificationTarget` returns `undefined`
    // for `ShiftStartingSoon`, so this assertion fails today.
    expect(target).toBeDefined();
  });

  // (A') Fallback when no shiftId is present — part of the fixed resolver
  // behavior described in fix 5.2 ("falling back to /worker/dashboard when
  // shiftId is absent"). Also `undefined` today.
  it('falls back to the worker dashboard for a check-in notification with no shiftId', () => {
    const target = resolveNotificationTarget(
      { kind: 'ShiftStartingSoon' },
      'worker',
    );
    expect(target).toBe('/worker/dashboard');
  });

  // (B) Deep-link target hosts the check-in/check-out action.
  it('worker shift-detail page (the deep-link target) hosts a check-in/check-out action', () => {
    const source = readFileSync(WORKER_SHIFT_DETAIL_PATH, 'utf8');

    // Markers that indicate the page actually renders a check-in/check-out
    // CTA (the gate predicates or the button labels the dashboard uses).
    const hostsCheckInAction =
      source.includes('canCheckIn') ||
      source.includes('canWorkerCheckIn') ||
      source.includes('btn.checkIn');
    const hostsCheckOutAction =
      source.includes('canCheckOut') ||
      source.includes('canWorkerCheckOut') ||
      source.includes('btn.checkOut');

    // Expected once fixed (task 5.2/5.3): the worker shift-detail page renders
    // the check-in/check-out CTA so the worker can act in place after tapping
    // the notification.
    //
    // UNFIXED counterexample: the CTA lives ONLY on `/worker/dashboard`; the
    // shift-detail page references neither the gates nor the button labels, so
    // both of these fail today.
    expect(hostsCheckInAction).toBe(true);
    expect(hostsCheckOutAction).toBe(true);
  });
});
