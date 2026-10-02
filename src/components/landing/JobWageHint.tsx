'use client';

/**
 * Dòng "30.000–45.000 đ/giờ · 3 ca đang tuyển" trên thẻ loại việc ở `/for-workers`
 * (03/10). Số lấy từ các ca đang tuyển thật (`wageRanges`); chưa nạp dữ liệu hoặc
 * loại việc chưa có ca → không hiện gì. Bản demo: số từ dữ liệu mẫu (khối đã ghi
 * "(dữ liệu demo)" ở dòng đếm ca phía trên).
 */

import { useMemo } from 'react';

import { isShiftAvailableForRecruiting } from '@/domain/shiftAvailability';
import { useTx } from '@/i18n/LocaleProvider';
import { formatVND } from '@/lib/format';
import { jobTypeFromSlug } from '@/lib/jobTypeSlug';
import { useApplicationStore } from '@/stores/applicationStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import { useShiftStore } from '@/stores/shiftStore';

import { wageRanges } from './wageReference';

export function JobWageHint({ filter }: { filter?: string }) {
  const tx = useTx();
  const shifts = useShiftStore((s) => s.shifts);
  const applications = useApplicationStore((s) => s.applications);
  const hydrated = useHydrationStore((s) => s.hydrated);
  const jobType = jobTypeFromSlug(filter);

  const range = useMemo(() => {
    if (!jobType) return undefined;
    const nowMs = Date.parse(new Date().toISOString());
    const open = shifts.filter((s) => isShiftAvailableForRecruiting(s, applications, nowMs));
    return wageRanges(open).get(jobType);
  }, [shifts, applications, jobType]);

  if (!hydrated || !range) return null;
  const money = range.min === range.max ? formatVND(range.min) : `${formatVND(range.min).replace(/\s*đ$/, '')}–${formatVND(range.max)}`;
  return (
    <span className="motion-fade-up mt-0.5 block text-xs font-semibold text-orange-800 tabular-nums">
      {tx('{money}/giờ').replace('{money}', money)} ·{' '}
      {range.count === 1 ? tx('1 ca đang tuyển') : tx('{n} ca đang tuyển').replace('{n}', String(range.count))}
    </span>
  );
}
