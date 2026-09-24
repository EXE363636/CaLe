'use client';

/**
 * DepositWalletConfirm — Đăng ca bằng SỐ DƯ VÍ (tiền thật nạp qua PayOS).
 *
 * Flow:
 *  - Ví ĐỦ   → giữ cọc trực tiếp từ số dư ví (không QR).
 *  - Ví THIẾU → "Nạp phần còn thiếu qua QR": tạo đơn nạp PayOS đúng phần thiếu
 *    (tối thiểu 2.000 đ) → QR → khi PayOS xác nhận, ví đủ → quay lại bước xác
 *    nhận để giữ cọc (employer không phải rời trang).
 *
 * confirm_deposit_session (server) TRỪ cọc khỏi ví employer + publish ca (HELD).
 * Số tiền do SERVER tính; số dư ví đọc từ server (get_wallet_state) — nguồn sự
 * thật, không suy từ ledger client (#7).
 */

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { PayosTopUpQr } from '@/components/payment/PayosTopUpQr';
import { formatVND } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { getPaymentProvider, listPaymentChannels } from '@/data/payments';
import type { CreatePaymentResult } from '@/data/repos/paymentRepo';

/** PayOS: số tiền nạp tối thiểu. */
const PAYOS_MIN_AMOUNT = 2000;

function mapDepositErr(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const map: Record<string, string> = {
    INSUFFICIENT_BALANCE:
      'Số dư ví không đủ để giữ cọc. Vui lòng nạp thêm vào ví rồi thử lại.',
    SHIFT_IN_PAST: 'Ca đã qua giờ bắt đầu, không thể đăng. Vui lòng chỉnh lại thời gian.',
    SESSION_EXPIRED: 'Phiên đã hết hạn. Vui lòng thử lại.',
    NOT_OWNER: 'Bạn không có quyền với phiên này.',
    CHANNEL_NOT_AVAILABLE: 'Chưa có kênh thanh toán khả dụng. Vui lòng liên hệ hỗ trợ.',
    PAYOS_REJECTED: 'Không tạo được mã thanh toán PayOS. Vui lòng thử lại sau.',
    PAYOS_UNREACHABLE: 'Không kết nối được PayOS. Vui lòng thử lại sau.',
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
  const createRealTopUp = useWalletStore((s) => s.createRealTopUp);

  const balance = useMemo(
    () => wallets.find((w) => w.userId === currentUserId)?.balance ?? 0,
    [wallets, currentUserId],
  );

  const [topUpOrder, setTopUpOrder] = useState<CreatePaymentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nạp số dư ví THẬT từ server khi mount (nguồn sự thật, không suy client).
  useEffect(() => {
    if (currentUserId) void refetchWallet(currentUserId);
  }, [currentUserId, refetchWallet]);

  const enough = balance >= previewAmount;
  const shortfall = Math.max(0, previewAmount - balance);
  const topUpAmount = Math.max(shortfall, PAYOS_MIN_AMOUNT);

  /** Ví ĐỦ: tạo phiên cọc + giữ cọc trực tiếp từ ví. */
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

  /** Ví THIẾU: tạo đơn nạp PayOS đúng phần thiếu → hiện QR. */
  async function openTopUp() {
    if (loading) return;
    setLoading(true);
    setError(null);
    const r = await createRealTopUp(topUpAmount);
    setLoading(false);
    if (!r.ok) {
      setError(mapDepositErr(r.error));
      return;
    }
    setTopUpOrder(r.value);
  }

  // ---- Bước QR (ví thiếu) --------------------------------------------------
  if (topUpOrder && currentUserId) {
    return (
      <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-card">
        <h2 className="mb-3 font-semibold text-orange-950">Nạp phần còn thiếu để giữ cọc</h2>
        <PayosTopUpQr
          order={topUpOrder}
          userId={currentUserId}
          destinationLabel="Ví của bạn (để giữ cọc ca này)"
          onPaid={() => setTopUpOrder(null)}
          onBack={() => setTopUpOrder(null)}
        />
      </div>
    );
  }

  // ---- Bước xác nhận (ví đủ / thiếu) ---------------------------------------
  return (
    <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-card">
      <h2 className="font-semibold text-orange-950">Xác nhận đăng ca — giữ cọc từ ví</h2>

      <dl className="mt-4 flex flex-col gap-1.5 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-orange-100">
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">Số dư ví</dt>
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
        Số tiền do máy chủ tính lại chính xác khi giữ cọc. Tiền cọc được giữ trong hệ thống
        cho tới khi ca hoàn thành (trả lương người lao động) hoặc được hoàn lại vào ví nếu ca
        bị huỷ / hết hạn không có người làm.
      </p>

      {!enough && (
        <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          Ví không đủ để giữ cọc. Cần thêm <strong>{formatVND(shortfall)}</strong>. Nạp phần
          còn thiếu bằng QR chuyển khoản
          {topUpAmount > shortfall ? ` (tối thiểu ${formatVND(PAYOS_MIN_AMOUNT)})` : ''}, rồi
          quay lại xác nhận đăng ca.
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
            onClick={openTopUp}
          >
            Nạp {formatVND(topUpAmount)} qua QR
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
