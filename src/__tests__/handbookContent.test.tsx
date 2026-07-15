/**
 * Cluster 5 · Task 16 — EXPLORATION (bug-condition) test.
 *
 * Property 7 (Bug Condition) — "Practical handbook content + menu label".
 *
 * Validates: Requirements 1.7, 2.7
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS TEST ENCODES (the correct, post-fix behavior)
 * ---------------------------------------------------------------------------
 * Per design.md "Cluster 5 — Handbook / footer" (BUG 7) and bugfix.md req 2.7,
 * the guide/handbook and its menu entry must, after the fix:
 *
 *   (1) name the menu entry "Cẩm nang" (or "Cẩm nang đi ca") — NOT the current
 *       "Bắt đầu nhanh" and NOT the trust/safety framing ("Tin cậy & An toàn"),
 *       and
 *   (2) present ORIGINAL, short, PRACTICAL handbook content for BOTH audiences:
 *         - workers  — satisfying employers, arriving on time (punctuality),
 *                      communicating schedule conflicts, cancelling well;
 *         - employers — attracting staff, writing clear shift descriptions,
 *                       setting appropriate pay, reducing no-shows.
 *
 * Because the exact final prose is not pinned, this test keys on stable,
 * meaningful, requirement-2.7-derived concept anchors rather than exact
 * sentences, and on the i18n label VALUE + the rendered page structure — the
 * two signals the task calls out ("Prefer asserting on the i18n label value +
 * rendered page structure").
 *
 * The label check accepts any label CONTAINING "cẩm nang" (so both "Cẩm nang"
 * and "Cẩm nang đi ca" satisfy it) and rejects the trust/safety framing.
 *
 * For the page, each audience is required to carry practical guidance via a
 * small OR-set of natural Vietnamese phrasings per topic (so the fix is not
 * over-fit to one wording):
 *   - worker "satisfy employers"  → "hài lòng" | "vừa lòng"
 *   - worker "punctuality"        → "đúng giờ"
 *   - employer "attract staff"    → "thu hút" | "giữ chân"
 *   - employer "appropriate pay"  → "hợp lý" | "tương xứng"
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS EXPECTED TO FAIL ON THE CURRENT (UNFIXED) CODE
 * ---------------------------------------------------------------------------
 * CURRENT STATE recorded from source:
 *
 *   • Menu label — src/i18n/vi.ts: `'nav.label.userGuide': 'Bắt đầu nhanh'`.
 *     (The parent NavBar dropdown group is labelled "Tin cậy & cẩm nang" and
 *     `'nav.label.safety': 'An toàn & Tin cậy'` — the trust/safety framing.)
 *     So `t('nav.label.userGuide')` does NOT contain "cẩm nang" → label
 *     assertion FAILS.
 *
 *   • Page framing — src/app/user-guide/page.tsx: the page is an app USAGE
 *     walkthrough (InfoPage eyebrow "Hướng dẫn sử dụng", title "Cách dùng
 *     CaLẻ / Now"): 9-step worker timeline + 9-step employer timeline +
 *     feature-anchor cards + FAQ — all PROCEDURAL ("how to use the app"),
 *     not a practical behavioral handbook. None of the practical-topic
 *     anchors above appear anywhere in the page (verified by grep: "hài
 *     lòng", "vừa lòng", "đúng giờ", "thu hút", "giữ chân", "hợp lý",
 *     "tương xứng" are all absent) → both page assertions FAIL.
 *
 * Each assertion below therefore FAILS on current code. That FAILURE is the
 * counterexample proving the bug exists. This test is NOT fixed here — the
 * SAME test later validates the fix (task 19.1 / 19.3).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { t } from '@/i18n/vi';
import UserGuidePage from '@/app/user-guide/page';

// ---------------------------------------------------------------------------
// Normalization helpers — Vietnamese diacritics compare reliably in NFC.
// ---------------------------------------------------------------------------

/** Unicode-normalize (NFC) so composed/decomposed diacritics compare equal. */
const nfc = (s: string | null | undefined): string => (s ?? '').normalize('NFC');
/** NFC + lower-case for case-insensitive substring checks. */
const lc = (s: string | null | undefined): string => nfc(s).toLowerCase();

/** True iff `haystack` contains ANY of the (NFC+lower-cased) `needles`. */
const includesAny = (haystack: string, needles: string[]): boolean =>
  needles.some((n) => haystack.includes(lc(n)));

// ---------------------------------------------------------------------------
// The exact strings the assertions key on (documented per the task's
// requirement to record what the test matches against).
// ---------------------------------------------------------------------------

/** The required handbook marker in the menu label (accepts "Cẩm nang" + "Cẩm nang đi ca"). */
const HANDBOOK_LABEL_MARKER = 'cẩm nang';
/** The current (buggy) menu label the fix must replace. */
const CURRENT_LABEL = 'Bắt đầu nhanh';
/** The trust/safety framing words the handbook label must NOT use. */
const TRUST_SAFETY_MARKERS = ['tin cậy', 'an toàn'];

/**
 * Practical-handbook topic anchors (req 2.7). Each topic is an OR-set of
 * natural Vietnamese phrasings so the fix isn't pinned to one sentence. All
 * of these are ABSENT from the current page (grep-verified).
 */
const WORKER_SATISFY = ['hài lòng', 'vừa lòng']; // satisfying employers
const WORKER_PUNCTUAL = ['đúng giờ']; //             arriving on time
const EMPLOYER_ATTRACT = ['thu hút', 'giữ chân']; // attracting staff
const EMPLOYER_FAIR_PAY = ['hợp lý', 'tương xứng']; // setting appropriate pay

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Surface 1 — the guide menu label (asserted via the i18n VALUE)
// ---------------------------------------------------------------------------

describe('Property 7 (Bug Condition): guide menu label is a practical handbook label', () => {
  it('reads "Cẩm nang" (not "Bắt đầu nhanh" / "Tin cậy & An toàn")', () => {
    const label = t('nav.label.userGuide');

    // EXPECTED (post-fix): the label names a handbook ("Cẩm nang" / "Cẩm nang
    // đi ca"). CURRENT (unfixed): the label is "Bắt đầu nhanh" → FAILS.
    expect(lc(label)).toContain(HANDBOOK_LABEL_MARKER);

    // EXPECTED (post-fix): the old quick-start wording is gone.
    // CURRENT (unfixed): the label IS "Bắt đầu nhanh" → FAILS.
    expect(nfc(label)).not.toBe(nfc(CURRENT_LABEL));

    // EXPECTED (post-fix): the label is NOT framed as trust/safety.
    for (const marker of TRUST_SAFETY_MARKERS) {
      expect(lc(label)).not.toContain(marker);
    }
  });
});

// ---------------------------------------------------------------------------
// Surface 2 — the /user-guide page (rendered)
// ---------------------------------------------------------------------------

describe('Property 7 (Bug Condition): /user-guide is a practical dual-audience handbook', () => {
  it('renders practical WORKER guidance (satisfying employers + punctuality)', () => {
    const { container } = render(<UserGuidePage />);
    const pageText = lc(container.textContent);

    // EXPECTED (post-fix): the handbook coaches workers on satisfying
    // employers and arriving on time. CURRENT (unfixed): the page is a
    // procedural usage walkthrough — none of these anchors appear → FAILS.
    expect(includesAny(pageText, WORKER_SATISFY)).toBe(true);
    expect(includesAny(pageText, WORKER_PUNCTUAL)).toBe(true);
  });

  it('renders practical EMPLOYER guidance (attracting staff + appropriate pay)', () => {
    const { container } = render(<UserGuidePage />);
    const pageText = lc(container.textContent);

    // EXPECTED (post-fix): the handbook coaches employers on attracting staff
    // and setting appropriate pay. CURRENT (unfixed): the page is a procedural
    // usage walkthrough — none of these anchors appear → FAILS.
    expect(includesAny(pageText, EMPLOYER_ATTRACT)).toBe(true);
    expect(includesAny(pageText, EMPLOYER_FAIR_PAY)).toBe(true);
  });
});
