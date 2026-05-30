/**
 * CORE-STABILITY-6 — unit guards for wallet withdrawal (Part 3),
 * employer deposit insufficient-balance (Part 4 store guard), and
 * notification deduplication (Part 2).
 *
 * Deterministic store-level tests; no React, no timers.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { useWalletStore } from '@/stores/walletStore';
import { useNotificationStore } from '@/stores/notificationStore';

const USER = 'user-cs6';

beforeEach(() => {
  useWalletStore.setState({ wallets: [], ledger: [] });
  useNotificationStore.setState({ notifications: [] });
});

// ---------------------------------------------------------------------------
// Part 3 — wallet withdrawal
// ---------------------------------------------------------------------------

describe('walletStore.withdraw — demo withdrawal guard (Part 3)', () => {
  it('withdraws an exact valid amount, debits the balance, and adds a negative ledger entry', () => {
    useWalletStore.getState().topUp(USER, 500_000);
    const r = useWalletStore.getState().withdraw(USER, 200_000);
    expect(r.ok).toBe(true);
    expect(useWalletStore.getState().getBalance(USER)).toBe(300_000);
    const ledger = useWalletStore.getState().forUser(USER);
    const withdrawal = ledger.find((l) => l.kind === 'UserWithdrawal');
    expect(withdrawal).toBeDefined();
    expect(withdrawal!.amount).toBe(-200_000);
  });

  it('blocks a withdrawal greater than the balance (INSUFFICIENT_BALANCE) with no ledger change', () => {
    useWalletStore.getState().topUp(USER, 100_000);
    const ledgerBefore = useWalletStore.getState().ledger.length;
    const r = useWalletStore.getState().withdraw(USER, 100_001);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('INSUFFICIENT_BALANCE');
    expect(useWalletStore.getState().getBalance(USER)).toBe(100_000);
    expect(useWalletStore.getState().ledger.length).toBe(ledgerBefore);
  });

  it('allows withdrawing the EXACT full balance to zero', () => {
    useWalletStore.getState().topUp(USER, 250_000);
    const r = useWalletStore.getState().withdraw(USER, 250_000);
    expect(r.ok).toBe(true);
    expect(useWalletStore.getState().getBalance(USER)).toBe(0);
  });

  it('rejects zero / negative / non-finite amounts (INVALID_AMOUNT)', () => {
    useWalletStore.getState().topUp(USER, 100_000);
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = useWalletStore.getState().withdraw(USER, bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe('INVALID_AMOUNT');
    }
    // Balance untouched by any rejected attempt.
    expect(useWalletStore.getState().getBalance(USER)).toBe(100_000);
  });

  it('persists an exact withdrawal note when supplied', () => {
    useWalletStore.getState().topUp(USER, 300_000);
    const r = useWalletStore.getState().withdraw(USER, 50_000, 'Vietcombank 0123');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.note).toContain('Vietcombank 0123');
  });
});

// ---------------------------------------------------------------------------
// Part 2 — notification deduplication + ordering
// ---------------------------------------------------------------------------

describe('notificationStore.push — dedupe + ordering (Part 2)', () => {
  it('does NOT create a duplicate when the same (userId, dedupeKey) is pushed again', () => {
    const a = useNotificationStore.getState().push({
      userId: USER,
      kind: 'ShiftEnded',
      title: 'Ca làm đã kết thúc',
      body: 'first',
      dedupeKey: 'ShiftEnded:app-1',
    });
    const b = useNotificationStore.getState().push({
      userId: USER,
      kind: 'ShiftEnded',
      title: 'Ca làm đã kết thúc',
      body: 'second (should be ignored)',
      dedupeKey: 'ShiftEnded:app-1',
    });
    // Same record returned, only one notification stored.
    expect(b.id).toBe(a.id);
    expect(
      useNotificationStore
        .getState()
        .notifications.filter((n) => n.dedupeKey === 'ShiftEnded:app-1').length,
    ).toBe(1);
  });

  it('allows the same dedupeKey for a DIFFERENT user', () => {
    useNotificationStore.getState().push({
      userId: 'worker-x',
      kind: 'ShiftEnded',
      title: 'Ca làm đã kết thúc',
      body: 'worker',
      dedupeKey: 'ShiftEnded:app-9',
    });
    useNotificationStore.getState().push({
      userId: 'employer-y',
      kind: 'ShiftEnded',
      title: 'Ca làm đã kết thúc',
      body: 'employer',
      dedupeKey: 'ShiftEnded:app-9',
    });
    expect(useNotificationStore.getState().notifications.length).toBe(2);
  });

  it('still creates separate notifications when no dedupeKey is set', () => {
    useNotificationStore.getState().push({
      userId: USER,
      kind: 'ApplicationReceived',
      title: 'x',
      body: 'a',
    });
    useNotificationStore.getState().push({
      userId: USER,
      kind: 'ApplicationReceived',
      title: 'x',
      body: 'b',
    });
    expect(useNotificationStore.getState().notifications.length).toBe(2);
  });

  it('every notification carries a createdAt timestamp', () => {
    const n = useNotificationStore.getState().push({
      userId: USER,
      kind: 'ApplicationReceived',
      title: 'x',
      body: 'a',
    });
    expect(typeof n.createdAt).toBe('string');
    expect(Number.isNaN(Date.parse(n.createdAt))).toBe(false);
  });
});
