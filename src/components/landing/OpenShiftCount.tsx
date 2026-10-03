'use client';

/**
 * Trang chủ — dòng "● 12 ca đang tuyển · 3 ca gấp trong 24 giờ tới · Xem ca →"
 * dưới hai cửa vai trò (02/10): trả lời ngay "có việc không?" bằng số THẬT.
 *
 * Đếm bằng đúng điều kiện của `/shifts` (`isShiftAvailableForRecruiting`) và
 * khối "Ca gấp" (`isUnfilledUrgent`), nên số khớp danh sách. Chưa nạp dữ liệu
 * → giữ chỗ một dòng ẩn (tránh xô bố cục); 0 ca → không hiện gì (không "0 ca").
 * Bản demo ghi "(dữ liệu demo)" vì số đếm từ dữ liệu mẫu trong trình duyệt.
 */

import Link from 'next/link';
import { useMemo } from 'react';

import { isSupabaseEnv } from '@/data/supabaseClient';
import { isUnfilledUrgent, UNFILLED_URGENT_HOURS } from '@/domain/adminShiftFilter';
import { isShiftAvailableForRecruiting } from '@/domain/shiftAvailability';
import { useTx } from '@/i18n/LocaleProvider';
import { useApplicationStore } from '@/stores/applicationStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import { useShiftStore } from '@/stores/shiftStore';

export function OpenShiftCount() {
  const tx = useTx();
  const shifts = useShiftStore((s) => s.shifts);
  const applications = useApplicationStore((s) => s.applications);
  const hydrated = useHydrationStore((s) => s.hydrated);

  const { open, urgent } = useMemo(() => {
    const nowIso = new Date().toISOString();
    const nowMs = new Date(nowIso).getTime();
    const recruiting = shifts.filter((s) => isShiftAvailableForRecruiting(s, applications, nowMs));
    return {
      open: recruiting.length,
      urgent: recruiting.filter((s) => isUnfilledUrgent(s, applications, nowIso)).length,
    };
  }, [shifts, applications]);

  // 04/10: chưa nạp dữ liệu → giữ chỗ đúng một dòng (ẩn, không đọc) thay vì `null`,
  // để dòng số ca hiện ra không đẩy phần bên dưới xuống (CLS). 0 ca vẫn không hiện gì.
  if (!hydrated) {
    return (
      <p aria-hidden="true" className="invisible mt-5 text-sm">
        &nbsp;
      </p>
    );
  }
  if (open === 0) return null;

  return (
    <p className="motion-fade-up mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700">
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-green-600" />
      <span className="font-semibold text-gray-900 tabular-nums">
        {open === 1 ? tx('1 ca đang tuyển') : tx('{n} ca đang tuyển').replace('{n}', String(open))}
      </span>
      {urgent > 0 && (
        <span className="tabular-nums">
          ·{' '}
          {(urgent === 1 ? tx('1 ca gấp trong {h} giờ tới') : tx('{n} ca gấp trong {h} giờ tới'))
            .replace('{n}', String(urgent))
            .replace('{h}', String(UNFILLED_URGENT_HOURS))}
        </span>
      )}
      {!isSupabaseEnv() && <span className="text-gray-600">{tx('(dữ liệu demo)')}</span>}
      <Link
        href="/shifts"
        className="font-semibold text-orange-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        {tx('Xem ca')} →
      </Link>
    </p>
  );
}
