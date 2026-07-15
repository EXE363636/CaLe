// Feature: checkpoint-readiness-phase-1, Task 5.3 — landing role-selection
// store.
//
// Holds the visitor's chosen landing role ("worker" / "employer") for the
// current browser session (R1.4/R1.5/R1.9). Persistence goes through the
// Phase 1 `clientStorage` adapter at scope `session` — NOT the central
// `persistence.ts` snapshot (no STORAGE_KEYS, no SCHEMA_VERSION bump, no
// AppHydrator wiring). Each consumer hydrates this store itself inside a
// client `useEffect`, so the first server render stays neutral and avoids
// hydration mismatch (design: "Tích hợp hydration").
//
// No `window` / storage access at module top level — all access is funneled
// through `clientStorage`, which is itself SSR-safe. If storage is disabled
// the store still works in-memory and simply won't persist across reloads.

import { create } from 'zustand';

import {
  CALE_PHASE1_KEYS,
  clientStorage,
  removeClientStorageItem,
} from '@/lib/clientStorage';

export type SelectedRole = 'worker' | 'employer';

const VALID_ROLES: readonly SelectedRole[] = ['worker', 'employer'];

/** Narrows an unknown persisted value to a valid role, else `null`. */
function coerceRole(value: unknown): SelectedRole | null {
  return typeof value === 'string' && VALID_ROLES.includes(value as SelectedRole)
    ? (value as SelectedRole)
    : null;
}

interface RoleSelectionStore {
  /** Currently selected landing role; `null` = neutral (not chosen). */
  selectedRole: SelectedRole | null;
  /**
   * Whether `hydrate()` has run on the client. Lets UI keep the neutral
   * first paint until the persisted role is applied (avoids hydration
   * mismatch).
   */
  hasHydrated: boolean;
  /** Select a role and persist it for the session (R1.4/R1.9). */
  select(role: SelectedRole): void;
  /** Clear the selection and remove it from storage. */
  clear(): void;
  /** Restore the persisted role from session storage (client-only). */
  hydrate(): void;
}

export const useRoleSelectionStore = create<RoleSelectionStore>((set) => ({
  selectedRole: null,
  hasHydrated: false,

  select(role) {
    // Guard against bad callers; only persist valid roles.
    const next = coerceRole(role);
    if (next === null) return;
    set({ selectedRole: next });
    clientStorage.set(CALE_PHASE1_KEYS.selectedRole, next, 'session');
  },

  clear() {
    set({ selectedRole: null });
    removeClientStorageItem(CALE_PHASE1_KEYS.selectedRole, { scope: 'session' });
  },

  hydrate() {
    const stored = clientStorage.get<unknown>(
      CALE_PHASE1_KEYS.selectedRole,
      null,
      'session',
    );
    set({ selectedRole: coerceRole(stored), hasHydrated: true });
  },
}));
