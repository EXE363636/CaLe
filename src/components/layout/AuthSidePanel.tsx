'use client';

/**
 * Khung trang đăng nhập / đăng ký / quên mật khẩu.
 *
 * 03/10 (lần 2) — một thẻ lớn giữa trang thay cho hai cột rời: form bên trái, nửa phải
 * nền đào (`hero-decor`) chứa phần giới thiệu. Trên điện thoại:
 *   - đăng nhập / quên mật khẩu: chỉ có form (minh hoạ là phụ);
 *   - đăng ký: phần giới thiệu xuống dưới form (lợi ích theo vai trò đáng đọc).
 *
 * `AuthSidePanel`:
 *   - Đăng nhập: một câu + minh hoạ ca tự diễn của trang người lao động (`WorkerPreview`).
 *   - Đăng ký: đổi theo vai trò đang chọn trong form (`role`) — lợi ích + ba bước sau
 *     khi đăng ký.
 *
 * Câu chữ đúng theo chế độ dữ liệu:
 *   - Production: tiền công giữ cọc thật (PayOS), phí 10% chỉ trên phần ca có người làm,
 *     không ghi "mô phỏng" cho tiền. Không hứa điểm uy tín / huy hiệu xác minh (bản thật
 *     nhà tuyển dụng chỉ thấy điểm sao + số ca, số lần vắng với họ).
 *   - Demo: tiền và xác minh giấy tờ là mô phỏng, dữ liệu lưu trong trình duyệt.
 */

import type { ReactNode } from 'react';

import { LandingIconGlyph, type LandingIcon } from '@/components/landing/LandingSections';
import { WorkerPreview } from '@/components/landing/LandingPreview';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { useTx } from '@/i18n/LocaleProvider';

export function AuthShell({
  panel,
  panelOnMobile = false,
  children,
}: {
  panel: ReactNode;
  /** Hiện phần giới thiệu dưới form trên điện thoại (đăng ký). */
  panelOnMobile?: boolean;
  children: ReactNode;
}) {
  return (
    <section data-tone="cream" className="public-skin public-canvas px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-modal ring-1 ring-black/5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="min-w-0 p-6 sm:p-10">{children}</div>
        <div
          className={[
            'hero-decor relative min-w-0 border-t border-black/5 bg-orange-50 p-6 sm:p-10 lg:border-l lg:border-t-0',
            panelOnMobile ? '' : 'hidden lg:block',
          ].join(' ')}
        >
          {panel}
        </div>
      </div>
    </section>
  );
}

interface AuthSidePanelProps {
  mode: 'login' | 'register';
  /** Vai trò đang chọn ở form đăng ký. */
  role?: 'worker' | 'employer';
}

export function AuthSidePanel({ mode, role = 'worker' }: AuthSidePanelProps) {
  const tx = useTx();
  const live = isSupabaseEnv();

  const note = live
    ? tx('Nạp và rút tiền qua PayOS. Tiền công được giữ cọc tới khi ca hoàn thành.')
    : tx('Bản demo: dữ liệu lưu trong trình duyệt này. Nạp, giữ, trả tiền và xác minh giấy tờ đều là mô phỏng.');

  if (mode === 'login') {
    return (
      <div className="flex h-full flex-col justify-center">
        <p className="text-balance text-2xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-3xl">
          {tx('Ca làm của bạn vẫn ở đây.')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {tx('Ca đã nhận, check-in, ví tiền công và người ứng tuyển của từng ca: đăng nhập là thấy ngay.')}
        </p>
        <div className="mt-6">
          <WorkerPreview />
        </div>
        <Note text={note} />
      </div>
    );
  }

  const worker = role === 'worker';
  const benefits: Array<{ icon: LandingIcon; title: string; body: string }> = worker
    ? [
        { icon: 'calendar', title: tx('Ứng tuyển miễn phí'), body: tx('Tìm ca theo khu vực, ngày và loại việc. Không mất phí khi ứng tuyển.') },
        live
          ? { icon: 'wallet', title: tx('Tiền công được giữ trước'), body: tx('Ca chỉ hiện khi nhà tuyển dụng đã giữ đủ tiền công; ca xong, tiền vào ví của bạn.') }
          : { icon: 'wallet', title: tx('Tiền công được giữ trước (mô phỏng)'), body: tx('Ca chỉ hiện khi đã giữ đủ tiền công; ca xong, tiền vào ví mô phỏng.') },
        { icon: 'star', title: tx('Đánh giá hai chiều'), body: tx('Sau ca, hai bên chấm sao cho nhau trong 14 ngày.') },
      ]
    : [
        { icon: 'status', title: tx('Đăng ca trong vài phút'), body: tx('Điền giờ, lương và số người; ca hiện cho người lao động ngay khi tiền đã được giữ.') },
        live
          ? { icon: 'money', title: tx('Phí chỉ trên phần ca có người làm'), body: tx('10% tiền công. Vị trí trống, người vắng mặt, ca huỷ: hoàn cả tiền công lẫn phí.') }
          : { icon: 'money', title: tx('Bản demo chưa thu phí'), body: tx('Tiền giữ và tiền hoàn đều là mô phỏng.') },
        { icon: 'profile', title: tx('Duyệt từng người'), body: tx('Xem điểm sao và số ca người đó đã làm với bạn trước khi duyệt.') },
      ];
  const steps = worker
    ? [tx('Điền họ tên và số điện thoại'), tx('Tìm một ca và ứng tuyển'), tx('Được duyệt thì check-in đúng giờ')]
    : [
        tx('Chọn loại hình và tên cơ sở'),
        live ? tx('Nạp tiền và đăng ca đầu tiên') : tx('Đăng ca đầu tiên'),
        tx('Duyệt người, xác nhận hoàn thành'),
      ];

  return (
    <div className="lg:sticky lg:top-24">
      <p className="text-sm font-semibold text-orange-700">{worker ? tx('Dành cho người lao động') : tx('Dành cho nhà tuyển dụng')}</p>
      <p className="mt-2 text-balance text-2xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-3xl">
        {worker ? tx('Làm ca theo giờ rảnh của bạn.') : tx('Thiếu người cho ca, tuyển trong vài phút.')}
      </p>

      <ul className="mt-6 flex flex-col gap-4">
        {benefits.map((b) => (
          <li key={b.title} className="flex gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-700 shadow-sm ring-1 ring-orange-100">
              <LandingIconGlyph name={b.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-gray-900">{b.title}</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-gray-600">{b.body}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <p className="text-sm font-semibold text-gray-900">{tx('Sau khi đăng ký')}</p>
        <ol className="mt-3 flex flex-col gap-2.5">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm text-gray-700">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white tabular-nums">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>
      <Note text={note} />
    </div>
  );
}

function Note({ text }: { text: string }) {
  return <p className="mt-6 text-xs leading-relaxed text-gray-500">{text}</p>;
}
