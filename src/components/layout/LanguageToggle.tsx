'use client';

/**
 * Nút chuyển Tiếng Việt / English. Ghi cookie `cale.lang` (1 năm) rồi
 * `router.refresh()` để server component + layout render lại theo ngôn ngữ mới
 * (không tải lại cả trang, giữ nguyên dữ liệu đang có trên client).
 */

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { useLocale } from '@/i18n/LocaleProvider';
import { LOCALE_COOKIE, type Locale } from '@/i18n/locale';

const ONE_YEAR = 60 * 60 * 24 * 365;

export function LanguageToggle({ className = '' }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next: Locale = locale === 'vi' ? 'en' : 'vi';

  function switchLocale() {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={pending}
      lang={next}
      aria-label={next === 'en' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-lg px-2 text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60 ${className}`}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9s1.3-6.3 3.8-9z" />
      </svg>
      <span aria-hidden="true">{next === 'en' ? 'EN' : 'VI'}</span>
    </button>
  );
}
