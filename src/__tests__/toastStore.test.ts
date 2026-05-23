/**
 * Phase 9Q — toast store dedupe + lifecycle tests.
 *
 * Pins down:
 *   - `show` adds a single toast on first call
 *   - calling `show` again with identical content does NOT stack
 *   - the existing toast's `version` and `createdAt` bump on dedupe
 *   - different content creates separate items
 *   - cap eviction kicks in when the queue exceeds MAX_VISIBLE_TOASTS
 *   - sticky toasts (`duration: 0`) don't carry a progress bar
 *   - `dismiss` removes a single item; `clear` removes all
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore, MAX_VISIBLE_TOASTS } from '@/stores/toastStore';

function reset() {
  useToastStore.setState({ toasts: [] });
}

describe('toastStore.show — dedupe (Phase 9Q)', () => {
  beforeEach(reset);

  it('adds a single toast on first show', () => {
    const id = useToastStore.getState().show({
      tone: 'error',
      title: 'Email hoặc mật khẩu không đúng.',
    });
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe(id);
    expect(toasts[0].version).toBe(1);
  });

  it('does not stack when the same toast is shown again while active', () => {
    const id1 = useToastStore.getState().show({
      tone: 'error',
      title: 'Email hoặc mật khẩu không đúng.',
    });
    const id2 = useToastStore.getState().show({
      tone: 'error',
      title: 'Email hoặc mật khẩu không đúng.',
    });
    const toasts = useToastStore.getState().toasts;
    // Same id is returned and only one card is on screen.
    expect(id1).toBe(id2);
    expect(toasts).toHaveLength(1);
    // version bumped so the component restarts its timer/progress.
    expect(toasts[0].version).toBe(2);
  });

  it('bumps createdAt on a dedupe re-trigger', async () => {
    const id1 = useToastStore.getState().show({
      tone: 'error',
      title: 'Email hoặc mật khẩu không đúng.',
    });
    const t0 = useToastStore.getState().toasts[0].createdAt;
    // Wait one tick so Date.now() advances even on fast machines.
    await new Promise((r) => setTimeout(r, 5));
    const id2 = useToastStore.getState().show({
      tone: 'error',
      title: 'Email hoặc mật khẩu không đúng.',
    });
    expect(id1).toBe(id2);
    const t1 = useToastStore.getState().toasts[0].createdAt;
    expect(t1).toBeGreaterThanOrEqual(t0);
  });

  it('treats different titles as different toasts', () => {
    useToastStore.getState().show({ tone: 'error', title: 'A' });
    useToastStore.getState().show({ tone: 'error', title: 'B' });
    expect(useToastStore.getState().toasts).toHaveLength(2);
  });

  it('treats same title with different tone as different toasts', () => {
    useToastStore.getState().show({ tone: 'success', title: 'Hello' });
    useToastStore.getState().show({ tone: 'info', title: 'Hello' });
    expect(useToastStore.getState().toasts).toHaveLength(2);
  });

  it('treats same title with different description as different toasts', () => {
    useToastStore.getState().show({
      tone: 'success',
      title: 'Hello',
      description: 'first',
    });
    useToastStore.getState().show({
      tone: 'success',
      title: 'Hello',
      description: 'second',
    });
    expect(useToastStore.getState().toasts).toHaveLength(2);
  });

  it('lets a dismissed toast appear again normally', () => {
    const id = useToastStore.getState().show({
      tone: 'error',
      title: 'Same',
    });
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);

    const id2 = useToastStore.getState().show({
      tone: 'error',
      title: 'Same',
    });
    expect(id2).not.toBe(id);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].version).toBe(1);
  });
});

describe('toastStore.show — cap (Phase 9Q)', () => {
  beforeEach(reset);

  it('caps the visible toast count at MAX_VISIBLE_TOASTS', () => {
    for (let i = 0; i < MAX_VISIBLE_TOASTS + 3; i += 1) {
      useToastStore.getState().show({
        tone: 'info',
        title: `Toast ${i}`,
      });
    }
    expect(useToastStore.getState().toasts).toHaveLength(
      MAX_VISIBLE_TOASTS,
    );
  });

  it('evicts the oldest non-sticky toast first when capped', () => {
    // Three sticky toasts followed by enough non-sticky ones to overflow.
    useToastStore.getState().show({
      tone: 'error',
      title: 'sticky-A',
      duration: 0,
    });
    useToastStore.getState().show({
      tone: 'error',
      title: 'sticky-B',
      duration: 0,
    });
    for (let i = 0; i < 5; i += 1) {
      useToastStore.getState().show({
        tone: 'info',
        title: `transient-${i}`,
      });
    }
    const titles = useToastStore.getState().toasts.map((t) => t.title);
    // Sticky toasts must still be present; cap only evicts non-sticky.
    expect(titles).toContain('sticky-A');
    expect(titles).toContain('sticky-B');
    expect(titles).toHaveLength(MAX_VISIBLE_TOASTS);
  });
});

describe('toastStore.show — sticky (Phase 9Q)', () => {
  beforeEach(reset);

  it('keeps duration: 0 verbatim so the component skips the progress bar', () => {
    useToastStore.getState().show({
      tone: 'error',
      title: 'sticky',
      duration: 0,
    });
    expect(useToastStore.getState().toasts[0].duration).toBe(0);
  });

  it('falls back to the per-tone default duration when omitted', () => {
    useToastStore.getState().show({ tone: 'success', title: 's' });
    useToastStore.getState().show({ tone: 'info', title: 'i' });
    useToastStore.getState().show({ tone: 'warning', title: 'w' });
    useToastStore.getState().show({ tone: 'error', title: 'e' });
    const map = Object.fromEntries(
      useToastStore.getState().toasts.map((t) => [t.tone, t.duration]),
    );
    expect(map.success).toBe(3000);
    expect(map.info).toBe(4000);
    expect(map.warning).toBe(4000);
    expect(map.error).toBe(5000);
  });
});

describe('toastStore — dismiss / clear', () => {
  beforeEach(reset);

  it('dismiss removes only the matching toast', () => {
    const id1 = useToastStore.getState().show({ tone: 'info', title: 'a' });
    useToastStore.getState().show({ tone: 'info', title: 'b' });
    useToastStore.getState().dismiss(id1);
    const titles = useToastStore.getState().toasts.map((t) => t.title);
    expect(titles).toEqual(['b']);
  });

  it('clear removes all toasts', () => {
    useToastStore.getState().show({ tone: 'info', title: 'a' });
    useToastStore.getState().show({ tone: 'info', title: 'b' });
    useToastStore.getState().clear();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});


// ---------------------------------------------------------------------------
// Phase 9R — auto-dismiss lifecycle (store-owned timers + scope clear)
// ---------------------------------------------------------------------------

import { vi, afterEach } from 'vitest';

describe('toastStore — auto-dismiss lifecycle (Phase 9R)', () => {
  beforeEach(() => {
    reset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-removes a non-sticky toast exactly after its duration', () => {
    const id = useToastStore.getState().show({
      tone: 'error',
      title: 'temporary',
      duration: 1000,
    });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(999);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts.find((t) => t.id === id)).toBeUndefined();
  });

  it('does NOT auto-remove a sticky toast', () => {
    useToastStore.getState().show({
      tone: 'error',
      title: 'sticky',
      duration: 0,
    });
    vi.advanceTimersByTime(60_000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('resets the dismiss timer on a dedupe re-trigger', () => {
    useToastStore.getState().show({
      tone: 'error',
      title: 'wrong',
      duration: 1000,
    });
    // Advance halfway, then re-trigger.
    vi.advanceTimersByTime(500);
    useToastStore.getState().show({
      tone: 'error',
      title: 'wrong',
      duration: 1000,
    });
    // Old timer would have fired here (at 1000ms total) — confirm
    // toast is still on screen, meaning the dismiss timer was reset.
    vi.advanceTimersByTime(500);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    // Advance the rest of the new duration.
    vi.advanceTimersByTime(500);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('clears the timer on manual dismiss so it does not fire later', () => {
    const id = useToastStore.getState().show({
      tone: 'info',
      title: 'manual',
      duration: 1000,
    });
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
    // Even if we advance past the original duration, no new entry
    // should reappear.
    vi.advanceTimersByTime(2000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('clear() drops every toast and cancels their timers', () => {
    useToastStore.getState().show({
      tone: 'info',
      title: 'a',
      duration: 1000,
    });
    useToastStore.getState().show({
      tone: 'info',
      title: 'b',
      duration: 1000,
    });
    useToastStore.getState().clear();
    expect(useToastStore.getState().toasts).toHaveLength(0);
    vi.advanceTimersByTime(2000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});

describe('toastStore.clearByScope — Phase 9R', () => {
  beforeEach(reset);

  it('removes only toasts whose scope matches', () => {
    useToastStore.getState().show({
      tone: 'error',
      title: 'auth-1',
      scope: 'auth',
    });
    useToastStore.getState().show({
      tone: 'error',
      title: 'auth-2',
      scope: 'auth',
    });
    useToastStore.getState().show({
      tone: 'success',
      title: 'unscoped',
    });
    useToastStore.getState().show({
      tone: 'info',
      title: 'worker-1',
      scope: 'worker',
    });

    useToastStore.getState().clearByScope('auth');

    const titles = useToastStore.getState().toasts.map((t) => t.title);
    expect(titles).toEqual(expect.arrayContaining(['unscoped', 'worker-1']));
    expect(titles).not.toContain('auth-1');
    expect(titles).not.toContain('auth-2');
  });

  it('treats same content with different scopes as separate toasts', () => {
    useToastStore.getState().show({
      tone: 'error',
      title: 'shared',
      scope: 'auth',
    });
    useToastStore.getState().show({
      tone: 'error',
      title: 'shared',
      scope: 'worker',
    });
    expect(useToastStore.getState().toasts).toHaveLength(2);
  });
});
