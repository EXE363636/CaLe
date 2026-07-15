'use client';

/**
 * Site footer — Premium dark redesign.
 *
 * Dark surface footer with orange brand accents, gradient column headings,
 * hover underline links, and a top-edge soft gradient separator.
 * 5-column responsive layout: brand + contact, plus four navigation groups.
 *
 * Phase 9R real-routes: every link goes to a real route.
 * Phase 9Q: 5-column layout, link groups.
 * UI-Upgrade: dark surface, gradient headings, premium spacing.
 */

import Link from 'next/link';
import { t } from '@/i18n/vi';

interface ColumnLink {
  label: string;
  href: string;
}

interface Column {
  heading: string;
  links: ColumnLink[];
}

const ABOUT_COLUMN: Column = {
  heading: 'Về CaLedo',
  links: [
    { label: 'Giới thiệu', href: '/about' },
    { label: 'Cách hoạt động', href: '/how-it-works' },
    { label: t('nav.label.safety'), href: '/safety' },
    { label: 'Câu hỏi thường gặp', href: '/faq' },
  ],
};

const WORKER_COLUMN: Column = {
  heading: 'Người lao động',
  links: [
    { label: 'Tìm ca làm', href: '/shifts' },
    { label: 'Hồ sơ & điểm uy tín', href: '/worker/reputation-guide' },
    { label: 'Lịch cá nhân', href: '/worker/schedule' },
    { label: 'Quy định huỷ ca', href: '/worker/cancellation-policy' },
  ],
};

const EMPLOYER_COLUMN: Column = {
  heading: 'Nhà tuyển dụng',
  links: [
    { label: 'Đăng ca tuyển', href: '/employer/shifts/new' },
    { label: 'Quản lý ứng viên', href: '/employer/dashboard' },
    { label: 'Đảm bảo thanh toán', href: '/employer/payments' },
    { label: 'Đánh giá sau ca', href: '/employer/reviews' },
  ],
};

const LEGAL_COLUMN: Column = {
  heading: 'Pháp lý & Hỗ trợ',
  links: [
    { label: t('nav.label.userGuide'), href: '/user-guide' },
    { label: 'Điều khoản sử dụng', href: '/terms' },
    { label: 'Chính sách bảo mật', href: '/privacy' },
    { label: 'Xử lý tranh chấp', href: '/disputes' },
    { label: 'Liên hệ hỗ trợ', href: '/support' },
  ],
};

const COLUMNS: Column[] = [
  ABOUT_COLUMN,
  WORKER_COLUMN,
  EMPLOYER_COLUMN,
  LEGAL_COLUMN,
];

// Social link icons
function GlobeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m2 7 10 7 10-7" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer
      className="mt-auto relative"
      style={{
        background: 'linear-gradient(180deg, #0a1120 0%, #080d14 100%)',
        borderTop: '1px solid rgba(51, 90, 140, 0.2)',
      }}
    >
      {/* Top gradient fade — blends into the page content above */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(249, 115, 22, 0.4) 50%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Subtle orange glow in top-left corner */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(249, 115, 22, 0.6), transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Column 1 — brand + contact */}
          <div className="lg:col-span-1">
            {/* Logo */}
            <Link href="/" className="group inline-flex flex-col leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:rounded">
              <span
                className="text-xl font-extrabold tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                CaLẻ / Now
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                by CaLedo Tech
              </span>
            </Link>

            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Kết nối ca làm ngắn hạn an toàn, minh bạch và linh hoạt cho người lao động và nhà tuyển dụng tại Việt Nam.
            </p>

            {/* Contact */}
            <ul className="mt-5 flex flex-col gap-2.5">
              <li className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-400">
                  <MailIcon />
                </span>
                <a
                  href="mailto:support@caledo.vn"
                  className="hover:text-orange-400 transition-colors duration-150"
                >
                  support@caledo.vn
                </a>
              </li>
              <li className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-400">
                  <GlobeIcon />
                </span>
                <span>Hà Nội, Việt Nam · Hotline: <span className="font-medium text-slate-300">1900 3636</span></span>
              </li>
            </ul>

            {/* Trust badge */}
            <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 ring-1 ring-orange-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" aria-hidden="true" />
              <span className="text-[11px] font-semibold text-orange-400">Đang hoạt động</span>
            </div>
          </div>

          {/* Columns 2–5 — link groups */}
          {COLUMNS.map((col) => (
            <FooterColumn key={col.heading} column={col} />
          ))}
        </div>

        {/* Divider */}
        <div
          className="mt-12 border-t"
          style={{ borderColor: 'rgba(51, 90, 140, 0.2)' }}
        />

        {/* Bottom row */}
        <div className="mt-6 flex flex-col items-start justify-between gap-3 text-xs sm:flex-row sm:items-center">
          <p className="text-slate-500">© 2026 CaLedo Tech. All rights reserved.</p>
          <p className="text-slate-600">
            Made with <span className="text-orange-500">♥</span> in Hà Nội · Phiên bản dùng thử
          </p>
        </div>

        {/* Demo data note */}
        <p
          className="mt-4 rounded-xl px-4 py-2.5 text-center text-[11px] leading-relaxed"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            color: 'rgba(252, 211, 77, 0.7)',
            border: '1px solid rgba(245, 158, 11, 0.12)',
          }}
        >
          Dữ liệu demo đang lưu trên trình duyệt. Xóa cache sẽ mất dữ liệu.
        </p>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------

function FooterColumn({ column }: { column: Column }) {
  return (
    <div>
      <p
        className="text-[11px] font-bold uppercase tracking-widest"
        style={{
          background: 'linear-gradient(135deg, #fb923c, #f97316)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {column.heading}
      </p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {column.links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-slate-400 transition-colors duration-150 hover:text-orange-400"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
