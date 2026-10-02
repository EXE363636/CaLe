'use client';

/**
 * P2-1 (0028) — ở trang chi tiết ca, trước khi ứng tuyển: cho người lao động
 * biết ca này cần cọc bao nhiêu (hoặc được miễn), và số dư ví có đủ không.
 * Chỉ hiển thị; server quyết định thật. Cờ tắt → không hiện gì.
 */

import Link from 'next/link';

import type { WorkerDepositStatus } from '@/data/repos/workerDepositRepo';
import { workerDepositLimitReached } from '@/domain/workerDeposit';
import { formatVND } from '@/lib/format';
import { useT } from '@/i18n/LocaleProvider';

import { formatVnDate } from './vnTime';

const linkClass =
  'inline-flex min-h-[44px] items-center font-semibold text-orange-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400';

interface Props {
  status: WorkerDepositStatus;
  /** Số cọc của ca này (0 = không cần). */
  amount: number;
  className?: string;
}

export function WorkerDepositApplyNotice({ status, amount, className = '' }: Props) {
  const t = useT();
  if (!status.enabled) return null;

  if (!status.needsDeposit || amount <= 0) {
    const text =
      status.reason === 'IDENTITY'
        ? t('workerDeposit.exempt.IDENTITY')
        : status.reason === 'COMPLETED_SHIFTS'
          ? t('workerDeposit.exempt.COMPLETED_SHIFTS')
              .replace('{n}', String(status.exemptAfter))
              .replace('{days}', String(status.windowDays))
          : null;
    if (!text) return null;
    return (
      <p
        role="status"
        className={`rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ${className}`}
      >
        {text}
      </p>
    );
  }

  const insufficient = status.balance < amount;
  const atLimit = workerDepositLimitReached(status.openHolds, status.maxOpenHolds);
  return (
    <div
      role="status"
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`}
    >
      <p className="font-semibold">
        {t('workerDeposit.apply.required').replace('{amount}', formatVND(amount))}
      </p>
      <p className="mt-1">{t('workerDeposit.apply.rules')}</p>
      {status.blockedUntil && (
        <p className="mt-1">
          {t('workerDeposit.blocked').replace('{date}', formatVnDate(status.blockedUntil))}
        </p>
      )}
      {atLimit && (
        <p className="mt-1 font-semibold">
          {t('workerDeposit.apply.limit')
            .replace('{open}', String(status.openHolds))
            .replace('{max}', String(status.maxOpenHolds))}
        </p>
      )}
      <p className="mt-1">
        {t('workerDeposit.apply.balance').replace('{balance}', formatVND(status.balance))}
        {insufficient && <> {t('workerDeposit.apply.insufficient')}</>}
      </p>
      <div className="mt-1 flex flex-wrap gap-x-4">
        {insufficient && (
          <Link href="/worker/dashboard#wallet" className={linkClass}>
            {t('workerDeposit.apply.topUp')}
          </Link>
        )}
        {status.reason === 'NOT_ENOUGH' && (
          <Link href="/worker/profile#verify" className={linkClass}>
            {t('workerDeposit.apply.verify')}
          </Link>
        )}
      </div>
    </div>
  );
}
