/**
 * Dựng `PersonalSnapshot` (dữ liệu của CHÍNH người đang hỏi) cho trợ lý hỗ trợ từ
 * dữ liệu đã có trong store — không gọi mạng, không đoán.
 *
 *   - Khách → `null` (trợ lý mời đăng nhập).
 *   - Chỉ lấy bản ghi của `user.id` (ca của mình / đơn của mình / ví của mình).
 *   - Trường nào store không có số đáng tin ở chế độ hiện tại → `undefined`
 *     (trợ lý bảo người dùng xem ở Bảng điều khiển):
 *       · số dư production: chỉ khi `wallets` đã có ví của người này (đã nạp từ
 *         server như ô Ví ở bảng điều khiển); chưa có → `undefined`, không tự nạp.
 *       · số dư demo: sổ cái mô phỏng (`deriveWalletBalance`) — giống ô Ví.
 *   - Ca sắp tới theo đồng hồ (`getShiftLifecycleState`): chỉ Đã đăng / Sắp bắt đầu /
 *     Đang diễn ra; bỏ ca huỷ / hoàn thành / hết hạn / chờ xác nhận / nháp.
 *   - Tên gọi: chỉ người lao động / quản trị viên (họ tên). Nhà tuyển dụng chỉ có
 *     tên doanh nghiệp — trợ lý gọi "từ cuối" của tên nên bỏ trống cho tự nhiên.
 *
 * Logic thuần (không React).
 */

import { deriveWalletBalance } from '@/domain/finance';
import { getShiftLifecycleState, type ShiftLifecycleState } from '@/domain/shiftLifecycleState';
import type { PersonalSnapshot } from '@/domain/supportBot';
import { formatRelativeDay } from '@/lib/format';
import type {
  Application,
  ChatThread,
  Shift,
  User,
  UserWallet,
  WalletLedgerEntry,
} from '@/types';

export interface PersonalSources {
  user: User | null;
  /** true = production (Supabase). */
  live: boolean;
  shifts: readonly Shift[];
  applications: readonly Application[];
  wallets: readonly UserWallet[];
  ledger: readonly WalletLedgerEntry[];
  threads: readonly ChatThread[];
  locale: 'vi' | 'en';
  now: Date;
}

const UPCOMING: ReadonlySet<ShiftLifecycleState> = new Set(['Published', 'StartingSoon', 'InProgress']);
/** Ca còn nhận / còn chờ duyệt đơn (chưa bắt đầu). */
const NOT_STARTED: ReadonlySet<ShiftLifecycleState> = new Set(['Published', 'StartingSoon']);

function startKey(s: Shift): string {
  return `${s.date}T${s.startTime}`;
}

function describeShift(s: Shift, href: string, locale: 'vi' | 'en', now: Date) {
  return {
    title: s.title,
    when: `${formatRelativeDay(s.date, locale, now)}, ${s.startTime}–${s.endTime}`,
    href,
  };
}

export function buildPersonalSnapshot(src: PersonalSources): PersonalSnapshot | null {
  const { user, live, shifts, applications, wallets, ledger, threads, locale, now } = src;
  if (!user) return null;
  const nowIso = now.toISOString();
  const allApps = applications as Application[];
  const stateOf = (s: Shift) => getShiftLifecycleState(s, allApps, nowIso);
  const shiftById = new Map(shifts.map((s) => [s.id, s]));

  const snapshot: PersonalSnapshot = {};
  if (user.role === 'worker' || user.role === 'admin') snapshot.name = user.fullName;

  if (user.role === 'worker' || user.role === 'employer') {
    if (live) {
      const wallet = wallets.find((w) => w.userId === user.id);
      if (wallet) snapshot.balance = wallet.balance;
    } else {
      snapshot.balance = deriveWalletBalance(ledger, user.id);
    }
    snapshot.unreadMessages = threads.reduce((sum, th) => sum + (th.unread > 0 ? th.unread : 0), 0);
  }

  if (user.role === 'worker') {
    const mine = allApps.filter((a) => a.workerId === user.id);
    const accepted = mine
      .filter((a) => a.status === 'Approved' || a.status === 'CheckedIn')
      .map((a) => shiftById.get(a.shiftId))
      .filter((s): s is Shift => !!s && UPCOMING.has(stateOf(s)))
      .sort((a, b) => startKey(a).localeCompare(startKey(b)));
    snapshot.nextShift = accepted[0] ? describeShift(accepted[0], `/shifts/${accepted[0].id}`, locale, now) : null;
    snapshot.applications = {
      pending: mine.filter((a) => {
        const s = a.status === 'Pending' ? shiftById.get(a.shiftId) : undefined;
        return !!s && NOT_STARTED.has(stateOf(s));
      }).length,
      approved: mine.filter((a) => {
        const s = a.status === 'Approved' ? shiftById.get(a.shiftId) : undefined;
        return !!s && UPCOMING.has(stateOf(s));
      }).length,
    };
  }

  if (user.role === 'employer') {
    const own = shifts.filter((s) => s.employerId === user.id);
    const upcoming = own
      .filter((s) => UPCOMING.has(stateOf(s)))
      .sort((a, b) => startKey(a).localeCompare(startKey(b)));
    snapshot.nextShift = upcoming[0]
      ? describeShift(upcoming[0], `/employer/shifts/${upcoming[0].id}`, locale, now)
      : null;
    const open = new Set(own.filter((s) => NOT_STARTED.has(stateOf(s))).map((s) => s.id));
    snapshot.pendingReviews = allApps.filter((a) => a.status === 'Pending' && open.has(a.shiftId)).length;
  }

  return snapshot;
}
