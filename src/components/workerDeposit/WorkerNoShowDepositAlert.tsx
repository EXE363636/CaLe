'use client';

/**
 * P2-1 (0028, T3) — server chưa gửi thông báo khi người lao động bị đánh vắng,
 * nên dashboard cảnh báo các khoản cọc đang giữ của đơn vắng mặt để họ kịp
 * khiếu nại trong hạn 72 giờ. Không có khoản nào → không hiện gì.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { getMyNoShowHolds, type WorkerHold } from '@/data/repos/workerDepositRepo';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { t } from '@/i18n/vi';

export function WorkerNoShowDepositAlert({ className = '' }: { className?: string }) {
  const [holds, setHolds] = useState<WorkerHold[]>([]);
  const supabase = isSupabaseEnv();

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    getMyNoShowHolds()
      .then((h) => {
        if (alive) setHolds(h);
      })
      .catch(() => {
        // Không tải được → không cảnh báo; trang ca vẫn hiện khoản cọc.
      });
    return () => {
      alive = false;
    };
  }, [supabase]);

  if (holds.length === 0) return null;
  return (
    <div
      role="alert"
      className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 ${className}`}
    >
      <p className="font-semibold">{t('workerDeposit.alert.title').replace('{n}', String(holds.length))}</p>
      <p className="mt-1">{t('workerDeposit.alert.body')}</p>
      <Link
        href={`/shifts/${holds[0].shiftId}`}
        className="mt-1 inline-flex min-h-[44px] items-center font-semibold text-red-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        {t('workerDeposit.alert.link')}
      </Link>
    </div>
  );
}
