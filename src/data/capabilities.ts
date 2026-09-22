/**
 * Runtime capability map — nguồn sự thật DUY NHẤT cho "tính năng nào đã có
 * backend thật" theo data mode. UI/hydrator đọc map này để quyết định render /
 * ẩn / để rỗng, tránh mỗi trang tự đoán và tránh dữ liệu demo tái xuất hiện khi
 * tiếp tục phát triển (task tổng vệ sinh · mục 8).
 *
 * Quy ước:
 *   - supabase/production: CHỈ bật những gì đã nối server thật (auth/profile,
 *     shifts, applications, quản trị tài khoản). Mọi thứ chưa có backend = false
 *     → UI ẩn module/CTA, slice khởi tạo RỖNG (không seed).
 *   - local/demo: bật tất cả để giữ nguyên luồng test/prototype cũ.
 *
 * KHÔNG đọc secret ở đây. `isSupabaseEnv()` chỉ đọc NEXT_PUBLIC_DATA_MODE
 * (build-safe, không throw) nên dùng được cả lúc render server component.
 */

import { isSupabaseEnv } from '@/data/supabaseClient';

export interface Capabilities {
  /** Đăng nhập/đăng ký + hồ sơ (Supabase Auth + public.users + profiles). */
  authProfiles: boolean;
  /** Ca làm (shifts) đọc/ghi từ Supabase. */
  shifts: boolean;
  /** Đơn ứng tuyển + duyệt/hủy/rút (applications) từ Supabase. */
  applications: boolean;
  /** Quản trị tài khoản qua Edge Function admin-users. */
  adminUsers: boolean;
  /** Chấm công: check-in / xác nhận có mặt / check-out / xác nhận hoàn thành
   *  (RPC Supabase, thời gian server). KHÔNG gồm no-show/vắng mặt (chưa nối). */
  attendance: boolean;
  /** Thu/giữ/chuyển tiền (payment/escrow/cọc) THẬT. Chưa có backend. */
  payments: boolean;
  /** Thanh toán MÔ PHỎNG (provider CALE_MOCK) — QR + phiên lưu Supabase, demo. */
  mockPayments: boolean;
  /** Thanh toán THẬT (PAYOS…) — chỉ bật khi có credentials + webhook đã xác minh. */
  livePayments: boolean;
  /** Ví + sổ cái ví. Chưa có backend. */
  wallet: boolean;
  /** Tranh chấp. Chưa migrate. */
  disputes: boolean;
  /** Xác minh giấy tờ. Chưa migrate. */
  verifications: boolean;
  /** Đánh giá + điểm uy tín. Chưa migrate. */
  ratings: boolean;
  /** Thông báo trong ứng dụng. Chưa migrate. */
  notifications: boolean;
  /** Lượt boost. Chưa có backend. */
  boost: boolean;
  /** Lịch cá nhân (schedule blocks). Chưa migrate. */
  schedule: boolean;
}

/** Supabase/production — chỉ bật phần đã có server thật. */
const SUPABASE_CAPABILITIES: Capabilities = {
  authProfiles: true,
  shifts: true,
  applications: true,
  adminUsers: true,
  attendance: true,
  payments: false,
  mockPayments: true,
  livePayments: false,
  wallet: true,
  disputes: false,
  verifications: false,
  ratings: false,
  notifications: false,
  boost: false,
  schedule: false,
};

/** Local/demo — mọi tính năng mock đều bật để giữ baseline test cũ. */
const LOCAL_CAPABILITIES: Capabilities = {
  authProfiles: true,
  shifts: true,
  applications: true,
  adminUsers: true,
  attendance: true,
  payments: true,
  mockPayments: true,
  livePayments: false,
  wallet: true,
  disputes: true,
  verifications: true,
  ratings: true,
  notifications: true,
  boost: true,
  schedule: true,
};

/** Trả về map capability theo data mode hiện tại (đọc runtime, build-safe). */
export function capabilities(): Capabilities {
  return isSupabaseEnv() ? SUPABASE_CAPABILITIES : LOCAL_CAPABILITIES;
}

/** Tiện ích: một tính năng có khả dụng ở data mode hiện tại không. */
export function hasCapability(key: keyof Capabilities): boolean {
  return capabilities()[key];
}
