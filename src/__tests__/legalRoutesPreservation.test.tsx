/**
 * Cluster 5 · Task 18 — PRESERVATION baseline test.
 *
 * Property 15 (Preservation) — "Legal links + guide/safety routes".
 *
 * Validates: Requirements 3.8, 3.9
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS TEST ENCODES (observation-first baseline for Cluster 5)
 * ---------------------------------------------------------------------------
 * The Cluster 5 fix (tasks 19.1 / 19.2) does three things:
 *   • renames the guide menu label from "Bắt đầu nhanh" to "Cẩm nang",
 *   • rewrites `/user-guide` from a usage walkthrough into a practical
 *     handbook, and
 *   • moves the guide link OUT of the footer "Pháp lý & Hỗ trợ" legal group
 *     into the handbook/guide group.
 *
 * None of that is allowed to break the ROUTES or the four legal/support
 * LINKS. This test pins the CURRENT (unfixed) behavior so it becomes the
 * regression guard for the fix:
 *
 *   (Req 3.8) The footer's four legal/support links — Terms (`/terms`),
 *             Privacy (`/privacy`), Dispute handling (`/disputes`), and
 *             Contact support (`/support`) — still point at their routes,
 *             and those route modules still resolve to real page components.
 *             Only the GROUP that owns the guide link changes in the fix;
 *             the four legal links' PRESENCE must survive untouched.
 *
 *   (Req 3.9) The guide + safety routes (`/user-guide`, `/safety`) still
 *             resolve to valid, mountable pages after the handbook rewrite +
 *             menu rename.
 *
 * ---------------------------------------------------------------------------
 * KEYING STRATEGY (deliberately robust across the fix)
 * ---------------------------------------------------------------------------
 *   • The four legal links are keyed on their HREF, never their label. Their
 *     labels are stable, but keying on the route makes the baseline immune to
 *     any incidental copy change and mirrors the footer-grouping test.
 *   • For the guide route we assert only that the MODULE resolves (default
 *     export is a component) and that it renders SOME page structure (an
 *     `<h1>` heading) — we deliberately do NOT pin its content or its menu
 *     label, because those are exactly what the handbook rewrite + rename
 *     change. `InfoPage` always renders the page title as an `<h1>`, so the
 *     heading check proves "valid page" independent of the title's wording.
 *
 * ---------------------------------------------------------------------------
 * WHY IT PASSES ON THE CURRENT (UNFIXED) CODE
 * ---------------------------------------------------------------------------
 *   • `Footer` (src/components/layout/Footer.tsx) already renders `<a>`
 *     anchors for `/terms`, `/privacy`, `/disputes`, and `/support` (they sit
 *     in `LEGAL_COLUMN` today, alongside `/user-guide`). Their presence is
 *     what we assert — the fix only regroups the guide link, not these four.
 *   • `/terms`, `/privacy`, `/disputes`, `/support`, `/user-guide`, and
 *     `/safety` all export default page components today, each built on the
 *     shared `<InfoPage>` shell (which renders an `<h1>` title).
 *
 * This is a PRESERVATION baseline: it MUST PASS on the unfixed code and MUST
 * still pass after the Cluster 5 fix (re-run at task 19.4).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { Footer } from '@/components/layout/Footer';
import UserGuidePage from '@/app/user-guide/page';
import SafetyPage from '@/app/safety/page';
import TermsPage from '@/app/terms/page';
import PrivacyPage from '@/app/privacy/page';
import DisputesPage from '@/app/disputes/page';
import SupportPage from '@/app/support/page';

// ---------------------------------------------------------------------------
// The four footer legal/support links — keyed on ROUTE, never label. Only the
// GROUP that owns the guide link changes in the Cluster 5 fix; these four must
// keep both their presence in the footer and their resolvable page modules.
// ---------------------------------------------------------------------------

const LEGAL_HREFS = ['/terms', '/privacy', '/disputes', '/support'] as const;

/** Legal/support route modules, paired with their href for readable output. */
const LEGAL_PAGE_MODULES: ReadonlyArray<readonly [string, unknown]> = [
  ['/terms', TermsPage],
  ['/privacy', PrivacyPage],
  ['/disputes', DisputesPage],
  ['/support', SupportPage],
];

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Req 3.8 — footer legal/support links still resolve to their routes
// ---------------------------------------------------------------------------

describe('Property 15 (Preservation): footer legal links still point to their routes (Req 3.8)', () => {
  it.each(LEGAL_HREFS)(
    'the Footer renders an anchor pointing to "%s"',
    (href) => {
      const { container } = render(<Footer />);
      // Presence of the href is the invariant; the Cluster 5 fix only moves
      // the guide link between groups, it must not drop any legal link.
      const link = container.querySelector(`a[href="${href}"]`);
      expect(link, `expected a footer <a href="${href}">`).not.toBeNull();
    },
  );

  it.each(LEGAL_PAGE_MODULES)(
    'the route module for "%s" resolves to a page component (function)',
    (_href, mod) => {
      // A callable default export proves the route still resolves to a real,
      // mountable Next.js page — the destination the footer link points at.
      expect(typeof mod).toBe('function');
    },
  );
});

// ---------------------------------------------------------------------------
// Req 3.9 — guide + safety routes stay valid pages after the rename/rewrite
// ---------------------------------------------------------------------------

describe('Property 15 (Preservation): guide + safety routes stay valid pages (Req 3.9)', () => {
  it('the /user-guide module default export is a page component (function)', () => {
    // Assert the MODULE resolves — NOT its content or menu label, which the
    // handbook rewrite + rename intentionally change.
    expect(typeof UserGuidePage).toBe('function');
  });

  it('the /safety module default export is a page component (function)', () => {
    expect(typeof SafetyPage).toBe('function');
  });

  it('/user-guide renders to a valid page (an <h1> heading is present)', () => {
    const { container } = render(<UserGuidePage />);
    // `InfoPage` renders the page title as an <h1>; its presence proves the
    // page mounts, independent of the (changing) title text.
    expect(container.querySelector('h1')).not.toBeNull();
  });

  it('/safety renders to a valid page (an <h1> heading is present)', () => {
    const { container } = render(<SafetyPage />);
    expect(container.querySelector('h1')).not.toBeNull();
  });
});
