/**
 * Feature: checkpoint-readiness-phase-1 — Property 1 (Task 5.4) +
 * example-based coverage for `roleSelectionStore` (Task 5.3).
 *
 * Property 1: Round-trip lựa chọn vai trò.
 * Validates: Requirements 1.4, 1.5, 1.9.
 *
 * For any valid role r, `select(r)` then `hydrate()` (a fresh read from
 * session storage) restores `selectedRole === r`; switching to another
 * role updates immediately without confirmation.
 *
 * Property tests use `fast-check` with `numRuns: 100` minimum and the
 * tag comment format `// Feature: checkpoint-readiness-phase-1,
 * Property N: <text>` per the design's testing strategy.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  useRoleSelectionStore,
  type SelectedRole,
} from '@/stores/roleSelectionStore';
import { CALE_PHASE1_KEYS } from '@/lib/clientStorage';

const arbRole: fc.Arbitrary<SelectedRole> = fc.constantFrom('worker', 'employer');

/** Reset the singleton store + session storage to a neutral baseline. */
function resetStore() {
  window.sessionStorage?.clear?.();
  useRoleSelectionStore.setState({ selectedRole: null, hasHydrated: false });
}

describe('checkpoint-readiness-phase-1 — roleSelectionStore (Task 5.3)', () => {
  beforeEach(resetStore);
  afterEach(resetStore);

  it('defaults selectedRole to null', () => {
    expect(useRoleSelectionStore.getState().selectedRole).toBeNull();
  });

  it("select('worker') stores worker", () => {
    useRoleSelectionStore.getState().select('worker');
    expect(useRoleSelectionStore.getState().selectedRole).toBe('worker');
    expect(window.sessionStorage.getItem(CALE_PHASE1_KEYS.selectedRole)).toBe(
      JSON.stringify('worker'),
    );
  });

  it("select('employer') stores employer", () => {
    useRoleSelectionStore.getState().select('employer');
    expect(useRoleSelectionStore.getState().selectedRole).toBe('employer');
  });

  it('clear() resets to null and removes the stored value', () => {
    useRoleSelectionStore.getState().select('worker');
    useRoleSelectionStore.getState().clear();
    expect(useRoleSelectionStore.getState().selectedRole).toBeNull();
    expect(
      window.sessionStorage.getItem(CALE_PHASE1_KEYS.selectedRole),
    ).toBeNull();
  });

  it('hydrate() restores a valid role persisted in session storage', () => {
    window.sessionStorage.setItem(
      CALE_PHASE1_KEYS.selectedRole,
      JSON.stringify('employer'),
    );
    useRoleSelectionStore.getState().hydrate();
    const state = useRoleSelectionStore.getState();
    expect(state.selectedRole).toBe('employer');
    expect(state.hasHydrated).toBe(true);
  });

  it('hydrate() ignores an invalid stored value and falls back to null', () => {
    window.sessionStorage.setItem(
      CALE_PHASE1_KEYS.selectedRole,
      JSON.stringify('manager'),
    );
    useRoleSelectionStore.getState().hydrate();
    expect(useRoleSelectionStore.getState().selectedRole).toBeNull();
    expect(useRoleSelectionStore.getState().hasHydrated).toBe(true);
  });

  it('select ignores invalid roles (defensive guard)', () => {
    // Cast through unknown to exercise the runtime guard.
    (useRoleSelectionStore.getState().select as (r: unknown) => void)('admin');
    expect(useRoleSelectionStore.getState().selectedRole).toBeNull();
  });

  it('does not crash when session storage is disabled', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('sessionStorage disabled');
      },
    });
    try {
      expect(() => useRoleSelectionStore.getState().select('worker')).not.toThrow();
      // In-memory fallback still holds the value within the store state.
      expect(useRoleSelectionStore.getState().selectedRole).toBe('worker');
      expect(() => useRoleSelectionStore.getState().hydrate()).not.toThrow();
    } finally {
      if (original) {
        Object.defineProperty(window, 'sessionStorage', original);
      } else {
        delete (window as unknown as Record<string, unknown>).sessionStorage;
      }
    }
  });
});

describe('checkpoint-readiness-phase-1 — Property 1: role selection round-trip', () => {
  beforeEach(resetStore);
  afterEach(resetStore);

  // Feature: checkpoint-readiness-phase-1, Property 1: select then re-read restores the same role
  it('round-trips any valid role through select + hydrate', () => {
    fc.assert(
      fc.property(arbRole, (role) => {
        resetStore();
        const store = useRoleSelectionStore.getState();
        store.select(role);
        // Simulate a fresh load: drop in-memory state, then hydrate from
        // the persisted session value.
        useRoleSelectionStore.setState({ selectedRole: null, hasHydrated: false });
        useRoleSelectionStore.getState().hydrate();
        expect(useRoleSelectionStore.getState().selectedRole).toBe(role);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: checkpoint-readiness-phase-1, Property 1: switching role updates immediately (R1.9)
  it('switching to another role updates immediately without confirmation', () => {
    fc.assert(
      fc.property(arbRole, arbRole, (first, second) => {
        resetStore();
        const store = useRoleSelectionStore.getState();
        store.select(first);
        store.select(second);
        expect(useRoleSelectionStore.getState().selectedRole).toBe(second);
      }),
      { numRuns: 100 },
    );
  });
});
