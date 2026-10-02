'use client';

/**
 * P2-1 (0028) — đơn bị đánh vắng mặt (supabase): người lao động khiếu nại
 * trong hạn (max(hết ca, lúc bị đánh vắng) + 72 giờ). Server kiểm hạn thật;
 * admin quyết.
 *   - Có khoản cọc → khoản sang "đang khiếu nại", admin hoàn hoặc chuyển NTD.
 *   - Không có cọc (được miễn) → khiếu nại không kèm tiền; admin chấp nhận thì
 *     lần vắng mặt không tính khi xét miễn cọc.
 */

import { useEffect, useState } from 'react';

import { Button, Textarea } from '@/components/ui';
import {
  contestNoShow,
  getMyApplicationNoShowAt,
  getMyHoldForApplication,
  getMyNoShowContest,
  type NoShowContest,
  type WorkerHold,
} from '@/data/repos/workerDepositRepo';
import { noShowForfeitDeadline } from '@/domain/workerDeposit';
import { toastFromStoreError } from '@/lib/errorMap';
import { formatVND } from '@/lib/format';
import { showError, showSuccess } from '@/lib/toast';
import { useT } from '@/i18n/LocaleProvider';

import { formatVnDateTime, vnShiftInstantIso } from './vnTime';

interface Props {
  applicationId: string;
  shiftDate: string;
  shiftEndTime: string;
  /** Được gọi sau khi tải — trang cha ẩn banner khiếu nại cũ (local). */
  onLoaded?: () => void;
  className?: string;
}

interface Loaded {
  hold: WorkerHold | null;
  contest: NoShowContest | null;
  /** applications.no_show_at — hạn = max(hết ca, mốc này) + 72h, khớp server. */
  noShowAt: string | null;
  /** Mốc "bây giờ" lấy lúc tải xong (không gọi Date.now trong render). */
  atMs: number;
}

export function WorkerDepositContestPanel({
  applicationId,
  shiftDate,
  shiftEndTime,
  onLoaded,
  className = '',
}: Props) {
  const t = useT();
  const [data, setData] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getMyHoldForApplication(applicationId),
      getMyNoShowContest(applicationId),
      getMyApplicationNoShowAt(applicationId),
    ])
      .then(([hold, contest, noShowAt]) => {
        if (!alive) return;
        setData({ hold, contest, noShowAt, atMs: Date.now() });
        onLoaded?.();
      })
      .catch(() => {
        // Không tải được → không hiện gì; server vẫn giữ nguyên trạng thái.
      });
    return () => {
      alive = false;
    };
  }, [applicationId, reloadKey, onLoaded]);

  if (!data) return null;
  const { hold, contest, atMs } = data;
  const box = `rounded-lg border px-4 py-3 text-sm ${className}`;
  const reload = () => setReloadKey((k) => k + 1);

  const shiftEndIso = vnShiftInstantIso(shiftDate, shiftEndTime);
  const noShowAt = hold?.noShowAt ?? data.noShowAt ?? shiftEndIso;
  const deadlineIso = noShowForfeitDeadline(shiftEndIso, noShowAt);
  const deadlineText = formatVnDateTime(deadlineIso);
  const expired = atMs >= Date.parse(deadlineIso);

  // ---------- Không có cọc (L1), hoặc cọc đã hoàn mà không phải do admin xử
  //            cho worker (vd. hoàn dự phòng rồi mới bị đánh vắng) ----------
  const refundedNotByAdmin = hold?.status === 'Refunded' && hold.resolution !== 'WORKER';
  if (!hold || refundedNotByAdmin) {
    const title = t('workerDeposit.contest.noDeposit.title');
    const refundedLine = hold && (
      <p className="mt-1">
        {t('workerDeposit.contest.refunded').replace('{amount}', () => formatVND(hold.amount))}
      </p>
    );
    if (contest) {
      const key =
        contest.status === 'Upheld'
          ? 'workerDeposit.contest.noDeposit.upheld'
          : contest.status === 'Rejected'
            ? 'workerDeposit.contest.noDeposit.rejected'
            : 'workerDeposit.contest.noDeposit.pending';
      return (
        <div role="status" className={`${box} border-gray-200 bg-gray-50 text-gray-800`}>
          <p className="font-semibold">{title}</p>
          {refundedLine}
          <p className="mt-1">{t(key)}</p>
          {contest.resolutionNote && <AdminNote note={contest.resolutionNote} />}
        </div>
      );
    }
    return (
      <div className={`${box} border-red-200 bg-red-50 text-red-900`}>
        <p className="font-semibold">{title}</p>
        {refundedLine}
        {expired ? (
          <p className="mt-1">{t('workerDeposit.contest.noDeposit.expired')}</p>
        ) : (
          <>
            <p className="mt-1">
              {t('workerDeposit.contest.noDeposit.body').replace('{deadline}', () => deadlineText)}
            </p>
            <ContestForm applicationId={applicationId} onSent={reload} />
          </>
        )}
      </div>
    );
  }

  // ---------- Có cọc ----------
  const amount = formatVND(hold.amount);
  if (hold.status === 'Refunded' || hold.status === 'Forfeited') {
    return (
      <div role="status" className={`${box} border-gray-200 bg-gray-50 text-gray-800`}>
        <p className="font-semibold">
          {t(hold.status === 'Refunded' ? 'workerDeposit.contest.refunded' : 'workerDeposit.contest.forfeited')
            .replace('{amount}', () => amount)}
        </p>
        {hold.resolutionNote && <AdminNote note={hold.resolutionNote} />}
      </div>
    );
  }

  const title = t('workerDeposit.contest.title').replace('{amount}', () => amount);

  if (hold.status === 'Contested') {
    // Hệ thống giữ lại chờ admin (trần NTD) mà worker chưa khiếu nại → vẫn cho gửi lý do.
    if (!hold.contestReason) {
      return (
        <div className={`${box} border-amber-200 bg-amber-50 text-amber-900`}>
          <p className="font-semibold">{title}</p>
          <p className="mt-1">{t('workerDeposit.contest.reviewPending')}</p>
          <ContestForm applicationId={applicationId} onSent={reload} />
        </div>
      );
    }
    return (
      <div role="status" className={`${box} border-amber-200 bg-amber-50 text-amber-900`}>
        <p className="font-semibold">{title}</p>
        <p className="mt-1">{t('workerDeposit.contest.pending')}</p>
      </div>
    );
  }

  return (
    <div className={`${box} border-red-200 bg-red-50 text-red-900`}>
      <p className="font-semibold">{title}</p>
      {expired ? (
        <p className="mt-1">{t('workerDeposit.contest.expired')}</p>
      ) : (
        <>
          <p className="mt-1">
            {t('workerDeposit.contest.body').replace('{deadline}', () => deadlineText)}
          </p>
          <ContestForm applicationId={applicationId} onSent={reload} />
        </>
      )}
    </div>
  );
}

function AdminNote({ note }: { note: string }) {
  const t = useT();
  return <p className="mt-1">{t('workerDeposit.contest.adminNote').replace('{note}', () => note)}</p>;
}

function ContestForm({ applicationId, onSent }: { applicationId: string; onSent: () => void }) {
  const t = useT();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError(t('workerDeposit.contest.reasonShort'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      await contestNoShow(applicationId, trimmed);
      showSuccess(t('workerDeposit.contest.sent'));
      setReason('');
      onSent();
    } catch (e) {
      const msg = toastFromStoreError(e instanceof Error ? e.message : 'BACKEND_ERROR');
      setError(msg);
      showError(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="mt-3">
        <Textarea
          id={`worker-deposit-contest-${applicationId}`}
          label={t('workerDeposit.contest.label')}
          placeholder={t('workerDeposit.contest.placeholder')}
          value={reason}
          maxLength={500}
          rows={3}
          error={error ?? undefined}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <Button className="mt-2" size="sm" variant="primary" loading={sending} onClick={() => void submit()}>
        {t('workerDeposit.contest.submit')}
      </Button>
    </>
  );
}
