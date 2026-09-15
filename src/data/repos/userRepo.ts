/**
 * User repository (BACKEND-MIGRATION-1 · Phase 1).
 *
 * Lớp lưu trữ BÊN DƯỚI `userStore` — thay localStorage bằng Supabase mà KHÔNG đổi
 * interface store nhìn từ component. Chọn backend theo `getDataMode()`
 * (docs/PHASE_1_PLAN.md v4 mục 2/3/7).
 *
 * Slice 1: chỉ GHI HỒ SƠ CHỦ-SỬA (`updateProfile`). KHÔNG đụng field khóa/hoãn:
 *   - employerType / employerType10A: KHÓA (first-set/type-change đi đường deferred
 *     localStorage; trigger signup đặt type ban đầu). Không nằm trong patch, không
 *     GRANT UPDATE (migration ...0003 REVOKE).
 *   - reputation/boost/verifications/suspended/role: hoãn/server-controlled.
 *
 * Bất biến (theo review):
 *   - Mỗi UPDATE Supabase phải `.select()` + xác nhận ĐÚNG 1 dòng của user; RLS có
 *     thể trả 0 dòng KHÔNG kèm error → coi là WRITE_FAILED (throw), store không đổi cache.
 *   - Field nullable (bio/description/avatar_url/logo_url): patch gửi rỗng/undefined
 *     → ghi `null` xuống DB (tránh UI xóa nhưng DB giữ data cũ). Cache dùng undefined.
 *   - Validate patch theo vai trò ở store (patch sai vai trò bị từ chối, không âm thầm).
 */

import { STORAGE_KEYS, read, write } from '@/data/persistence';
import { getDataMode, getSupabaseClient } from '@/data/supabaseClient';
import type { User, Worker, Employer } from '@/types';

// --- Patch tách theo vai trò (điều kiện 4) ---------------------------------
export type WorkerProfilePatch = Partial<
  Pick<
    Worker,
    | 'phone'
    | 'fullName'
    | 'avatarUrl'
    | 'bio'
    | 'skills'
    | 'preferredJobTypes'
    | 'preferredLocations'
  >
>;

// LƯU Ý: KHÔNG gồm employerType / employerType10A (khóa).
export type EmployerProfilePatch = Partial<
  Pick<
    Employer,
    | 'phone'
    | 'companyName'
    | 'businessType'
    | 'description'
    | 'logoUrl'
    | 'understaffedPolicy'
  >
>;

export type ProfilePatch = WorkerProfilePatch | EmployerProfilePatch;

/** Khóa hợp lệ theo vai trò — dùng để validate ở store (điều kiện 4). */
export const WORKER_PATCH_KEYS: ReadonlyArray<keyof WorkerProfilePatch> = [
  'phone', 'fullName', 'avatarUrl', 'bio', 'skills', 'preferredJobTypes', 'preferredLocations',
];
export const EMPLOYER_PATCH_KEYS: ReadonlyArray<keyof EmployerProfilePatch> = [
  'phone', 'companyName', 'businessType', 'description', 'logoUrl', 'understaffedPolicy',
];

export interface UserRepo {
  /** Ghi hồ sơ chủ-sửa. Throw nếu backend từ chối HOẶC không đúng 1 dòng. */
  updateProfile(user: User, patch: ProfilePatch): Promise<void>;

  /**
   * Nạp User của CHÍNH session (own private `users` row + hồ sơ theo vai trò).
   * Dùng cho login/register (Slice 2). Field HOÃN (reputation/ratings/boost/
   * verifications/verifiedBusiness) mang GIÁ TRỊ MẶC ĐỊNH ở Phase 1 (chưa có bảng
   * nguồn — theo quyết định plan). Trả null nếu không tìm thấy.
   */
  loadOwnUser(authUserId: string): Promise<User | null>;
}

// --- Mapper DB row → User (field hoãn = mặc định Phase 1) -------------------
type Row = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const sOpt = (v: unknown): string | undefined =>
  typeof v === 'string' && v !== '' ? v : undefined;
const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

function mapWorker(u: Row, p: Row | null): Worker {
  return {
    id: s(u.id),
    role: 'worker',
    email: s(u.email),
    phone: s(u.phone),
    passwordHash: '', // Auth giữ mật khẩu; không lộ hash ở client.
    suspended: Boolean(u.suspended),
    createdAt: s(u.created_at),
    fullName: s(p?.full_name),
    avatarUrl: sOpt(p?.avatar_url),
    bio: sOpt(p?.bio),
    skills: arr(p?.skills),
    preferredJobTypes: arr(p?.preferred_job_types),
    preferredLocations: arr(p?.preferred_locations),
    // Field HOÃN — mặc định Phase 1:
    verifications: [],
    reputationScore: 100,
    completedShiftCount: 0,
    ratingsReceived: [],
    cancellationHistory: [],
    noShowCount: 0,
  };
}

function mapEmployer(u: Row, p: Row | null): Employer {
  return {
    id: s(u.id),
    role: 'employer',
    email: s(u.email),
    phone: s(u.phone),
    passwordHash: '',
    suspended: Boolean(u.suspended),
    createdAt: s(u.created_at),
    companyName: s(p?.company_name),
    businessType: s(p?.business_type),
    description: sOpt(p?.description),
    logoUrl: sOpt(p?.logo_url),
    employerType: (sOpt(p?.employer_type) as Employer['employerType']),
    employerType10A: (sOpt(p?.employer_type10a) as Employer['employerType10A']),
    understaffedPolicy: (sOpt(p?.understaffed_policy) as Employer['understaffedPolicy']),
    // Field HOÃN — mặc định Phase 1:
    verifiedBusiness: false,
    boostCredits: 0,
  };
}

function mapAdmin(u: Row): User {
  return {
    id: s(u.id),
    role: 'admin',
    email: s(u.email),
    phone: s(u.phone),
    passwordHash: '',
    suspended: Boolean(u.suspended),
    createdAt: s(u.created_at),
    fullName: s(u.email), // schema chưa lưu tên admin; dùng email tạm (Phase 1).
  };
}

// ---------------------------------------------------------------------------
// Local (localStorage) — hành vi y hệt hôm nay (cache/localStorage dùng undefined).
// ---------------------------------------------------------------------------

class LocalStorageUserRepo implements UserRepo {
  async updateProfile(user: User, patch: ProfilePatch): Promise<void> {
    const users = read<User[]>(STORAGE_KEYS.users, []);
    const next = users.map((u) =>
      u.id === user.id ? ({ ...u, ...patch } as User) : u,
    );
    write(STORAGE_KEYS.users, next);
  }

  async loadOwnUser(authUserId: string): Promise<User | null> {
    const users = read<User[]>(STORAGE_KEYS.users, []);
    return users.find((u) => u.id === authUserId) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Supabase — ghi users.phone + bảng hồ sơ theo vai trò.
// ---------------------------------------------------------------------------

// camelCase (patch) → snake_case (cột). employer_type* KHÔNG có mặt (khóa).
const WORKER_COLS: Record<string, string> = {
  fullName: 'full_name',
  avatarUrl: 'avatar_url',
  bio: 'bio',
  skills: 'skills',
  preferredJobTypes: 'preferred_job_types',
  preferredLocations: 'preferred_locations',
};
const EMPLOYER_COLS: Record<string, string> = {
  companyName: 'company_name',
  businessType: 'business_type',
  description: 'description',
  logoUrl: 'logo_url',
  understaffedPolicy: 'understaffed_policy',
};
// Cột nullable: rỗng/undefined → null (điều kiện 2).
const NULLABLE_KEYS = new Set(['avatarUrl', 'bio', 'description', 'logoUrl']);

function buildCols(
  patch: ProfilePatch,
  colmap: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const p = patch as Record<string, unknown>;
  for (const [key, col] of Object.entries(colmap)) {
    if (!(key in p)) continue;
    let v = p[key];
    if (NULLABLE_KEYS.has(key) && (v === undefined || v === '')) v = null;
    out[col] = v;
  }
  return out;
}

class SupabaseUserRepo implements UserRepo {
  async updateProfile(user: User, patch: ProfilePatch): Promise<void> {
    const client = getSupabaseClient();
    const p = patch as Record<string, unknown>;

    // 1) users.phone (cột duy nhất chủ-sửa ở bảng users). Không nullable.
    if ('phone' in p && p.phone !== undefined) {
      const { data, error } = await client
        .from('users')
        .update({ phone: p.phone })
        .eq('id', user.id)
        .select('id');
      if (error) throw new Error(`updateProfile(users.phone): ${error.message}`);
      if (!data || data.length !== 1) {
        throw new Error(`updateProfile(users.phone): kỳ vọng 1 dòng, nhận ${data?.length ?? 0}`);
      }
    }

    // 2) bảng hồ sơ theo vai trò.
    if (user.role === 'worker') {
      const cols = buildCols(patch, WORKER_COLS);
      if (Object.keys(cols).length > 0) {
        const { data, error } = await client
          .from('worker_profiles')
          .update(cols)
          .eq('user_id', user.id)
          .select('user_id');
        if (error) throw new Error(`updateProfile(worker_profiles): ${error.message}`);
        if (!data || data.length !== 1) {
          throw new Error(`updateProfile(worker_profiles): kỳ vọng 1 dòng, nhận ${data?.length ?? 0}`);
        }
      }
    } else if (user.role === 'employer') {
      const cols = buildCols(patch, EMPLOYER_COLS);
      if (Object.keys(cols).length > 0) {
        const { data, error } = await client
          .from('employer_profiles')
          .update(cols)
          .eq('user_id', user.id)
          .select('user_id');
        if (error) throw new Error(`updateProfile(employer_profiles): ${error.message}`);
        if (!data || data.length !== 1) {
          throw new Error(`updateProfile(employer_profiles): kỳ vọng 1 dòng, nhận ${data?.length ?? 0}`);
        }
      }
    }
    // admin: không có hồ sơ chủ-sửa ở Phase 1.
  }

  async loadOwnUser(authUserId: string): Promise<User | null> {
    const client = getSupabaseClient();

    // 1) users row. Phân biệt "không có dòng" (PGRST116 → null) với lỗi query
    //    thật (throw — KHÔNG nuốt lỗi rồi coi như không tồn tại).
    const { data: urow, error: uErr } = await client
      .from('users')
      .select('id, role, email, phone, suspended, created_at')
      .eq('id', authUserId)
      .single();
    if (uErr) {
      if (uErr.code === 'PGRST116') return null; // 0 dòng = user chưa có
      throw new Error(`loadOwnUser(users): ${uErr.message}`);
    }
    if (!urow) return null;

    // 2) profile theo vai trò. Lỗi query HOẶC thiếu dòng (invariant vỡ — trigger
    //    signup phải tạo) đều THROW; KHÔNG dựng profile rỗng.
    if (urow.role === 'worker') {
      const { data: p, error: pErr } = await client
        .from('worker_profiles')
        .select('*')
        .eq('user_id', authUserId)
        .single();
      if (pErr) throw new Error(`loadOwnUser(worker_profiles): ${pErr.message}`);
      if (!p) throw new Error('loadOwnUser(worker_profiles): thiếu hồ sơ');
      return mapWorker(urow as Row, p as Row);
    }
    if (urow.role === 'employer') {
      const { data: p, error: pErr } = await client
        .from('employer_profiles')
        .select('*')
        .eq('user_id', authUserId)
        .single();
      if (pErr) throw new Error(`loadOwnUser(employer_profiles): ${pErr.message}`);
      if (!p) throw new Error('loadOwnUser(employer_profiles): thiếu hồ sơ');
      return mapEmployer(urow as Row, p as Row);
    }
    return mapAdmin(urow as Row);
  }
}

// ---------------------------------------------------------------------------
// Bộ chọn — lazy, theo data mode.
// ---------------------------------------------------------------------------

let localRepo: LocalStorageUserRepo | null = null;
let supabaseRepo: SupabaseUserRepo | null = null;

export function getUserRepo(): UserRepo {
  if (getDataMode() === 'supabase') {
    return (supabaseRepo ??= new SupabaseUserRepo());
  }
  return (localRepo ??= new LocalStorageUserRepo());
}
