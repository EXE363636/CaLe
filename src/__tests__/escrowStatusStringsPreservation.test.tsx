/**
 * Cluster 4 · Task 14 — PRESERVATION baseline test.
 *
 * Property 14 (Preservation) — escrow STATUS strings unchanged.
 *   Validates: Requirements 3.7
 * Property 15 (Preservation) — `/employer/payments` route still resolves.
 *   Validates: Requirements 3.8
 *
 * ---------------------------------------------------------------------------
 * WHY THIS TEST EXISTS (observation-first baseline for a COPY-ONLY cluster)
 * ---------------------------------------------------------------------------
 * Cluster 4 only rewords the payment-GUARANTEE *concept* (the marketing label
 * shown on the NavBar / Footer / `/employer/payments`) and adds a mandatory
 * "no real transactions" demo note. It must NOT touch:
 *
 *   (1) the escrow STATE-MACHINE display strings (the `escrow.*` i18n keys /
 *       `escrowLabel()` / `EscrowStatusBadge`), and
 *   (2) the `/employer/payments` route itself (the page must still resolve,
 *       and the surfaces that link to it must keep the `/employer/payments`
 *       href even as their visible label text changes).
 *
 * This test encodes the CURRENT behavior of both and MUST PASS on the unfixed
 * code. It becomes the regression guard for the wording fix (task 15).
 *
 * ---------------------------------------------------------------------------
 * IMPORTANT — two DIFFERENT concepts share the phrase "đảm bảo thanh toán"
 * ---------------------------------------------------------------------------
 * The escrow STATUS labels `PendingDeposit` ("Chờ đảm bảo thanh toán") and
 * `Deposited` ("Đã đảm bảo thanh toán") intentionally contain the substring
 * "đảm bảo thanh toán" — the SAME phrase the Cluster 4 fix replaces on the
 * payment-guarantee *marketing* surfaces. These escrow status strings are a
 * SEPARATE concept and must survive the wording fix untouched. Pinning them
 * here means a naive global find-replace of "đảm bảo thanh toán" (which would
 * corrupt the state-machine labels) is caught as a regression.
 *
 * This test deliberately does NOT pin the payment-guarantee marketing label
 * (that is exactly what the fix changes) — for the route surfaces it asserts
 * only the `/employer/payments` HREF, never the label text.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { escrowLabel } from '@/i18n/vi';
import { EscrowStatusBadge } from '@/components/shift/EscrowStatusBadge';
import { Footer } from '@/components/layout/Footer';
import { NAV_GROUPS } from '@/components/layout/NavBar';
import EmployerPaymentsPage from '@/app/employer/payments/page';
import type { EscrowStatus } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** NFC-normalize so Vietnamese diacritics compare reliably. */
const nfc = (s: string | null | undefined): string => (s ?? '').normalize('NFC');

/**
 * The CURRENT escrow STATUS labels, pinned exactly as they read today in
 * `src/i18n/vi.ts` (keys `escrow.*`). The `Record<EscrowStatus, string>`
 * annotation makes this map EXHAUSTIVE at compile time: adding or removing an
 * `EscrowStatus` without updating this pin is a TypeScript error, so the
 * baseline can never silently drift out of sync with the enum.
 */
const PINNED_ESCROW_LABELS: Record<EscrowStatus, string> = {
  PendingDeposit: 'Chờ đảm bảo thanh toán',
  Deposited: 'Đã đảm bảo thanh toán',
  InProgress: 'Đang xử lý',
  Completed: 'Đã hoàn tất',
  Released: 'Đã thanh toán',
  Disputed: 'Đang tranh chấp',
  Refunded: 'Đã hoàn tiền',
};

const ESCROW_STATUSES = Object.keys(PINNED_ESCROW_LABELS) as EscrowStatus[];

const PAYMENTS_HREF = '/employer/payments';
// The Footer's employer info links were consolidated onto the user-guide;
// the "payments" entry now deep-links to that guide's payments anchor while
// the live `/employer/payments` route stays reachable from the NavBar.
const FOOTER_PAYMENTS_HREF = '/user-guide#employer-payments';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Property 14 — escrow STATUS strings unchanged (Req 3.7)
// ---------------------------------------------------------------------------

describe('Property 14 (Preservation): escrow STATUS strings unchanged', () => {
  it.each(ESCROW_STATUSES)(
    'escrowLabel("%s") returns its current pinned string (i18n source)',
    (status) => {
      // The i18n helper is the canonical source of the state-machine display
      // string (`escrowLabel` → t(`escrow.${status}`)).
      expect(nfc(escrowLabel(status))).toBe(nfc(PINNED_ESCROW_LABELS[status]));
    },
  );

  it.each(ESCROW_STATUSES)(
    'EscrowStatusBadge renders the current pinned label for "%s" (display surface)',
    (status) => {
      // The badge is the on-screen surface that shows the escrow status; pin
      // the rendered text so the display can't drift either.
      const { container } = render(<EscrowStatusBadge status={status} />);
      expect(nfc(container.textContent)).toBe(nfc(PINNED_ESCROW_LABELS[status]));
    },
  );
});

// ---------------------------------------------------------------------------
// Property 15 — /employer/payments route still resolves (Req 3.8)
// ---------------------------------------------------------------------------

describe('Property 15 (Preservation): /employer/payments route still resolves', () => {
  it('the page module default export is a component (function)', () => {
    expect(typeof EmployerPaymentsPage).toBe('function');
  });

  it('the page renders to a valid page (an <h1> heading is present)', () => {
    render(<EmployerPaymentsPage />);
    // A rendered <h1> proves the module resolves to a real, mountable page —
    // independent of the h1's exact wording (which the fix is allowed to change).
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('the NavBar employer menu still links to /employer/payments (href preserved)', () => {
    // Assert only the HREF — the label text is what the wording fix changes.
    const item = NAV_GROUPS.employer.items.find((i) => i.href === PAYMENTS_HREF);
    expect(item).toBeTruthy();
  });

  it('the Footer keeps a payments entry (now the user-guide payments anchor)', () => {
    // The footer's employer links were consolidated onto the user guide, so
    // the payments entry deep-links there rather than to the live route (which
    // stays reachable from the NavBar, asserted above). Assert only the HREF —
    // the label text is what the wording fix changes.
    const { container } = render(<Footer />);
    const link = container.querySelector(`a[href="${FOOTER_PAYMENTS_HREF}"]`);
    expect(link).not.toBeNull();
  });
});
