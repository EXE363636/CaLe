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
 *   - local/demo: bật tất cả (trừ `livePayments` — demo không có tiền thật) để
 *     giữ nguyên luồng test/prototype cũ.
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
  /**
   * Tiền THẬT qua PayOS (nạp / giữ cọc / trả công / hoàn cọc / rút — 0016–0019):
   * bật ở production, tắt ở local/demo. Hiện chỉ `MockPaymentSession` (luồng cọc
   * CALE_MOCK cũ, không còn trang nào render) đọc cờ này để ẩn nút mô phỏng.
   */
  livePayments: boolean;
  /** Ví + sổ cái ví. Chưa có backend. */
  wallet: boolean;
  /** Tranh chấp. Chưa migrate. */
  disputes: boolean;
  /** Xác minh giấy tờ. Chưa migrate. */
  verifications: boolean;
  /** Đánh giá + điểm uy tín. Chưa migrate. */
  ratings: boolean;
  /**
   * Đánh giá sao + nhận xét hai chiều sau ca (0024 shift_reviews). Tách khỏi
   * `ratings` (điểm uy tín / điểm kỹ năng / hạn mức huỷ — vẫn chưa có server).
   */
  reviews: boolean;
  /**
   * Chuông thông báo trong ứng dụng. Production: chỉ có thông báo phía server
   * của chính người dùng (0031 `user_notifications`, vd. kết quả kiểm tra giao
   * dịch nạp) — xem `clientNotifications`.
   */
  notifications: boolean;
  /**
   * Thông báo tạo ở client (`notificationStore.push` trong store/màn hình). Chạy
   * trên máy NGƯỜI THAO TÁC (vd. thông báo cho người khác, luồng của admin) và
   * không lưu đâu cả → production TẮT (push không lưu), chỉ local/demo bật.
   */
  clientNotifications: boolean;
  /** Lượt boost. Chưa có backend. */
  boost: boolean;
  // Lịch cá nhân không có cờ ở đây: scheduleStore tự biết server có bảng
  // `schedule_blocks` (0023) hay chưa (`serverSync`).
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
  livePayments: true,
  wallet: true,
  disputes: false,
  verifications: false,
  ratings: false,
  reviews: true,
  notifications: true,
  clientNotifications: false,
  boost: false,
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
  reviews: true,
  notifications: true,
  clientNotifications: true,
  boost: true,
};

/** Trả về map capability theo data mode hiện tại (đọc runtime, build-safe). */
export function capabilities(): Capabilities {
  return isSupabaseEnv() ? SUPABASE_CAPABILITIES : LOCAL_CAPABILITIES;
}

/** Tiện ích: một tính năng có khả dụng ở data mode hiện tại không. */
export function hasCapability(key: keyof Capabilities): boolean {
  return capabilities()[key];
}
