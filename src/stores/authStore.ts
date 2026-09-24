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

/** User đăng nhập Google lần đầu: đã có phiên nhưng CHƯA có hồ sơ (chưa chọn vai trò). */
export interface PendingOAuth {
  email: string;
  fullName: string;
}

export interface CompleteOAuthInput {
  role: 'worker' | 'employer';
  phone: string;
  fullName?: string;
  companyName?: string;
  businessType?: string;
  employerType10A?: 'Individual' | 'HouseholdBusiness' | 'Company' | 'AgencyEvent';
}

export type PasswordResetError = 'INVALID_EMAIL' | 'RATE_LIMITED' | 'BACKEND_ERROR';
export type UpdatePasswordError =
  | 'WEAK_PASSWORD'
  | 'SAME_PASSWORD'
  | 'SESSION_EXPIRED'
  | 'BACKEND_ERROR';

/** sessionStorage: vai trò người dùng chọn trước khi bấm "Tiếp tục với Google". */
export const OAUTH_ROLE_KEY = 'cale.oauthRole';

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
  /** Supabase: phiên OAuth chưa có hồ sơ → trang đăng ký hiện bước chọn vai trò. */
  pendingOAuth: PendingOAuth | null;

  currentUser: () => User | null;

  login(email: string, password: string): Promise<Result<User, LoginError>>;
  register(input: RegisterInput): Promise<Result<RegisterSuccess, RegisterError>>;
  logout(): Promise<void>;
  touch(): void;

  /** Supabase: chuyển sang Google. `role` (nếu có) dùng để điền sẵn bước chọn vai trò. */
  signInWithGoogle(role?: 'worker' | 'employer'): Promise<Result<void, 'BACKEND_ERROR'>>;
  /** Supabase: tạo hồ sơ cho phiên OAuth mới (RPC complete_oauth_signup). */
  completeOAuthSignup(input: CompleteOAuthInput): Promise<Result<User, string>>;
  /** Huỷ bước chọn vai trò → đăng xuất phiên OAuth. */
  cancelOAuthSignup(): Promise<void>;
  /**
   * Phiên hợp lệ nhưng chưa có hồ sơ: nếu là phiên OAuth → ghi `pendingOAuth`
   * và trả true (KHÔNG đăng xuất); ngược lại false.
   */
  markPendingOAuth(): Promise<boolean>;
  /** Supabase: gửi email đặt lại mật khẩu (không tiết lộ email có tồn tại không). */
  requestPasswordReset(email: string): Promise<Result<void, PasswordResetError>>;
  /** Supabase: đặt mật khẩu mới trong phiên khôi phục (link email). */
  updatePassword(password: string): Promise<Result<void, UpdatePasswordError>>;

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
  pendingOAuth: null,

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
    set({ currentUserId: null, lastActivityAt: null, pendingOAuth: null });
    persistAuth(null, null);
  },

  async signInWithGoogle(role) {
    try {
      if (role) {
        try {
          sessionStorage.setItem(OAUTH_ROLE_KEY, role);
        } catch {
          /* không có sessionStorage → bỏ qua điền sẵn */
        }
      }
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) return { ok: false, error: 'BACKEND_ERROR' };
      return { ok: true, value: undefined };
    } catch {
      return { ok: false, error: 'BACKEND_ERROR' };
    }
  },

  async markPendingOAuth() {
    try {
      const { data } = await getSupabaseClient().auth.getSession();
      const u = data.session?.user;
      const provider = u?.app_metadata?.provider;
      if (!u || !provider || provider === 'email' || provider === 'phone') return false;
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const name =
        typeof meta.full_name === 'string'
          ? meta.full_name
          : typeof meta.name === 'string'
            ? meta.name
            : '';
      set({ pendingOAuth: { email: u.email ?? '', fullName: name } });
      return true;
    } catch {
      return false;
    }
  },

  async completeOAuthSignup(input) {
    const client = getSupabaseClient();
    const { data } = await client.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return { ok: false, error: 'NOT_AUTHENTICATED' };
    const { error } = await client.rpc('complete_oauth_signup', {
      p_profile: {
        role: input.role,
        phone: input.phone,
        full_name: input.fullName ?? '',
        company_name: input.companyName ?? '',
        business_type: input.businessType ?? '',
        employer_type10a: input.employerType10A ?? null,
      },
    });
    if (error && !error.message.includes('ALREADY_REGISTERED')) {
      return { ok: false, error: error.message };
    }
    const status = await get().syncSessionUser(uid);
    if (status !== 'ok') return { ok: false, error: 'BACKEND_ERROR' };
    const user = get().currentUser();
    if (!user) return { ok: false, error: 'BACKEND_ERROR' };
    set({ pendingOAuth: null });
    try {
      sessionStorage.removeItem(OAUTH_ROLE_KEY);
    } catch {
      /* ignore */
    }
    return { ok: true, value: user };
  },

  async cancelOAuthSignup() {
    set({ pendingOAuth: null });
    try {
      await getSupabaseClient().auth.signOut();
    } catch {
      /* ignore */
    }
  },

  async requestPasswordReset(email) {
    const trimmed = (email ?? '').trim().toLowerCase();
    if (trimmed === '') return { ok: false, error: 'INVALID_EMAIL' };
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/forgot-password?mode=reset`,
    });
    if (error) {
      // Email không tồn tại KHÔNG báo lỗi (Supabase vẫn trả thành công).
      const code = mapSignUpError(error);
      if (code === 'RATE_LIMITED') return { ok: false, error: 'RATE_LIMITED' };
      if (code === 'INVALID_EMAIL') return { ok: false, error: 'INVALID_EMAIL' };
      return { ok: false, error: 'BACKEND_ERROR' };
    }
    return { ok: true, value: undefined };
  },

  async updatePassword(password) {
    const client = getSupabaseClient();
    const { data } = await client.auth.getSession();
    if (!data.session) return { ok: false, error: 'SESSION_EXPIRED' };
    const { error } = await client.auth.updateUser({ password });
    if (error) {
      const code = ((error as { code?: string }).code ?? '').toLowerCase();
      if (code === 'weak_password') return { ok: false, error: 'WEAK_PASSWORD' };
      if (code === 'same_password') return { ok: false, error: 'SAME_PASSWORD' };
      if (code === 'session_not_found' || code === 'session_expired') {
        return { ok: false, error: 'SESSION_EXPIRED' };
      }
      return { ok: false, error: 'BACKEND_ERROR' };
    }
    return { ok: true, value: undefined };
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
        set({ currentUserId: null, lastActivityAt: null, pendingOAuth: null });
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
            // Đăng nhập Google lần đầu: chưa có hồ sơ → chờ chọn vai trò, không đăng xuất.
            if (status === 'notfound' && (await get().markPendingOAuth())) return;
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
