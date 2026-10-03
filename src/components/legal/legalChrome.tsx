/**
 * Phần lặp lại của ba trang pháp lý (03/10): thanh chuyển tài liệu, dòng "áp dụng cho",
 * thẻ "Còn thắc mắc?" và hai thẻ "Đọc tiếp". Dựng bằng `tx` của trang (server).
 *
 * Email / hotline / giờ trực: CÙNG giá trị với `/support` và chân trang
 * (`components/layout/Footer.tsx`). Đổi ở đó thì đổi cả ở đây.
 */

import type { ComponentProps } from 'react';

import type { LegalDoc, LegalEnd } from '@/components/landing/LegalArticle';
import type { TFunction } from '@/i18n/locale';

const SUPPORT_EMAIL = 'nguyenphuonganh98113@gmail.com';
const SUPPORT_HOTLINE = '0868325698';

export function legalChrome(tx: TFunction, current: LegalDoc, live: boolean) {
  const all: Array<{ doc: LegalDoc; href: string; label: string; title: string; body: string }> = [
    {
      doc: 'terms',
      href: '/terms',
      label: tx('Điều khoản'),
      title: tx('Điều khoản sử dụng'),
      body: tx('Phạm vi dịch vụ, tài khoản, hành vi không được phép và giữ cọc.'),
    },
    {
      doc: 'privacy',
      href: '/privacy',
      label: tx('Bảo mật'),
      title: tx('Chính sách bảo mật'),
      body: tx('Thông tin CaLẻ thu thập, cách dùng và quyền của bạn với dữ liệu.'),
    },
    {
      doc: 'disputes',
      href: '/disputes',
      label: tx('Tranh chấp'),
      title: tx('Chính sách xử lý tranh chấp'),
      body: tx('Khi nào nên mở yêu cầu, quy trình xem xét và cách phản hồi quyết định.'),
    },
  ];

  const end: ComponentProps<typeof LegalEnd> = {
    title: tx('Còn thắc mắc?'),
    body: tx('Hotline trực 08:00 – 20:00, Thứ Hai đến Thứ Bảy. Email được phản hồi trong vòng 24 giờ vào các ngày làm việc.'),
    email: SUPPORT_EMAIL,
    hotline: SUPPORT_HOTLINE,
    supportLabel: tx('Trang liên hệ hỗ trợ'),
    nextLabel: tx('Đọc tiếp'),
    next: all.filter((d) => d.doc !== current).map((d) => ({ href: d.href, title: d.title, body: d.body })),
  };

  return {
    docs: all.map(({ doc, href, label }) => ({ doc, href, label })),
    switcherLabel: tx('Tài liệu pháp lý'),
    eyebrow: tx('Pháp lý'),
    appliesTo: live ? tx('Áp dụng cho: bản thử nghiệm giới hạn (Beta)') : tx('Áp dụng cho: bản dùng thử'),
    sectionCount: (n: number) => tx('{n} mục').replace('{n}', String(n)),
    tocLabel: tx('Mục lục'),
    end,
  };
}
