/**
 * Wallet repo (supabase) — đọc ví + két trung tâm, hoàn cọc ca huỷ/hết hạn.
 * Mọi thay đổi tiền đi qua RPC server (security definer). Client KHÔNG tự cộng/
 * trừ số dư (bất biến #7).
 *   Nạp / rút tiền THẬT : xem paymentRepo (PayOS). Hàm nạp/rút mô phỏng
 *                         wallet_top_up / wallet_withdraw đã bị khoá ở 0017.
 *   Lock/Complete       : nằm trong confirm_deposit_session / employer_confirm_completion.
 */

import { getSupabaseClient } from '@/data/supabaseClient';
import type { WalletLedgerEntry, WalletLedgerEntryKind } from '@/types';

type Row = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const sOpt = (v: unknown): string | undefined =>
  typeof v === 'string' && v !== '' ? v : undefined;
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

function rowToEntry(r: Row): WalletLedgerEntry {
  return {
    id: s(r.id),
    occurredAt: s(r.occurredAt),
    userId: s(r.userId),
    kind: (s(r.kind) as WalletLedgerEntryKind) || 'WorkerWageReleased',
    amount: num(r.amount),
    shiftId: sOpt(r.shiftId),
    applicationId: sOpt(r.applicationId),
    note: sOpt(r.note),
  };
}

export interface WalletState {
  balance: number;
  ledger: WalletLedgerEntry[];
}

/** Số dư + lịch sử ví của user hiện tại. */
export async function getWalletState(): Promise<WalletState> {
  const { data, error } = await getSupabaseClient().rpc('get_wallet_state');
  if (error) throw new Error(`get_wallet_state: ${error.message}`);
  const obj = (data ?? {}) as { balance?: number; ledger?: Row[] };
  return {
    balance: num(obj.balance),
    ledger: Array.isArray(obj.ledger) ? obj.ledger.map(rowToEntry) : [],
  };
}

/**
 * Tự chốt các ca quá hạn (sau giờ kết thúc + 24h): tự xác nhận / vắng mặt /
 * hoàn cọc phần dư (RPC sync_overdue_settlements, 0019). Idempotent; gọi khi
 * mở app (không polling). Trả số ca đã xử lý.
 */
export async function syncOverdueSettlements(): Promise<number> {
  const { data, error } = await getSupabaseClient().rpc('sync_overdue_settlements');
  if (error) throw new Error(error.message);
  return num(data);
}

export interface PayoutHealth {
  /** Lệnh rút thất bại vì Kênh chi hết tiền trong 24h qua. */
  insufficientFailures24h: number;
  lastInsufficientAt: string | null;
  failed24h: number;
  /** Lệnh rút đang chờ / đang xử lý. */
  processingCount: number;
}

/** Tình trạng Kênh chi (chỉ admin; RPC admin_payout_health, 0019). */
export async function getPayoutHealth(): Promise<PayoutHealth> {
  const { data, error } = await getSupabaseClient().rpc('admin_payout_health');
  if (error) throw new Error(error.message);
  const o = (data ?? {}) as Row;
  return {
    insufficientFailures24h: num(o.insufficientFailures24h),
    lastInsufficientAt: sOpt(o.lastInsufficientAt) ?? null,
    failed24h: num(o.failed24h),
    processingCount: num(o.processingCount),
  };
}

/**
 * Hoàn cọc cho một ca BỊ HUỶ / HẾT HẠN (phần chưa dùng).
 * Server tự kiểm điều kiện + idempotent (phiên đã hoàn → no-op). Trả trạng thái.
 * KHÔNG ném lỗi cho các no-op thường gặp (không có phiên HELD / chưa đủ điều
 * kiện) để tiện gọi hàng loạt khi quét ca; chỉ ném khi lỗi thật (quyền, mạng).
 */
export async function refundDepositForShift(
  shiftId: string,
): Promise<'REFUNDED' | 'NO_HELD_SESSION' | 'NOT_REFUNDABLE'> {
  const { data, error } = await getSupabaseClient().rpc('refund_deposit_for_shift', {
    p_shift_id: shiftId,
  });
  if (error) {
    if (error.message.includes('SHIFT_NOT_REFUNDABLE')) return 'NOT_REFUNDABLE';
    throw new Error(error.message);
  }
  const status = s((data as { status?: string } | null)?.status);
  return status === 'REFUNDED' ? 'REFUNDED' : 'NO_HELD_SESSION';
}

/** Số dư két trung tâm Két bảo đảm CALE_MOCK (minh bạch demo). */
export async function getSystemBank(): Promise<{ name: string; balance: number }> {
  const { data, error } = await getSupabaseClient().rpc('get_system_bank');
  if (error) throw new Error(`get_system_bank: ${error.message}`);
  const obj = (data ?? {}) as { name?: string; balance?: number };
  return { name: s(obj.name) || 'Két bảo đảm CALE_MOCK', balance: num(obj.balance) };
}
