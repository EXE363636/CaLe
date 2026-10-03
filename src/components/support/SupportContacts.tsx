'use client';

/**
 * Kênh liên hệ đội hỗ trợ CaLẻ (tab "Liên hệ" của bong bóng hỗ trợ, và hiện kèm
 * câu trả lời của trợ lý khi không trả lời được / người dùng muốn gặp người thật).
 *
 * Hotline (`tel:`), phiếu hỗ trợ (`mailto:` có sẵn tiêu đề + mã tài khoản / email
 * + trang đang xem), Facebook, Zalo. Hằng số ở `lib/contact.ts`. Liên kết ngoài mở
 * tab mới với `rel="noopener noreferrer"`.
 */

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { useLocale, useT } from '@/i18n/LocaleProvider';
import { FACEBOOK_URL, SUPPORT_HOTLINE, ZALO_URL, supportMailto, telHref } from '@/lib/contact';
import { useCurrentUser } from '@/stores/authStore';

interface ContactRow {
  key: string;
  href: string;
  label: string;
  sub: string;
  icon: ReactNode;
  external?: boolean;
}

const ICON = 'h-5 w-5';

function PhoneIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21h2.9z" />
    </svg>
  );
}

function ZaloIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
      <path d="M8 9h4l-4 4h4" />
      <path d="M15 9v4" />
    </svg>
  );
}

export interface SupportContactsProps {
  /** Bản gọn (kèm câu trả lời của trợ lý): không có đoạn giới thiệu, hàng thấp hơn. */
  compact?: boolean;
  /**
   * Câu người dùng vừa hỏi trợ lý — điền sẵn vào phiếu hỗ trợ để đội hỗ trợ có ngữ
   * cảnh, người dùng không phải kể lại.
   */
  question?: string | null;
}

export function SupportContacts({ compact = false, question }: SupportContactsProps) {
  const t = useT();
  const locale = useLocale();
  const pathname = usePathname() ?? '';
  const user = useCurrentUser();

  const rows: ContactRow[] = [
    {
      key: 'hotline',
      href: telHref(SUPPORT_HOTLINE),
      label: t('supportBubble.contact.hotline'),
      sub: SUPPORT_HOTLINE,
      icon: <PhoneIcon />,
    },
    {
      key: 'ticket',
      href: supportMailto({ userId: user?.id, email: user?.email, path: pathname, locale, question }),
      label: t('supportBubble.contact.ticket'),
      sub: t('supportBubble.contact.ticketSub'),
      icon: <MailIcon />,
    },
    {
      key: 'facebook',
      href: FACEBOOK_URL,
      label: t('supportBubble.contact.facebook'),
      sub: t('supportBubble.contact.facebookSub'),
      icon: <FacebookIcon />,
      external: true,
    },
    {
      key: 'zalo',
      href: ZALO_URL,
      label: t('supportBubble.contact.zalo'),
      sub: t('supportBubble.contact.zaloSub'),
      icon: <ZaloIcon />,
      external: true,
    },
  ];

  return (
    <div className="min-w-0">
      {!compact && <p className="mb-3 text-[15px] leading-relaxed text-gray-700">{t('supportBubble.contact.intro')}</p>}
      {/* Một cột, mỗi kênh một hàng rộng: chữ xuống dòng khi dài, KHÔNG cắt "…"
          (người dùng phải đọc đủ số hotline / mô tả). */}
      <ul aria-label={t('supportBubble.contact.listLabel')} className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.key} className="min-w-0">
            <a
              href={row.href}
              data-contact={row.key}
              {...(row.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className={[
                'motion-lift motion-press flex min-h-14 w-full min-w-0 items-center gap-3 rounded-2xl border border-gray-200 bg-white text-left shadow-sm',
                'hover:border-orange-300 hover:bg-orange-50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
                compact ? 'px-3 py-2' : 'px-3.5 py-3',
              ].join(' ')}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-700">
                {row.icon}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-semibold leading-snug text-gray-900 [overflow-wrap:anywhere]">
                  {row.label}
                </span>
                <span className="text-sm leading-snug text-gray-700 tabular-nums [overflow-wrap:anywhere]">{row.sub}</span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-xl leading-none text-gray-500">
                ›
              </span>
              {row.external && <span className="sr-only">{t('supportBubble.contact.newTab')}</span>}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
