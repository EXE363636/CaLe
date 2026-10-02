'use client';

import { useMemo } from 'react';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useUserStore } from '@/stores/userStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import { isShiftAvailableForRecruiting } from '@/domain/shiftAvailability';
import { ShiftCard } from '@/components/shift/ShiftCard';
import { OpenShiftsEmpty } from '@/components/shift/OpenShiftsEmpty';
import { useT } from '@/i18n/LocaleProvider';

/**
 * P1 feedback F4 — "6 ca mới nhất" trên trang người lao động (`/for-workers`).
 *
 * Chỉ đọc store (AppHydrator đã nạp), lọc bằng helper chuẩn
 * `isShiftAvailableForRecruiting` (cùng luật với `/shifts`), rồi lấy ca đăng
 * gần nhất. Không có ca → `OpenShiftsEmpty` (quy trình + việc làm ngay), không bịa dữ liệu mẫu.
 */
export function LatestShifts({ limit = 6 }: { limit?: number }) {
  const t = useT();
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
    return <OpenShiftsEmpty headingLevel={3} />;
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
