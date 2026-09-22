'use client';

/**
 * MockPaymentSession — luồng thanh toán MÔ PHỎNG end-to-end (provider CALE_MOCK).
 *
 * KHÔNG giao dịch thật. Phiên lưu ở Supabase (bảng payment_sessions) → reload/
 * refetch vẫn còn (không dùng localStorage; paymentId đưa vào query string, tải
 * lại qua RLS). Component đi qua PaymentProvider (getPaymentProvider) — không gọi
 * RPC trực tiếp trong JSX; sau này thay bằng PayOS adapter mà không sửa UI này.
 *
 * Bước:
 *   select  → chọn ngân hàng mô phỏng → "Tạo QR mô phỏng" → tạo phiên PENDING.
 *   session → QR + số tiền + mã đơn + trạng thái + cảnh báo + nút mô phỏng/hủy.
 *   HELD/RELEASED → biên nhận mô phỏng + điều hướng sang ca đã đăng.
 *
 * Nút "Mô phỏng thanh toán thành công" CHỈ hiện ở mock (khi !livePayments).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import { Button, Card } from '@/components/ui';
import { formatVND, formatLogDateTime } from '@/lib/format';
import { hasCapability } from '@/data/capabilities';
import {
  getPaymentProvider,
  listPaymentChannels,
  type PaymentChannel,
  type PaymentResult,
} from '@/data/payments';

const STATUS_LABEL: Record<string, string> = {
  CREATED: 'Đã khởi tạo',
  PENDING: 'Đang chờ thanh toán mô phỏng',
  HELD: 'Đã giữ tiền (mô phỏng)',
  RELEASED: 'Đã giải ngân (mô phỏng)',
  CANCELLED: 'Đã hủy phiên mô phỏng',
  EXPIRED: 'Phiên đã hết hạn',
  FAILED: 'Thất bại',
};

/** Tên đầy đủ theo mã ngân hàng — hiển thị "MÃ - Tên đầy đủ". Đây là TÊN
 *  (chữ thông tin), không phải logo/nhãn hiệu. Kênh vẫn gắn nhãn Demo. */
const BANK_FULL_NAME: Record<string, string> = {
  ACB: 'Ngân hàng Thương mại Cổ phần Á Châu',
  BIDV: 'Ngân hàng Thương mại Cổ phần Đầu tư và Phát triển Việt Nam',
  MB: 'Ngân hàng Thương mại Cổ phần Quân đội',
  VCB: 'Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam',
};

/** Nhãn kênh: "MÃ - Tên đầy đủ" nếu biết mã; nếu không, dùng display_name seed. */
function channelLabel(ch: { bankCode: string | null; displayName: string }): string {
  const full = ch.bankCode ? BANK_FULL_NAME[ch.bankCode] : undefined;
  return full && ch.bankCode ? `${ch.bankCode} - ${full}` : ch.displayName;
}

export interface MockPaymentSessionProps {
  /** Per-worker: ca đã đăng + đơn đã duyệt. Bỏ trống khi dùng chế độ cọc. */
  shiftId?: string;
  applicationId?: string;
  /**
   * Chế độ CỌC TRƯỚC KHI ĐĂNG: payload ca chưa đăng. Khi có, component tạo
   * phiên cọc và ca chỉ được publish (server-side) sau khi giữ tiền (HELD).
   */
  shiftPayload?: Record<string, unknown>;
  /** Idempotency key cho phiên + ca (chống tạo trùng). */
  clientRequestId: string;
  /** Số tiền hiển thị trước (server sẽ tính lại chuẩn khi tạo phiên). */
  previewAmount?: number;
  /** Gọi khi HELD: điều hướng sang chi tiết ca đã đăng. */
  onPaid: (shiftId: string) => void;
  /** Gọi khi hủy phiên → quay lại form. */
  onCancel: () => void;
}

export function MockPaymentSession({
  shiftId,
  applicationId,
  shiftPayload,
  clientRequestId,
  previewAmount,
  onPaid,
  onCancel,
}: MockPaymentSessionProps) {
  // Chế độ cọc-trước-khi-đăng khi được truyền shiftPayload (chưa có ca/đơn).
  const isDeposit = shiftPayload != null;
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentIdParam = searchParams?.get('paymentId') ?? null;

  const provider = getPaymentProvider();
  const showSimulateButton = !hasCapability('livePayments'); // mock-only

  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [session, setSession] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(false); // khóa double-click
  const [busyAction, setBusyAction] = useState<'create' | 'confirm' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<boolean>(Boolean(paymentIdParam));

  const setParamPaymentId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (id) params.set('paymentId', id);
      else params.delete('paymentId');
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : '?');
    },
    [router, searchParams],
  );

  // Tải kênh + (nếu có paymentId) khôi phục phiên từ Supabase khi mount/reload.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const chs = await listPaymentChannels();
        if (!alive) return;
        setChannels(chs);
        setSelectedChannelId((prev) => prev ?? chs[0]?.id ?? null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Không tải được danh sách ngân hàng.');
      }
      if (paymentIdParam) {
        try {
          const s = await provider.getPayment(paymentIdParam);
          if (!alive) return;
          setSession(s);
          setSelectedChannelId((prev) => s.channelId ?? prev);
        } catch {
          // Phiên không còn/không thuộc mình → về bước chọn, xoá query.
          if (alive) {
            setSession(null);
            setParamPaymentId(null);
          }
        }
      }
      if (alive) setRestoring(false);
    })();
    return () => { alive = false; };
    // Chỉ chạy khi paymentId thay đổi (mount/reload).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentIdParam]);

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === (session?.channelId ?? selectedChannelId)) ?? null,
    [channels, session, selectedChannelId],
  );

  async function handleCreate() {
    if (loading || !selectedChannelId) return;
    setLoading(true); setBusyAction('create'); setError(null);
    try {
      const s = isDeposit
        ? await provider.createDeposit({
            shiftPayload: shiftPayload as Record<string, unknown>,
            channelId: selectedChannelId,
            clientRequestId,
          })
        : await provider.createPayment({
            channelId: selectedChannelId,
            clientRequestId,
            shiftId: shiftId as string,
            applicationId: applicationId as string,
          });
      setSession(s);
      setParamPaymentId(s.paymentId); // reload-safe
    } catch (e) {
      setError(mapErr(e));
    } finally {
      setLoading(false); setBusyAction(null);
    }
  }

  async function handleSimulateSuccess() {
    if (loading || !session) return;
    setLoading(true); setBusyAction('confirm'); setError(null);
    try {
      // Cọc-trước-khi-đăng: confirm sẽ PUBLISH ca từ payload rồi trả shiftId.
      const r = isDeposit
        ? await provider.confirmDeposit(session.paymentId)
        : await provider.simulateSuccess(session.paymentId);
      // Cập nhật hiển thị khoản giữ tiền rồi điều hướng.
      setSession((prev) => (prev ? { ...prev, status: r.status, shiftId: r.shiftId ?? prev.shiftId } : prev));
      if (r.shiftId) {
        setTimeout(() => onPaid(r.shiftId as string), 900);
      }
    } catch (e) {
      setError(mapErr(e));
    } finally {
      setLoading(false); setBusyAction(null);
    }
  }

  async function handleCancel() {
    if (loading || !session) return;
    setLoading(true); setBusyAction('cancel'); setError(null);
    try {
      await provider.cancelPayment(session.paymentId);
      setParamPaymentId(null);
      setSession(null);
      onCancel();
    } catch (e) {
      setError(mapErr(e));
    } finally {
      setLoading(false); setBusyAction(null);
    }
  }

  if (restoring) {
    return (
      <Card className="mb-6">
        <p className="text-sm text-gray-500">Đang tải phiên thanh toán mô phỏng…</p>
      </Card>
    );
  }

  // ---- Bước chọn ngân hàng (chưa có phiên) --------------------------------
  if (!session) {
    return (
      <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-card">
        <h2 className="font-semibold text-orange-950">Chọn ngân hàng nhận tiền mô phỏng</h2>
        <p className="mt-1 text-sm text-gray-600">
          Chọn một kênh ngân hàng <strong>mô phỏng</strong> để tạo mã QR xem trước. Ca chỉ được
          đăng sau khi bạn bấm “Mô phỏng thanh toán thành công”.
        </p>
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-200">
          Mô phỏng — không chuyển tiền thật
        </p>

        <ul className="mt-4 flex flex-col gap-2">
          {channels.map((ch) => (
            <li key={ch.id}>
              <label
                className={[
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                  selectedChannelId === ch.id
                    ? 'border-orange-400 bg-white shadow-sm'
                    : 'border-gray-200 bg-white hover:border-orange-300',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="mock-payment-channel"
                  className="h-4 w-4 accent-orange-500"
                  checked={selectedChannelId === ch.id}
                  onChange={() => setSelectedChannelId(ch.id)}
                />
                {/* Nhãn kênh đã gồm "MÃ - Tên đầy đủ" nên bỏ badge viết tắt cho gọn.
                    KHÔNG dùng logo ngân hàng thật (nhãn hiệu + kênh Demo). */}
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-gray-900">{channelLabel(ch)}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  Demo
                </span>
              </label>
            </li>
          ))}
          {channels.length === 0 && (
            <li className="text-sm text-gray-500">Chưa có kênh ngân hàng mô phỏng.</li>
          )}
        </ul>

        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:flex-1"
            loading={busyAction === 'create'}
            disabled={loading || !selectedChannelId}
            onClick={handleCreate}
          >
            Tạo QR mô phỏng
          </Button>
          <Button variant="ghost" size="lg" className="w-full sm:w-auto" onClick={onCancel} disabled={loading}>
            Quay lại chỉnh sửa
          </Button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Số tiền dự kiến: <strong>{formatVND(previewAmount ?? 0)}</strong> (máy chủ sẽ tính lại chính xác).
        </p>
      </div>
    );
  }

  // ---- Đã có phiên: PAID / CANCELLED / EXPIRED / PENDING -------------------
  const statusLabel = STATUS_LABEL[session.status] ?? session.status;

  if (session.status === 'HELD' || session.status === 'RELEASED') {
    return (
      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-card">
        <h2 className="font-semibold text-emerald-900">Biên nhận mô phỏng</h2>
        <dl className="mt-3 flex flex-col gap-1.5 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-emerald-100">
          <Row label="Mã giao dịch" value={session.orderCode} mono />
          <Row label="Ngân hàng" value={selectedChannel?.displayName ?? '—'} />
          <Row label="Số tiền" value={formatVND(session.amount)} />
          <Row label="Thời gian" value={session.paidAt ? formatLogDateTime(session.paidAt) : '—'} />
          <Row label="Trạng thái" value={statusLabel} />
        </dl>
        <p className="mt-3 text-center text-xs font-bold uppercase tracking-wide text-red-700">
          Không phải giao dịch ngân hàng thật
        </p>
        {session.shiftId && (
          <Button
            variant="primary"
            size="lg"
            className="mt-4 w-full"
            onClick={() => onPaid(session.shiftId as string)}
          >
            Xem ca đã đăng
          </Button>
        )}
      </div>
    );
  }

  if (session.status === 'CANCELLED' || session.status === 'EXPIRED' || session.status === 'FAILED') {
    return (
      <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-card">
        <h2 className="font-semibold text-gray-900">Phiên thanh toán mô phỏng</h2>
        <p className="mt-2 text-sm text-gray-600">Trạng thái: <strong>{statusLabel}</strong>.</p>
        <Button variant="secondary" size="lg" className="mt-4 w-full" onClick={() => { setParamPaymentId(null); setSession(null); onCancel(); }}>
          Tạo phiên mới
        </Button>
      </div>
    );
  }

  // PENDING
  return (
    <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-card">
      <h2 className="font-semibold text-orange-950">Thanh toán mô phỏng</h2>
      <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-center text-sm font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-200">
        MÔ PHỎNG — KHÔNG CÓ GIAO DỊCH TIỀN THẬT
      </p>

      <dl className="mt-4 flex flex-col gap-1.5 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-orange-100">
        <Row label="Số tiền" value={formatVND(session.amount)} highlight />
        <Row label="Mã đơn" value={session.orderCode} mono />
        <Row label="Ngân hàng" value={selectedChannel ? channelLabel(selectedChannel) : '—'} />
        {/* Thông tin đối chiếu khi chuyển khoản (mô phỏng). */}
        <Row label="Người thụ hưởng" value={selectedChannel?.accountName ?? '—'} />
        <Row label="Số tài khoản" value={selectedChannel?.accountNumberMasked ?? '—'} mono />
        <Row label="Trạng thái" value={statusLabel} />
      </dl>

      {session.qrPayload && (
        <div className="mt-4 flex justify-center">
          <div className="w-fit rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-200">
            <QRCode value={session.qrPayload} size={192} level="M" aria-label="Mã QR thanh toán mô phỏng" />
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-col gap-2">
        {showSimulateButton && (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            loading={busyAction === 'confirm'}
            disabled={loading}
            onClick={handleSimulateSuccess}
          >
            Mô phỏng giữ tiền (HELD)
          </Button>
        )}
        <Button
          variant="ghost"
          size="lg"
          className="w-full"
          loading={busyAction === 'cancel'}
          disabled={loading}
          onClick={handleCancel}
        >
          Hủy phiên mô phỏng
        </Button>
      </div>

      <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs leading-relaxed text-gray-600 ring-1 ring-orange-100">
        CaLẻ chưa kết nối ngân hàng, chưa thu hoặc giữ tiền. Mã QR chỉ chứa dữ liệu thử nghiệm
        (không phải VietQR, không có số tài khoản thật) và không thể dùng để thanh toán thật.
      </p>
    </div>
  );
}

function Row({ label, value, mono = false, highlight = false }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={highlight ? 'font-semibold text-gray-900' : 'text-gray-600'}>{label}</dt>
      <dd className={[highlight ? 'font-bold text-orange-900' : 'font-medium text-gray-900', mono ? 'font-mono' : ''].join(' ')}>{value}</dd>
    </div>
  );
}

function mapErr(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const map: Record<string, string> = {
    CHANNEL_NOT_FOUND: 'Không tìm thấy kênh ngân hàng.',
    CHANNEL_DISABLED: 'Kênh ngân hàng đã tắt.',
    CHANNEL_NOT_AVAILABLE: 'Kênh này chưa khả dụng.',
    SESSION_NOT_FOUND: 'Không tìm thấy phiên thanh toán.',
    SESSION_EXPIRED: 'Phiên thanh toán đã hết hạn. Vui lòng tạo lại.',
    INVALID_SESSION_STATE: 'Phiên không ở trạng thái hợp lệ.',
    NOT_OWNER: 'Bạn không có quyền với phiên này.',
    INSUFFICIENT_BALANCE: 'Số dư ví không đủ để giữ cọc. Vui lòng nạp thêm vào ví (mô phỏng) rồi thử lại.',
    SHIFT_IN_PAST: 'Ca đã qua giờ bắt đầu, không thể đăng. Vui lòng chỉnh lại thời gian.',
  };
  for (const k of Object.keys(map)) if (raw.includes(k)) return map[k];
  return 'Có lỗi xảy ra với phiên thanh toán mô phỏng. Vui lòng thử lại.';
}
