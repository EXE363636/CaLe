/**
 * Cluster 2 · Task 7 — EXPLORATION (bug-condition) test.
 *
 * Property 4 (Bug Condition) — "Single shared reputation source".
 *
 * Validates: Requirements 1.3, 2.3
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS TEST ENCODES (the correct, post-fix behavior)
 * ---------------------------------------------------------------------------
 * For ONE worker at ONE data state, every surface that shows that worker's
 * reputation must display the IDENTICAL value — because every surface should
 * read from a single shared source (`getWorkerReputation(userId)`, which
 * returns `Worker.reputationScore`).
 *
 * The de-facto single source today is `Worker.reputationScore`: the worker
 * dashboard `StatTile` and the `UserMenu` trust chip both read it directly.
 * Confirmed by inspecting `src/components/layout/UserMenu.tsx` →
 *
 *     function trustChip(user) {
 *       ...
 *       const score = (user as Worker).reputationScore;   // <-- direct read
 *       label: t('nav.userMenu.chip.reputation').replace('{score}', String(score))
 *     }
 *
 * So "the value the other surfaces render" === `worker.reputationScore`.
 * This test seeds a logged-in worker whose score is DELIBERATELY not 95,
 * renders the landing hero, reads the reputation the hero renders, and
 * asserts it equals `worker.reputationScore`. Equality across the two
 * surfaces is exactly Property 4.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS EXPECTED TO FAIL ON THE CURRENT (UNFIXED) CODE
 * ---------------------------------------------------------------------------
 * The landing hero island `<FeaturedJobMockup/>` HARD-CODES the reputation
 * tile to the literal `95` — it never reads the current user, the role, or
 * any shared source (confirmed in
 * `src/components/landing/FeaturedJobMockup.tsx`):
 *
 *     <p className="mt-1 text-3xl font-extrabold text-emerald-500">95</p>
 *
 * So for a worker whose real `reputationScore` is (say) 80, the hero shows
 * 95 while every `worker.reputationScore`-backed surface shows 80. The two
 * surfaces DIVERGE → the assertion `heroScore === worker.reputationScore`
 * FAILS. That FAILURE is the counterexample proving the bug: there is no
 * shared `getWorkerReputation(userId)` reader yet.
 *
 * The canonical counterexample is `hero 95 vs worker 80`. The property-based
 * run generalises it across every score in [0, 100] EXCEPT the coincidental
 * 95 (where the hard-coded literal would accidentally match and mask the
 * divergence).
 *
 * ---------------------------------------------------------------------------
 * IMPORTANT
 * ---------------------------------------------------------------------------
 * - This test is NOT fixed here. The SAME test later validates the fix
 *   (tasks 9.1 / 9.3): once the hero reads `getWorkerReputation(currentUser.id)`
 *   for a logged-in worker, it renders the worker's real score and the two
 *   surfaces agree → this test PASSES.
 * - It asserts on OBSERVABLE rendered/derived values only. It does NOT import
 *   the not-yet-existing `getWorkerReputation`, so it fails at RUNTIME
 *   (assertion), never as a compile error.
 * - The stores are seeded with the same pattern the neighboring render tests
 *   use (`useHydrationStore` / `useUserStore` / `useAuthStore` /
 *   `useShiftStore` / `useApplicationStore` — see
 *   `src/__tests__/featuredJobMockup.test.tsx` and
 *   `src/__tests__/properties/attendanceCtaGating.property.test.ts`).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import fc from 'fast-check';

import { FeaturedJobMockup } from '@/components/landing/FeaturedJobMockup';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import type { Worker } from '@/types';

// ---------------------------------------------------------------------------
// Constants — the strings/values the test keys on. All come from
// `src/components/landing/FeaturedJobMockup.tsx` + `src/i18n/vi.ts`.
// ---------------------------------------------------------------------------

/** landing.hero.featured.repLabel — the reputation tile's label. */
const REP_TILE_LABEL = 'Điểm uy tín';
/** The literal reputation score baked into the unfixed hero (`<p>95</p>`). */
const HARDCODED_HERO_SCORE = 95;

const WORKER_ID = 'wrk-rep';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A complete, valid worker with a chosen reputation score. */
function mkWorker(reputationScore: number): Worker {
  return {
    id: WORKER_ID,
    role: 'worker',
    email: 'worker@rep.vn',
    phone: '+84900000002',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2020-01-01T00:00:00.000Z',
    fullName: 'Nguyễn Văn Uy Tín',
    skills: [],
    preferredJobTypes: [],
    preferredLocations: [],
    verifications: ['phone'],
    reputationScore,
    completedShiftCount: 0,
    ratingsReceived: [],
    cancellationHistory: [],
    noShowCount: 0,
  };
}

// ---------------------------------------------------------------------------
// Store seeding / teardown
// ---------------------------------------------------------------------------

/**
 * A logged-in WORKER with the given reputation score and NO upcoming shift.
 * The hero currently ignores the auth/user stores; seeding them anyway makes
 * the scenario meaningful and lets the SAME test validate the fix (which will
 * derive the hero's reputation from `useCurrentUser()` + the shared reader).
 */
function seedLoggedInWorker(reputationScore: number): void {
  useHydrationStore.setState({ hydrated: true });
  useUserStore.setState({ users: [mkWorker(reputationScore)] });
  useAuthStore.setState({ currentUserId: WORKER_ID, lastActivityAt: null });
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

/** What every `worker.reputationScore`-backed surface renders (StatTile / UserMenu chip). */
function otherSurfaceReputation(): number {
  const worker = useUserStore.getState().findById(WORKER_ID) as Worker;
  return worker.reputationScore;
}

/**
 * The reputation value the landing hero renders, read from the DOM.
 *
 * The reputation tile is labelled with `REP_TILE_LABEL` ("Điểm uy tín"). The
 * score sits in a sibling element within the same tile. The tile's hint
 * ("/ 100 — đáng tin cậy") also contains digits, so match only a LEAF element
 * whose entire text is a bare score ("95") or a "score/100" form ("80/100");
 * the hint (starts with "/") and the label (starts with a letter) never match.
 *
 * Returns `null` when no reputation preview is rendered (the post-fix state
 * for a non-worker viewer — not exercised here, since this test seeds a
 * worker).
 */
function readHeroReputationScore(): number | null {
  const labels = screen.queryAllByText(REP_TILE_LABEL);
  if (labels.length === 0) return null;
  const tile = labels[0].closest('div');
  if (!tile) return null;
  const leaves = Array.from(tile.querySelectorAll('*')).filter(
    (el) => el.children.length === 0,
  );
  for (const el of leaves) {
    const txt = (el.textContent ?? '').trim();
    const m = txt.match(/^(\d{1,3})(?:\s*\/\s*100)?$/);
    if (m) return Number(m[1]);
  }
  return null;
}

afterEach(() => {
  cleanup();
  resetStores();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 4 (Bug Condition): single shared reputation source', () => {
  it('hero reputation equals the worker\'s real score (canonical: hero 95 vs worker 80)', () => {
    const WORKER_SCORE = 80;
    seedLoggedInWorker(WORKER_SCORE);
    render(createElement(FeaturedJobMockup));

    const heroScore = readHeroReputationScore();
    const otherScore = otherSurfaceReputation(); // === 80 (StatTile / UserMenu chip)

    // Sanity: the hero DID render a reputation number.
    expect(heroScore).not.toBeNull();

    // EXPECTED (post-fix): the hero reads the shared source, so it shows 80
    // and equals the other surfaces. CURRENT (unfixed): the hero hard-codes
    // 95 while the worker's real score is 80 → 95 !== 80 → this assertion
    // FAILS, proving the surfaces diverge (no shared getWorkerReputation).
    expect(heroScore).toBe(otherScore);
  });

  it('property: for any score in [0,100] except 95, hero reputation === worker.reputationScore', () => {
    fc.assert(
      fc.property(
        // Exclude 95: the hero's hard-coded literal would coincidentally
        // match a worker whose real score is also 95, masking the divergence.
        fc.integer({ min: 0, max: 100 }).filter((n) => n !== HARDCODED_HERO_SCORE),
        (score) => {
          seedLoggedInWorker(score);
          render(createElement(FeaturedJobMockup));

          const heroScore = readHeroReputationScore();
          const otherScore = otherSurfaceReputation(); // === score

          cleanup();
          resetStores();

          // Holds after the fix (both read the shared source). FAILS now:
          // heroScore is the hard-coded 95, otherScore is `score` (!= 95),
          // so 95 !== score → counterexample (e.g. hero 95 vs worker 80).
          return heroScore === otherScore;
        },
      ),
      { numRuns: 30 },
    );
  });
});
