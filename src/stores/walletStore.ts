/**
 * Wallet store — Phase 10C-Stab-1 Batch 4 J.
 *
 * Mock-only wallet model with append-only ledger entries. Mirrors
 * existing store patterns: hydrate from persistence on boot, persist
 * on every mutation, no setTimeout / setInterval / polling.
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import { newPrefixedId } from '@/lib/ids';
import type {
  Result,
  UserWallet,
  WalletLedgerEntry,
  WalletLedgerEntryKind,
} from '@/types';

const nowIso = (): string => new Date().toISOString();

/** CORE-STABILITY-6 Part 3 — withdrawal rejection reasons. */
export type WalletWithdrawError = 'INVALID_AMOUNT' | 'INSUFFICIENT_BALANCE';

interface MutationContext {
  shiftId?: string;
  applicationId?: string;
  note?: string;
}

export interface WalletStore {
  wallets: UserWallet[];
  ledger: WalletLedgerEntry[];

  hydrate: (
    wallets: UserWallet[],
    ledger: WalletLedgerEntry[],
  ) => void;

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
    shifts: Array<{ id: string; employerId: string; title: string }>;
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

  hydrate(wallets, ledger) {
    set({ wallets, ledger });
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
        occurredAt: ts,
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
      });
      // NOTE: we intentionally do NOT debit the employer for these
      // historical completions. The deposit left the employer's
      // account pre-demo (escrow), so debiting now would drive the
      // wallet negative with no offsetting top-up — confusing for the
      // demo and contrary to "no negative wallet" (QA-Fix-1 E8). New
      // runtime deposits / refunds / top-ups are the only employer
      // wallet movements.
    }

    if (ledger.length > 0) {
      set({ wallets, ledger });
      persistWallets(wallets);
      persistLedger(ledger);
    }
  },
}));
