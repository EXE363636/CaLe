/**
 * Cluster 2 · Task 6 — EXPLORATION (bug-condition) test.
 *
 * Property 3 (Bug Condition) — "Landing hero derives from current user + role".
 *
 * Validates: Requirements 1.2, 2.2
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS TEST ENCODES (the correct, post-fix behavior)
 * ---------------------------------------------------------------------------
 * The landing hero island `<FeaturedJobMockup/>` must derive its preview
 * tiles from the CURRENT user + role and the live stores — never from
 * hard-coded literals:
 *
 *   - No reputation tile may show the hard-coded literal "95".
 *   - A reputation preview may appear ONLY when the current user is a worker
 *     (so it is absent for a logged-out visitor and for an employer).
 *   - An "upcoming" / "Sắp diễn ra" card may appear ONLY when the current
 *     user actually has a real upcoming shift (so it is absent for a logged-
 *     out visitor and for an employer with no upcoming shift).
 *
 * The two rendered scenarios below (logged-out visitor, logged-in employer
 * with no upcoming shift) are exactly the cases where every preview tile
 * must be ABSENT.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS EXPECTED TO FAIL ON THE CURRENT (UNFIXED) CODE
 * ---------------------------------------------------------------------------
 * `FeaturedJobMockup` renders a "supporting stats" group unconditionally —
 * it is gated by neither the current user, the role, nor the shift stores.
 * That group contains two HARD-CODED tiles (confirmed by inspecting
 * `src/components/landing/FeaturedJobMockup.tsx`):
 *
 *   1. A reputation tile: `<p ...>95</p>` (the literal 95) with the label
 *      `t('landing.hero.featured.repLabel')` = "Điểm uy tín".
 *   2. A fabricated "upcoming" card:
 *        label `t('landing.hero.featured.upcomingLabel')` = "Sắp diễn ra",
 *        day   `t('landing.hero.featured.upcomingDay')`   = "Thứ Bảy, 24/05",
 *        time  `t('landing.hero.featured.upcomingTime')`  = "Ca 14:00 – 18:00".
 *
 * Because those tiles render regardless of who is viewing, BOTH scenarios
 * below surface the literal 95, a reputation preview for a non-worker, and
 * an upcoming card for a user with no upcoming shift — so the assertions
 * FAIL. That FAILURE is the counterexample proving the bug exists. This
 * test is NOT fixed here — the SAME test later validates the fix
 * (tasks 9.2 / 9.3).
 *
 * The stores are seeded with the same pattern the neighboring page/render
 * tests use (`useHydrationStore` / `useUserStore` / `useAuthStore` /
 * `useShiftStore` / `useApplicationStore` — see
 * `src/__tests__/properties/attendanceCtaGating.property.test.ts`). The
 * current component ignores the auth/user stores; seeding them anyway makes
 * each scenario meaningful and lets the SAME test validate the fix, which
 * derives the tiles from `useCurrentUser()` + the shift/application stores.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { FeaturedJobMockup } from '@/components/landing/FeaturedJobMockup';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import type { Employer } from '@/types';

// ---------------------------------------------------------------------------
// The exact hard-coded strings/values the UNFIXED hero renders. These are the
// values the assertions key on (documented here per the task's requirement to
// record what the test keyed on). All come from
// `src/components/landing/FeaturedJobMockup.tsx` + `src/i18n/vi.ts`.
// ---------------------------------------------------------------------------

/** The literal reputation score baked into the tile: `<p ...>95</p>`. */
const HARDCODED_REP_SCORE = '95';
/** landing.hero.featured.repLabel — the reputation-preview tile's label. */
const REP_TILE_LABEL = 'Điểm uy tín';
/** landing.hero.featured.upcomingLabel — the fabricated card's label. */
const UPCOMING_LABEL = 'Sắp diễn ra';
/** landing.hero.featured.upcomingDay — the fabricated card's day literal. */
const UPCOMING_DAY = 'Thứ Bảy, 24/05';
/**
 * landing.hero.featured.upcomingTime — the fabricated card's time literal
 * ("Ca 14:00 – 18:00", note the en-dash). Matched with a partial regex so a
 * dash/whitespace nuance never masks the real signal.
 */
const UPCOMING_TIME_RE = /Ca 14:00/;

const EMPLOYER_ID = 'emp-hero';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mkEmployer(): Employer {
  return {
    id: EMPLOYER_ID,
    role: 'employer',
    email: 'employer@hero.vn',
    phone: '+84900000001',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2020-01-01T00:00:00.000Z',
    companyName: 'Hero Co.',
    businessType: 'F&B',
    verifiedBusiness: true,
    boostCredits: 0,
  };
}

// ---------------------------------------------------------------------------
// Store seeding / teardown
// ---------------------------------------------------------------------------

/** A logged-out visitor: hydrated stores, nobody signed in, no data. */
function seedLoggedOutVisitor(): void {
  useHydrationStore.setState({ hydrated: true });
  useUserStore.setState({ users: [] });
  useAuthStore.setState({ currentUserId: null, lastActivityAt: null });
  useShiftStore.setState({ shifts: [] });
  useApplicationStore.setState({ applications: [], disputes: [] });
}

/** A logged-in employer with NO upcoming shift (empty shift/application stores). */
function seedLoggedInEmployer(): void {
  useHydrationStore.setState({ hydrated: true });
  useUserStore.setState({ users: [mkEmployer()] });
  useAuthStore.setState({ currentUserId: EMPLOYER_ID, lastActivityAt: null });
  useShiftStore.setState({ shifts: [] });
  useApplicationStore.setState({ applications: [], disputes: [] });
}

function resetStores(): void {
  useApplicationStore.setState({ applications: [], disputes: [] });
  useShiftStore.setState({ shifts: [] });
  useUserStore.setState({ users: [] });
  useAuthStore.setState({ currentUserId: null, lastActivityAt: null });
  useHydrationStore.setState({ hydrated: false });
}

/**
 * The three bug-condition assertions, shared by both scenarios. For a viewer
 * who is NOT a worker and has NO upcoming shift, every preview tile must be
 * absent.
 */
function expectNoHardCodedPreviews(): void {
  // 1. No hard-coded reputation literal "95".
  expect(screen.queryAllByText(HARDCODED_REP_SCORE)).toHaveLength(0);
  // 2. No reputation preview at all (viewer is not a worker).
  expect(screen.queryAllByText(REP_TILE_LABEL)).toHaveLength(0);
  // 3. No fabricated upcoming card (viewer has no real upcoming shift).
  expect(screen.queryAllByText(UPCOMING_LABEL)).toHaveLength(0);
  expect(screen.queryAllByText(UPCOMING_DAY)).toHaveLength(0);
  expect(screen.queryAllByText(UPCOMING_TIME_RE)).toHaveLength(0);
}

afterEach(() => {
  cleanup();
  resetStores();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 3 (Bug Condition): landing hero derives from current user + role', () => {
  it('logged-out visitor: no literal 95, no reputation preview, no fabricated upcoming card', () => {
    seedLoggedOutVisitor();
    render(<FeaturedJobMockup />);
    // EXPECTED (post-fix): every preview tile is absent for a logged-out
    // visitor. CURRENT (unfixed): the hard-coded "95" tile and the
    // fabricated "Sắp diễn ra / Thứ Bảy, 24/05 / Ca 14:00 – 18:00" card
    // render regardless of the viewer → these assertions FAIL, proving the bug.
    expectNoHardCodedPreviews();
  });

  it('logged-in employer (no upcoming shift): no literal 95, no reputation preview, no upcoming card', () => {
    seedLoggedInEmployer();
    render(<FeaturedJobMockup />);
    // EXPECTED (post-fix): an employer is not a worker and has no upcoming
    // shift, so no reputation preview and no upcoming card. CURRENT
    // (unfixed): both hard-coded tiles still render → these assertions FAIL.
    expectNoHardCodedPreviews();
  });
});
