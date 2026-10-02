'use client';

/**
 * OpenShiftsEmpty — khi chợ ca KHÔNG có ca nào đang mở tuyển (không phải do
 * bộ lọc). Thay vì một dòng "quay lại sau", nói thật chuyện gì xảy ra khi có ca
 * mới và đưa ra một việc làm ngay theo vai trò:
 *  - khách: tạo tài khoản người lao động;
 *  - người lao động: thêm giờ rảnh để được gợi ý ca hợp lịch;
 *  - nhà tuyển dụng: đăng ca.
 * Không bịa ca mẫu (quyết định P1 F4) — chỉ mô tả quy trình thật.
 */

import Link from 'next/link';

import { ButtonLink } from '@/components/ui';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { useT, useTx } from '@/i18n/LocaleProvider';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';

export function OpenShiftsEmpty({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const t = useT();
  const tx = useTx();
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const role = useUserStore((s) => s.users.find((u) => u.id === currentUserId)?.role);
  const real = isSupabaseEnv();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  const steps = [
    real
      ? tx('Nhà tuyển dụng đăng ca và giữ trước đủ tiền công trên CaLẻ.')
      : tx('Nhà tuyển dụng đăng ca và giữ trước tiền công (mô phỏng).'),
    tx('Ca hiện ở đây, kèm tổng tiền cả ca, giờ làm và địa điểm.'),
    real
      ? tx('Bạn ứng tuyển, được duyệt và đi làm; xong ca, tiền công vào ví của bạn.')
      : tx('Bạn ứng tuyển, được duyệt và đi làm; xong ca, tiền công vào ví (mô phỏng).'),
  ];

  const action =
    role === 'worker'
      ? { href: '/worker/schedule', label: tx('Thêm giờ rảnh của bạn'), hint: tx('Có ca hợp lịch, CaLẻ gợi ý cho bạn trước.') }
      : role === 'employer'
        ? { href: '/employer/shifts/new', label: t('btn.postShift'), hint: undefined }
        : role === 'admin'
          ? null
          : { href: '/register?role=worker', label: tx('Tạo tài khoản người lao động'), hint: tx('Miễn phí, chỉ mất một phút.') };

  return (
    <section className="grid gap-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-card sm:p-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-12">
      <div>
        <Heading className="text-balance text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
          {t('shifts.listing.emptyNone')}
        </Heading>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600">{t('shifts.listing.emptyNoneHint')}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          {action && (
            <ButtonLink href={action.href} variant="primary">
              {action.label}
            </ButtonLink>
          )}
          <Link
            href="/how-it-works"
            className="inline-flex min-h-[44px] items-center rounded text-sm font-semibold text-orange-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            {tx('Cách CaLẻ hoạt động')} →
          </Link>
        </div>
        {action?.hint && <p className="mt-2 text-xs text-gray-500">{action.hint}</p>}
      </div>

      <div className="border-t border-gray-100 pt-6 md:border-l md:border-t-0 md:pl-12 md:pt-0">
        <p className="text-sm font-semibold text-gray-900">{tx('Khi có ca mới')}</p>
        <ol className="mt-4 flex flex-col gap-4">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-gray-700">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-bold text-orange-700 ring-1 ring-orange-100 tabular-nums"
              >
                {i + 1}
              </span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
