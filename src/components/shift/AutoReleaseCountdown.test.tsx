/**
 * Phase 10C — `<AutoReleaseCountdown/>` tests.
 *
 * Lock down the countdown's display contract so a future Wave 12
 * property test (Requirement 11.12) has a stable foundation:
 *
 *   - Renders text matching `/^\d{2}:\d{2}:\d{2}$/`.
 *   - Decreases when the deterministic clock advances.
 *   - Clamps at `00:00:00` for past timestamps.
 *   - Carries the `data-testid="auto-release-countdown"` handle and
 *     the `aria-label="Đếm ngược tự động thanh toán"` accessible
 *     name.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { AutoReleaseCountdown } from './AutoReleaseCountdown';

const ISO = (ms: number) => new Date(ms).toISOString();

describe('<AutoReleaseCountdown/>', () => {
  it('renders hh:mm:ss for a future deadline', () => {
    const now = 1_700_000_000_000;
    const deadline = now + (1 * 3600 + 23 * 60 + 45) * 1000; // 01:23:45
    render(
      <AutoReleaseCountdown
        autoReleaseAt={ISO(deadline)}
        nowSource={() => now}
      />,
    );
    const span = screen.getByTestId('auto-release-countdown');
    expect(span).toHaveAttribute(
      'aria-label',
      'Đếm ngược tự động thanh toán',
    );
    expect(span.textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(span.textContent).toBe('01:23:45');
  });

  it('clamps at 00:00:00 for past timestamps', () => {
    const now = 1_700_000_000_000;
    render(
      <AutoReleaseCountdown
        autoReleaseAt={ISO(now - 1000)}
        nowSource={() => now}
      />,
    );
    expect(screen.getByTestId('auto-release-countdown').textContent).toBe(
      '00:00:00',
    );
  });

  it('decreases when the deterministic clock advances', () => {
    let now = 1_700_000_000_000;
    const deadline = now + 60_000; // 60 seconds out
    const { rerender } = render(
      <AutoReleaseCountdown
        autoReleaseAt={ISO(deadline)}
        nowSource={() => now}
      />,
    );
    expect(screen.getByTestId('auto-release-countdown').textContent).toBe(
      '00:01:00',
    );

    // Advance the clock by 30s and force a rerender so the new
    // `nowSource` value is observed.
    act(() => {
      now += 30_000;
    });
    rerender(
      <AutoReleaseCountdown
        autoReleaseAt={ISO(deadline)}
        nowSource={() => now}
      />,
    );
    // The component runs an immediate tick on mount so the rerender
    // pulls the fresh `nowSource()` value.
    expect(
      Number(
        (screen.getByTestId('auto-release-countdown').textContent || '00:00:00')
          .split(':')
          .reduce<number>((acc, part) => acc * 60 + Number(part), 0),
      ),
    ).toBeLessThan(60);
  });
});
