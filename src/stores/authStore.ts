/**
 * Authentication store (BACKEND-MIGRATION-1 · Phase 1, Slice 2).
 *
 * Hai chế độ theo `getDataMode()`:
 *   - local: mock auth như trước (mật khẩu `mock-hash:` trong localStorage) —
 *     dùng cho Vitest / Playwright localStorage. Hành vi giữ NGUYÊN.
 *   - supabase: auth THẬT qua Supabase Auth (mật khẩu hash phía Supabase); session
 *     do supabase-js quản lý; `onAuthChange` đồng bộ đăng xuất đa tab.
 *
 * `login`/`register`/`logout` là ASYNC (đã duyệt). `register` trả `RegisterSuccess`
 * để hỗ trợ email confirmation BẬT (không auto-login → `needsConfirmation`).
 */

import { create } from 'zustand';

import {
  STORAGE_KEYS,
  write,
  type AuthState as PersistedAuthState,
} from '@/data/persistence';
import { getDataMode, getSupabaseClient, onAuthChange } from '@/data/supabaseClient';
import { getUserRepo } from '@/data/repos/userRepo';
import { newPrefixedId } from '@/lib/ids';
import type { Result, Role, User, Worker, Employer } from '@/types';

import { useUserStore } from './userStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LoginError = 'INVALID_CREDENTIALS' | 'SUSPENDED';

export type RegisterError = 'EMAIL_TAKEN' | 'INVALID_ROLE' | 'INVALID_INPUT';

/**
 * Kết quả đăng ký. `needsConfirmation` = true khi Supabase bật email confirmation
 * và signUp KHÔNG trả session (không auto-login) — UI hiện màn "kiểm tra email".
 */
export interface RegisterSuccess {
  user: User | null;
  needsConfirmation: boolean;
}

export interface RegisterInput {
  role: 'worker' | 'employer';
  email: string;
  phone: string;
  password: string;
  fullName?: string;
  companyName?: string;
  businessType?: string;
  employerType?: 'individual' | 'business';
  employerType10A?: 'Individual' | 'HouseholdBusiness' | 'Company' | 'AgencyEvent';
}

interface AuthStore {
  currentUserId: string | null;
  lastActivityAt: string | null;

  currentUser: () => User | null;

  login(email: string, password: string): Promise<Result<User, LoginError>>;
  register(input: RegisterInput): Promise<Result<RegisterSuccess, RegisterError>>;
  logout(): Promise<void>;
  touch(): void;

  /**
   * Đăng ký lắng nghe onAuthStateChange (chỉ chế độ supabase). Trả hàm huỷ.
   * Wiring vào vòng đời app ở AppHydrator (Slice 3 — hydrate).
   */
  subscribeAuth(): () => void;

  hydrate(state: PersistedAuthState): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nowIso = (): string => new Date().toISOString();

function isSupabase(): boolean {
  try {
    return getDataMode() === 'supabase';
  } catch {
    return false;
  }
}

/** Persist phiên vào localStorage — CHỈ chế độ local (supabase dùng session riêng). */
function persistAuth(currentUserId: string | null, lastActivityAt: string | null): void {
  if (isSupabase()) return;
  const payload: PersistedAuthState = { currentUserId, lastActivityAt };
  write(STORAGE_KEYS.auth, payload);
}

/** Đưa/ghi đè 1 user vào cache userStore mà KHÔNG persist localStorage (supabase). */
function cacheUser(user: User): void {
  const existing = useUserStore.getState().users;
  const merged = existing.some((u) => u.id === user.id)
    ? existing.map((u) => (u.id === user.id ? user : u))
    : [...existing, user];
  useUserStore.setState({ users: merged });
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
    (input.employerType10A === 'Individual' ||
      input.employerType10A === 'HouseholdBusiness' ||
      input.employerType10A === 'Company' ||
      input.employerType10A === 'AgencyEvent')
  );
}

/** Validate input đăng ký (dùng chung cả 2 chế độ). Trả lỗi hoặc null. */
function validateRegister(input: RegisterInput): RegisterError | null {
  if (input.role !== 'worker' && input.role !== 'employer') return 'INVALID_ROLE';
  const trimmedEmail = (input.email ?? '').trim().toLowerCase();
  if (
    trimmedEmail === '' ||
    typeof input.phone !== 'string' ||
    typeof input.password !== 'string' ||
    input.password.length < 8
  ) {
    return 'INVALID_INPUT';
  }
  if (input.role === 'worker' && !isWorkerInput(input)) return 'INVALID_INPUT';
  if (input.role === 'employer' && !isEmployerInput(input)) return 'INVALID_INPUT';
  return null;
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

  async login(email, password) {
    if (isSupabase()) {
      const client = getSupabaseClient();
      const trimmedEmail = (email ?? '').trim().toLowerCase();
      const { data, error } = await client.auth.signInWithPassword({
        email: trimmedEmail,
        password: typeof password === 'string' ? password : '',
      });
      if (error || !data.user) {
        return { ok: false, error: 'INVALID_CREDENTIALS' };
      }
      const user = await getUserRepo().loadOwnUser(data.user.id);
      if (!user) return { ok: false, error: 'INVALID_CREDENTIALS' };
      if (user.suspended) {
        await client.auth.signOut();
        return { ok: false, error: 'SUSPENDED' };
      }
      cacheUser(user);
      const ts = nowIso();
      set({ currentUserId: user.id, lastActivityAt: ts });
      return { ok: true, value: user };
    }

    // --- local mode (giữ nguyên hành vi Phase 9P) ---------------------------
    if (typeof password !== 'string' || password.length === 0) {
      return { ok: false, error: 'INVALID_CREDENTIALS' };
    }
    const trimmedEmail = (email ?? '').trim().toLowerCase();
    if (trimmedEmail === '') return { ok: false, error: 'INVALID_CREDENTIALS' };

    const user = useUserStore.getState().findByEmail(trimmedEmail);
    if (!user) return { ok: false, error: 'INVALID_CREDENTIALS' };

    if (user.passwordHash !== `mock-hash:${password}`) {
      return { ok: false, error: 'INVALID_CREDENTIALS' };
    }
    if (user.suspended) return { ok: false, error: 'SUSPENDED' };

    const ts = nowIso();
    set({ currentUserId: user.id, lastActivityAt: ts });
    persistAuth(user.id, ts);
    return { ok: true, value: user };
  },

  async register(input) {
    const invalid = validateRegister(input);
    if (invalid) return { ok: false, error: invalid };
    const trimmedEmail = input.email.trim().toLowerCase();

    if (isSupabase()) {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signUp({
        email: trimmedEmail,
        password: input.password,
        options: {
          data: {
            role: input.role,
            phone: input.phone,
            full_name: input.fullName,
            company_name: input.companyName,
            business_type: input.businessType,
            employer_type: input.employerType,
            employer_type10a: input.employerType10A,
          },
        },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          return { ok: false, error: 'EMAIL_TAKEN' };
        }
        return { ok: false, error: 'INVALID_INPUT' };
      }
      // Email confirmation BẬT → không có session → không auto-login.
      if (!data.session || !data.user) {
        return { ok: true, value: { user: null, needsConfirmation: true } };
      }
      const user = await getUserRepo().loadOwnUser(data.user.id);
      if (!user) return { ok: false, error: 'INVALID_INPUT' };
      cacheUser(user);
      const ts = nowIso();
      set({ currentUserId: user.id, lastActivityAt: ts });
      return { ok: true, value: { user, needsConfirmation: false } };
    }

    // --- local mode (giữ nguyên hành vi) -----------------------------------
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
        employerType: input.employerType ?? 'individual',
        employerType10A: input.employerType10A,
      };
      newUser = employer;
    }

    userStore.addUser(newUser);
    set({ currentUserId: newUser.id, lastActivityAt: created });
    persistAuth(newUser.id, created);
    return { ok: true, value: { user: newUser, needsConfirmation: false } };
  },

  async logout() {
    if (isSupabase()) {
      try {
        await getSupabaseClient().auth.signOut();
      } catch {
        /* vẫn xoá state cục bộ dù signOut lỗi */
      }
    }
    set({ currentUserId: null, lastActivityAt: null });
    persistAuth(null, null);
  },

  touch() {
    if (!get().currentUserId) return;
    const ts = nowIso();
    set({ lastActivityAt: ts });
    persistAuth(get().currentUserId, ts);
  },

  subscribeAuth() {
    if (!isSupabase()) return () => {};
    const sub = onAuthChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ currentUserId: null, lastActivityAt: null });
      }
      // SIGNED_IN / TOKEN_REFRESHED: session do supabase-js giữ; currentUserId
      // đã được set ở login, hoặc AppHydrator khôi phục (Slice 3).
    });
    return () => sub.unsubscribe();
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

export function useCurrentUser(): User | null {
  const id = useAuthStore((s) => s.currentUserId);
  return useUserStore((s) => (id ? (s.findById(id) ?? null) : null));
}
