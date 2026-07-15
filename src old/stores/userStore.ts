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
