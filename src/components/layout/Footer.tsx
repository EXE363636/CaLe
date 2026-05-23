'use client';

/**
 * Site footer (Phase 9Q rewrite, Phase 9R real-routes pass).
 *
 * 5-column responsive layout: brand + contact, plus four navigation
 * groups (about / worker / employer / legal). Stacks vertically on
 * mobile. Brand orange accent in the headings; subtle border-top so
 * the footer separates from the page chrome without a hard line.
 *
 * Phase 9R changes:
 *   - Footer is now mounted on every route (including `/admin/*`) so
 *     navigation feels consistent. The previous `usePathname()` hide
 *     left admins with no way to find legal/help links from the
 *     management screens.
 *   - Every link is a real `<Link>` to a real route. Phase 9Q's
 *     `aria-disabled` placeholder rows are gone. Static info pages
 *     (`/about`, `/how-it-works`, `/safety`, `/faq`, `/terms`,
 *     `/privacy`, `/disputes`, `/support`, `/worker/reputation-guide`,
 *     `/worker/cancellation-policy`, `/employer/payments`,
 *     `/employer/reviews`) ship in this same phase.
 *   - The MVP-disclaimer pill is gone from the public copyright row;
 *     it now reads as a real-product footer.
 *
 * Mock-only: the email / hotline / address values are placeholders
 * suitable for the MVP. The footer never sends real network requests.
 */

import Link from 'next/link';

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
    { label: 'An toàn & xác minh', href: '/safety' },
    { label: 'Câu hỏi thường gặp', href: '/faq' },
  ],
};

const WORKER_COLUMN: Column = {
  heading: 'Dành cho người lao động',
  links: [
    { label: 'Tìm ca làm', href: '/shifts' },
    { label: 'Hồ sơ & điểm uy tín', href: '/worker/reputation-guide' },
    { label: 'Lịch cá nhân', href: '/worker/schedule' },
    { label: 'Quy định huỷ ca', href: '/worker/cancellation-policy' },
  ],
};

const EMPLOYER_COLUMN: Column = {
  heading: 'Dành cho nhà tuyển dụng',
  links: [
    { label: 'Đăng ca tuyển', href: '/employer/shifts/new' },
    { label: 'Quản lý ứng viên', href: '/employer/dashboard' },
    { label: 'Đặt cọc & thanh toán', href: '/employer/payments' },
    { label: 'Đánh giá sau ca', href: '/employer/reviews' },
  ],
};

const LEGAL_COLUMN: Column = {
  heading: 'Pháp lý & hỗ trợ',
  links: [
    { label: 'Hướng dẫn sử dụng', href: '/user-guide' },
    { label: 'Điều khoản sử dụng', href: '/terms' },
    { label: 'Chính sách bảo mật', href: '/privacy' },
    { label: 'Chính sách xử lý tranh chấp', href: '/disputes' },
    { label: 'Liên hệ hỗ trợ', href: '/support' },
  ],
};

const COLUMNS: Column[] = [
  ABOUT_COLUMN,
  WORKER_COLUMN,
  EMPLOYER_COLUMN,
  LEGAL_COLUMN,
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-orange-100 bg-white/80">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Column 1 — brand + contact */}
          <div className="lg:col-span-1">
            <p className="text-base font-bold text-orange-600">
              CaLẻ / ShiftNow
            </p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-500">
              CaLedo Tech
            </p>
            <p className="mt-3 text-sm text-gray-600">
              Kết nối ca làm ngắn hạn an toàn, minh bạch và linh hoạt cho
              người lao động và nhà tuyển dụng tại Việt Nam.
            </p>
            <ul className="mt-4 flex flex-col gap-1.5 text-xs text-gray-600">
              <li>
                <span className="text-gray-400">Email: </span>
                <a
                  href="mailto:support@caledo.vn"
                  className="hover:text-orange-600 hover:underline"
                >
                  support@caledo.vn
                </a>
              </li>
              <li>
                <span className="text-gray-400">Hotline: </span>
                <span className="font-medium text-gray-700">1900 3636</span>
              </li>
              <li>
                <span className="text-gray-400">Địa chỉ: </span>
                <span>Hà Nội, Việt Nam</span>
              </li>
            </ul>
          </div>

          {/* Columns 2–5 — link groups */}
          {COLUMNS.map((col) => (
            <FooterColumn key={col.heading} column={col} />
          ))}
        </div>

        {/* Bottom row */}
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-gray-100 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center">
          <p>© 2026 CaLedo Tech. All rights reserved.</p>
          <p className="text-xs text-gray-400">
            Made with care in Hà Nội · Phiên bản dùng thử
          </p>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------

function FooterColumn({ column }: { column: Column }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
        {column.heading}
      </p>
      <ul className="mt-3 flex flex-col gap-2 text-sm text-gray-600">
        {column.links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="hover:text-orange-600 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
