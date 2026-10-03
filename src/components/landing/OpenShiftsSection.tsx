'use client';

/**
 * Khối "Ca đang tuyển" của `/for-workers` (`#worker-shifts`, 03/10 — chủ dự án: tìm ca
 * phải nằm trong trang người lao động). Ô tìm (gửi sang `/shifts?q=…`, danh sách đầy đủ
 * có bộ lọc), 6 ca gần nhất đang tuyển bằng đúng thẻ ca của `/shifts` và cùng điều kiện
 * (`isShiftAvailableForRecruiting`, sắp theo `compareShiftsForWorker`), nút "Xem tất cả".
 * Chưa có ca nào → khối "khi có ca mới" dùng chung với `/shifts` (`OpenShiftsEmpty`).
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { OpenShiftsEmpty } from '@/components/shift/OpenShiftsEmpty';
import { ShiftCard } from '@/components/shift/ShiftCard';
import { compareShiftsForWorker } from '@/domain/shiftSorting';
import { isShiftAvailableForRecruiting } from '@/domain/shiftAvailability';
import { useT, useTx } from '@/i18n/LocaleProvider';
import { useApplicationStore } from '@/stores/applicationStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';

const LIMIT = 6;

export function OpenShiftsSection({ tone = 'cream' }: { tone?: string }) {
  const t = useT();
  const tx = useTx();
  const router = useRouter();
  const shifts = useShiftStore((s) => s.shifts);
  const applications = useApplicationStore((s) => s.applications);
  const users = useUserStore((s) => s.users);
  const hydrated = useHydrationStore((s) => s.hydrated);
  const [query, setQuery] = useState('');

  const open = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- cùng cách /shifts lọc ca đang tuyển theo giờ hiện tại khi vẽ
    const nowMs = Date.now();
    return shifts
      .filter((s) => isShiftAvailableForRecruiting(s, applications, nowMs))
      .sort((a, b) => compareShiftsForWorker(a, b, null));
  }, [shifts, applications]);

  const employerName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const u of users) if (u.role === 'employer') m[u.id] = u.companyName;
    return m;
  }, [users]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/shifts?q=${encodeURIComponent(q)}` : '/shifts');
  }

  return (
    <section aria-labelledby="worker-shifts" data-tone={tone} className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 id="worker-shifts" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {tx('Ca đang tuyển')}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              {tx('Ca nào hiện ở đây cũng đã được giữ trước tiền công. Bấm vào ca để xem chi tiết và ứng tuyển.')}
            </p>
          </div>
          <form role="search" onSubmit={onSubmit} className="flex w-full max-w-md gap-2">
            <label htmlFor="worker-shift-search" className="sr-only">
              {tx('Tìm ca')}
            </label>
            <input
              id="worker-shift-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('form.searchPlaceholder')}
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
            <button
              type="submit"
              className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-orange-500 px-5 text-sm font-semibold text-gray-900 hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {tx('Tìm ca')}
            </button>
          </form>
        </div>

        {!hydrated ? (
          // Chưa nạp dữ liệu: giữ chỗ, không báo "chưa có ca" sai trong chốc lát.
          <div aria-busy="true" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-white/70 ring-1 ring-black/5 motion-safe:animate-pulse" />
            ))}
          </div>
        ) : open.length === 0 ? (
          <div className="mt-8">
            <OpenShiftsEmpty headingLevel={3} />
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {open.slice(0, LIMIT).map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  employerName={employerName[shift.employerId]}
                  applications={applications}
                  href={`/shifts/${shift.id}`}
                />
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Link
                href="/shifts"
                className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-6 text-sm font-semibold text-gray-900 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
              >
                {(open.length > LIMIT ? tx('Xem tất cả {n} ca') : tx('Mở trang tìm ca')).replace('{n}', String(open.length))}{' '}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
