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

export type LoginError = 'INVALID_CREDENTIALS' | 'SUSPENDED' | 'BACKEND_ERROR';

export type RegisterError =
  | 'EMAIL_TAKEN'
  | 'INVALID_ROLE'
  | 'INVALID_INPUT'
  | 'INVALID_EMAIL'
  | 'WEAK_PASSWORD'
  | 'RATE_LIMITED'
  | 'BACKEND_ERROR';

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
   * Nạp user của session Supabase `uid` vào store (supabase mode). Xử lý account
   * switch (reset seed nếu đổi user), suspended, thiếu profile. KHÔNG tự signOut —
   * caller quyết định. Trả trạng thái để caller map lỗi.
   */
  syncSessionUser(uid: string): Promise<'ok' | 'suspended' | 'notfound' | 'error'>;

  /**
   * Lắng nghe onAuthStateChange (chỉ supabase). Xử lý SIGNED_OUT / SIGNED_IN /
   * TOKEN_REFRESHED / USER_UPDATED + account switch; gọi Supabase được DEFER ra
   * ngoài callback. Trả hàm huỷ. Wiring ở AppHydrator.
   */
  subscribeAuth(): () => void;

  hydrate(state: PersistedAuthState): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nowIso = (): string => new Date().toISOString();

/**
 * Data mode = supabase? KHÔNG bọc try/catch: lỗi cấu hình `getDataMode()` phải
 * PROPAGATE (production cấu hình sai tuyệt đối không được âm thầm fallback local).
 */
function isSupabase(): boolean {
  return getDataMode() === 'supabase';
}

/** Persist phiên vào localStorage — CHỈ chế độ local (supabase dùng session riêng). */
function persistAuth(currentUserId: string | null, lastActivityAt: string | null): void {
  if (isSupabase()) return;
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

/**
 * Map lỗi `signUp` của Supabase → `RegisterError` cụ thể để UI báo đúng nguyên
 * nhân (email trùng / email sai / mật khẩu yếu / vượt giới hạn / backend lỗi),
 * thay vì nuốt hết thành một mã chung.
 *
 * Ưu tiên `error.code` (ổn định), rồi `error.status` (HTTP), cuối cùng mới dò
 * message (server cũ). Client đã chạy `validateRegister` TRƯỚC khi gọi, nên input
 * chắc chắn hợp lệ ở phía client → lỗi lạ còn lại là vấn đề backend, KHÔNG phải
 * `INVALID_INPUT`. Chỉ trả về mã enum — KHÔNG bao giờ để lộ message thô, JWT, key.
 */
export function mapSignUpError(error: unknown): RegisterError {
  const e = (error ?? {}) as { code?: string; status?: number; message?: string };
  const code = typeof e.code === 'string' ? e.code.toLowerCase() : '';
  const status = typeof e.status === 'number' ? e.status : undefined;
  const msg = typeof e.message === 'string' ? e.message.toLowerCase() : '';

  // 1) Mã lỗi ổn định của Supabase auth-js.
  if (code === 'user_already_exists' || code === 'email_exists') return 'EMAIL_TAKEN';
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    code === 'over_sms_send_rate_limit'
  ) {
    return 'RATE_LIMITED';
  }
  if (code === 'weak_password') return 'WEAK_PASSWORD';
  if (code === 'email_address_invalid') return 'INVALID_EMAIL';
  if (code === 'signup_disabled') return 'BACKEND_ERROR';

  // 2) Theo HTTP status.
  if (status === 429) return 'RATE_LIMITED';
  if (status !== undefined && status >= 500) return 'BACKEND_ERROR';

  // 3) Dò message (server cũ / chưa có code).
  if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
    return 'EMAIL_TAKEN';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) return 'RATE_LIMITED';
  if (msg.includes('weak') && msg.includes('password')) return 'WEAK_PASSWORD';
  if (msg.includes('invalid') && msg.includes('email')) return 'INVALID_EMAIL';

  // 4) Mặc định: input đã qua validate client → coi là lỗi backend, không đổ cho input.
  return 'BACKEND_ERROR';
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
      // Sign-in OK nhưng nạp profile có thể lỗi → phân biệt rõ, signOut, báo lỗi.
      const status = await get().syncSessionUser(data.user.id);
      if (status !== 'ok') {
        await client.auth.signOut();
        if (status === 'suspended') return { ok: false, error: 'SUSPENDED' };
        if (status === 'notfound') return { ok: false, error: 'INVALID_CREDENTIALS' };
        return { ok: false, error: 'BACKEND_ERROR' };
      }
      const user = get().currentUser();
      if (!user) return { ok: false, error: 'BACKEND_ERROR' };
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
        return { ok: false, error: mapSignUpError(error) };
      }
      // Email confirmation BẬT → không có session → không auto-login.
      if (!data.session || !data.user) {
        return { ok: true, value: { user: null, needsConfirmation: true } };
      }
      const status = await get().syncSessionUser(data.user.id);
      if (status !== 'ok') {
        await client.auth.signOut();
        return { ok: false, error: 'BACKEND_ERROR' };
      }
      const user = get().currentUser();
      if (!user) return { ok: false, error: 'BACKEND_ERROR' };
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
      // Guardrail 4: loại mọi private user Supabase khỏi cache, khôi phục seed —
      // email/phone của user cũ KHÔNG được còn trong bộ nhớ.
      useUserStore.getState().resetToSeedUsers();
    }
    set({ currentUserId: null, lastActivityAt: null });
    persistAuth(null, null);
  },

  async syncSessionUser(uid) {
    // Account switch: đổi user → xoá private user cũ, khôi phục seed TRƯỚC.
    const current = get().currentUserId;
    if (current && current !== uid) {
      useUserStore.getState().resetToSeedUsers();
    }
    let user: User | null;
    try {
      user = await getUserRepo().loadOwnUser(uid);
    } catch {
      return 'error';
    }
    if (!user) return 'notfound';
    if (user.suspended) {
      useUserStore.getState().resetToSeedUsers();
      return 'suspended';
    }
    useUserStore.getState().overlayUser(user);
    set({ currentUserId: user.id, lastActivityAt: nowIso() });
    return 'ok';
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
        // Xoá private user cũ + khôi phục seed (guardrail 4).
        useUserStore.getState().resetToSeedUsers();
        set({ currentUserId: null, lastActivityAt: null });
        return;
      }
      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        const uid = session.user.id;
        // DEFER gọi Supabase ra NGOÀI callback onAuthStateChange (tránh deadlock
        // supabase-js). Xử lý cả account switch (syncSessionUser tự reset seed).
        setTimeout(() => {
          void (async () => {
            const status = await get().syncSessionUser(uid);
            if (status !== 'ok') {
              try {
                await getSupabaseClient().auth.signOut();
              } catch {
                /* ignore */
              }
            }
          })();
        }, 0);
      }
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
