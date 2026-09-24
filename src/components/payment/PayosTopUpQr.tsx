'use client';

/**
 * PayosTopUpQr — hiển thị QR nạp tiền PayOS đã tạo + nút "Tôi đã chuyển khoản".
 *
 * Dùng chung cho ví (WalletPanel) và đăng ca khi ví thiếu (DepositWalletConfirm).
 * Đơn nạp do CALLER tạo (walletStore.createRealTopUp) rồi truyền vào — component
 * không tự tạo đơn khi mount (tránh tạo đơn trùng khi React chạy effect 2 lần).
 *
 * Thật: bấm nút → poll trạng thái đơn (webhook PayOS đã cộng ví server-side).
 * Mô phỏng (server PAYOS_MOCK): bấm nút → server cộng ví ngay.
 * KHÔNG dùng timer — kiểm tra theo nút bấm.
 */

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui';
import { formatVND } from '@/lib/format';
import { useWalletStore } from '@/stores/walletStore';
import type { CreatePaymentResult } from '@/data/repos/paymentRepo';

export interface PayosTopUpQrProps {
  order: CreatePaymentResult;
  userId: string;
  /** Nhãn dòng "Nạp vào" / mục đích. */
  destinationLabel?: string;
  /** Gọi khi server xác nhận đã nhận tiền (ví đã được refetch). */
  onPaid: () => void;
  onBack: () => void;
}

export function PayosTopUpQr({
  order,
  userId,
  destinationLabel = 'Ví của bạn',
  onPaid,
  onBack,
}: PayosTopUpQrProps) {
  const pollRealTopUp = useWalletStore((s) => s.pollRealTopUp);
  const confirmMockTopUp = useWalletStore((s) => s.confirmMockTopUp);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    if (checking) return;
    setChecking(true);
    setError(null);
    const paid = order.mock
      ? await confirmMockTopUp(order.orderCode, userId)
      : await pollRealTopUp(order.orderCode, userId);
    setChecking(false);
    if (paid) {
      onPaid();
      return;
    }
    setError(
      'Chưa nhận được xác nhận thanh toán. Nếu vừa chuyển khoản, đợi vài giây rồi bấm kiểm tra lại.',
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      {order.mock && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-200">
          MÔ PHỎNG — KHÔNG CÓ GIAO DỊCH TIỀN THẬT
        </p>
      )}

      <dl className="flex flex-col gap-1.5 rounded-xl bg-white px-4 py-3 ring-1 ring-orange-100">
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">Số tiền nạp</dt>
          <dd className="font-semibold tabular-nums text-orange-700">{formatVND(order.amount)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">Nạp vào</dt>
          <dd className="font-medium text-gray-900">{destinationLabel}</dd>
        </div>
      </dl>

      <p className="text-center text-xs text-gray-600">
        {order.mock
          ? 'Đây là luồng mô phỏng: bấm "Tôi đã chuyển khoản (mô phỏng)" để cộng số dư ví ngay, không có tiền thật.'
          : 'Quét mã QR bằng app ngân hàng để chuyển khoản. Giữ nguyên số tiền và nội dung chuyển khoản. Sau khi chuyển xong, bấm "Tôi đã chuyển khoản".'}
      </p>

      {order.qrCode ? (
        <div className="flex justify-center">
          <div className="w-fit rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-200">
            <QRCode value={order.qrCode} size={200} level="M" aria-label="Mã QR chuyển khoản" />
          </div>
        </div>
      ) : (
        <p className="text-center text-xs text-gray-500">
          Không tạo được mã QR. Dùng nút mở trang thanh toán bên dưới.
        </p>
      )}

      {!order.mock && (
        <a
          href={order.checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[44px] items-center justify-center rounded-lg border border-orange-300 bg-white px-3 py-2 text-center text-sm font-medium text-orange-700 hover:bg-orange-50"
        >
          Mở trang thanh toán PayOS
        </a>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-between gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={onBack} disabled={checking}>
          Quay lại
        </Button>
        <Button size="sm" variant="primary" onClick={check} loading={checking} disabled={checking}>
          {order.mock ? 'Tôi đã chuyển khoản (mô phỏng)' : 'Tôi đã chuyển khoản'}
        </Button>
      </div>
    </div>
  );
}
