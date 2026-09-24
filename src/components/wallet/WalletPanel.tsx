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
import { PayosTopUpQr } from '@/components/payment/PayosTopUpQr';
import { formatVND } from '@/lib/format';
import { formatNumberVNInput, parseVNNumberInput } from '@/lib/numberVN';
import { showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';
import { getDataMode } from '@/data/supabaseClient';
import type { CreatePaymentResult } from '@/data/repos/paymentRepo';
import { useWalletStore } from '@/stores/walletStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { walletHistoryLink } from '@/lib/notificationTarget';
import { BANKS, bankByBin } from '@/lib/banks';
import { deriveWalletBalance, projectRecentTransactions } from '@/domain/finance';
import type { PayoutOrder, Role, WalletLedgerEntry } from '@/types';

/** PayOS: số tiền tối thiểu cho một lần nạp / rút. */
const PAYOS_MIN_AMOUNT = 2000;

/** Tone chữ cho trạng thái lệnh rút (luôn kèm nhãn chữ, không chỉ dựa màu). */
function withdrawalTone(status: PayoutOrder['status']): string {
  if (status === 'SUCCEEDED') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (status === 'FAILED' || status === 'CANCELLED') return 'bg-rose-50 text-rose-800 ring-rose-200';
  return 'bg-amber-50 text-amber-800 ring-amber-200';
}

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

/** Map mã lỗi server (supabase / PayOS) sang copy tiếng Việt. */
function mapWalletErr(raw: string): string {
  if (raw.includes('INSUFFICIENT_BALANCE')) return t('wallet.withdraw.error.insufficient');
  if (raw.includes('INVALID_AMOUNT')) return t('wallet.topUp.error.invalid');
  if (raw.includes('INVALID_BANK')) return t('wallet.withdraw.real.error.bank');
  if (raw.includes('INVALID_ACCOUNT')) return t('wallet.withdraw.real.error.account');
  if (raw.includes('PAYOUT_REJECTED')) return t('wallet.withdraw.real.error.rejected');
  if (raw.includes('PAYOS_REJECTED') || raw.includes('PAYOS_UNREACHABLE')) {
    return 'Không tạo được mã thanh toán PayOS. Vui lòng thử lại sau.';
  }
  if (raw.includes('NOT_CONFIGURED')) return 'Cổng thanh toán chưa được cấu hình. Vui lòng liên hệ hỗ trợ.';
  return 'Không thực hiện được. Vui lòng thử lại.';
}

function entryToneClass(amount: number): string {
  if (amount > 0) return 'text-emerald-700';
  if (amount < 0) return 'text-rose-700';
  return 'text-gray-700';
}

function LedgerRow({ entry }: { entry: WalletLedgerEntry }) {
  const sign = entry.amount > 0 ? '+' : entry.amount < 0 ? '-' : '';
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
  const ledger = useWalletStore((s) => s.ledger);
  const wallets = useWalletStore((s) => s.wallets);
  const topUp = useWalletStore((s) => s.topUp);
  const withdraw = useWalletStore((s) => s.withdraw);
  const createRealTopUp = useWalletStore((s) => s.createRealTopUp);
  const withdrawAsync = useWalletStore((s) => s.withdrawAsync);
  const refetchAsync = useWalletStore((s) => s.refetchAsync);
  const withdrawals = useWalletStore((s) => s.withdrawals);
  const refetchWithdrawalsAsync = useWalletStore((s) => s.refetchWithdrawalsAsync);
  const checkWithdrawalAsync = useWalletStore((s) => s.checkWithdrawalAsync);
  const pushNotification = useNotificationStore((s) => s.push);
  // Supabase: ví THẬT ở server — nạp/rút tiền thật qua PayOS.
  // Local/demo: ví mock localStorage (nạp/rút demo như cũ).
  const supabase = getDataMode() === 'supabase';
  const [busy, setBusy] = useState(false);

  // Supabase: nạp số dư THẬT + lệnh rút gần đây từ server khi mount (không nơi
  // nào khác gọi refetch → nếu bỏ, UI hiển thị số dư client suy từ ledger, lệch
  // server). No-op ở local.
  useEffect(() => {
    if (!supabase) return;
    void refetchAsync(userId);
    void refetchWithdrawalsAsync();
  }, [supabase, refetchAsync, refetchWithdrawalsAsync, userId]);

  // Cluster 3 · BUG 5 (Req 2.5): route the balance + transaction list through
  // the single derived money module. `deriveWalletBalance` equals the store's
  // `getBalance` by the wallet invariant (balance == Σ of the user's ledger
  // entries, kept in sync on every mutation), and `projectRecentTransactions`
  // reproduces the same user-scoped, newest-first projection the panel built
  // inline — so the panel's behavior + format are unchanged; only the source
  // is unified.
  // Supabase: số dư THẬT server (wallets[].balance từ refetchAsync) — nguồn
  // sự thật, KHÔNG suy từ ledger (client) để tránh lệch với server khi đăng
  // ca (#7). Local/demo: suy từ ledger như cũ.
  const balance = useMemo(() => {
    if (supabase) return wallets.find((w) => w.userId === userId)?.balance ?? 0;
    return deriveWalletBalance(ledger, userId);
  }, [supabase, wallets, ledger, userId]);
  const userLedger = useMemo(
    () => projectRecentTransactions(ledger, userId),
    [ledger, userId],
  );
  const recent = useMemo(
    () => projectRecentTransactions(ledger, userId, recentLimit),
    [ledger, userId, recentLimit],
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional deeplink signal→open-ledger-modal sync (guarded by prevSignal ref so initial 0 doesn't auto-open); refactor would break the wallet deeplink
      if (openLedgerSignal > 0) setModalOpen(true);
    }
  }, [openLedgerSignal]);
  // QA-Fix-2 Phase 4 — custom top-up modal state.
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpText, setTopUpText] = useState('');
  const [topUpError, setTopUpError] = useState<string | null>(null);
  // Supabase: nạp tiền THẬT qua PayOS. Bước 'amount' → nhập số → tạo đơn;
  // bước 'qr' → QR PayOS + "Tôi đã chuyển khoản" (component PayosTopUpQr).
  const [topUpStep, setTopUpStep] = useState<'amount' | 'qr'>('amount');
  const [topUpOrder, setTopUpOrder] = useState<CreatePaymentResult | null>(null);
  // CORE-STABILITY-6 Part 3 — withdrawal modal state.
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawText, setWithdrawText] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  // Supabase: rút tiền THẬT về tài khoản ngân hàng (PayOS Kênh chi).
  const [withdrawBin, setWithdrawBin] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawName, setWithdrawName] = useState('');
  /** Một key cho một lần mở form rút — bấm lặp không tạo lệnh rút thứ hai. */
  const withdrawIdemRef = useRef('');
  const [checkingId, setCheckingId] = useState<string | null>(null);

  /** Mở form rút tiền: key idempotency mới + điền sẵn tài khoản của lệnh rút gần nhất. */
  function openWithdraw() {
    setWithdrawText('');
    setWithdrawNote('');
    setWithdrawError(null);
    withdrawIdemRef.current = crypto.randomUUID();
    const last = withdrawals[0];
    if (last) {
      setWithdrawBin(last.toBin);
      setWithdrawAccount(last.toAccountNumber);
      setWithdrawName(last.toAccountName ?? '');
    }
    setWithdrawOpen(true);
  }

  async function submitTopUp() {
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
    // Supabase: tạo đơn nạp THẬT + QR PayOS qua Edge Function. Ví chỉ tăng khi
    // PayOS xác nhận đã nhận tiền (webhook, server-side).
    if (supabase) {
      if (amount < PAYOS_MIN_AMOUNT) {
        setTopUpError(`Số tiền nạp tối thiểu là ${formatVND(PAYOS_MIN_AMOUNT)}.`);
        return;
      }
      if (busy) return;
      setBusy(true);
      setTopUpError(null);
      const r = await createRealTopUp(amount);
      setBusy(false);
      if (!r.ok) {
        setTopUpError(mapWalletErr(r.error));
        return;
      }
      setTopUpOrder(r.value);
      setTopUpStep('qr');
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

  /** Đóng + reset modal nạp tiền về bước đầu. */
  function closeTopUp() {
    setTopUpOpen(false);
    setTopUpStep('amount');
    setTopUpText('');
    setTopUpError(null);
    setTopUpOrder(null);
  }

  /** PayOS xác nhận đã nhận tiền (ví đã được refetch trong PayosTopUpQr). */
  function onTopUpPaid(order: CreatePaymentResult) {
    showSuccess('Đã nạp tiền vào ví', `+${formatVND(order.amount)}`);
    pushNotification({
      userId,
      kind: 'UserTopUp',
      title: 'Đã nạp tiền vào ví',
      body: `${t('wallet.kind.UserTopUp')}: +${formatVND(order.amount)}`,
      link: walletHistoryLink(role),
      dedupeKey: `PayosTopUp:${order.orderCode}`,
    });
    closeTopUp();
  }

  /** Tra lại một lệnh rút đang xử lý (server hỏi PayOS; thất bại → hoàn ví). */
  async function checkWithdrawal(id: string) {
    if (checkingId) return;
    setCheckingId(id);
    const r = await checkWithdrawalAsync(id, userId);
    setCheckingId(null);
    if (r.ok && r.value.status === 'SUCCEEDED') {
      showSuccess(t('wallet.withdraw.real.success'));
    }
  }

  async function submitWithdraw() {
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
    // Supabase: rút THẬT về tài khoản ngân hàng qua PayOS. Server trừ ví (khoá
    // chống rút vượt số dư) rồi chi; PayOS từ chối → server hoàn ví.
    if (supabase) {
      if (amount < PAYOS_MIN_AMOUNT) {
        setWithdrawError(t('wallet.withdraw.real.error.min'));
        return;
      }
      if (amount > balance) {
        setWithdrawError(t('wallet.withdraw.error.insufficient'));
        return;
      }
      if (!bankByBin(withdrawBin)) {
        setWithdrawError(t('wallet.withdraw.real.error.bank'));
        return;
      }
      const account = withdrawAccount.replace(/\s+/g, '');
      if (!/^[0-9]{4,30}$/.test(account)) {
        setWithdrawError(t('wallet.withdraw.real.error.account'));
        return;
      }
      if (busy) return;
      setBusy(true);
      setWithdrawError(null);
      const r = await withdrawAsync(
        {
          amount,
          toBin: withdrawBin,
          toAccountNumber: account,
          toAccountName: withdrawName.trim().toUpperCase(),
          idempotencyKey: withdrawIdemRef.current || crypto.randomUUID(),
        },
        userId,
      );
      setBusy(false);
      if (!r.ok) {
        setWithdrawError(mapWalletErr(r.error));
        // Lệnh đã bị từ chối + hoàn ví → lần bấm tiếp là lệnh MỚI.
        withdrawIdemRef.current = crypto.randomUUID();
        return;
      }
      if (r.value.status === 'SUCCEEDED') {
        showSuccess(t('wallet.withdraw.real.success'), `-${formatVND(amount)}`);
      } else if (r.value.status === 'FAILED') {
        setWithdrawError(t('wallet.withdraw.real.error.rejected'));
        withdrawIdemRef.current = crypto.randomUUID();
        return;
      } else {
        showSuccess(t('wallet.withdraw.real.processing'), `-${formatVND(amount)}`);
      }
      pushNotification({
        userId,
        kind: 'UserWithdrawal',
        title: t('wallet.withdraw.real.title'),
        body: `${t('wallet.kind.UserWithdrawal')}: -${formatVND(amount)}`,
        link: walletHistoryLink(role),
        dedupeKey: `PayosWithdrawal:${r.value.id}`,
      });
      setWithdrawText('');
      setWithdrawOpen(false);
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
                setTopUpStep('amount');
                setTopUpOpen(true);
              }}
            >
              {t('wallet.topUp.button')}
            </Button>
          )}
          {allowWithdraw && balance > 0 && (
            <Button size="sm" variant="ghost" onClick={openWithdraw}>
              {t('wallet.withdraw.button')}
            </Button>
          )}
        </div>
      </div>

      {/* Supabase: lệnh rút tiền thật gần đây + nút tra lại lệnh đang xử lý. */}
      {supabase && withdrawals.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-gray-700">
            {t('wallet.withdraw.real.history')}
          </p>
          <ul className="flex flex-col gap-2">
            {withdrawals.slice(0, 3).map((w) => {
              const pending = w.status === 'PENDING' || w.status === 'PROCESSING';
              return (
                <li
                  key={w.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block font-semibold tabular-nums text-gray-900">
                      -{formatVND(w.amount)}
                    </span>
                    <span className="mt-0.5 block text-gray-600">
                      {bankByBin(w.toBin)?.shortName ?? w.toBin} · *{w.toAccountNumber.slice(-4)} ·{' '}
                      <span className="font-mono text-[11px] text-gray-500">
                        {formatOccurredAt(w.createdAt)}
                      </span>
                    </span>
                    {w.status === 'FAILED' && w.failReason && (
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-rose-700">
                        {/không đủ|insufficient/i.test(w.failReason)
                          ? t('wallet.withdraw.real.failPayoutFunds')
                          : `Lý do: ${w.failReason}`}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${withdrawalTone(w.status)}`}
                    >
                      {t(`wallet.withdraw.real.status.${w.status}`)}
                    </span>
                    {pending && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => checkWithdrawal(w.id)}
                        loading={checkingId === w.id}
                        disabled={checkingId !== null}
                      >
                        {t('wallet.withdraw.real.check')}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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

      {/* QA-Fix-2 Phase 4 — custom-amount top-up modal. Supabase: 2 bước
          (nhập số → QR PayOS thật). Local/demo: 1 bước (nhập số → nạp demo). */}
      <Modal
        open={topUpOpen}
        onClose={closeTopUp}
        title={
          supabase && topUpStep === 'qr'
            ? 'Nạp tiền — quét QR chuyển khoản'
            : supabase
              ? 'Nạp tiền vào ví'
              : t('wallet.topUp.modal.title')
        }
      >
        {supabase && topUpStep === 'qr' && topUpOrder ? (
          <PayosTopUpQr
            order={topUpOrder}
            userId={userId}
            onPaid={() => onTopUpPaid(topUpOrder)}
            onBack={() => {
              setTopUpStep('amount');
              setTopUpOrder(null);
              setTopUpError(null);
            }}
          />
        ) : (
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
            {supabase && (
              <p className="text-xs text-gray-500">
                Bước sau: quét mã QR bằng app ngân hàng để chuyển khoản qua PayOS. Tối
                thiểu {formatVND(PAYOS_MIN_AMOUNT)}.
              </p>
            )}
            {topUpError && (
              <p role="alert" className="text-xs text-red-600">
                {topUpError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={closeTopUp}>
                {t('wallet.topUp.modal.cancel')}
              </Button>
              <Button size="sm" variant="primary" onClick={submitTopUp} loading={busy}>
                {supabase ? 'Tiếp tục' : t('wallet.topUp.modal.submit')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rút tiền. Supabase: rút THẬT về tài khoản ngân hàng (PayOS). Local: demo. */}
      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title={supabase ? t('wallet.withdraw.real.title') : t('wallet.withdraw.modal.title')}
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
          {supabase ? (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-700">
                  {t('wallet.withdraw.real.bank')}
                </span>
                <select
                  value={withdrawBin}
                  onChange={(e) => {
                    setWithdrawBin(e.target.value);
                    if (withdrawError) setWithdrawError(null);
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 min-h-[44px] hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <option value="">{t('wallet.withdraw.real.bankPlaceholder')}</option>
                  {BANKS.map((b) => (
                    <option key={b.bin} value={b.bin}>
                      {b.shortName} — {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-700">
                  {t('wallet.withdraw.real.account')}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={withdrawAccount}
                  maxLength={30}
                  onChange={(e) => {
                    setWithdrawAccount(e.target.value.replace(/[^\d]/g, ''));
                    if (withdrawError) setWithdrawError(null);
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-gray-900 min-h-[44px] hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-700">
                  {t('wallet.withdraw.real.accountName')}
                </span>
                <input
                  type="text"
                  autoComplete="off"
                  value={withdrawName}
                  maxLength={100}
                  placeholder={t('wallet.withdraw.real.accountNamePlaceholder')}
                  onChange={(e) => setWithdrawName(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 min-h-[44px] hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                />
              </label>
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
                {t('wallet.withdraw.real.note')}
              </p>
            </>
          ) : (
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
          )}
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
            <Button size="sm" variant="primary" onClick={submitWithdraw} loading={busy}>
              {supabase ? t('wallet.withdraw.real.submit') : t('wallet.withdraw.modal.submit')}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
