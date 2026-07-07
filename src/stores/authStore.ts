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
  /** Phase 6: defaults to `'individual'` when omitted. */
  employerType?: 'individual' | 'business';
  /**
   * Phase 10A-Fix-3: canonical 4-value account shape selected at
   * registration. Required when `role === 'employer'`. The auth store
   * persists this onto `Employer.employerType10A` so the new posting
   * guard never has to fall back to the first-set picker.
   */
  employerType10A?: 'Individual' | 'HouseholdBusiness' | 'Company' | 'AgencyEvent';
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
    input.businessType.trim() !== '' &&
    // Phase 10A-Fix-3: employer type is now mandatory at registration.
    // The four canonical shapes drive the verification queue and the
    // posting-guard rules; allowing an employer to slip through without
    // a type would re-introduce the inconsistent state Phase 10A-Fix-2
    // closed.
    (input.employerType10A === 'Individual' ||
      input.employerType10A === 'HouseholdBusiness' ||
      input.employerType10A === 'Company' ||
      input.employerType10A === 'AgencyEvent')
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
    // Phase 9P — auth correctness fix.
    //
    // Previous code returned a generic INVALID_CREDENTIALS only when the
    // email didn't match a user, but treated `mock-hash:demo` as a
    // universal password — so any random password was accepted for any
    // seed account. That was a real auth bug, not just a demo shortcut.
    //
    // New rule:
    //   1. Empty / non-string password → INVALID_CREDENTIALS.
    //   2. Email must resolve to a user — but we don't reveal that to the
    //      caller (always return INVALID_CREDENTIALS, never a "no such
    //      account" error) so attackers can't enumerate registered
    //      emails.
    //   3. Password must match the stored `mock-hash:<password>` exactly.
    //   4. Only after credentials match do we surface SUSPENDED. A
    //      suspended account with a wrong password still returns
    //      INVALID_CREDENTIALS so the suspension state isn't leaked.
    //
    // Demo accounts keep `passwordHash: "mock-hash:demo"` in seed data;
    // typing `demo` still works for them but nothing else does.
    if (typeof password !== 'string' || password.length === 0) {
      return { ok: false, error: 'INVALID_CREDENTIALS' };
    }

    const trimmedEmail = (email ?? '').trim().toLowerCase();
    if (trimmedEmail === '') {
      return { ok: false, error: 'INVALID_CREDENTIALS' };
    }

    const user = useUserStore.getState().findByEmail(trimmedEmail);
    if (!user) {
      return { ok: false, error: 'INVALID_CREDENTIALS' };
    }

    const expected = `mock-hash:${password}`;
    if (user.passwordHash !== expected) {
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
        // Phase 6: default to individual / freelance — matches the
        // register form's default selection.
        employerType: input.employerType ?? 'individual',
        // Phase 10A-Fix-3: canonical 4-shape stored at registration so
        // the posting guard never sees a missing type for new accounts.
        // `isEmployerInput` already validated this is one of the four
        // canonical values.
        employerType10A: input.employerType10A,
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

/**
 * Resolves the currently authenticated user. Returns `null` when nobody is
 * signed in *or* when the persisted `currentUserId` no longer matches a real
 * user (stale localStorage). Components should prefer this over reading
 * `currentUserId` directly when deciding whether to show logged-in chrome.
 */
export function useCurrentUser(): User | null {
  const id = useAuthStore((s) => s.currentUserId);
  return useUserStore((s) => (id ? (s.findById(id) ?? null) : null));
}
