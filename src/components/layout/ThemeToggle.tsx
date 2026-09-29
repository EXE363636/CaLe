'use client';

/**
 * Nút giao diện sáng / tối. Đổi `<html data-theme>` ngay (không cần tải lại) và
 * ghi cookie `cale.theme` (1 năm) để lần sau server render đúng giao diện.
 */

import { useSyncExternalStore } from 'react';

import { useLocale } from '@/i18n/LocaleProvider';
import { normalizeTheme, THEME_COOKIE, type Theme } from '@/lib/theme';

const ONE_YEAR = 60 * 60 * 24 * 365;

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function currentTheme(): Theme {
  return normalizeTheme(document.documentElement.dataset.theme);
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'light' as Theme);
  const en = useLocale() === 'en';
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label =
    next === 'dark'
      ? en ? 'Switch to dark mode' : 'Chuyển sang giao diện tối'
      : en ? 'Switch to light mode' : 'Chuyển sang giao diện sáng';

  function toggle() {
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-700 hover:bg-orange-50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${className}`}
    >
      {next === 'dark' ? (
        // Mặt trăng — bấm để sang tối
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        </svg>
      ) : (
        // Mặt trời — bấm để sang sáng
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
