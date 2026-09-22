'use client';

/**
 * DepositWalletConfirm — Đăng ca bằng SỐ DƯ VÍ (mô phỏng).
 *
 * Flow hybrid:
 *  - Ví ĐỦ  → giữ cọc trực tiếp từ số dư ví (không QR).
 *  - Ví THIẾU → "Thanh toán bằng QR": QR mô phỏng NẠP đúng phần thiếu vào ví
 *    rồi giữ cọc trong một luồng (employer không phải rời trang đi nạp ví).
 *
 * confirm_deposit_session (server) TRỪ cọc khỏi ví employer + publish ca (HELD).
 * Số tiền do SERVER tính; số dư ví đọc từ server (get_wallet_state) — nguồn sự
 * thật, không suy từ ledger client (#7). KHÔNG giao dịch thật; QR VÔ HẠI.
 */

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui';
import { formatVND } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import {
  getPaymentProvider,
  listPaymentChannels,
  type PaymentChannel,
} from '@/data/payments';

/** Tên đầy đủ theo mã ngân hàng — "MÃ - Tên đầy đủ" (chữ thông tin, không logo). */
const BANK_FULL_NAME: Record<string, string> = {
  ACB: 'Ngân hàng Thương mại Cổ phần Á Châu',
  BIDV: 'Ngân hàng Thương mại Cổ phần Đầu tư và Phát triển Việt Nam',
  MB: 'Ngân hàng Thương mại Cổ phần Quân đội',
  VCB: 'Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam',
};

function channelLabel(ch: PaymentChannel): string {
  const full = ch.bankCode ? BANK_FULL_NAME[ch.bankCode] : undefined;
  return full && ch.bankCode ? `${ch.bankCode} - ${full}` : ch.displayName;
}

function mapDepositErr(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const map: Record<string, string> = {
    INSUFFICIENT_BALANCE:
      'Số dư ví không đủ để giữ cọc. Vui lòng nạp thêm vào ví (mô phỏng) rồi thử lại.',
    SHIFT_IN_PAST: 'Ca đã qua giờ bắt đầu, không thể đăng. Vui lòng chỉnh lại thời gian.',
    SESSION_EXPIRED: 'Phiên đã hết hạn. Vui lòng thử lại.',
    NOT_OWNER: 'Bạn không có quyền với phiên này.',
    CHANNEL_NOT_AVAILABLE: 'Chưa có kênh thanh toán mô phỏng khả dụng.',
  };
  for (const k of Object.keys(map)) if (raw.includes(k)) return map[k];
  return 'Không đăng được ca. Vui lòng thử lại.';
}

export interface DepositWalletConfirmProps {
  /** Payload ca chưa đăng — server publish sau khi giữ cọc (HELD). */
  shiftPayload: Record<string, unknown>;
  /** Idempotency key cho phiên + ca (chống tạo trùng). */
  clientRequestId: string;
  /** Số tiền dự kiến hiển thị trước (server tính lại chính xác). */
  previewAmount: number;
  /** Gọi khi HELD: điều hướng sang chi tiết ca đã đăng. */
  onPaid: (shiftId: string) => void;
  /** Gọi khi hủy → quay lại form. */
  onCancel: () => void;
}

export function DepositWalletConfirm({
  shiftPayload,
  clientRequestId,
  previewAmount,
  onPaid,
  onCancel,
}: DepositWalletConfirmProps) {
  const provider = getPaymentProvider();
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const wallets = useWalletStore((s) => s.wallets);
  const refetchWallet = useWalletStore((s) => s.refetchAsync);
  const topUpAsync = useWalletStore((s) => s.topUpAsync);
  const systemBank = useWalletStore((s) => s.systemBank);

  const balance = useMemo(
    () => wallets.find((w) => w.userId === currentUserId)?.balance ?? 0,
    [wallets, currentUserId],
  );

  const [mode, setMode] = useState<'confirm' | 'qr'>('confirm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);

  // Nạp số dư ví THẬT từ server khi mount (nguồn sự thật, không suy client).
  useEffect(() => {
    if (currentUserId) void refetchWallet(currentUserId);
  }, [currentUserId, refetchWallet]);

  const enough = balance >= previewAmount;
  const shortfall = Math.max(0, previewAmount - balance);

  const qrPayload = useMemo(
    () =>
      JSON.stringify({
        realTransaction: false,
        provider: 'CALE_MOCK',
        purpose: 'shift_deposit',
        amount: previewAmount,
      }),
    [previewAmount],
  );

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === channelId) ?? null,
    [channels, channelId],
  );

  /** Ví ĐỦ: tạo phiên cọc + giữ cọc trực tiếp từ ví (không QR). */
  async function handleConfirmWallet() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const chs = await listPaymentChannels();
      const channel = chs[0];
      if (!channel) throw new Error('CHANNEL_NOT_AVAILABLE');
      const session = await provider.createDeposit({
        shiftPayload,
        channelId: channel.id,
        clientRequestId,
      });
      const r = await provider.confirmDeposit(session.paymentId);
      if (currentUserId) await refetchWallet(currentUserId);
      if (!r.shiftId) throw new Error('SESSION_NOT_FOUND');
      onPaid(r.shiftId);
    } catch (e) {
      setError(mapDepositErr(e));
    } finally {
      setLoading(false);
    }
  }

  /** Ví THIẾU: mở bước QR — tải kênh ngân hàng mô phỏng. */
  async function openQrStep() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const chs = await listPaymentChannels();
      setChannels(chs);
      setChannelId((prev) => prev ?? chs[0]?.id ?? null);
      setMode('qr');
    } catch {
      setError('Không tải được danh sách ngân hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  /** QR "Mô phỏng thanh toán thành công": nạp ĐÚNG phần thiếu vào ví (theo số
   *  tiền SERVER của phiên) rồi giữ cọc → publish ca. */
  async function handlePayQr() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      if (!channelId) throw new Error('CHANNEL_NOT_AVAILABLE');
      // 1) Tạo phiên cọc để biết SỐ TIỀN THẬT (server tính).
      const session = await provider.createDeposit({
        shiftPayload,
        channelId,
        clientRequestId,
      });
      // 2) Nạp đúng phần còn thiếu vào ví (mô phỏng) qua QR.
      const need = Math.max(0, session.amount - balance);
      if (need > 0) {
        const top = await topUpAsync(need);
        if (!top.ok) throw new Error(top.error);
      }
      // 3) Giữ cọc: trừ ví + publish ca (HELD). Server guard số dư.
      const r = await provider.confirmDeposit(session.paymentId);
      if (currentUserId) await refetchWallet(currentUserId);
      if (!r.shiftId) throw new Error('SESSION_NOT_FOUND');
      onPaid(r.shiftId);
    } catch (e) {
      setError(mapDepositErr(e));
    } finally {
      setLoading(false);
    }
  }

  // ---- Bước QR (ví thiếu) --------------------------------------------------
  if (mode === 'qr') {
    return (
      <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-card">
        <h2 className="font-semibold text-orange-950">Thanh toán cọc bằng QR mô phỏng</h2>
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-center text-sm font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-200">
          MÔ PHỎNG — KHÔNG CÓ GIAO DỊCH TIỀN THẬT
        </p>

        <dl className="mt-4 flex flex-col gap-1.5 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-orange-100">
          <div className="flex items-center justify-between">
            <dt className="text-gray-600">Khoản cần giữ cọc</dt>
            <dd className="font-semibold tabular-nums text-orange-700">{formatVND(previewAmount)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-600">Số dư ví hiện có</dt>
            <dd className="font-semibold tabular-nums text-gray-900">{formatVND(balance)}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-1.5">
            <dt className="text-gray-600">Cần thanh toán thêm</dt>
            <dd className="font-semibold tabular-nums text-orange-700">{formatVND(shortfall)}</dd>
          </div>
        </dl>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-gray-700">Chọn ngân hàng mô phỏng</span>
          <div className="mt-2 flex flex-col gap-2">
            {channels.map((ch) => (
              <label
                key={ch.id}
                className={[
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                  channelId === ch.id
                    ? 'border-orange-400 bg-white shadow-sm'
                    : 'border-gray-200 bg-white hover:border-orange-300',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="deposit-qr-channel"
                  className="h-4 w-4 accent-orange-500"
                  checked={channelId === ch.id}
                  onChange={() => setChannelId(ch.id)}
                />
                <span className="min-w-0 flex-1 font-medium text-gray-900">{channelLabel(ch)}</span>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  Demo
                </span>
              </label>
            ))}
            {channels.length === 0 && (
              <span className="text-sm text-gray-500">Chưa có kênh ngân hàng mô phỏng.</span>
            )}
          </div>
        </label>

        {channelId && (
          <div className="mt-4 flex justify-center">
            <div className="w-fit rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-200">
              <QRCode value={qrPayload} size={176} level="M" aria-label="Mã QR thanh toán cọc mô phỏng" />
            </div>
          </div>
        )}
        {selectedChannel && (
          <p className="mt-2 text-center text-xs text-gray-500">
            Người thụ hưởng: <strong>{selectedChannel.accountName ?? 'CALE DEMO'}</strong>
            {selectedChannel.accountNumberMasked ? ` · ${selectedChannel.accountNumberMasked}` : ''}
          </p>
        )}

        <p className="mt-2 text-xs text-gray-500">
          Quét QR mô phỏng để nạp phần thiếu vào ví rồi giữ cọc. Tiền vẫn nằm trong
          {systemBank ? ` ${systemBank.name}` : ' Két bảo đảm CALE_MOCK'}, không rời hệ thống.
        </p>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-between gap-2">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setMode('confirm');
              setError(null);
            }}
            disabled={loading}
          >
            Quay lại
          </Button>
          <Button
            variant="primary"
            size="lg"
            loading={loading}
            disabled={loading || !channelId}
            onClick={handlePayQr}
          >
            Mô phỏng thanh toán thành công
          </Button>
        </div>
      </div>
    );
  }

  // ---- Bước xác nhận (ví đủ / thiếu) ---------------------------------------
  return (
    <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-card">
      <h2 className="font-semibold text-orange-950">Xác nhận đăng ca — giữ cọc từ ví</h2>
      <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-center text-sm font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-200">
        MÔ PHỎNG — KHÔNG CÓ GIAO DỊCH TIỀN THẬT
      </p>

      <dl className="mt-4 flex flex-col gap-1.5 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-orange-100">
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">Số dư ví (mô phỏng)</dt>
          <dd className="font-semibold tabular-nums text-gray-900">{formatVND(balance)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">Khoản cần giữ cọc</dt>
          <dd className="font-semibold tabular-nums text-orange-700">{formatVND(previewAmount)}</dd>
        </div>
        {enough && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-1.5">
            <dt className="text-gray-600">Số dư sau khi giữ cọc</dt>
            <dd className="font-semibold tabular-nums text-gray-900">
              {formatVND(balance - previewAmount)}
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-2 text-xs text-gray-500">
        Số tiền do máy chủ tính lại chính xác khi giữ cọc. Tiền vẫn nằm trong
        {systemBank ? ` ${systemBank.name}` : ' Két bảo đảm CALE_MOCK'} (chuyển từ
        khả dụng sang giữ cọc), không rời hệ thống.
      </p>

      {!enough && (
        <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          Ví không đủ để giữ cọc. Cần thêm <strong>{formatVND(shortfall)}</strong>. Bạn có thể
          thanh toán trực tiếp bằng QR (nạp phần thiếu + giữ cọc), hoặc mở ví ở trang tổng quan
          để nạp thêm rồi quay lại.
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {enough ? (
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:flex-1"
            loading={loading}
            disabled={loading}
            onClick={handleConfirmWallet}
          >
            Xác nhận đăng ca — giữ cọc {formatVND(previewAmount)}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:flex-1"
            loading={loading}
            disabled={loading}
            onClick={openQrStep}
          >
            Thanh toán bằng QR — {formatVND(shortfall)}
          </Button>
        )}
        <Button
          variant="ghost"
          size="lg"
          className="w-full sm:w-auto"
          onClick={onCancel}
          disabled={loading}
        >
          Quay lại chỉnh sửa
        </Button>
      </div>
    </div>
  );
}
