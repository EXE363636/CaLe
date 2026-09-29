'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useUserStore } from '@/stores/userStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import { isShiftAvailableForRecruiting } from '@/domain/shiftAvailability';
import { ShiftCard } from '@/components/shift/ShiftCard';
import { t } from '@/i18n/vi';

/**
 * P1 feedback F4 — "6 ca mới nhất" trên trang người lao động (`/viec-lam`).
 *
 * Chỉ đọc store (AppHydrator đã nạp), lọc bằng helper chuẩn
 * `isShiftAvailableForRecruiting` (cùng luật với `/shifts`), rồi lấy ca đăng
 * gần nhất. Không có ca → lời mời xem danh sách, không bịa dữ liệu mẫu.
 */
export function LatestShifts({ limit = 6 }: { limit?: number }) {
  const shifts = useShiftStore((s) => s.shifts);
  const applications = useApplicationStore((s) => s.applications);
  const users = useUserStore((s) => s.users);
  const hydrated = useHydrationStore((s) => s.hydrated);

  const nowIso = new Date().toISOString();
  const latest = useMemo(() => {
    const nowMs = new Date(nowIso).getTime();
    return shifts
      .filter((s) => isShiftAvailableForRecruiting(s, applications, nowMs))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
    // nowIso đổi mỗi render; chỉ tính lại khi dữ liệu đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts, applications, limit]);

  const employerName = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u?.role === 'employer' ? u.companyName : undefined;
  };

  if (!hydrated) {
    return (
      <p className="py-10 text-center text-sm text-gray-500" role="status">
        {t('common.loading')}
      </p>
    );
  }

  if (latest.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-orange-200 bg-white px-6 py-10 text-center">
        <p className="text-sm text-gray-600">{t('workerHome.latest.empty')}</p>
        <Link
          href="/shifts"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          {t('workerHome.latest.viewAll')} →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {latest.map((shift) => (
        <ShiftCard
          key={shift.id}
          shift={shift}
          employerName={employerName(shift.employerId)}
          applications={applications}
          nowIso={nowIso}
          href={`/shifts/${shift.id}`}
        />
      ))}
    </div>
  );
}
