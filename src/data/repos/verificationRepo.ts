/**
 * Xác thực tài khoản THẬT (supabase mode, migration 0022):
 *   - SĐT: gửi OTP qua Edge Function `phone-otp`, nhập mã qua RPC `verify_phone_otp`.
 *   - CCCD: ảnh lên bucket riêng tư `identity-docs/<uid>/…`, nộp qua RPC
 *     `submit_identity_verification`; admin duyệt qua `admin_review_identity`.
 *   - Cờ bắt buộc (admin bật/tắt) + thống kê OTP.
 * CHỈ dùng ở chế độ supabase. Chế độ local giữ luồng xác minh mô phỏng cũ.
 */

import { getSupabaseClient } from '@/data/supabaseClient';

type Row = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const sOpt = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const n = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

export const IDENTITY_BUCKET = 'identity-docs';

export type IdentityStatus = 'None' | 'Pending' | 'Approved' | 'Rejected';

export interface MyVerification {
  phone: string;
  phoneVerifiedAt: string | null;
  identityVerifiedAt: string | null;
  identityStatus: IdentityStatus;
  identityRejectReason: string | null;
  requirePhone: boolean;
  requireEmployerIdentity: boolean;
}

export async function getMyVerification(): Promise<MyVerification> {
  const { data, error } = await getSupabaseClient().rpc('get_my_verification');
  if (error) throw new Error(error.message);
  const o = (data ?? {}) as Row;
  const st = s(o.identityStatus);
  return {
    phone: s(o.phone),
    phoneVerifiedAt: sOpt(o.phoneVerifiedAt),
    identityVerifiedAt: sOpt(o.identityVerifiedAt),
    identityStatus: (['Pending', 'Approved', 'Rejected'].includes(st) ? st : 'None') as IdentityStatus,
    identityRejectReason: sOpt(o.identityRejectReason),
    requirePhone: o.requirePhone === true,
    requireEmployerIdentity: o.requireEmployerIdentity === true,
  };
}

/** Trạng thái xác thực của MỘT user, nhìn từ phía admin. */
export interface AdminUserVerification {
  phone: string;
  phoneVerifiedAt: string | null;
  identityVerifiedAt: string | null;
  identityStatus: IdentityStatus;
  identityRejectReason: string | null;
  /** Thời điểm nộp hồ sơ CCCD gần nhất (null nếu chưa nộp). */
  identitySubmittedAt: string | null;
}

/**
 * Admin đọc trạng thái xác thực của một user bất kỳ. Đọc thẳng bảng qua RLS
 * (`users_self_or_admin_select`, `identity_verifications_sel` đều cho
 * `is_admin()`), không cần Edge Function. Suy ra `identityStatus` ĐÚNG như
 * RPC `get_my_verification` (0022): đã có `identity_verified_at` → Approved,
 * ngược lại lấy trạng thái hồ sơ mới nhất, không có hồ sơ → None.
 */
export async function adminGetUserVerification(userId: string): Promise<AdminUserVerification> {
  const sb = getSupabaseClient();
  const [userRes, idvRes] = await Promise.all([
    sb
      .from('users')
      .select('phone, phone_verified_at, identity_verified_at')
      .eq('id', userId)
      .maybeSingle(),
    sb
      .from('identity_verifications')
      .select('status, reject_reason, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (userRes.error) throw new Error(userRes.error.message);
  if (idvRes.error) throw new Error(idvRes.error.message);
  const u = (userRes.data ?? {}) as Row;
  const v = (idvRes.data ?? null) as Row | null;
  const identityVerifiedAt = sOpt(u.identity_verified_at);
  const latest = v ? s(v.status) : '';
  const identityStatus: IdentityStatus = identityVerifiedAt
    ? 'Approved'
    : (['Pending', 'Approved', 'Rejected'].includes(latest) ? latest : 'None') as IdentityStatus;
  return {
    phone: s(u.phone),
    phoneVerifiedAt: sOpt(u.phone_verified_at),
    identityVerifiedAt,
    identityStatus,
    identityRejectReason: v && latest === 'Rejected' ? sOpt(v.reject_reason) : null,
    identitySubmittedAt: v ? sOpt(v.created_at) : null,
  };
}

// ---------------------------------------------------------------------------
// OTP số điện thoại
// ---------------------------------------------------------------------------

export class OtpError extends Error {
  constructor(
    public code: string,
    public retryAfter?: number,
    public attemptsLeft?: number,
  ) {
    super(code);
  }
}

export interface OtpSent {
  phone: string;
  expiresIn: number;
  cooldown: number;
  mock: boolean;
}

export async function sendPhoneOtp(phone: string): Promise<OtpSent> {
  const { data, error } = await getSupabaseClient().functions.invoke('phone-otp', {
    body: { phone },
  });
  if (error) {
    let code = 'REQUEST_FAILED';
    let retryAfter: number | undefined;
    const ctx = (error as unknown as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const parsed = await ctx.json();
        if (parsed?.error) code = String(parsed.error);
        if (typeof parsed?.retryAfter === 'number') retryAfter = parsed.retryAfter;
      } catch {
        /* giữ mã mặc định */
      }
    }
    throw new OtpError(code, retryAfter);
  }
  const o = (data ?? {}) as Row;
  return {
    phone: s(o.phone),
    expiresIn: n(o.expiresIn) || 300,
    cooldown: n(o.cooldown) || 60,
    mock: o.mock === true,
  };
}

export async function verifyPhoneOtp(code: string): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('verify_phone_otp', { p_code: code });
  if (error) throw new OtpError(error.message);
  const o = (data ?? {}) as Row;
  if (o.ok !== true) {
    throw new OtpError(
      s(o.error) || 'OTP_INVALID',
      undefined,
      typeof o.attemptsLeft === 'number' ? o.attemptsLeft : undefined,
    );
  }
  return s(o.phone);
}

// ---------------------------------------------------------------------------
// CCCD
// ---------------------------------------------------------------------------

export type IdentityImageKind = 'front' | 'back' | 'selfie';

/** Tải 1 ảnh lên `identity-docs/<uid>/<thời gian>-<loại>.<đuôi>`. Trả đường dẫn. */
export async function uploadIdentityImage(
  userId: string,
  kind: IdentityImageKind,
  file: Blob,
): Promise<string> {
  const ext =
    file.type === 'image/png' ? 'png'
    : file.type === 'image/webp' ? 'webp'
    : file.type === 'image/heic' ? 'heic'
    : file.type === 'image/heif' ? 'heif'
    : 'jpg';
  const path = `${userId}/${Date.now()}-${kind}.${ext}`;
  const { error } = await getSupabaseClient()
    .storage.from(IDENTITY_BUCKET)
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
  if (error) throw new Error('UPLOAD_FAILED');
  return path;
}

export interface IdentitySubmission {
  fullName: string;
  idNumber: string;
  dateOfBirth: string | null;
  frontPath: string;
  backPath: string;
  selfiePath: string;
}

export async function submitIdentity(input: IdentitySubmission): Promise<void> {
  const { error } = await getSupabaseClient().rpc('submit_identity_verification', {
    p_full_name: input.fullName,
    p_id_number: input.idNumber,
    p_date_of_birth: input.dateOfBirth,
    p_front_path: input.frontPath,
    p_back_path: input.backPath,
    p_selfie_path: input.selfiePath,
  });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface IdentityReviewItem {
  id: string;
  userId: string;
  role: 'worker' | 'employer';
  email: string;
  phone: string;
  displayName: string;
  fullName: string;
  idNumber: string;
  dateOfBirth: string | null;
  frontPath: string;
  backPath: string;
  selfiePath: string;
  status: Exclude<IdentityStatus, 'None'>;
  rejectReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export async function adminListIdentity(
  status: Exclude<IdentityStatus, 'None'> | null,
): Promise<IdentityReviewItem[]> {
  const { data, error } = await getSupabaseClient().rpc('admin_list_identity_verifications', {
    p_status: status,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((r) => ({
    id: s(r.id),
    userId: s(r.user_id),
    role: s(r.role) === 'employer' ? 'employer' : 'worker',
    email: s(r.email),
    phone: s(r.phone),
    displayName: s(r.display_name),
    fullName: s(r.full_name),
    idNumber: s(r.id_number),
    dateOfBirth: sOpt(r.date_of_birth),
    frontPath: s(r.front_path),
    backPath: s(r.back_path),
    selfiePath: s(r.selfie_path),
    status: (s(r.status) || 'Pending') as IdentityReviewItem['status'],
    rejectReason: sOpt(r.reject_reason),
    reviewedAt: sOpt(r.reviewed_at),
    createdAt: s(r.created_at),
  }));
}

/** URL xem ảnh tạm thời (10 phút) — chỉ admin / chủ ảnh (RLS storage). */
export async function signedIdentityUrls(paths: string[]): Promise<Record<string, string>> {
  const { data, error } = await getSupabaseClient()
    .storage.from(IDENTITY_BUCKET)
    .createSignedUrls(paths, 600);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}

export async function adminReviewIdentity(
  id: string,
  approve: boolean,
  reason: string,
): Promise<void> {
  const { error } = await getSupabaseClient().rpc('admin_review_identity', {
    p_id: id,
    p_approve: approve,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

export interface VerificationSettings {
  requirePhone: boolean;
  requireEmployerIdentity: boolean;
  otpDailyCap: number;
  otpSent24h: number;
  otpFailed24h: number;
  lastOtpFailReason: string | null;
  pendingIdentity: number;
}

export async function adminGetVerificationSettings(): Promise<VerificationSettings> {
  const { data, error } = await getSupabaseClient().rpc('admin_get_verification_settings');
  if (error) throw new Error(error.message);
  const o = (data ?? {}) as Row;
  return {
    requirePhone: o.requirePhone === true,
    requireEmployerIdentity: o.requireEmployerIdentity === true,
    otpDailyCap: n(o.otpDailyCap),
    otpSent24h: n(o.otpSent24h),
    otpFailed24h: n(o.otpFailed24h),
    lastOtpFailReason: sOpt(o.lastOtpFailReason),
    pendingIdentity: n(o.pendingIdentity),
  };
}

export async function adminSetVerificationSettings(input: {
  requirePhone?: boolean;
  requireEmployerIdentity?: boolean;
  otpDailyCap?: number;
}): Promise<void> {
  const { error } = await getSupabaseClient().rpc('admin_set_verification_settings', {
    p_require_phone: input.requirePhone ?? null,
    p_require_employer_identity: input.requireEmployerIdentity ?? null,
    p_otp_daily_cap: input.otpDailyCap ?? null,
  });
  if (error) throw new Error(error.message);
}
