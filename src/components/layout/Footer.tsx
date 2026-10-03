'use client';

/**
 * Chân trang (03/10 — làm lại theo da "giấy trắng, cam rõ", `.public-skin`).
 *
 *   - Từ `lg` một hàng: logo + một câu giới thiệu · ba cột liên kết "CaLẻ" / "Người lao
 *     động" / "Nhà tuyển dụng" · "Cần hỗ trợ?" (nút "Nhắn với trợ lý" mở bong bóng hỗ trợ,
 *     email, hotline, địa chỉ, lối sang /support).
 *     `md`: logo | hỗ trợ, ba cột liên kết hàng dưới. Điện thoại: logo, hỗ trợ, liên kết 2
 *     cột. Hai cột vai trò thêm lại 03/10 (chủ dự án), trỏ tới các khối của trang vai trò.
 *   - Dưới cùng: bản quyền + hàng liên kết pháp lý nhỏ (Điều khoản · Bảo mật · Tranh
 *     chấp · Hỗ trợ), có tiêu đề ẩn "Pháp lý & hỗ trợ" cho trình đọc màn hình.
 *   - Dòng trạng thái dữ liệu theo chế độ (demo: không có giao dịch thật; bản thật:
 *     tiền thật qua PayOS) — bắt buộc phải trung thực.
 * Gắn trên mọi route (kể cả /admin) để luôn tìm được liên kết pháp lý / hỗ trợ.
 * Không cột nào dùng nhãn chữ in hoa giãn chữ (eyebrow): tiêu đề cột là chữ thường đậm.
 */

import Image from 'next/image';
import Link from 'next/link';
import { t } from '@/i18n/vi';
import { useTx } from '@/i18n/LocaleProvider';
import { SUPPORT_EMAIL, SUPPORT_HOTLINE } from '@/lib/contact';
import { SupportGlyph } from '@/components/support/SupportGlyph';
import { openSupportBubble } from '@/components/support/supportBubbleEvents';

interface ColumnLink {
  label: string;
  href: string;
}

interface Column {
  heading: string;
  links: ColumnLink[];
}

const COLUMNS: Column[] = [
  {
    heading: 'CaLẻ',
    links: [
      // 03/10 — giới thiệu / cách hoạt động / bảng giá là các khối của trang chủ và trang
      // nhà tuyển dụng; lưu ý an toàn nằm ở /support.
      // ("Bảng giá" = "Phí dịch vụ" ở cột nhà tuyển dụng, không lặp.)
      { label: 'Giới thiệu', href: '/#home-about' },
      { label: 'Cách hoạt động', href: '/#home-how' },
      { label: t('nav.label.userGuide'), href: '/user-guide' },
      { label: t('nav.label.handbook'), href: '/handbook' },
      { label: 'Lưu ý an toàn', href: '/support#support-safety' },
      { label: 'Câu hỏi thường gặp', href: '/faq' },
    ],
  },
  {
    heading: 'Người lao động',
    links: [
      { label: 'Tìm ca làm', href: '/shifts' },
      { label: 'Ca đang tuyển', href: '/for-workers#worker-shifts' },
      { label: 'Lịch cá nhân', href: '/for-workers#worker-schedule' },
      { label: 'Tiền về tay khi nào', href: '/for-workers#worker-money' },
      { label: 'Quy định huỷ ca', href: '/for-workers#worker-cancel' },
      { label: 'Hồ sơ & điểm uy tín', href: '/for-workers#worker-reputation' },
    ],
  },
  {
    heading: 'Nhà tuyển dụng',
    links: [
      { label: 'Đăng ca tuyển', href: '/employer/shifts/new' },
      { label: 'Thử đăng một ca', href: '/for-employers#employer-post' },
      { label: 'Duyệt người ứng tuyển', href: '/for-employers#employer-applicants' },
      { label: 'Giữ tiền ca làm', href: '/for-employers#employer-payments' },
      { label: 'Phí dịch vụ', href: '/for-employers#employer-pricing' },
      { label: 'Đánh giá sau ca', href: '/for-employers#employer-reviews' },
    ],
  },
];

const LEGAL_LINKS: ColumnLink[] = [
  { label: 'Điều khoản sử dụng', href: '/terms' },
  { label: 'Chính sách bảo mật', href: '/privacy' },
  { label: 'Chính sách xử lý tranh chấp', href: '/disputes' },
  { label: 'Liên hệ hỗ trợ', href: '/support' },
];

const EMAIL = SUPPORT_EMAIL;
const HOTLINE = SUPPORT_HOTLINE;

const LINK =
  'rounded underline-offset-4 decoration-orange-400 decoration-2 hover:text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400';

export function Footer() {
  const tx = useTx();
  const live = process.env.NEXT_PUBLIC_DATA_MODE === 'supabase';
  return (
    <footer className="public-skin mt-auto border-t border-black/5" style={{ backgroundColor: 'var(--tone-paper)' }}>
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        {/* lg: logo · 3 cột liên kết · hỗ trợ (một hàng). md: logo | hỗ trợ, liên kết hàng
            dưới. Điện thoại: logo, hỗ trợ, liên kết 2 cột (03/10, lần 4). */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1.35fr)] lg:gap-12">
          <div className="min-w-0">
            <Link
              href="/"
              className="inline-flex rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {/* 04/10: logo bản nhỏ (194×120) thay ảnh gốc 3896×2416 — đỡ giải mã ảnh lớn mỗi trang. */}
              <Image src="/images/logo-small.png" alt={t('site.name')} width={194} height={120} className="h-10 w-auto object-contain" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-600">
              {tx('Kết nối ca làm ngắn hạn an toàn, minh bạch và linh hoạt cho người lao động và nhà tuyển dụng tại Việt Nam.')}
            </p>
          </div>

          <section aria-labelledby="footer-help" className="min-w-0 lg:order-last">
            <h2 id="footer-help" className="text-sm font-semibold text-gray-900">
              {tx('Cần hỗ trợ?')}
            </h2>
            {/* 04/10: mở bong bóng hỗ trợ ở tab trợ lý (cùng nút tròn góc màn hình). */}
            <button
              type="button"
              onClick={() => openSupportBubble({ tab: 'assistant' })}
              data-footer-assistant=""
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-orange-500 px-4 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <SupportGlyph className="h-5 w-5" />
              {tx('Nhắn với trợ lý')}
            </button>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <div className="min-w-0">
                <dt className="text-xs text-gray-600">Email</dt>
                <dd className="mt-0.5">
                  <a href={`mailto:${EMAIL}`} className={['font-medium text-gray-900 [overflow-wrap:anywhere]', LINK].join(' ')}>
                    {EMAIL}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-600">Hotline</dt>
                <dd className="mt-0.5">
                  <a href={`tel:${HOTLINE}`} className={['font-medium text-gray-900 tabular-nums', LINK].join(' ')}>
                    {HOTLINE}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-600">{tx('Địa chỉ')}</dt>
                <dd className="mt-0.5 font-medium text-gray-900">{tx('Hà Nội, Việt Nam')}</dd>
              </div>
            </dl>
            <Link
              href="/support"
              className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded text-sm font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {tx('Cách phản ánh sự cố')} <span aria-hidden="true">→</span>
            </Link>
          </section>

          <nav aria-label={tx('Liên kết chân trang')} className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:col-span-2 lg:col-span-1">
            {COLUMNS.map((col) => (
              <div key={col.heading} className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900">{tx(col.heading)}</h2>
                <ul className="mt-4 flex flex-col gap-3 text-sm text-gray-600">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={LINK}>
                        {tx(link.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bản quyền + liên kết pháp lý */}
        <div className="mt-14 flex flex-col gap-4 border-t border-black/10 pt-6 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
          <p>© 2026 CaLedo Tech</p>
          <div>
            <h2 className="sr-only">{tx('Pháp lý & hỗ trợ')}</h2>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {tx(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trạng thái dữ liệu theo chế độ (build-time inlined; process.env để build không throw). */}
        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-gray-600">
          <span
            aria-hidden="true"
            className={['mt-1 h-2 w-2 shrink-0 rounded-full', live ? 'bg-green-600' : 'bg-amber-500'].join(' ')}
          />
          {live
            ? tx('Dữ liệu tài khoản, ca làm và đơn ứng tuyển được lưu trên hệ thống. Nạp, giữ cọc, trả công và rút tiền là giao dịch thật qua cổng thanh toán PayOS.')
            : tx('Dữ liệu demo đang lưu trên trình duyệt. Xóa cache sẽ mất dữ liệu. Trong MVP/demo không có giao dịch thật.')}
        </p>
      </div>
    </footer>
  );
}
