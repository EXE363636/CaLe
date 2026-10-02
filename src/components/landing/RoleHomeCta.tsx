'use client';

/**
 * Nút hành động của trang `/for-workers` và `/for-employers` theo phiên đăng nhập.
 *
 * Hai trang là server component nên không biết người xem đã đăng nhập (phiên ở
 * trình duyệt). Component này đọc cùng nguồn với NavBar (`useCurrentUser`):
 *  - khách: hiện `children` (nút đăng ký + "Đã có tài khoản? Đăng nhập") do
 *    trang server dựng sẵn — đúng bản SSR, không nhấp nháy với khách;
 *  - đúng vai trò của trang: việc chính của vai trò (đăng ca / tìm ca) + về tổng quan;
 *  - khác vai trò / admin: về trang của mình.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

import { useT, useTx } from '@/i18n/LocaleProvider';
import { useCurrentUser } from '@/stores/authStore';

const PRIMARY_HERO =
  'cta-arrow-nudge motion-press inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-8 text-base font-semibold text-gray-900 shadow-md hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2';
const SECONDARY_HERO =
  'inline-flex min-h-[52px] items-center justify-center rounded-xl border border-gray-300 bg-white px-6 text-base font-semibold text-gray-900 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2';
const PRIMARY_BAND =
  'cta-arrow-nudge inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-gray-900 hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900';

const DASHBOARD = { worker: '/worker/dashboard', employer: '/employer/dashboard', admin: '/admin/dashboard' } as const;

export function RoleHomeCta({
  audience,
  placement,
  children,
}: {
  /** Vai trò mà trang hướng tới. */
  audience: 'worker' | 'employer';
  placement: 'hero' | 'band';
  /** Nút cho khách — trang server dựng sẵn. */
  children: ReactNode;
}) {
  const t = useT();
  const tx = useTx();
  const user = useCurrentUser();
  if (!user) return <>{children}</>;

  const home = DASHBOARD[user.role];
  const sameRole = user.role === audience;
  const primary = sameRole
    ? audience === 'employer'
      ? { href: '/employer/shifts/new', label: t('btn.postShift') }
      : { href: '/shifts', label: t('btn.findShift') }
    : { href: home, label: tx('Về trang của bạn') };

  const arrow = (
    <span className="cta-arrow" aria-hidden="true">
      →
    </span>
  );

  if (placement === 'band') {
    return (
      <Link href={primary.href} className={PRIMARY_BAND}>
        {primary.label} {arrow}
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <Link href={primary.href} className={PRIMARY_HERO}>
        {primary.label} {arrow}
      </Link>
      {sameRole && (
        <Link href={home} className={SECONDARY_HERO}>
          {tx('Về trang tổng quan')}
        </Link>
      )}
    </div>
  );
}
