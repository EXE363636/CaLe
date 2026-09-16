/**
 * Admin user repository (Admin Account Management · task C/D).
 *
 * Lớp gọi Edge Function `admin-users` TỪ TRÌNH DUYỆT qua supabase-js
 * `functions.invoke` (JWT của admin đang đăng nhập tự đính vào Authorization).
 * KHÔNG bao giờ dùng service_role ở client — mọi thao tác đặc quyền chạy
 * server-side trong Edge Function (xem supabase/functions/admin-users/index.ts).
 *
 * CHỈ dùng ở chế độ supabase. Ở local/demo store giữ đường đồng bộ cũ.
 */

import { getSupabaseClient } from '@/data/supabaseClient';
import type { User, Worker, Employer } from '@/types';

export type CreatableRole = 'worker' | 'employer';

export interface AdminCreateInput {
  email: string;
  password: string;
  displayName: string;
  role: CreatableRole;
}

/** Lỗi có mã máy đọc được (để UI dịch sang thông báo tiếng Việt). */
export class AdminApiError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'AdminApiError';
  }
}

type Row = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const sOpt = (v: unknown): string | undefined =>
  typeof v === 'string' && v !== '' ? v : undefined;
const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

function mapRow(r: Row): User {
  const base = {
    id: s(r.id),
    email: s(r.email),
    phone: s(r.phone),
    passwordHash: '',
    suspended: Boolean(r.suspended),
    createdAt: s(r.created_at),
  };
  if (r.role === 'worker') {
    const p = (r.worker ?? {}) as Row;
    return {
      ...base,
      role: 'worker',
      fullName: s(p.full_name),
      avatarUrl: sOpt(p.avatar_url),
      bio: sOpt(p.bio),
      skills: arr(p.skills),
      preferredJobTypes: arr(p.preferred_job_types),
      preferredLocations: arr(p.preferred_locations),
      verifications: [],
      reputationScore: 100,
      completedShiftCount: 0,
      ratingsReceived: [],
      cancellationHistory: [],
      noShowCount: 0,
    } as Worker;
  }
  if (r.role === 'employer') {
    const p = (r.employer ?? {}) as Row;
    return {
      ...base,
      role: 'employer',
      companyName: s(p.company_name),
      businessType: s(p.business_type),
      description: sOpt(p.description),
      logoUrl: sOpt(p.logo_url),
      employerType: sOpt(p.employer_type) as Employer['employerType'],
      employerType10A: sOpt(p.employer_type10a) as Employer['employerType10A'],
      understaffedPolicy: sOpt(p.understaffed_policy) as Employer['understaffedPolicy'],
      verifiedBusiness: false,
      boostCredits: 0,
    } as Employer;
  }
  return {
    ...base,
    role: 'admin',
    fullName: s(r.email),
  } as User;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const client = getSupabaseClient();
  const { data, error } = await client.functions.invoke('admin-users', { body });
  // functions.invoke coi HTTP non-2xx là error; body lỗi nằm trong
  // error.context (Response). Cố đọc mã lỗi { ok:false, error } của hàm.
  if (error) {
    let code = 'REQUEST_FAILED';
    let message = error.message;
    const ctx = (error as unknown as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const parsed = await ctx.json();
        if (parsed?.error) code = String(parsed.error);
        if (parsed?.message) message = String(parsed.message);
      } catch {
        /* giữ mã mặc định */
      }
    }
    throw new AdminApiError(code, message);
  }
  const d = data as { ok?: boolean; error?: string; message?: string } & T;
  if (d && d.ok === false) throw new AdminApiError(String(d.error ?? 'REQUEST_FAILED'), d.message);
  return d as T;
}

export const adminUserRepo = {
  async listUsers(): Promise<User[]> {
    const d = await invoke<{ users: Row[] }>({ action: 'list' });
    return (d.users ?? []).map(mapRow);
  },

  async createUser(input: AdminCreateInput): Promise<{ id: string; email: string; role: string }> {
    const d = await invoke<{ user: { id: string; email: string; role: string } }>({
      action: 'create',
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      role: input.role,
    });
    return d.user;
  },

  async deleteUser(userId: string): Promise<string> {
    const d = await invoke<{ deletedId: string }>({ action: 'delete', userId });
    return d.deletedId;
  },

  async setSuspended(userId: string, suspended: boolean): Promise<void> {
    await invoke<{ user: { id: string; suspended: boolean } }>({
      action: 'setSuspended',
      userId,
      suspended,
    });
  },
};
