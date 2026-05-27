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
  UserWallet,
  WalletLedgerEntry,
  WalletLedgerEntryKind,
} from '@/types';

const nowIso = (): string => new Date().toISOString();

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
}));
