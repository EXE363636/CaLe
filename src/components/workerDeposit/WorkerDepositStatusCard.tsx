'use client';

/**
 * P2-1 (0028) — hồ sơ người lao động: có phải cọc khi ứng tuyển không, và cách
 * để được miễn. Cờ tắt / không phải supabase → không hiện gì.
 */

import { useEffect } from 'react';

import { Card } from '@/components/ui';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { formatVND } from '@/lib/format';
import { t } from '@/i18n/vi';
import { useWorkerDepositStore } from '@/stores/workerDepositStore';

import { formatVnDate } from './vnTime';

export function WorkerDepositStatusCard({ className = '' }: { className?: string }) {
  const status = useWorkerDepositStore((s) => s.status);
  const refresh = useWorkerDepositStore((s) => s.refresh);
  const supabase = isSupabaseEnv();

  useEffect(() => {
    if (supabase) void refresh();
  }, [supabase, refresh]);

  if (!supabase || !status || !status.enabled) return null;

  let body: string;
  let extra: string | null = null;
  if (status.reason === 'IDENTITY') {
    body = t('workerDeposit.exempt.IDENTITY');
  } else if (status.reason === 'COMPLETED_SHIFTS') {
    body = t('workerDeposit.exempt.COMPLETED_SHIFTS')
      .replace('{n}', String(status.exemptAfter))
      .replace('{days}', String(status.windowDays));
  } else {
    body = t('workerDeposit.status.needs')
      .replace('{pct}', String(status.ratioPct))
      .replace('{max}', formatVND(status.maxAmount));
    extra = status.blockedUntil
      ? t('workerDeposit.blocked').replace('{date}', formatVnDate(status.blockedUntil))
      : t('workerDeposit.status.howToExempt')
          .replaceAll('{n}', String(status.exemptAfter))
          .replace('{days}', String(status.windowDays))
          .replace('{done}', String(status.completedInWindow));
  }

  return (
    <Card className={className}>
      <h2 className="font-semibold text-gray-900">{t('workerDeposit.status.title')}</h2>
      <p className="mt-1 text-sm text-gray-700">{body}</p>
      {extra && <p className="mt-1 text-sm text-gray-600">{extra}</p>}
    </Card>
  );
}
