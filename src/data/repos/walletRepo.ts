/**
 * Wallet repo (supabase) — ví điện tử MÔ PHỎNG + két trung tâm "Két bảo đảm CALE_MOCK".
 * Mọi thay đổi tiền đi qua RPC server (security definer). Client KHÔNG tự cộng/
 * trừ số dư (bất biến #7). Tiền không thật.
 *   Deposit (top-up) : ví +amount, két +amount.
 *   Withdraw         : ví -amount (guard đủ), két không đổi.
 *   Lock/Complete    : nằm trong confirm_deposit_session / employer_confirm_completion.
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

/** Nạp tiền vào ví (mô phỏng) → ví +amount, két +amount. Trả số dư mới. */
export async function walletTopUp(amount: number): Promise<number> {
  const { data, error } = await getSupabaseClient().rpc('wallet_top_up', { p_amount: amount });
  if (error) throw new Error(error.message);
  return num((data as { balance?: number } | null)?.balance);
}

/** Rút tiền khỏi ví (mô phỏng) → ví -amount (guard đủ số dư). Trả số dư mới. */
export async function walletWithdraw(amount: number): Promise<number> {
  const { data, error } = await getSupabaseClient().rpc('wallet_withdraw', { p_amount: amount });
  if (error) throw new Error(error.message);
  return num((data as { balance?: number } | null)?.balance);
}

/** Số dư két trung tâm Két bảo đảm CALE_MOCK (minh bạch demo). */
export async function getSystemBank(): Promise<{ name: string; balance: number }> {
  const { data, error } = await getSupabaseClient().rpc('get_system_bank');
  if (error) throw new Error(`get_system_bank: ${error.message}`);
  const obj = (data ?? {}) as { name?: string; balance?: number };
  return { name: s(obj.name) || 'Két bảo đảm CALE_MOCK', balance: num(obj.balance) };
}
