'use client';

/**
 * Phase 10C-Stab-1 Batch 4B — wallet balance tile + ledger modal.
 *
 * Mock-only. Reads from `useWalletStore.getBalance(userId)` for the
 * balance and `useWalletStore.forUser(userId)` for the ledger entries.
 * The component is intentionally generic: the same tile renders on
 * both the worker and employer dashboards. Balance can go negative
 * when the employer holds outstanding deposits — the styling
 * accommodates either sign without distinction.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Modal } from '@/components/ui';
import { formatVND } from '@/lib/format';
import { formatNumberVNInput, parseVNNumberInput } from '@/lib/numberVN';
import { showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';
import { useWalletStore } from '@/stores/walletStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { walletHistoryLink } from '@/lib/notificationTarget';
import type { Role, WalletLedgerEntry } from '@/types';

interface WalletPanelProps {
  userId: string;
  /**
   * Optional title override for the tile (default `t('wallet.title')`).
   * Useful when a dashboard wants to label the tile per role.
   */
  title?: string;
  /**
   * Maximum number of ledger entries to render in the inline preview.
   * Defaults to 3. The "Xem lịch sử giao dịch" button always opens
   * the full modal regardless of this value.
   */
  recentLimit?: number;
  /**
   * QA-Fix-1 E — when true, render the demo "Nạp tiền vào ví" action.
   * Defaults to true; pass false on read-only contexts.
   */
  allowTopUp?: boolean;
  /**
   * CORE-STABILITY-6 Part 3 — when true, render the demo "Rút tiền"
   * action (shown only when balance > 0). Defaults to true.
   */
  allowWithdraw?: boolean;
  /**
   * CORE-STABILITY-7 Part 1 — recipient role, used to build the
   * wallet-history deeplink on top-up / withdraw notifications so a
   * click lands the user on their OWN dashboard wallet modal. Defaults
   * to 'worker' when omitted.
   */
  role?: Role;
  /**
   * CORE-STABILITY-7 Part 1 — when this number increments, the ledger
   * (transaction history) modal opens. Lets a dashboard open the wallet
   * history in response to a `?modal=wallet` deeplink / same-route
   * notification event without WalletPanel knowing about the router.
   */
  openLedgerSignal?: number;
  className?: string;
}

/** QA-Fix-2 Phase 4 — demo top-up cap so a fat-finger entry can't
 *  create an absurd balance. */
const TOP_UP_MAX = 50_000_000;
/** Optional quick presets shown above the custom-amount input. */
const TOP_UP_PRESETS = [200_000, 500_000, 1_000_000];

const DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function formatOccurredAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return DATE_FMT.format(d);
}

function entryToneClass(amount: number): string {
  if (amount > 0) return 'text-emerald-700';
  if (amount < 0) return 'text-rose-700';
  return 'text-gray-700';
}

function LedgerRow({ entry }: { entry: WalletLedgerEntry }) {
  const sign = entry.amount > 0 ? '+' : '';
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs">
      <div className="min-w-0 flex-1">
        <span className="block font-medium text-gray-900">
          {t(`wallet.kind.${entry.kind}`)}
        </span>
        <span className="mt-0.5 block font-mono text-[11px] text-gray-500">
          {formatOccurredAt(entry.occurredAt)}
        </span>
        {entry.note && (
          <span className="mt-0.5 block leading-relaxed text-gray-600">
            {entry.note}
          </span>
        )}
      </div>
      <span
        className={`shrink-0 text-sm font-semibold tabular-nums ${entryToneClass(entry.amount)}`}
      >
        {sign}
        {formatVND(Math.abs(entry.amount))}
      </span>
    </li>
  );
}

export function WalletPanel({
  userId,
  title,
  recentLimit = 3,
  allowTopUp = true,
  allowWithdraw = true,
  role = 'worker',
  openLedgerSignal = 0,
  className = '',
}: WalletPanelProps) {
  const balance = useWalletStore((s) => s.getBalance(userId));
  const ledger = useWalletStore((s) => s.ledger);
  const topUp = useWalletStore((s) => s.topUp);
  const withdraw = useWalletStore((s) => s.withdraw);
  const pushNotification = useNotificationStore((s) => s.push);

  const userLedger = useMemo(
    () =>
      ledger
        .filter((l) => l.userId === userId)
        .slice()
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [ledger, userId],
  );
  const recent = useMemo(
    () => userLedger.slice(0, recentLimit),
    [userLedger, recentLimit],
  );

  const [modalOpen, setModalOpen] = useState(false);

  // CORE-STABILITY-7 Part 1 — open the ledger (transaction history)
  // modal when the dashboard signals a wallet deeplink. We track the
  // previous signal so the initial 0 doesn't auto-open, and so repeat
  // deeplinks (signal increments again) re-open it.
  const prevSignal = useRef(openLedgerSignal);
  useEffect(() => {
    if (openLedgerSignal !== prevSignal.current) {
      prevSignal.current = openLedgerSignal;
      if (openLedgerSignal > 0) setModalOpen(true);
    }
  }, [openLedgerSignal]);
  // QA-Fix-2 Phase 4 — custom top-up modal state.
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpText, setTopUpText] = useState('');
  const [topUpError, setTopUpError] = useState<string | null>(null);
  // CORE-STABILITY-6 Part 3 — withdrawal modal state.
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawText, setWithdrawText] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  function submitTopUp() {
    const trimmed = topUpText.trim();
    if (trimmed === '') {
      setTopUpError(t('wallet.topUp.error.required'));
      return;
    }
    const amount = parseVNNumberInput(trimmed);
    if (!Number.isFinite(amount) || amount <= 0) {
      setTopUpError(t('wallet.topUp.error.invalid'));
      return;
    }
    if (amount > TOP_UP_MAX) {
      setTopUpError(t('wallet.topUp.error.tooLarge'));
      return;
    }
    const entry = topUp(userId, amount);
    showSuccess(
      t('wallet.topUp.success'),
      `+${formatVND(amount)}`,
    );
    // CORE-STABILITY-7 Part 1.4 — top-up creates a notification that
    // deeplinks to the wallet history. Deduped per ledger entry id so a
    // re-render / double-submit can't double-notify.
    pushNotification({
      userId,
      kind: 'UserTopUp',
      title: t('wallet.topUp.success'),
      body: `${t('wallet.kind.UserTopUp')}: +${formatVND(amount)}`,
      link: walletHistoryLink(role),
      dedupeKey: `UserTopUp:${entry.id}`,
    });
    setTopUpText('');
    setTopUpError(null);
    setTopUpOpen(false);
  }

  function submitWithdraw() {
    const trimmed = withdrawText.trim();
    if (trimmed === '') {
      setWithdrawError(t('wallet.withdraw.error.required'));
      return;
    }
    const amount = parseVNNumberInput(trimmed);
    if (!Number.isFinite(amount) || amount <= 0) {
      setWithdrawError(t('wallet.withdraw.error.invalid'));
      return;
    }
    const result = withdraw(userId, amount, withdrawNote);
    if (!result.ok) {
      // The store guard is authoritative; map its reason to copy.
      setWithdrawError(
        result.error === 'INSUFFICIENT_BALANCE'
          ? t('wallet.withdraw.error.insufficient')
          : t('wallet.withdraw.error.invalid'),
      );
      return;
    }
    showSuccess(t('wallet.withdraw.success'), `-${formatVND(amount)}`);
    // Part 3.4 + CORE-STABILITY-7 Part 1.5 — emit a notification for
    // the withdrawal that deeplinks to the wallet history. Deduped per
    // ledger entry id.
    pushNotification({
      userId,
      kind: 'UserWithdrawal',
      title: t('wallet.withdraw.success'),
      body: `${t('wallet.kind.UserWithdrawal')}: -${formatVND(amount)}`,
      link: walletHistoryLink(role),
      dedupeKey: `UserWithdrawal:${result.value.id}`,
    });
    setWithdrawText('');
    setWithdrawNote('');
    setWithdrawError(null);
    setWithdrawOpen(false);
  }

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-700">
            {title ?? t('wallet.title')}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {t('wallet.balance.label')}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatVND(balance)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setModalOpen(true)}
            disabled={userLedger.length === 0}
          >
            {t('wallet.ledger.openButton')}
          </Button>
          {allowTopUp && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setTopUpText('');
                setTopUpError(null);
                setTopUpOpen(true);
              }}
            >
              {t('wallet.topUp.button')}
            </Button>
          )}
          {allowWithdraw && balance > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setWithdrawText('');
                setWithdrawNote('');
                setWithdrawError(null);
                setWithdrawOpen(true);
              }}
            >
              {t('wallet.withdraw.button')}
            </Button>
          )}
        </div>
      </div>

      {userLedger.length === 0 ? (
        <p className="mt-3 text-xs italic text-gray-500">
          {t('wallet.balance.empty')}
        </p>
      ) : (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-gray-700">
            {t('wallet.ledger.recent')}
          </p>
          <ul className="flex flex-col gap-2">
            {recent.map((entry) => (
              <LedgerRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('wallet.ledger.modal.title')}
        className="max-w-xl"
      >
        <div className="flex flex-col gap-3 text-sm">
          {userLedger.length === 0 ? (
            <p className="italic text-gray-500">
              {t('wallet.balance.empty')}
            </p>
          ) : (
            <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
              {userLedger.map((entry) => (
                <LedgerRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setModalOpen(false)}
            >
              {t('wallet.ledger.modal.close')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* QA-Fix-2 Phase 4 — custom-amount top-up modal. */}
      <Modal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        title={t('wallet.topUp.modal.title')}
      >
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {TOP_UP_PRESETS.map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTopUpText(formatNumberVNInput(preset));
                  setTopUpError(null);
                }}
              >
                {formatVND(preset)}
              </Button>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-700">
              {t('wallet.topUp.modal.label')}
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={topUpText}
              placeholder={t('wallet.topUp.modal.placeholder')}
              onChange={(e) => {
                // Numbers only — strip non-digits, format with VN grouping.
                const numericOnly = e.target.value.replace(/[^\d]/g, '');
                setTopUpText(formatNumberVNInput(numericOnly));
                if (topUpError) setTopUpError(null);
              }}
              aria-invalid={!!topUpError}
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm font-mono text-gray-900',
                'min-h-[44px] transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
                topUpError
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-300 bg-white hover:border-gray-400',
              ].join(' ')}
            />
          </label>
          {topUpError && (
            <p role="alert" className="text-xs text-red-600">
              {topUpError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setTopUpOpen(false)}
            >
              {t('wallet.topUp.modal.cancel')}
            </Button>
            <Button size="sm" variant="primary" onClick={submitTopUp}>
              {t('wallet.topUp.modal.submit')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* CORE-STABILITY-6 Part 3 — withdrawal modal (demo). */}
      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title={t('wallet.withdraw.modal.title')}
      >
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-xs text-gray-600">
            {t('wallet.withdraw.modal.available')}:{' '}
            <span className="font-semibold text-gray-900">
              {formatVND(balance)}
            </span>
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-700">
              {t('wallet.withdraw.modal.label')}
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={withdrawText}
              placeholder={t('wallet.withdraw.modal.placeholder')}
              onChange={(e) => {
                const numericOnly = e.target.value.replace(/[^\d]/g, '');
                setWithdrawText(formatNumberVNInput(numericOnly));
                if (withdrawError) setWithdrawError(null);
              }}
              aria-invalid={!!withdrawError}
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm font-mono text-gray-900',
                'min-h-[44px] transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
                withdrawError
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-300 bg-white hover:border-gray-400',
              ].join(' ')}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-700">
              {t('wallet.withdraw.modal.noteLabel')}
            </span>
            <input
              type="text"
              autoComplete="off"
              value={withdrawNote}
              maxLength={120}
              placeholder={t('wallet.withdraw.modal.notePlaceholder')}
              onChange={(e) => setWithdrawNote(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 min-h-[44px] hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            />
          </label>
          {withdrawError && (
            <p role="alert" className="text-xs text-red-600">
              {withdrawError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setWithdrawOpen(false)}
            >
              {t('wallet.withdraw.modal.cancel')}
            </Button>
            <Button size="sm" variant="primary" onClick={submitWithdraw}>
              {t('wallet.withdraw.modal.submit')}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
