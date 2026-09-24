/**
 * Wallet store — Phase 10C-Stab-1 Batch 4 J.
 *
 * Mock-only wallet model with append-only ledger entries. Mirrors
 * existing store patterns: hydrate from persistence on boot, persist
 * on every mutation, no setTimeout / setInterval / polling.
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import { getDataMode } from '@/data/supabaseClient';
import {
  getWalletState,
  getSystemBank,
  refundDepositForShift,
} from '@/data/repos/walletRepo';
import {
  createPayment,
  getPaymentOrderStatus,
  confirmMockPayment,
  requestWithdrawal,
  checkWithdrawal,
  listMyWithdrawals,
  PaymentApiError,
  type CreatePaymentResult,
  type WithdrawalRequest,
  type WithdrawalResult,
} from '@/data/repos/paymentRepo';
import { newPrefixedId } from '@/lib/ids';
import type {
  PayoutOrder,
  Result,
  UserWallet,
  WalletLedgerEntry,
  WalletLedgerEntryKind,
} from '@/types';

/** Mã lỗi server (PaymentApiError.code) hoặc message — để UI map sang câu tiếng Việt. */
const errCode = (e: unknown, fallback: string): string =>
  e instanceof PaymentApiError ? e.code : e instanceof Error ? e.message : fallback;

const nowIso = (): string => new Date().toISOString();

/** CORE-STABILITY-6 Part 3 — withdrawal rejection reasons. */
export type WalletWithdrawError = 'INVALID_AMOUNT' | 'INSUFFICIENT_BALANCE';

interface MutationContext {
  shiftId?: string;
  applicationId?: string;
  note?: string;
  occurredAt?: string;
}

export interface WalletStore {
  wallets: UserWallet[];
  ledger: WalletLedgerEntry[];
  /** Số dư két trung tâm "Két bảo đảm CALE_MOCK" (supabase). */
  systemBank: { name: string; balance: number } | null;
  /** Lệnh rút tiền thật gần đây của user hiện tại (supabase). */
  withdrawals: PayoutOrder[];

  hydrate: (
    wallets: UserWallet[],
    ledger: WalletLedgerEntry[],
  ) => void;

  /**
   * Supabase: nạp số dư + lịch sử ví của user hiện tại từ server
   * (get_wallet_state) + số dư két. KHÔNG giữ tiền client (#7). No-op ở local.
   * `userId` (current auth user) để gán số dư server kể cả khi ledger rỗng.
   */
  refetchAsync(userId?: string): Promise<void>;
  /**
   * NẠP tiền THẬT qua PayOS: tạo đơn + link/QR (Edge Function). KHÔNG cộng ví
   * ở đây — ví chỉ tăng khi webhook PayOS xác nhận. Trả QR để UI hiển thị.
   * Supabase-only.
   */
  createRealTopUp(amount: number): Promise<Result<CreatePaymentResult, string>>;
  /**
   * Poll trạng thái một đơn nạp thật. Nếu đã PAID → refetch số dư (ví đã được
   * webhook cộng server-side) và trả true. Supabase-only.
   */
  pollRealTopUp(orderCode: number, userId?: string): Promise<boolean>;
  /**
   * MÔ PHỎNG (PAYOS_MOCK): xác nhận "đã chuyển khoản" → server cộng ví ngay →
   * refetch số dư. Trả true nếu ghi nhận thành công. Supabase-only.
   */
  confirmMockTopUp(orderCode: number, userId?: string): Promise<boolean>;
  /**
   * RÚT tiền THẬT về tài khoản ngân hàng (PayOS Kênh chi) → refetch số dư + danh
   * sách lệnh rút. Lỗi trả mã server (INSUFFICIENT_BALANCE, PAYOUT_REJECTED...).
   * Supabase-only.
   */
  withdrawAsync(req: WithdrawalRequest, userId?: string): Promise<Result<WithdrawalResult, string>>;
  /** Nạp danh sách lệnh rút gần đây. Supabase-only; lỗi → giữ danh sách cũ. */
  refetchWithdrawalsAsync(): Promise<void>;
  /** Tra lại một lệnh rút đang xử lý → refetch số dư + danh sách. Supabase-only. */
  checkWithdrawalAsync(id: string, userId?: string): Promise<Result<WithdrawalResult, string>>;
  /**
   * Hoàn cọc (mô phỏng) cho ca huỷ/hết hạn không có người làm → refetch số dư.
   * Server idempotent + tự kiểm điều kiện. Trả true nếu vừa hoàn (để caller
   * hiển thị toast). Supabase-only; no-op ở local. KHÔNG ném cho no-op thường.
   */
  refundForShiftAsync(shiftId: string, userId?: string): Promise<boolean>;

  getBalance(userId: string): number;
  forUser(userId: string): WalletLedgerEntry[];

  credit(
    userId: string,
    amount: number,
    kind: WalletLedgerEntryKind,
    ctx?: MutationContext,
  ): WalletLedgerEntry;

  debit(
    userId: string,
    amount: number,
    kind: WalletLedgerEntryKind,
    ctx?: MutationContext,
  ): WalletLedgerEntry;

  /**
   * QA-Fix-1 E — demo-only top-up. Credits `userId` with `amount` via
   * a `'UserTopUp'` ledger entry. Returns the created entry so the
   * caller can fire a toast / notification.
   */
  topUp(userId: string, amount: number): WalletLedgerEntry;

  /**
   * CORE-STABILITY-6 Part 3 — demo-only withdrawal. Debits `userId` by
   * `amount` via a `'UserWithdrawal'` ledger entry (stored negative).
   * GUARDED: rejects when `amount` is not a finite number > 0
   * (`'INVALID_AMOUNT'`) or exceeds the available balance
   * (`'INSUFFICIENT_BALANCE'`). The guard lives here (not just the UI)
   * so a direct store call cannot overdraw. No real banking.
   */
  withdraw(
    userId: string,
    amount: number,
    note?: string,
  ): Result<WalletLedgerEntry, WalletWithdrawError>;

  /**
   * QA-Fix-1 E — reconstruct the wallet ledger from historical
   * confirmed applications when the ledger is empty (e.g. on first
   * hydration of seed data). Idempotent: a no-op when any ledger
   * entry already exists, so runtime transactions are never
   * double-counted.
   *
   * For each `Confirmed` application it credits the worker's payout
   * (`WorkerWageReleased`) and debits the employer's matching deposit
   * (`EmployerDepositHeld`) so both wallets reflect completed history.
   */
  backfillFromHistory(input: {
    applications: Array<{
      id: string;
      shiftId: string;
      workerId: string;
      status: string;
      payoutAmount?: number;
      confirmedAt?: string;
    }>;
    shifts: Array<{
      id: string;
      employerId: string;
      title: string;
      status: string;
      depositAmount: number;
      createdAt?: string;
      updatedAt?: string;
    }>;
  }): void;
}

function persistWallets(wallets: UserWallet[]): void {
  write(STORAGE_KEYS.wallets, wallets);
}

function persistLedger(ledger: WalletLedgerEntry[]): void {
  write(STORAGE_KEYS.walletLedger, ledger);
}

function applyMutation(
  state: { wallets: UserWallet[]; ledger: WalletLedgerEntry[] },
  userId: string,
  delta: number,
  kind: WalletLedgerEntryKind,
  ctx?: MutationContext,
): {
  wallets: UserWallet[];
  ledger: WalletLedgerEntry[];
  entry: WalletLedgerEntry;
} {
  const ts = nowIso();
  const entry: WalletLedgerEntry = {
    id: newPrefixedId('wallet-entry'),
    occurredAt: ts,
    userId,
    kind,
    amount: delta,
    shiftId: ctx?.shiftId,
    applicationId: ctx?.applicationId,
    note: ctx?.note,
  };
  const ledger = [...state.ledger, entry];
  const existing = state.wallets.find((w) => w.userId === userId);
  let wallets: UserWallet[];
  if (existing) {
    wallets = state.wallets.map((w) =>
      w.userId === userId
        ? { ...w, balance: w.balance + delta, updatedAt: ts }
        : w,
    );
  } else {
    wallets = [
      ...state.wallets,
      { userId, balance: delta, updatedAt: ts },
    ];
  }
  return { wallets, ledger, entry };
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  wallets: [],
  ledger: [],
  systemBank: null,
  withdrawals: [],

  hydrate(wallets, ledger) {
    set({ wallets, ledger });
  },

  async refetchAsync(userId) {
    if (getDataMode() !== 'supabase') return;
    const [state, bank] = await Promise.all([
      getWalletState(),
      getSystemBank().catch(() => null),
    ]);
    // Số dư THẬT từ server (không suy client). Ghi vào ví của user hiện tại.
    // (RLS: chỉ trả ví của mình → ledger toàn của current user.) Ưu tiên
    // `userId` truyền vào để gán số dư kể cả khi ledger rỗng (server có số dư
    // nhưng chưa có giao dịch nào của user, hoặc balance>0 mà ledger trống).
    const uid = userId ?? state.ledger[0]?.userId;
    const wallets: UserWallet[] = uid
      ? [{ userId: uid, balance: state.balance, updatedAt: nowIso() }]
      : [];
    set({ ledger: state.ledger, wallets, systemBank: bank });
  },

  async createRealTopUp(amount) {
    if (getDataMode() !== 'supabase') return { ok: false, error: 'NOT_SUPABASE' };
    try {
      const res = await createPayment(amount);
      return { ok: true, value: res };
    } catch (e) {
      return { ok: false, error: errCode(e, 'CREATE_PAYMENT_FAILED') };
    }
  },

  async pollRealTopUp(orderCode, userId) {
    if (getDataMode() !== 'supabase') return false;
    try {
      const order = await getPaymentOrderStatus(orderCode);
      if (order.status === 'PAID') {
        await get().refetchAsync(userId);
        return true;
      }
      return false;
    } catch {
      // No-op an toàn: lỗi mạng không chặn UI; lần poll sau thử lại.
      return false;
    }
  },

  async confirmMockTopUp(orderCode, userId) {
    if (getDataMode() !== 'supabase') return false;
    try {
      const ok = await confirmMockPayment(orderCode);
      if (ok) await get().refetchAsync(userId);
      return ok;
    } catch {
      return false;
    }
  },

  async withdrawAsync(req, userId) {
    if (getDataMode() !== 'supabase') return { ok: false, error: 'NOT_SUPABASE' };
    try {
      const res = await requestWithdrawal(req);
      return { ok: true, value: res };
    } catch (e) {
      return { ok: false, error: errCode(e, 'WITHDRAW_FAILED') };
    } finally {
      // Kể cả khi lỗi: server có thể đã trừ rồi hoàn ví — luôn đọc lại số dư thật.
      await Promise.all([
        get().refetchAsync(userId).catch(() => undefined),
        get().refetchWithdrawalsAsync(),
      ]);
    }
  },

  async refetchWithdrawalsAsync() {
    if (getDataMode() !== 'supabase') return;
    try {
      set({ withdrawals: await listMyWithdrawals() });
    } catch {
      // Giữ danh sách cũ; không chặn UI.
    }
  },

  async checkWithdrawalAsync(id, userId) {
    if (getDataMode() !== 'supabase') return { ok: false, error: 'NOT_SUPABASE' };
    try {
      const res = await checkWithdrawal(id);
      return { ok: true, value: res };
    } catch (e) {
      return { ok: false, error: errCode(e, 'CHECK_FAILED') };
    } finally {
      await Promise.all([
        get().refetchAsync(userId).catch(() => undefined),
        get().refetchWithdrawalsAsync(),
      ]);
    }
  },

  async refundForShiftAsync(shiftId, userId) {
    if (getDataMode() !== 'supabase') return false;
    try {
      const r = await refundDepositForShift(shiftId);
      if (r === 'REFUNDED') {
        await get().refetchAsync(userId);
        return true;
      }
      return false;
    } catch {
      // No-op an toàn: lỗi mạng/quyền không chặn UI. Sẽ thử lại lần quét sau.
      return false;
    }
  },

  getBalance(userId) {
    const w = get().wallets.find((x) => x.userId === userId);
    return w?.balance ?? 0;
  },

  forUser(userId) {
    return get().ledger.filter((l) => l.userId === userId);
  },

  credit(userId, amount, kind, ctx) {
    const next = applyMutation(get(), userId, Math.abs(amount), kind, ctx);
    set({ wallets: next.wallets, ledger: next.ledger });
    persistWallets(next.wallets);
    persistLedger(next.ledger);
    return next.entry;
  },

  debit(userId, amount, kind, ctx) {
    const next = applyMutation(get(), userId, -Math.abs(amount), kind, ctx);
    set({ wallets: next.wallets, ledger: next.ledger });
    persistWallets(next.wallets);
    persistLedger(next.ledger);
    return next.entry;
  },

  topUp(userId, amount) {
    const next = applyMutation(
      get(),
      userId,
      Math.abs(amount),
      'UserTopUp',
      { note: `Nạp tiền vào ví (demo): +${Math.abs(amount).toLocaleString('vi-VN')} đồng` },
    );
    set({ wallets: next.wallets, ledger: next.ledger });
    persistWallets(next.wallets);
    persistLedger(next.ledger);
    return next.entry;
  },

  withdraw(userId, amount, note) {
    // Guard: amount must be a finite number > 0.
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: 'INVALID_AMOUNT' };
    }
    // Guard: cannot exceed available balance (no overdraw). This lives
    // in the store so a direct call can't bypass the UI check.
    const balance = get().getBalance(userId);
    if (amount > balance) {
      return { ok: false, error: 'INSUFFICIENT_BALANCE' };
    }
    const trimmedNote = (note ?? '').trim();
    const next = applyMutation(get(), userId, -Math.abs(amount), 'UserWithdrawal', {
      note:
        trimmedNote.length > 0
          ? `Rút tiền khỏi ví (demo): ${trimmedNote}`
          : `Rút tiền khỏi ví (demo): -${Math.abs(amount).toLocaleString('vi-VN')} đồng`,
    });
    set({ wallets: next.wallets, ledger: next.ledger });
    persistWallets(next.wallets);
    persistLedger(next.ledger);
    return { ok: true, value: next.entry };
  },

  backfillFromHistory(input) {
    // Idempotent: never overwrite a ledger that already has entries
    // (runtime transactions or a prior backfill).
    if (get().ledger.length > 0) return;

    const shiftById = new Map(input.shifts.map((s) => [s.id, s]));
    const ts = nowIso();
    let wallets = get().wallets;
    const ledger = [...get().ledger];

    function apply(
      userId: string,
      delta: number,
      kind: WalletLedgerEntryKind,
      ctx: MutationContext,
    ) {
      const entry: WalletLedgerEntry = {
        id: newPrefixedId('wallet-entry'),
        occurredAt: ctx.occurredAt ?? ts,
        userId,
        kind,
        amount: delta,
        shiftId: ctx.shiftId,
        applicationId: ctx.applicationId,
        note: ctx.note,
      };
      ledger.push(entry);
      const existing = wallets.find((w) => w.userId === userId);
      if (existing) {
        wallets = wallets.map((w) =>
          w.userId === userId
            ? { ...w, balance: w.balance + delta, updatedAt: ts }
            : w,
        );
      } else {
        wallets = [...wallets, { userId, balance: delta, updatedAt: ts }];
      }
    }

    for (const a of input.applications) {
      if (a.status !== 'Confirmed') continue;
      const payout = a.payoutAmount ?? 0;
      if (payout <= 0) continue;
      const shift = shiftById.get(a.shiftId);
      const title = shift?.title ?? 'ca làm';
      // Worker received the wage — credit the worker wallet so the
      // "Số dư ví" reconciles with "Tổng thu nhập".
      apply(a.workerId, payout, 'WorkerWageReleased', {
        shiftId: a.shiftId,
        applicationId: a.id,
        note: `Lương ca "${title}" (lịch sử)`,
        occurredAt: a.confirmedAt || ts,
      });
    }

    // Employer history: Top up and Deposit Held for all non-draft shifts.
    // Refund the unused portion for Expired/Completed shifts.
    for (const shift of input.shifts) {
      if (shift.status === 'Draft') continue;
      
      const title = shift.title ?? 'ca làm';
      // Fallbacks in case shift doesn't have these
      const depositTime = shift.createdAt || ts;
      const refundTime = shift.updatedAt || ts;
      
      // Subtract 1 second for TopUp so it sorts before the Deposit
      const topUpTime = new Date(new Date(depositTime).getTime() - 1000).toISOString();

      // 1. Simulate Top-Up so balance doesn't go negative
      apply(shift.employerId, shift.depositAmount, 'UserTopUp', {
        note: `Nạp tiền (hệ thống mô phỏng)`,
        occurredAt: topUpTime,
      });

      // 2. Simulate Deposit Held
      apply(shift.employerId, -shift.depositAmount, 'EmployerDepositHeld', {
        shiftId: shift.id,
        note: `Đảm bảo thanh toán ca "${title}"`,
        occurredAt: depositTime,
      });

      // 3. If the shift is Expired (no workers), simulate full refund
      if (shift.status === 'Expired' || shift.status === 'Cancelled') {
        apply(shift.employerId, shift.depositAmount, 'EmployerUnusedRefund', {
          shiftId: shift.id,
          note: `Hoàn tiền ca "${title}" (${shift.status === 'Expired' ? 'hết hạn' : 'đã hủy'})`,
          occurredAt: refundTime,
        });
      }
      
      // 4. If Completed, refund the UNUSED portion (deposit - actual payout)
      if (shift.status === 'Completed') {
        const shiftApps = input.applications.filter(a => a.shiftId === shift.id && a.status === 'Confirmed');
        const payout = shiftApps.reduce((sum, a) => sum + (a.payoutAmount ?? 0), 0);
        const unused = shift.depositAmount - payout;
        if (unused > 0) {
          apply(shift.employerId, unused, 'EmployerUnusedRefund', {
            shiftId: shift.id,
            note: `Hoàn tiền dư ca "${title}"`,
            occurredAt: refundTime,
          });
        }
      }
    }

    if (ledger.length > 0) {
      set({ wallets, ledger });
      persistWallets(wallets);
      persistLedger(ledger);
    }
  },
}));
