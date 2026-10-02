'use client';

/**
 * Dải mực cuối trang vai trò (03/10) — câu chữ và nút theo NGƯỜI ĐANG XEM:
 *
 *   Trang \ người xem | Khách                          | Đúng vai trò              | Vai trò kia
 *   /for-workers      | "Sẵn sàng nhận ca đầu tiên?"   | "Tìm ca tiếp theo?"       | "Trang này dành cho
 *                     | Đăng ký để nhận ca             | Tìm ca làm                |  người lao động."
 *                     | + Bạn cần tuyển người? →       |                           | Về trang của bạn
 *   /for-employers    | "Sẵn sàng đăng ca đầu tiên?"   | "Cần thêm người cho ca    | "Trang này dành cho
 *                     | Đăng ký để đăng ca             |  tới?" Đăng ca cần tuyển  |  nhà tuyển dụng."
 *                     | + Bạn đang tìm việc? →         |                           | Về trang của bạn
 *
 * Trước đây chữ cố định cho khách: người đã đăng nhập vẫn thấy "đăng ca đầu tiên",
 * "Bạn đang tìm việc?", và trang người lao động không có nút đăng ký ở cuối.
 * Bản server / trước khi nạp phiên đăng nhập: bản cho khách (giống `RoleHomeCta`).
 */

import Link from 'next/link';

import { useT, useTx } from '@/i18n/LocaleProvider';
import { useCurrentUser } from '@/stores/authStore';

import { TypeOnView } from './TypeOnView';

const DASHBOARD = { worker: '/worker/dashboard', employer: '/employer/dashboard', admin: '/admin/dashboard' } as const;
const PRIMARY =
  'cta-arrow-nudge inline-flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-gray-900 hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900';

export function RoleBand({ audience }: { audience: 'worker' | 'employer' }) {
  const t = useT();
  const tx = useTx();
  const user = useCurrentUser();

  let title: string;
  let cta: { href: string; label: string };
  let switchLine: { text: string; href: string; label: string } | null = null;

  if (!user) {
    title = audience === 'worker' ? tx('Sẵn sàng nhận ca đầu tiên?') : t('employerHome.final.text');
    cta =
      audience === 'worker'
        ? { href: '/register?role=worker', label: t('workerHome.hero.cta') }
        : { href: '/register?role=employer', label: t('employerHome.hero.cta') };
    switchLine =
      audience === 'worker'
        ? { text: t('workerHome.switch.text'), href: '/for-employers', label: t('workerHome.switch.cta') }
        : { text: t('employerHome.switch.text'), href: '/for-workers', label: t('employerHome.switch.cta') };
  } else if (user.role === audience) {
    title = audience === 'worker' ? tx('Tìm ca tiếp theo?') : tx('Cần thêm người cho ca tới?');
    cta =
      audience === 'worker'
        ? { href: '/shifts', label: t('nav.shifts') }
        : { href: '/employer/shifts/new', label: t('btn.postShift') };
  } else {
    title = audience === 'worker' ? tx('Trang này dành cho người lao động.') : tx('Trang này dành cho nhà tuyển dụng.');
    cta = { href: DASHBOARD[user.role], label: tx('Về trang của bạn') };
  }

  return (
    <section className="bg-ink px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-lg font-semibold">
            {/* Chỉ gõ chữ cho khách; đổi người xem thì hiện ngay. */}
            {user ? title : <TypeOnView text={title} />}
          </p>
          {switchLine && (
            <p className="mt-1 text-sm text-white/70">
              {switchLine.text}{' '}
              <Link href={switchLine.href} className="font-semibold text-white underline-offset-2 hover:underline">
                {switchLine.label}
              </Link>
            </p>
          )}
        </div>
        <Link href={cta.href} className={PRIMARY}>
          {cta.label}{' '}
          <span className="cta-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
