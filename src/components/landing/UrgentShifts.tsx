'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useUserStore } from '@/stores/userStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import { isShiftAvailableForRecruiting } from '@/domain/shiftAvailability';
import { isUnfilledUrgent, UNFILLED_URGENT_HOURS } from '@/domain/adminShiftFilter';
import { ShiftCard } from '@/components/shift/ShiftCard';
import { t } from '@/i18n/vi';

/**
 * Trang chủ `/` — "Ca gấp cần người": ca đang tuyển THẬT, bắt đầu trong
 * UNFILLED_URGENT_HOURS giờ tới mà còn thiếu người (cùng định nghĩa "Gấp" với
 * bộ lọc admin). Xếp theo giờ bắt đầu gần nhất. Không có ca gấp → không render
 * gì (không hiện "0 ca" — phản tác dụng khi sàn còn ít tin).
 *
 * Thay cho ý "ca được boost": boost chưa có ở production (capabilities.boost
 * = false). Khi có boost trả phí, ca đã boost có thể được đưa lên đầu khối này.
 */
export function UrgentShifts({ limit = 3 }: { limit?: number }) {
  const shifts = useShiftStore((s) => s.shifts);
  const applications = useApplicationStore((s) => s.applications);
  const users = useUserStore((s) => s.users);
  const hydrated = useHydrationStore((s) => s.hydrated);

  const nowIso = new Date().toISOString();
  const urgent = useMemo(() => {
    const nowMs = new Date(nowIso).getTime();
    return shifts
      .filter(
        (s) =>
          isShiftAvailableForRecruiting(s, applications, nowMs) &&
          isUnfilledUrgent(s, applications, nowIso),
      )
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
      .slice(0, limit);
    // nowIso đổi mỗi render; chỉ tính lại khi dữ liệu đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts, applications, limit]);

  if (!hydrated || urgent.length === 0) return null;

  const employerName = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u?.role === 'employer' ? u.companyName : undefined;
  };

  return (
    <section aria-labelledby="home-urgent" className="mt-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="home-urgent" className="text-xl font-bold text-gray-900 sm:text-2xl">
            {t('home.urgent.title')}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {t('home.urgent.lead').replace('{hours}', String(UNFILLED_URGENT_HOURS))}
          </p>
        </div>
        <Link
          href="/shifts"
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          {t('workerHome.latest.viewAll')} →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {urgent.map((shift) => (
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
    </section>
  );
}
