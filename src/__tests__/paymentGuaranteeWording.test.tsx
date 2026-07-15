/**
 * Cluster 4 · Task 13 — EXPLORATION (bug-condition) test.
 *
 * Property 6 (Bug Condition) — "Payment-guarantee wording + demo note".
 *
 * Validates: Requirements 1.6, 2.6
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS TEST ENCODES (the correct, post-fix behavior)
 * ---------------------------------------------------------------------------
 * Every surface that presents the payment-guarantee concept — the NavBar
 * employer menu, the site Footer, and the `/employer/payments` page — must:
 *
 *   (1) use the clearer standardized wording instead of the confusing
 *       "Đảm bảo thanh toán" / "Mô phỏng đảm bảo thanh toán" label, and
 *   (2) ALWAYS include the mandatory demo note
 *       "Trong MVP/demo không có giao dịch thật.".
 *
 * Per design.md "Cluster 4 — Payment/escrow wording" and bugfix.md req 2.6,
 * the standardized label is one of a family of phrasings (e.g.
 * "Giữ tiền ca làm (mô phỏng)", "Tiền ca được giữ tạm trong demo", or
 * "Mô phỏng giữ tiền để đảm bảo trả công"). Because the exact final phrase
 * is not pinned to a single string, this test encodes the two invariants
 * that hold for EVERY member of that family:
 *
 *   - the surface no longer presents the confusing phrase "đảm bảo thanh toán"
 *     as the payment-guarantee LABEL (none of the standardized candidates
 *     contain that substring — the closest, "…đảm bảo trả công", does not), and
 *   - the surface carries the exact no-real-transactions note.
 *
 * Those two invariants are the robust, fix-agnostic encoding of Property 6.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS EXPECTED TO FAIL ON THE CURRENT (UNFIXED) CODE
 * ---------------------------------------------------------------------------
 * All three surfaces currently ship the confusing wording and NONE carries
 * the standardized demo note (confirmed by inspecting the sources + grepping
 * the repo — the exact string "Trong MVP/demo không có giao dịch thật."
 * appears nowhere in `src/`):
 *
 *   • NavBar  (src/components/layout/NavBar.tsx) — the employer menu group's
 *     `/employer/payments` item is `label: 'Đảm bảo thanh toán'`,
 *     `description: 'Cấp độ tin cậy và tỷ lệ đảm bảo thanh toán'`. No note.
 *   • Footer  (src/components/layout/Footer.tsx) — the employer column link
 *     is `label: 'Đảm bảo thanh toán'`. The only demo-ish note present is
 *     about localStorage persistence ("Dữ liệu demo đang lưu trên trình
 *     duyệt…"), not the no-real-transactions note. No note.
 *   • /employer/payments (src/app/employer/payments/page.tsx) — the page
 *     title (h1) is "Đảm bảo thanh toán"; the closest disclaimer reads
 *     "Mọi giao dịch tiền tệ trên CaLẻ hiện tại là mô phỏng." — which is NOT
 *     the standardized note. No note.
 *
 * Each assertion below therefore FAILS on current code. That FAILURE is the
 * counterexample proving the bug exists. This test is NOT fixed here — the
 * SAME test later validates the fix (tasks 15.1 / 15.2).
 *
 * ---------------------------------------------------------------------------
 * WHY THE NAVBAR SURFACE IS ASSERTED VIA `NAV_GROUPS`
 * ---------------------------------------------------------------------------
 * `NAV_GROUPS` is the export `NavBar.tsx` publishes explicitly "for tests /
 * docs"; `NAV_GROUPS.employer` is the canonical employer-menu definition that
 * carries the payment-guarantee item. Rendering the whole `<NavBar/>` would
 * (a) require a Next.js router context and (b) pull in a SEPARATE component,
 * `<MobileNav/>` (a different file, outside this cluster's fix scope), which
 * also renders the concept — making a rendered-DOM assertion cross-file and
 * non-deterministic. Asserting on the sanctioned `NAV_GROUPS` export keeps
 * the NavBar check deterministic and correctly scoped to `NavBar.tsx`. The
 * Footer and payments-page surfaces ARE rendered (they have no router deps).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Footer } from '@/components/layout/Footer';
import EmployerPaymentsPage from '@/app/employer/payments/page';
import { NAV_GROUPS } from '@/components/layout/NavBar';

// ---------------------------------------------------------------------------
// The exact strings the assertions key on (recorded here per the task's
// requirement to document what the test matches against).
// ---------------------------------------------------------------------------

/** Unicode-normalize so Vietnamese diacritics compare reliably (NFC). */
const nfc = (s: string | null | undefined): string => (s ?? '').normalize('NFC');
/** NFC + lower-case for case-insensitive substring checks. */
const lc = (s: string | null | undefined): string => nfc(s).toLowerCase();

/**
 * The mandatory demo note (req 2.6 / Property 6). Matched WITHOUT the trailing
 * period so a punctuation nuance (period rendered in a sibling node) never
 * masks the real signal. Absent from every surface today → assertions FAIL.
 */
const DEMO_NOTE = nfc('Trong MVP/demo không có giao dịch thật');

/**
 * The confusing payment-guarantee label the fix must replace. Lower-cased so a
 * single check catches both "Đảm bảo thanh toán" and "Mô phỏng đảm bảo thanh
 * toán". None of the standardized replacement phrasings contain this substring.
 */
const CONFUSING_LABEL = lc('Đảm bảo thanh toán'); // 'đảm bảo thanh toán'

const PAYMENTS_HREF = '/employer/payments';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Surface 1 — NavBar employer menu (asserted via the NAV_GROUPS export)
// ---------------------------------------------------------------------------

describe('Property 6 (Bug Condition): NavBar payment-guarantee wording + demo note', () => {
  it('the employer-menu payment item uses clearer wording (not "Đảm bảo thanh toán")', () => {
    const paymentItem = NAV_GROUPS.employer.items.find(
      (item) => item.href === PAYMENTS_HREF,
    );
    expect(paymentItem).toBeTruthy();

    // EXPECTED (post-fix): the label/description use the standardized wording.
    // CURRENT (unfixed): label = "Đảm bảo thanh toán", description =
    // "Cấp độ tin cậy và tỷ lệ đảm bảo thanh toán" → this assertion FAILS.
    const itemText = lc(`${paymentItem?.label ?? ''} ${paymentItem?.description ?? ''}`);
    expect(itemText).not.toContain(CONFUSING_LABEL);
  });

  it('the employer menu includes the no-real-transactions demo note', () => {
    // EXPECTED (post-fix): the demo note appears in the employer menu wherever
    // the payment-guarantee concept is presented.
    // CURRENT (unfixed): no item label/description carries the note → FAILS.
    const groupText = nfc(
      NAV_GROUPS.employer.items
        .map((item) => `${item.label} ${item.description ?? ''}`)
        .join(' '),
    );
    expect(groupText).toContain(DEMO_NOTE);
  });
});

// ---------------------------------------------------------------------------
// Surface 2 — Footer employer column (rendered)
// ---------------------------------------------------------------------------

describe('Property 6 (Bug Condition): Footer payment-guarantee wording + demo note', () => {
  it('the footer uses clearer wording (no "Đảm bảo thanh toán" label)', () => {
    const { container } = render(<Footer />);

    // EXPECTED (post-fix): the payment-guarantee entry no longer uses the
    // confusing label. CURRENT (unfixed): the employer-column link is exactly
    // "Đảm bảo thanh toán" → this assertion FAILS.
    expect(lc(container.textContent)).not.toContain(CONFUSING_LABEL);
  });

  it('the footer includes the no-real-transactions demo note', () => {
    const { container } = render(<Footer />);

    // EXPECTED (post-fix): the footer carries the mandatory demo note.
    // CURRENT (unfixed): only a localStorage-persistence note exists → FAILS.
    expect(nfc(container.textContent)).toContain(DEMO_NOTE);
  });
});

// ---------------------------------------------------------------------------
// Surface 3 — /employer/payments page (rendered)
// ---------------------------------------------------------------------------

describe('Property 6 (Bug Condition): /employer/payments wording + demo note', () => {
  it('the page title uses clearer wording (not "Đảm bảo thanh toán")', () => {
    render(<EmployerPaymentsPage />);
    const heading = screen.getByRole('heading', { level: 1 });

    // EXPECTED (post-fix): the primary label (page title) is standardized.
    // CURRENT (unfixed): the h1 is "Đảm bảo thanh toán" → this assertion FAILS.
    expect(lc(heading.textContent)).not.toContain(CONFUSING_LABEL);
  });

  it('the page includes the no-real-transactions demo note', () => {
    const { container } = render(<EmployerPaymentsPage />);

    // EXPECTED (post-fix): the page carries the mandatory demo note.
    // CURRENT (unfixed): the disclaimer reads "Mọi giao dịch tiền tệ … là mô
    // phỏng.", not the standardized note → this assertion FAILS.
    expect(nfc(container.textContent)).toContain(DEMO_NOTE);
  });
});
