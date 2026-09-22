/**
 * Wallet repo (supabase, READ-ONLY). Đọc "sổ cái mô phỏng" suy từ dữ liệu server
 * qua RPC `get_wallet_ledger` (worker: lương các ca đã xác nhận hoàn thành).
 * KHÔNG ghi/giữ tiền ở client (bất biến #7) — chỉ hiển thị.
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

/** Lấy ledger ví (read-only) của user hiện tại từ Supabase. */
export async function getWalletLedger(): Promise<WalletLedgerEntry[]> {
  const { data, error } = await getSupabaseClient().rpc('get_wallet_ledger');
  if (error) throw new Error(`get_wallet_ledger: ${error.message}`);
  const rows = Array.isArray(data) ? (data as Row[]) : [];
  return rows.map(rowToEntry);
}
