import Link from 'next/link';
import { t } from '@/i18n/vi';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm font-semibold text-orange-600">{t('site.name')}</p>
          <p className="text-xs text-gray-400">{t('site.tagline')}</p>
          <nav className="flex gap-4 text-xs text-gray-500" aria-label="Footer">
            <Link href="/" className="hover:text-orange-600 hover:underline">
              {t('nav.home')}
            </Link>
            <Link href="/shifts" className="hover:text-orange-600 hover:underline">
              {t('nav.shifts')}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
