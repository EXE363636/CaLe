/**
 * Authentication store for the CaLẻ / ShiftNow MVP.
 *
 * Mock authentication only — passwords are not hashed and the "session"
 * lives in localStorage via `data/persistence.ts`. Real password hashing,
 * CSRF, and HTTPS enforcement are documented as deferred (Req 30, Open
 * Questions in design.md).
 *
 * Exposes:
 *  - `currentUser`        — the logged-in `User`, or `null`
 *  - `login(email, pw)`   — looks up the user, blocks if suspended
 *  - `register(input)`    — creates a Worker / Employer (Admin signup is
 *                           disallowed; admins are seeded only)
 *  - `logout()`           — clears the session
 *  - `touch()`            — bumps `lastActivityAt` for idle-timeout (Req 30.2)
 */

import { create } from 'zustand';

import {
  STORAGE_KEYS,
  read,
  write,
  type AuthState as PersistedAuthState,
} from '@/data/persistence';
import { newPrefixedId } from '@/lib/ids';
import type { Result, Role, User, Worker, Employer } from '@/types';

import { useUserStore } from './userStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LoginError =
  | 'INVALID_CREDENTIALS'
  | 'SUSPENDED';

export type RegisterError =
  | 'EMAIL_TAKEN'
  | 'INVALID_ROLE'
  | 'INVALID_INPUT';

/**
 * Subset of fields collected at registration. The store backfills sensible
 * defaults (initial reputation, empty arrays, etc.) before persisting.
 */
export interface RegisterInput {
  role: 'worker' | 'employer';
  email: string;
  phone: string;
  password: string;
  /** Required for `role === 'worker'`. */
  fullName?: string;
  /** Required for `role === 'employer'`. */
  companyName?: string;
  /** Required for `role === 'employer'`. */
  businessType?: string;
}

interface AuthStore {
  currentUserId: string | null;
  lastActivityAt: string | null;

  /** Computed accessor — convenience over `currentUserId`. */
  currentUser: () => User | null;

  login(email: string, password: string): Result<User, LoginError>;
  register(input: RegisterInput): Result<User, RegisterError>;
  logout(): void;
  touch(): void;

  /** Hydrate the slice from a persisted snapshot. Called by `<AppHydrator>`. */
  hydrate(state: PersistedAuthState): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Current ISO 8601 timestamp. */
const nowIso = (): string => new Date().toISOString();

function persistAuth(currentUserId: string | null, lastActivityAt: string | null): void {
  const payload: PersistedAuthState = { currentUserId, lastActivityAt };
  write(STORAGE_KEYS.auth, payload);
}

function isWorkerInput(input: RegisterInput): boolean {
  return input.role === 'worker' && typeof input.fullName === 'string' && input.fullName.trim() !== '';
}

function isEmployerInput(input: RegisterInput): boolean {
  return (
    input.role === 'employer' &&
    typeof input.companyName === 'string' &&
    input.companyName.trim() !== '' &&
    typeof input.businessType === 'string' &&
    input.businessType.trim() !== ''
  );
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthStore>((set, get) => ({
  currentUserId: null,
  lastActivityAt: null,

  currentUser: () => {
    const id = get().currentUserId;
    if (!id) return null;
    return useUserStore.getState().findById(id) ?? null;
  },

  login(email, password) {
    const user = useUserStore.getState().findByEmail(email);
    if (!user) return { ok: false, error: 'INVALID_CREDENTIALS' };

    // Mock check: passwords are stored as `mock-hash:<password>` placeholders.
    const expected = `mock-hash:${password}`;
    if (user.passwordHash !== expected && user.passwordHash !== 'mock-hash:demo') {
      return { ok: false, error: 'INVALID_CREDENTIALS' };
    }

    if (user.suspended) {
      return { ok: false, error: 'SUSPENDED' };
    }

    const ts = nowIso();
    set({ currentUserId: user.id, lastActivityAt: ts });
    persistAuth(user.id, ts);
    return { ok: true, value: user };
  },

  register(input) {
    if (input.role !== 'worker' && input.role !== 'employer') {
      return { ok: false, error: 'INVALID_ROLE' };
    }

    const trimmedEmail = (input.email ?? '').trim().toLowerCase();
    if (
      trimmedEmail === '' ||
      typeof input.phone !== 'string' ||
      typeof input.password !== 'string' ||
      input.password.length < 8
    ) {
      return { ok: false, error: 'INVALID_INPUT' };
    }

    if (input.role === 'worker' && !isWorkerInput(input)) {
      return { ok: false, error: 'INVALID_INPUT' };
    }
    if (input.role === 'employer' && !isEmployerInput(input)) {
      return { ok: false, error: 'INVALID_INPUT' };
    }

    const userStore = useUserStore.getState();
    if (userStore.findByEmail(trimmedEmail)) {
      return { ok: false, error: 'EMAIL_TAKEN' };
    }

    const created = nowIso();
    const passwordHash = `mock-hash:${input.password}`;

    let newUser: User;
    if (input.role === 'worker') {
      const worker: Worker = {
        id: newPrefixedId('worker'),
        role: 'worker',
        email: trimmedEmail,
        phone: input.phone,
        passwordHash,
        suspended: false,
        createdAt: created,
        fullName: input.fullName!.trim(),
        skills: [],
        preferredJobTypes: [],
        preferredLocations: [],
        verifications: [],
        reputationScore: 100,
        completedShiftCount: 0,
        ratingsReceived: [],
        cancellationHistory: [],
        noShowCount: 0,
      };
      newUser = worker;
    } else {
      const employer: Employer = {
        id: newPrefixedId('employer'),
        role: 'employer',
        email: trimmedEmail,
        phone: input.phone,
        passwordHash,
        suspended: false,
        createdAt: created,
        companyName: input.companyName!.trim(),
        businessType: input.businessType!.trim(),
        verifiedBusiness: false,
        boostCredits: 0,
      };
      newUser = employer;
    }

    userStore.addUser(newUser);

    set({ currentUserId: newUser.id, lastActivityAt: created });
    persistAuth(newUser.id, created);
    return { ok: true, value: newUser };
  },

  logout() {
    set({ currentUserId: null, lastActivityAt: null });
    persistAuth(null, null);
  },

  touch() {
    if (!get().currentUserId) return;
    const ts = nowIso();
    set({ lastActivityAt: ts });
    persistAuth(get().currentUserId, ts);
  },

  hydrate(state) {
    set({
      currentUserId: state.currentUserId,
      lastActivityAt: state.lastActivityAt,
    });
  },
}));

/** Convenience selector for components that only need the role. */
export function useCurrentRole(): Role | null {
  const id = useAuthStore((s) => s.currentUserId);
  const user = useUserStore((s) => (id ? s.findById(id) : null));
  return user?.role ?? null;
}
