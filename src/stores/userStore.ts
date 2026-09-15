/**
 * User store — owns the in-memory list of `User` records.
 *
 * Pulled out of `authStore` so other stores (applications, ratings, admin)
 * can read worker / employer profiles without circular imports through
 * the auth slice. The auth slice still exposes the *currently* logged-in
 * user via `authStore.currentUser`.
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write, loadAll } from '@/data/persistence';
import {
  getUserRepo,
  WORKER_PATCH_KEYS,
  EMPLOYER_PATCH_KEYS,
  type ProfilePatch,
} from '@/data/repos/userRepo';
import { MAX_SCORE, MIN_SCORE } from '@/domain/reputation';
import type { Result, User, Worker, Employer } from '@/types';

interface UserStore {
  users: User[];

  findById(id: string): User | undefined;
  findByEmail(email: string): User | undefined;

  addUser(user: User): void;
  /**
   * Ghi các trường HỒ SƠ CHỦ-SỬA qua repo (server-first: backend ghi xong mới
   * đổi cache; lỗi → cache không đổi). Dùng cho các form sửa hồ sơ.
   * KHÁC `updateUser` (đồng bộ, localStorage) vốn dành cho các field HOÃN
   * (reputation/boost/verifications) — xem docs/PHASE_1_PLAN.md v4 mục 3/7.
   */
  updateProfile(id: string, patch: ProfilePatch): Promise<Result<void, string>>;
  /** Ghi field HOÃN (localStorage, đồng bộ). Không dành cho hồ sơ chủ-sửa. */
  updateUser(id: string, patch: Partial<User>): void;
  setSuspended(id: string, suspended: boolean): void;

  /**
   * Ghi đè/chèn 1 user thật (Supabase) vào cache — KHÔNG persist localStorage.
   * Dùng khi login/hydrate ở chế độ supabase.
   */
  overlayUser(user: User): void;
  /**
   * Đặt lại cache về đúng seed users (loại mọi user thật Supabase khỏi cache).
   * Dùng khi logout / account switch ở chế độ supabase để email/phone của user
   * cũ KHÔNG còn trong bộ nhớ.
   */
  resetToSeedUsers(): void;

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

  async updateProfile(id, patch) {
    const user = get().findById(id);
    if (!user) return { ok: false, error: 'NOT_FOUND' };

    // Validate khóa theo vai trò — patch sai vai trò/khóa cấm bị từ chối, KHÔNG
    // âm thầm bỏ qua rồi vẫn cập nhật cache (điều kiện 4).
    const allowed: ReadonlyArray<string> =
      user.role === 'worker'
        ? (WORKER_PATCH_KEYS as ReadonlyArray<string>)
        : user.role === 'employer'
          ? (EMPLOYER_PATCH_KEYS as ReadonlyArray<string>)
          : [];
    const invalid = Object.keys(patch).filter((k) => !allowed.includes(k));
    if (invalid.length > 0) {
      return { ok: false, error: `INVALID_FIELD:${invalid.join(',')}` };
    }

    try {
      // Server-first: repo ghi backend trước (Supabase xác nhận đúng 1 dòng);
      // lỗi/0 dòng → throw → không đổi cache.
      await getUserRepo().updateProfile(user, patch);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'WRITE_FAILED' };
    }
    const next = get().users.map((u) =>
      u.id === id ? ({ ...u, ...patch } as User) : u,
    );
    set({ users: next });
    return { ok: true, value: undefined };
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

  overlayUser(user) {
    const existing = get().users;
    const next = existing.some((u) => u.id === user.id)
      ? existing.map((u) => (u.id === user.id ? user : u))
      : [...existing, user];
    set({ users: next });
  },

  resetToSeedUsers() {
    // loadAll() trả seed users (client, chế độ supabase: user thật chưa từng
    // persist localStorage nên đây là seed thuần).
    set({ users: loadAll().users });
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
