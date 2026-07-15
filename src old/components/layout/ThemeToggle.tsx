'use client';

/**
 * ThemeToggle — Light / Dark mode toggle button.
 *
 * Reads the current theme from `data-theme` on `<html>` and toggles
 * between "light" (default, no attribute or data-theme="light") and
 * "dark" (data-theme="dark"). Persists preference in localStorage so
 * the user's choice survives a reload.
 *
 * The initial theme is applied via an inline <script> in layout.tsx
 * (before React hydrates) to avoid FOUC. This component only handles
 * subsequent user-driven toggles.
 *
 * Animated sun ↔ moon icon transition with smooth rotate+scale.
 */

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function SunIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Sync with the document theme on mount (could differ if localStorage
  // had a saved preference applied by the inline script).
  useEffect(() => {
    const saved = localStorage.getItem('cale-theme') as Theme | null;
    const current = document.documentElement.getAttribute('data-theme') as Theme | null;
    setTheme(saved ?? current ?? 'light');
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cale-theme', next);
  }

  // Render a placeholder that matches the icon size to avoid layout shift
  // during SSR / before mount.
  if (!mounted) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-lg" aria-hidden="true" />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
      className={[
        'relative flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-lg',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
        isDark
          ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 ring-1 ring-amber-500/20'
          : 'bg-slate-100 text-slate-500 hover:bg-orange-100 hover:text-orange-600',
      ].join(' ')}
    >
      {/* Icon container with smooth flip transition */}
      <span
        className="flex items-center justify-center"
        style={{
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(30deg) scale(0.9)',
          transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease',
          position: 'absolute',
          opacity: isDark ? 1 : 0,
        }}
      >
        <MoonIcon />
      </span>
      <span
        className="flex items-center justify-center"
        style={{
          transform: isDark ? 'rotate(-30deg) scale(0.9)' : 'rotate(0deg) scale(1)',
          transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease',
          position: 'absolute',
          opacity: isDark ? 0 : 1,
        }}
      >
        <SunIcon />
      </span>
    </button>
  );
}
