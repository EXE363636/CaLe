/**
 * QA-Stabilization-Automation Phase 6C — XSS escaping regression.
 *
 * User-supplied text (shift title here, representative of dispute
 * reason / evidence description / feedback / description) must render
 * as inert text, never as executable markup. The app uses React's
 * default escaping and contains NO `dangerouslySetInnerHTML` (verified
 * by repo grep), so a `<script>`/`<img onerror>` payload appears
 * verbatim as text content with no injected DOM nodes.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ShiftCard } from './ShiftCard';
import type { Shift } from '@/types';

const XSS = '<img src=x onerror="window.__xss=1"> <script>window.__xss=2</script>';

function makeShift(): Shift {
  return {
    id: 'xss-shift',
    employerId: 'employer-1',
    title: XSS,
    description: XSS,
    requirements: '',
    jobType: 'Phục vụ',
    location: XSS,
    district: 'Quận 1',
    date: '2030-06-10',
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 50_000,
    positionsTotal: 2,
    positionsFilled: 0,
    status: 'Published',
    escrowStatus: 'Deposited',
    depositAmount: 200_000,
    createdAt: '2030-01-01T00:00:00.000Z',
    updatedAt: '2030-01-01T00:00:00.000Z',
  };
}

describe('XSS escaping — user text renders inert', () => {
  it('renders an XSS payload as literal text, injects no script/img nodes, and does not execute', () => {
    const { container } = render(<ShiftCard shift={makeShift()} />);

    // The payload is present as TEXT (escaped), not as live DOM.
    // It appears in multiple fields (title + location), so allow ≥1.
    expect(screen.getAllByText(XSS, { exact: false }).length).toBeGreaterThan(0);

    // No actual <script> or onerror <img> node was injected from the
    // user-supplied string.
    expect(container.querySelector('script')).toBeNull();
    const injectedImg = Array.from(container.querySelectorAll('img')).find(
      (img) => img.getAttribute('src') === 'x',
    );
    expect(injectedImg).toBeUndefined();

    // The payload never executed.
    expect(
      (globalThis as unknown as { __xss?: number }).__xss,
    ).toBeUndefined();
  });
});
