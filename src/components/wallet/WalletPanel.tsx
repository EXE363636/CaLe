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
import QRCode from 'react-qr-code';
import { Button, Card, Modal } from '@/components/ui';
import { formatVND } from '@/lib/format';
import { formatNumberVNInput, parseVNNumberInput } from '@/lib/numberVN';
import { showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';
import { getDataMode } from '@/data/supabaseClient';
import { useWalletStore } from '@/stores/walletStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { walletHistoryLink } from '@/lib/notificationTarget';
import { deriveWalletBalance, projectRecentTransactions } from '@/domain/finance';
import { listPaymentChannels, type PaymentChannel } from '@/data/payments';
import type { Role, WalletLedgerEntry } from '@/types';

/** Tên đầy đủ theo mã ngân hàng — hiển thị "MÃ - Tên đầy đủ" (chữ thông tin,
 *  không phải logo/nhãn hiệu). Kênh vẫn gắn nhãn Demo. */
const BANK_FULL_NAME: Record<string, string> = {
  ACB: 'Ngân hàng Thương mại Cổ phần Á Châu',
  BIDV: 'Ngân hàng Thương mại Cổ phần Đầu tư và Phát triển Việt Nam',
  MB: 'Ngân hàng Thương mại Cổ phần Quân đội',
  VCB: 'Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam',
};

function topUpChannelLabel(ch: PaymentChannel): string {
  const full = ch.bankCode ? BANK_FULL_NAME[ch.bankCode] : undefined;
  return full && ch.bankCode ? `${ch.bankCode} - ${full}` : ch.displayName;
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

/** Map lỗi RPC ví (supabase) sang copy tiếng Việt. */
function mapWalletErr(raw: string): string {
  if (raw.includes('INSUFFICIENT_BALANCE')) return t('wallet.withdraw.error.insufficient');
  if (raw.includes('INVALID_AMOUNT')) return t('wallet.topUp.error.invalid');
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
  const topUpAsync = useWalletStore((s) => s.topUpAsync);
  const withdrawAsync = useWalletStore((s) => s.withdrawAsync);
  const refetchAsync = useWalletStore((s) => s.refetchAsync);
  const systemBank = useWalletStore((s) => s.systemBank);
  const pushNotification = useNotificationStore((s) => s.push);
  // Supabase: ví THẬT ở server (RPC). Local/demo: ví mock localStorage.
  const supabase = getDataMode() === 'supabase';
  const [busy, setBusy] = useState(false);

  // Supabase: nạp số dư THẬT từ server khi mount (không nơi nào khác gọi
  // refetch → nếu bỏ, UI hiển thị số dư client suy từ ledger, lệch server →
  // đăng ca báo INSUFFICIENT_BALANCE dù UI đủ). No-op ở local.
  useEffect(() => {
    if (supabase) void refetchAsync(userId);
  }, [supabase, refetchAsync, userId]);

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
  // Flow hybrid (supabase): nạp tiền qua QR mô phỏng. Bước 'amount' → nhập số;
  // bước 'qr' → chọn ngân hàng demo + QR → "Mô phỏng nạp thành công".
  const [topUpStep, setTopUpStep] = useState<'amount' | 'qr'>('amount');
  const [topUpAmount, setTopUpAmount] = useState(0);
  const [topUpChannels, setTopUpChannels] = useState<PaymentChannel[]>([]);
  const [topUpChannelId, setTopUpChannelId] = useState<string | null>(null);
  // CORE-STABILITY-6 Part 3 — withdrawal modal state.
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawText, setWithdrawText] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

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
    // Supabase: nạp qua QR mô phỏng — chuyển sang bước chọn ngân hàng + QR.
    // RPC wallet_top_up chỉ gọi khi bấm "Mô phỏng nạp thành công" (confirmTopUpQR).
    if (supabase) {
      if (busy) return;
      setBusy(true);
      setTopUpError(null);
      try {
        const chs = await listPaymentChannels();
        setTopUpChannels(chs);
        setTopUpChannelId((prev) => prev ?? chs[0]?.id ?? null);
        setTopUpAmount(amount);
        setTopUpStep('qr');
      } catch {
        setTopUpError('Không tải được danh sách ngân hàng. Vui lòng thử lại.');
      } finally {
        setBusy(false);
      }
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
    setTopUpAmount(0);
    setTopUpError(null);
  }

  /** Supabase QR: bấm "Mô phỏng nạp thành công" → RPC wallet_top_up (ví + két
   *  "Két bảo đảm CALE_MOCK" cùng tăng) → refetch số dư. */
  async function confirmTopUpQR() {
    if (busy) return;
    setBusy(true);
    const r = await topUpAsync(topUpAmount);
    setBusy(false);
    if (!r.ok) {
      setTopUpError(mapWalletErr(r.error));
      return;
    }
    showSuccess(t('wallet.topUp.success'), `+${formatVND(topUpAmount)}`);
    closeTopUp();
  }

  /** Payload QR mô phỏng — VÔ HẠI: không số tài khoản thật, đánh dấu không
   *  phải giao dịch thật. Chỉ để hiển thị mã QR demo. */
  const topUpQrPayload = useMemo(
    () =>
      JSON.stringify({
        realTransaction: false,
        provider: 'CALE_MOCK',
        purpose: 'wallet_topup',
        amount: topUpAmount,
      }),
    [topUpAmount],
  );

  const topUpSelectedChannel = useMemo(
    () => topUpChannels.find((c) => c.id === topUpChannelId) ?? null,
    [topUpChannels, topUpChannelId],
  );

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
    // Supabase: rút qua RPC (guard đủ số dư ở server). Két không đổi.
    if (supabase) {
      if (busy) return;
      setBusy(true);
      const r = await withdrawAsync(amount);
      setBusy(false);
      if (!r.ok) {
        setWithdrawError(mapWalletErr(r.error));
        return;
      }
      showSuccess(t('wallet.withdraw.success'), `-${formatVND(amount)}`);
      setWithdrawText('');
      setWithdrawNote('');
      setWithdrawError(null);
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

      {/* Supabase: nhãn mô phỏng + số dư két bảo đảm (minh bạch demo). */}
      {supabase && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="rounded-md bg-red-50 px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-200">
            MÔ PHỎNG — KHÔNG CÓ GIAO DỊCH TIỀN THẬT
          </p>
          {systemBank && (
            <p className="rounded-md bg-gray-50 px-3 py-1.5 text-[11px] text-gray-600 ring-1 ring-gray-100">
              {systemBank.name}:{' '}
              <span className="font-semibold text-gray-900">{formatVND(systemBank.balance)}</span>{' '}
              <span className="text-gray-400">(két bảo đảm mô phỏng)</span>
            </p>
          )}
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
          (nhập số → QR mô phỏng). Local/demo: 1 bước (nhập số → nạp). */}
      <Modal
        open={topUpOpen}
        onClose={closeTopUp}
        title={
          supabase && topUpStep === 'qr'
            ? 'Nạp tiền — quét QR mô phỏng'
            : t('wallet.topUp.modal.title')
        }
      >
        {supabase && topUpStep === 'qr' ? (
          <div className="flex flex-col gap-3 text-sm">
            <p className="rounded-md bg-red-50 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-200">
              MÔ PHỎNG — KHÔNG CÓ GIAO DỊCH TIỀN THẬT
            </p>

            <dl className="flex flex-col gap-1.5 rounded-xl bg-white px-4 py-3 ring-1 ring-orange-100">
              <div className="flex items-center justify-between">
                <dt className="text-gray-600">Số tiền nạp</dt>
                <dd className="font-semibold tabular-nums text-orange-700">{formatVND(topUpAmount)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-600">Nạp vào</dt>
                <dd className="font-medium text-gray-900">Ví CALE_MOCK của bạn</dd>
              </div>
            </dl>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-700">Chọn ngân hàng mô phỏng</span>
              <div className="flex flex-col gap-2">
                {topUpChannels.map((ch) => (
                  <label
                    key={ch.id}
                    className={[
                      'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                      topUpChannelId === ch.id
                        ? 'border-orange-400 bg-white shadow-sm'
                        : 'border-gray-200 bg-white hover:border-orange-300',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="wallet-topup-channel"
                      className="h-4 w-4 accent-orange-500"
                      checked={topUpChannelId === ch.id}
                      onChange={() => setTopUpChannelId(ch.id)}
                    />
                    <span className="min-w-0 flex-1 font-medium text-gray-900">
                      {topUpChannelLabel(ch)}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      Demo
                    </span>
                  </label>
                ))}
                {topUpChannels.length === 0 && (
                  <span className="text-sm text-gray-500">Chưa có kênh ngân hàng mô phỏng.</span>
                )}
              </div>
            </label>

            {topUpChannelId && (
              <div className="flex justify-center">
                <div className="w-fit rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-200">
                  <QRCode value={topUpQrPayload} size={176} level="M" aria-label="Mã QR nạp tiền mô phỏng" />
                </div>
              </div>
            )}
            {topUpSelectedChannel && (
              <p className="text-center text-xs text-gray-500">
                Người thụ hưởng: <strong>{topUpSelectedChannel.accountName ?? 'CALE DEMO'}</strong>
                {topUpSelectedChannel.accountNumberMasked
                  ? ` · ${topUpSelectedChannel.accountNumberMasked}`
                  : ''}
              </p>
            )}

            {topUpError && (
              <p role="alert" className="text-xs text-red-600">
                {topUpError}
              </p>
            )}

            <div className="flex justify-between gap-2 pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTopUpStep('amount');
                  setTopUpError(null);
                }}
                disabled={busy}
              >
                Quay lại
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={confirmTopUpQR}
                loading={busy}
                disabled={busy || !topUpChannelId}
              >
                Mô phỏng nạp tiền thành công
              </Button>
            </div>
          </div>
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
                Bước sau: chọn ngân hàng mô phỏng + quét QR để nạp vào ví CALE_MOCK.
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
            <Button size="sm" variant="primary" onClick={submitWithdraw} loading={busy}>
              {t('wallet.withdraw.modal.submit')}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
