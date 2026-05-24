/**
 * Toast store (Phase 9O initial, hardened in 9P / 9Q / 9R).
 *
 * Phase 9R rewrite — auto-dismiss is now owned by the **store**, not by
 * the `<Toast>` component. The previous design let each component own
 * its own `setTimeout`, which raced against `version` re-renders and
 * occasionally left a stale toast on screen after its progress bar
 * finished. Centralising timer ownership in the store eliminates the
 * race: `show()` schedules a `setTimeout` keyed on the toast id, and
 * every state transition (`dismiss`, `clear`, dedupe re-trigger,
 * `clearByScope`) clears the previous handle before doing anything
 * else. The `Toast` component is now purely presentational.
 *
 * Behaviour:
 *   - **Dedupe.** A new `show` whose `(scope, tone, title, description)`
 *     matches an active toast bumps the existing toast's `version` +
 *     `createdAt` instead of pushing a duplicate. The dismiss timer
 *     is cleared and rescheduled with the refreshed duration so a
 *     repeated trigger always restarts the countdown.
 *   - **Cap.** At most {@link MAX_VISIBLE_TOASTS} toasts on screen.
 *     When exceeded, the oldest non-sticky toast is evicted first.
 *   - **Scopes.** Toasts can carry an optional `scope`. Helpers can
 *     call `clearByScope('auth')` to drop stale auth errors after a
 *     successful login / register / logout, leaving toasts from other
 *     scopes alone.
 *   - **Lifecycle.** Sticky toasts (`duration <= 0`) never schedule
 *     a timer. Every other toast schedules exactly one timer per
 *     `(id, version)` pair; the timer's only side effect is calling
 *     `dismiss(id)` so the store remains the single source of truth.
 *
 * Stable raw selector pattern: components read `toasts` directly and
 * call `useMemo` if they need a derived value. The store does not
 * expose `.filter` / `.map` selectors that would return a fresh array.
 */

import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

/**
 * Phase 9R — optional scope label. Used by `clearByScope` to drop
 * a category of stale toasts (e.g. clearing `auth` errors after a
 * successful login). Free-form so callers can introduce new scopes
 * without changing the store.
 */
export type ToastScope = string;

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  /** Auto-dismiss after ms. 0 = sticky, user must close. */
  duration: number;
  /** Wall-clock ms when the toast was last shown (re-stamped on dedupe). */
  createdAt: number;
  /**
   * Phase 9Q: bumps every time an identical toast is re-triggered.
   * Used by the component as a `key` for the progress-bar animation
   * so it resets cleanly, and as a trigger for the brief "shake" pulse.
   */
  version: number;
  /** Stable dedupe identity: `scope|tone|title|description`. */
  dedupeKey: string;
  /** Phase 9R: optional category label for `clearByScope`. */
  scope?: ToastScope;
}

export interface ShowToastInput {
  tone: ToastTone;
  title: string;
  description?: string;
  /** Override the default duration (success 3000, info/warning 4000, error 5000). */
  duration?: number;
  /** Phase 9R — optional category for bulk clears. */
  scope?: ToastScope;
}

interface ToastStore {
  toasts: ToastItem[];
  show(input: ShowToastInput): string;
  dismiss(id: string): void;
  clear(): void;
  clearByScope(scope: ToastScope): void;
}

const DEFAULT_DURATION_MS: Record<ToastTone, number> = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 5000,
};

/**
 * Phase 10A-Fix-2 — adaptive auto-dismiss bounds.
 *
 * The base per-tone duration is comfortable for short copy ("Đã lưu",
 * "Có lỗi xảy ra"). Longer messages (especially Vietnamese acceptance
 * criteria, error explanations, or multi-line guidance) need more
 * reading time. `computeAdaptiveDuration` extends the base duration
 * proportionally to the content length, then clamps to a sane
 * window so users never face a sub-3s flash or a >9s wait that
 * blocks subsequent toasts.
 */
export const MIN_DURATION_MS = 3000;
export const MAX_DURATION_MS = 9000;

/**
 * Compute the adaptive auto-dismiss duration for a toast based on its
 * tone and copy length.
 *
 *   adaptive = base + 12ms * max(0, length - 40)
 *
 * Where `length = title.length + (description?.length ?? 0)` and
 * `base` is the per-tone default. The result is clamped to
 * `[MIN_DURATION_MS, MAX_DURATION_MS]`.
 *
 * Pure function — no I/O, no clock — so tests can pin behaviour
 * without `vi.useFakeTimers()`.
 */
export function computeAdaptiveDuration(
  tone: ToastTone,
  title: string,
  description?: string,
): number {
  const base = DEFAULT_DURATION_MS[tone];
  const length = (title?.length ?? 0) + (description?.length ?? 0);
  const overhead = 12 * Math.max(0, length - 40);
  const raw = base + overhead;
  if (raw < MIN_DURATION_MS) return MIN_DURATION_MS;
  if (raw > MAX_DURATION_MS) return MAX_DURATION_MS;
  return raw;
}

/** Phase 9Q: hard cap on visible toasts. */
export const MAX_VISIBLE_TOASTS = 4;

let counter = 0;

function nextId(): string {
  counter += 1;
  return `toast-${Date.now().toString(36)}-${counter}`;
}

function dedupeKeyFor(input: ShowToastInput): string {
  return `${input.scope ?? ''}|${input.tone}|${input.title}|${input.description ?? ''}`;
}

// ---------------------------------------------------------------------------
// Phase 9R — store-owned timer registry
// ---------------------------------------------------------------------------
//
// Map<toastId, timeoutHandle> keyed on the store-issued id. We keep the
// registry at module scope (not inside the store state) so the value
// reference stays stable across re-renders and Zustand snapshot
// equality remains intact. The handle type is portable across the
// browser and Node so the same store works in jsdom tests with
// `vi.useFakeTimers()`.
type TimerHandle = ReturnType<typeof setTimeout>;
const timers = new Map<string, TimerHandle>();

function clearTimer(id: string): void {
  const handle = timers.get(id);
  if (handle === undefined) return;
  clearTimeout(handle);
  timers.delete(id);
}

function scheduleDismiss(id: string, duration: number): void {
  // Sticky toasts don't schedule a timer at all.
  if (duration <= 0) return;
  // Always clear any prior timer for this id (dedupe re-triggers reuse
  // the same id with a refreshed duration).
  clearTimer(id);
  const handle = setTimeout(() => {
    timers.delete(id);
    useToastStore.getState().dismiss(id);
  }, duration);
  timers.set(id, handle);
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  show(input) {
    const dedupeKey = dedupeKeyFor(input);
    // Phase 10A-Fix-2: when caller did not pin a duration, derive
    // one from the copy length so long Vietnamese messages get more
    // reading time. Explicit values (including sticky `0`) are kept
    // verbatim.
    const duration =
      input.duration ??
      computeAdaptiveDuration(input.tone, input.title, input.description);
    const now = Date.now();

    const existing = get().toasts.find((t) => t.dedupeKey === dedupeKey);
    if (existing) {
      // Same content already on screen — bump version + createdAt so
      // the component restarts its progress bar / shake. Reschedule
      // the dismiss timer with the refreshed duration; any stale
      // timer from the previous trigger is cleared inside
      // `scheduleDismiss`.
      set((s) => ({
        toasts: s.toasts.map((t) =>
          t.id === existing.id
            ? { ...t, version: t.version + 1, createdAt: now, duration }
            : t,
        ),
      }));
      scheduleDismiss(existing.id, duration);
      return existing.id;
    }

    const id = nextId();
    const item: ToastItem = {
      id,
      tone: input.tone,
      title: input.title,
      description: input.description,
      duration,
      createdAt: now,
      version: 1,
      dedupeKey,
      scope: input.scope,
    };

    // Cap enforcement: keep at most MAX_VISIBLE_TOASTS items. If the
    // queue is full, evict the oldest non-sticky toast first; only
    // fall back to evicting a sticky one when every slot is sticky.
    set((s) => {
      const next = [...s.toasts, item];
      if (next.length <= MAX_VISIBLE_TOASTS) return { toasts: next };
      const idxOldestNonSticky = next.findIndex((t) => t.duration > 0);
      const evictIdx = idxOldestNonSticky !== -1 ? idxOldestNonSticky : 0;
      const evicted = next[evictIdx];
      next.splice(evictIdx, 1);
      // Cancel the evicted toast's timer — otherwise it would later
      // try to dismiss an id that no longer exists in state, which
      // is harmless but pointless.
      clearTimer(evicted.id);
      return { toasts: next };
    });

    scheduleDismiss(id, duration);
    return id;
  },
  dismiss(id) {
    clearTimer(id);
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
  clear() {
    for (const id of timers.keys()) clearTimer(id);
    set({ toasts: [] });
  },
  clearByScope(scope) {
    const matched = get().toasts.filter((t) => t.scope === scope);
    if (matched.length === 0) return;
    for (const t of matched) clearTimer(t.id);
    set((s) => ({ toasts: s.toasts.filter((t) => t.scope !== scope) }));
  },
}));
