/**
 * AuthSidePanel — Phase 9 visual polish.
 *
 * Side trust/benefit panel rendered next to the login or register form on
 * `lg+` screens. Below `lg` it collapses to a thin brand banner so mobile
 * users still get a hint of identity without cramming the auth card.
 *
 * Pure presentational. No store reads, no router. Imports `t()` only.
 */

import Link from 'next/link';
import { t } from '@/i18n/vi';

interface AuthSidePanelProps {
  mode: 'login' | 'register';
}

export function AuthSidePanel({ mode }: AuthSidePanelProps) {
  const items = [
    {
      title: t('auth.side.benefit1'),
      desc: t('auth.side.benefit1.desc'),
      icon: (
        <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3 4 6v6c0 4.5 3.2 8.5 8 9 4.8-.5 8-4.5 8-9V6l-8-3z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      title: t('auth.side.benefit2'),
      desc: t('auth.side.benefit2.desc'),
      icon: (
        <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 7c0-1.1.9-2 2-2h12l4 4v8c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V7Z" />
          <path d="M16 11h4M16 14h4" />
        </svg>
      ),
    },
    {
      title: t('auth.side.benefit3'),
      desc: t('auth.side.benefit3.desc'),
      icon: (
        <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="m12 2 3 7 7 .5-5.5 4.5L18 21l-6-3.5L6 21l1.5-7L2 9.5 9 9z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="hidden lg:block">
      {/* Brand palette — the entry panel uses the brand DARK ink
          (gray-900, remapped to #37373B in globals) as a solid surface so
          its white/light text stays high-contrast (white on the light
          #FF9A5F primary would fail). Warmth is carried by the coral/peach
          decorative blobs below, kept on-palette (no off-palette amber). */}
      <div className="relative overflow-hidden rounded-3xl bg-gray-900 p-8 text-white shadow-xl">
        {/* Decorative blobs */}
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-orange-200/20 blur-3xl" aria-hidden="true" />

        <div className="relative">
          <Link href="/" className="inline-flex text-2xl font-extrabold tracking-tight">
            {t('site.name')}
          </Link>
          <p className="mt-3 text-base font-medium text-orange-50">
            {mode === 'login' ? t('auth.side.welcome') : t('auth.side.join')}
          </p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-orange-100">
            {mode === 'login' ? t('auth.side.welcome.desc') : t('auth.side.join.desc')}
          </p>

          <ul className="mt-8 flex flex-col gap-5">
            {items.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  {item.icon}
                </span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-xs text-orange-100">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-xs text-orange-100">
            {t('auth.side.disclaimer')}
          </p>
        </div>
      </div>
    </aside>
  );
}
