/**
 * User store — owns the in-memory list of `User` records.
 *
 * Pulled out of `authStore` so other stores (applications, ratings, admin)
 * can read worker / employer profiles without circular imports through
 * the auth slice. The auth slice still exposes the *currently* logged-in
 * user via `authStore.currentUser`.
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import { MAX_SCORE, MIN_SCORE } from '@/domain/reputation';
import type { User, Worker, Employer } from '@/types';

interface UserStore {
  users: User[];

  findById(id: string): User | undefined;
  findByEmail(email: string): User | undefined;

  addUser(user: User): void;
  updateUser(id: string, patch: Partial<User>): void;
  setSuspended(id: string, suspended: boolean): void;

  /** Hydrate the slice from a persisted snapshot. */
  hydrate(users: User[]): void;
}

function persist(users: User[]): void {
  write(STORAGE_KEYS.users, users);
}

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],

  findById(id) {
    return get().users.find((u) => u.id === id);
  },

  findByEmail(email) {
    const target = email.trim().toLowerCase();
    return get().users.find((u) => u.email.toLowerCase() === target);
  },

  addUser(user) {
    const next = [...get().users, user];
    set({ users: next });
    persist(next);
  },

  updateUser(id, patch) {
    const next = get().users.map((u) =>
      u.id === id ? ({ ...u, ...patch } as User) : u,
    );
    set({ users: next });
    persist(next);
  },

  setSuspended(id, suspended) {
    get().updateUser(id, { suspended } as Partial<User>);
  },

  hydrate(users) {
    set({ users });
  },
}));

/** Type guard helpers used by stores that need to narrow a `User`. */
export function asWorker(u: User | undefined): Worker | undefined {
  return u && u.role === 'worker' ? u : undefined;
}

export function asEmployer(u: User | undefined): Employer | undefined {
  return u && u.role === 'employer' ? u : undefined;
}

/**
 * Single shared reputation reader (Cluster 2 · BUG 3, Req 2.3).
 *
 * Read-only accessor: looks the user up in `userStore` and, when they are a
 * worker, returns their `reputationScore` clamped to the domain bounds
 * `[MIN_SCORE, MAX_SCORE]` from `@/domain/reputation`. Every surface that
 * DISPLAYS a worker's reputation — the worker dashboard `StatTile`, the
 * `UserMenu` trust chip, the employer applicant badges, and (from task 9.2)
 * the landing hero — reads through this one function so the same worker shows
 * an identical value everywhere (Property 4).
 *
 * It does NOT modify the scoring rules in `@/domain/reputation`; it only
 * re-clamps a stored value defensively. Stored scores are already clamped to
 * `[0, 100]`, so this is a no-op for valid data and never changes the number
 * a surface renders (Property 12 preservation).
 *
 * Missing user / non-worker: returns `MIN_SCORE` (0). This is a fail-closed
 * default for a defensive path only — real callers invoke it for a confirmed
 * worker (each surface guards on role / worker existence first), so the
 * fallback is not reached during normal rendering. Returning the floor rather
 * than a neutral or high value avoids ever implying trust for an unknown id.
 */
export function getWorkerReputation(userId: string): number {
  const worker = asWorker(useUserStore.getState().findById(userId));
  if (!worker) return MIN_SCORE;
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, worker.reputationScore));
}
