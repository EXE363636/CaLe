/**
 * P2-1 (F9) — cọc người lao động (migration 0028).
 *
 * Server quyết định mọi thứ về tiền: có cần cọc không, bao nhiêu, giữ / hoàn /
 * chuyển. Client chỉ đọc trạng thái để HIỂN THỊ số cọc trước khi worker đồng ý
 * (tính lại bằng src/domain/workerDeposit.ts, khớp server) rồi gửi số đã đồng ý
 * lên `apply_with_deposit` — server từ chối nếu số thật lớn hơn.
 */

import { getSupabaseClient } from '@/data/supabaseClient';
import type {
  WorkerDepositReason,
  WorkerDepositSettings,
  WorkerHoldStatus,
} from '@/domain/workerDeposit';

type Row = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const sOrNull = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

export interface WorkerDepositStatus extends WorkerDepositSettings {
  needsDeposit: boolean;
  reason: WorkerDepositReason;
  completedInWindow: number;
  blockedUntil: string | null;
  /** Số khoản cọc đang giữ / khiếu nại của worker. */
  openHolds: number;
  /** Số dư tiền mặt hiện tại của worker. */
  balance: number;
}

const REASONS: WorkerDepositReason[] = ['DISABLED', 'IDENTITY', 'COMPLETED_SHIFTS', 'RECENT_NO_SHOW', 'NOT_ENOUGH'];

function toSettings(o: Row): WorkerDepositSettings {
  return {
    enabled: o.enabled === true,
    ratioPct: num(o.ratioPct),
    maxAmount: num(o.maxAmount),
    exemptAfter: num(o.exemptAfter),
    windowDays: num(o.windowDays),
    maxOpenHolds: num(o.maxOpenHolds),
    forfeitDailyCap: num(o.forfeitDailyCap),
  };
}

export async function getMyWorkerDepositStatus(): Promise<WorkerDepositStatus> {
  const { data, error } = await getSupabaseClient().rpc('get_my_worker_deposit_status');
  if (error) throw new Error(error.message);
  const o = (data ?? {}) as Row;
  const reason = REASONS.includes(o.reason as WorkerDepositReason)
    ? (o.reason as WorkerDepositReason)
    : 'DISABLED';
  return {
    ...toSettings(o),
    needsDeposit: o.needsDeposit === true,
    reason,
    completedInWindow: num(o.completedInWindow),
    blockedUntil: sOrNull(o.blockedUntil),
    openHolds: num(o.openHolds),
    balance: num(o.balance),
  };
}

export interface WorkerHold {
  id: string;
  applicationId: string;
  shiftId: string;
  amount: number;
  status: WorkerHoldStatus;
  contestReason: string | null;
  contestedAt: string | null;
  /** Hệ thống đưa sang chờ admin (vd. NTD đã nhận quá trần 24 giờ). */
  reviewReason: string | null;
  resolution: 'WORKER' | 'EMPLOYER' | null;
  resolutionNote: string | null;
  settledAt: string | null;
  createdAt: string;
  /** applications.status / no_show_at của đơn. */
  appStatus: string | null;
  noShowAt: string | null;
}

// L6 (0028): worker chỉ được cấp quyền đọc các cột này.
const HOLD_COLUMNS =
  'id, application_id, shift_id, amount, status, contest_reason, contested_at, review_reason, ' +
  'resolution, resolution_note, settled_at, created_at, applications(status, no_show_at)';

function rowToHold(r: Row): WorkerHold {
  const app = (r.applications ?? null) as Row | null;
  return {
    id: s(r.id),
    applicationId: s(r.application_id),
    shiftId: s(r.shift_id),
    amount: num(r.amount),
    status: (s(r.status) as WorkerHoldStatus) || 'Held',
    contestReason: sOrNull(r.contest_reason),
    contestedAt: sOrNull(r.contested_at),
    reviewReason: sOrNull(r.review_reason),
    resolution: r.resolution === 'WORKER' || r.resolution === 'EMPLOYER' ? r.resolution : null,
    resolutionNote: sOrNull(r.resolution_note),
    settledAt: sOrNull(r.settled_at),
    createdAt: s(r.created_at),
    appStatus: app ? sOrNull(app.status) : null,
    noShowAt: app ? sOrNull(app.no_show_at) : null,
  };
}

/** Khoản giữ cọc của một đơn (RLS: chỉ của chính worker). */
export async function getMyHoldForApplication(applicationId: string): Promise<WorkerHold | null> {
  const { data, error } = await getSupabaseClient()
    .from('worker_holds')
    .select(HOLD_COLUMNS)
    .eq('application_id', applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToHold(data as unknown as Row) : null;
}

/**
 * Khoản của worker cần hành động vì đơn bị đánh vắng (cảnh báo ở dashboard, T3):
 * đang giữ, hoặc hệ thống đưa sang chờ admin mà worker chưa ghi lý do.
 */
export async function getMyNoShowHolds(): Promise<WorkerHold[]> {
  const { data, error } = await getSupabaseClient()
    .from('worker_holds')
    .select(HOLD_COLUMNS)
    .in('status', ['Held', 'Contested']);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[])
    .map(rowToHold)
    .filter((h) => h.appStatus === 'NoShow' && (h.status === 'Held' || !h.contestReason));
}

/** applications.no_show_at của đơn (mốc hạn khiếu nại khi không có khoản cọc). */
export async function getMyApplicationNoShowAt(applicationId: string): Promise<string | null> {
  const { data, error } = await getSupabaseClient()
    .from('applications')
    .select('no_show_at')
    .eq('id', applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? sOrNull((data as Row).no_show_at) : null;
}

export interface NoShowContest {
  applicationId: string;
  reason: string;
  status: 'Pending' | 'Upheld' | 'Rejected';
  resolutionNote: string | null;
  createdAt: string;
}

/** L1 — khiếu nại vắng mặt không kèm cọc của một đơn (RLS: chỉ của chính worker). */
export async function getMyNoShowContest(applicationId: string): Promise<NoShowContest | null> {
  const { data, error } = await getSupabaseClient()
    .from('no_show_contests')
    .select('application_id, reason, status, resolution_note, created_at')
    .eq('application_id', applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const r = data as Row;
  const status = r.status === 'Upheld' || r.status === 'Rejected' ? r.status : 'Pending';
  return {
    applicationId: s(r.application_id),
    reason: s(r.reason),
    status,
    resolutionNote: sOrNull(r.resolution_note),
    createdAt: s(r.created_at),
  };
}

/** Ứng tuyển kèm cọc tối đa `acceptedDeposit` đồng (worker đã đồng ý trên UI). */
export async function applyWithDeposit(shiftId: string, acceptedDeposit: number): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('apply_with_deposit', {
    p_shift_id: shiftId,
    p_accepted_deposit: acceptedDeposit,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Khiếu nại vắng mặt (có cọc hoặc không — server tự chọn đường). */
export async function contestNoShow(applicationId: string, reason: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('worker_contest_no_show', {
    p_application_id: applicationId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Admin (server kiểm is_admin())
// ---------------------------------------------------------------------------

export interface AdminWorkerDepositSettings extends WorkerDepositSettings {
  heldCount: number;
  heldAmount: number;
  contestedCount: number;
  /** Khoản đã đến hạn xử lý hơn 1 giờ mà vẫn đang giữ (lượt quét lỗi / bị bỏ qua). */
  overdueHeldCount: number;
}

export async function adminGetWorkerDepositSettings(): Promise<AdminWorkerDepositSettings> {
  const { data, error } = await getSupabaseClient().rpc('admin_get_worker_deposit_settings');
  if (error) throw new Error(error.message);
  const o = (data ?? {}) as Row;
  return {
    ...toSettings(o),
    heldCount: num(o.heldCount),
    heldAmount: num(o.heldAmount),
    contestedCount: num(o.contestedCount),
    overdueHeldCount: num(o.overdueHeldCount),
  };
}

export async function adminSetWorkerDepositSettings(v: WorkerDepositSettings): Promise<void> {
  const { error } = await getSupabaseClient().rpc('admin_set_worker_deposit_settings', {
    p_enabled: v.enabled,
    p_ratio_pct: v.ratioPct,
    p_max: v.maxAmount,
    p_exempt_after: v.exemptAfter,
    p_window_days: v.windowDays,
    p_max_open: v.maxOpenHolds,
    p_forfeit_daily_cap: v.forfeitDailyCap,
  });
  if (error) throw new Error(error.message);
}

/** Một khiếu nại chờ admin: có cọc (`holdId`) hoặc không kèm cọc (L1). */
export interface AdminNoShowCase {
  key: string;
  /** null = khiếu nại không kèm cọc. */
  holdId: string | null;
  applicationId: string;
  shiftTitle: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  workerId: string;
  workerName: string;
  employerId: string;
  employerName: string;
  /** 0 khi không kèm cọc. */
  amount: number;
  contestReason: string | null;
  /** Hệ thống đưa sang chờ admin (EMPLOYER_DAILY_CAP) — worker chưa chắc đã khiếu nại. */
  reviewReason: string | null;
  createdAt: string;
}

const hhmm = (v: unknown) => s(v).slice(0, 5);

export async function adminListNoShowCases(): Promise<AdminNoShowCase[]> {
  const client = getSupabaseClient();
  const [holds, contests] = await Promise.all([
    client.rpc('admin_list_worker_holds', { p_status: 'Contested' }),
    client.rpc('admin_list_no_show_contests', { p_status: 'Pending' }),
  ]);
  if (holds.error) throw new Error(holds.error.message);
  if (contests.error) throw new Error(contests.error.message);
  const a: AdminNoShowCase[] = ((holds.data ?? []) as Row[]).map((r) => ({
    key: `h:${s(r.id)}`,
    holdId: s(r.id),
    applicationId: s(r.application_id),
    shiftTitle: s(r.shift_title),
    shiftDate: s(r.shift_date),
    startTime: hhmm(r.start_time),
    endTime: hhmm(r.end_time),
    workerId: s(r.worker_id),
    workerName: s(r.worker_name),
    employerId: s(r.employer_id),
    employerName: s(r.employer_name),
    amount: num(r.amount),
    contestReason: sOrNull(r.contest_reason),
    reviewReason: sOrNull(r.review_reason),
    createdAt: s(r.contested_at) || s(r.created_at),
  }));
  const b: AdminNoShowCase[] = ((contests.data ?? []) as Row[]).map((r) => ({
    key: `c:${s(r.application_id)}`,
    holdId: null,
    applicationId: s(r.application_id),
    shiftTitle: s(r.shift_title),
    shiftDate: s(r.shift_date),
    startTime: hhmm(r.start_time),
    endTime: hhmm(r.end_time),
    workerId: s(r.worker_id),
    workerName: s(r.worker_name),
    employerId: s(r.employer_id),
    employerName: s(r.employer_name),
    amount: 0,
    contestReason: sOrNull(r.reason),
    reviewReason: null,
    createdAt: s(r.created_at),
  }));
  return [...a, ...b].sort((x, y) => x.createdAt.localeCompare(y.createdAt));
}

/** Xử một khiếu nại: `forWorker` = hoàn cọc / gỡ vắng mặt cho người lao động. */
export async function adminResolveNoShowCase(c: AdminNoShowCase, forWorker: boolean, note: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = c.holdId
    ? await client.rpc('admin_resolve_worker_hold', { p_hold_id: c.holdId, p_to_worker: forWorker, p_note: note })
    : await client.rpc('admin_resolve_no_show_contest', {
        p_application_id: c.applicationId, p_overturn: forWorker, p_note: note,
      });
  if (error) throw new Error(error.message);
}
