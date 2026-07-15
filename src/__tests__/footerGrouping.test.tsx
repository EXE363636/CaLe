/**
 * Cluster 5 · Task 17 — EXPLORATION (bug-condition) test.
 *
 * Property 8 (Bug Condition) — "Footer grouping".
 *
 * Validates: Requirements 1.8, 2.8
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS TEST ENCODES (the correct, post-fix behavior)
 * ---------------------------------------------------------------------------
 * Per design.md "Cluster 5 — Handbook / footer" (BUG 8) and bugfix.md req 2.8,
 * the site footer must, after the fix:
 *
 *   (1) place the quick-start / guide link (route `/user-guide`) in the
 *       handbook/guide group — NOT under the "Pháp lý & Hỗ trợ" (legal /
 *       support) group, and
 *   (2) leave the "Pháp lý & Hỗ trợ" group holding ONLY the four legal /
 *       support entries: Terms (`/terms`), Privacy (`/privacy`), Dispute
 *       handling (`/disputes`), and Contact support (`/support`).
 *
 * The link is keyed on its ROUTE (`/user-guide`), never on its label. The
 * handbook rewrite (task 19.1) renames `nav.label.userGuide` from
 * "Bắt đầu nhanh" to "Cẩm nang", so the footer link's visible text changes
 * while the route stays valid (Req 3.9). Keying on the href makes this test
 * robust across that rename.
 *
 * The assertions read the footer's rendered grouping: each nav group renders
 * as `<div><p>{heading}</p><ul>…<a href/>…</ul></div>` (see `FooterColumn`),
 * so the group that owns a link is exactly the `<ul>` whose preceding heading
 * names it. The legal/support group is located by its heading ("Pháp lý &
 * hỗ trợ"), matched case-insensitively on the distinctive marker "pháp lý".
 *
 * ---------------------------------------------------------------------------
 * CURRENT (UNFIXED) FOOTER GROUP STRUCTURE — recorded from source
 * ---------------------------------------------------------------------------
 * `src/components/layout/Footer.tsx` defines four nav columns. The relevant
 * one is `LEGAL_COLUMN` (heading `'Pháp lý & hỗ trợ'`), whose links are:
 *
 *     { label: t('nav.label.userGuide'), href: '/user-guide' }  ← guide link
 *     { label: 'Điều khoản sử dụng',      href: '/terms'      }  ← Terms
 *     { label: 'Chính sách bảo mật',      href: '/privacy'    }  ← Privacy
 *     { label: 'Chính sách xử lý tranh chấp', href: '/disputes' } ← Dispute
 *     { label: 'Liên hệ hỗ trợ',          href: '/support'    }  ← Support
 *
 * i.e. the guide link (`/user-guide`, currently labelled "Bắt đầu nhanh")
 * sits INSIDE the legal/support group, alongside the four legal entries — and
 * it appears in NO other footer group. There is no separate handbook/guide
 * group yet; task 19.2 moves the guide link out of `LEGAL_COLUMN`.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS EXPECTED TO FAIL ON THE CURRENT (UNFIXED) CODE
 * ---------------------------------------------------------------------------
 *   • Assertion 1 (guide link not in legal group) — FAILS: the legal group's
 *     hrefs currently include `/user-guide`.
 *   • Assertion 2 (legal group holds only the four legal links) — FAILS: the
 *     legal group currently holds five hrefs (the four + `/user-guide`).
 *   • Assertion 3 (guide link lives in a non-legal group) — FAILS: `/user-guide`
 *     currently appears only inside the legal group.
 *
 * Each failure is the counterexample proving the bug (`quickStartLinkGrouped
 * UnderLegal`). This test is NOT fixed here and the product is NOT changed —
 * the SAME test later validates the fix (task 19.3).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { Footer } from '@/components/layout/Footer';

// ---------------------------------------------------------------------------
// Normalization helpers — Vietnamese diacritics compare reliably in NFC.
// ---------------------------------------------------------------------------

/** Unicode-normalize (NFC) so composed/decomposed diacritics compare equal. */
const nfc = (s: string | null | undefined): string => (s ?? '').normalize('NFC');
/** NFC + lower-case for case-insensitive substring checks. */
const lc = (s: string | null | undefined): string => nfc(s).toLowerCase();

// ---------------------------------------------------------------------------
// The exact strings the assertions key on (recorded per the task's
// requirement to document what the test matches against).
// ---------------------------------------------------------------------------

/** The guide / quick-start link is identified by its ROUTE, never its label. */
const GUIDE_HREF = '/user-guide';

/** Distinctive marker locating the legal/support group heading ("Pháp lý & hỗ trợ"). */
const LEGAL_HEADING_MARKER = lc('Pháp lý'); // 'pháp lý'

/** The four — and only four — entries the legal/support group must contain. */
const LEGAL_HREFS = ['/terms', '/privacy', '/disputes', '/support'];

// ---------------------------------------------------------------------------
// Footer group reader — maps the rendered DOM to { heading, hrefs } groups.
// ---------------------------------------------------------------------------

interface FooterGroup {
  heading: string;
  hrefs: string[];
}

/**
 * Read the footer's nav groups from the rendered DOM. Each group renders as
 * `<div><p>{heading}</p><ul>…<a href/>…</ul></div>`, so the heading is the
 * element immediately preceding each `<ul>`, and the group's links are the
 * anchors inside that `<ul>`. Only route links (href starting with "/") are
 * collected, so the brand column's `mailto:`/`tel:` contact links are ignored.
 */
function readFooterGroups(container: HTMLElement): FooterGroup[] {
  return Array.from(container.querySelectorAll('ul')).map((ul) => {
    const heading = nfc(ul.previousElementSibling?.textContent);
    const hrefs = Array.from(ul.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('/'));
    return { heading, hrefs };
  });
}

/** Locate the legal/support group by its heading marker. */
function findLegalGroup(groups: FooterGroup[]): FooterGroup {
  const legal = groups.find((g) => lc(g.heading).includes(LEGAL_HEADING_MARKER));
  expect(legal, 'expected a footer group headed "Pháp lý & Hỗ trợ"').toBeTruthy();
  return legal as FooterGroup;
}

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Property 8 (Bug Condition) — footer grouping
// ---------------------------------------------------------------------------

describe('Property 8 (Bug Condition): Footer grouping', () => {
  it('does NOT place the guide link (/user-guide) in the "Pháp lý & Hỗ trợ" group', () => {
    const { container } = render(<Footer />);
    const legalGroup = findLegalGroup(readFooterGroups(container));

    // EXPECTED (post-fix): the guide link is not part of the legal/support group.
    // CURRENT (unfixed): LEGAL_COLUMN lists `/user-guide` → this assertion FAILS.
    expect(legalGroup.hrefs).not.toContain(GUIDE_HREF);
  });

  it('the "Pháp lý & Hỗ trợ" group contains ONLY Terms, Privacy, Dispute handling, and Contact support', () => {
    const { container } = render(<Footer />);
    const legalGroup = findLegalGroup(readFooterGroups(container));

    // EXPECTED (post-fix): exactly the four legal/support routes, nothing else.
    // CURRENT (unfixed): the four PLUS `/user-guide` (five entries) → FAILS.
    expect([...legalGroup.hrefs].sort()).toEqual([...LEGAL_HREFS].sort());
  });

  it('places the guide link (/user-guide) in a non-legal handbook/guide group', () => {
    const { container } = render(<Footer />);
    const groups = readFooterGroups(container);

    const nonLegalHrefs = groups
      .filter((g) => !lc(g.heading).includes(LEGAL_HEADING_MARKER))
      .flatMap((g) => g.hrefs);

    // EXPECTED (post-fix): the guide link is moved into a non-legal group.
    // CURRENT (unfixed): `/user-guide` lives only in the legal group → FAILS.
    expect(nonLegalHrefs).toContain(GUIDE_HREF);
  });
});
