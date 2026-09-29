import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  /**
   * Max content width. Most app pages use `7xl`; narrow reading pages
   * (profile forms) can opt into `4xl`/`3xl`.
   * P0 feedback F1 — `wide` (1400px) cho màn làm việc nhiều cột: dashboard
   * worker/employer, Tổng quan admin, danh sách ca — để màn ≥1440px không
   * còn hai bên lề trống lớn (NavBar rộng 1600px).
   */
  width?: 'wide' | '7xl' | '6xl' | '5xl' | '4xl' | '3xl';
  className?: string;
}

const widthClasses: Record<NonNullable<PageShellProps['width']>, string> = {
  wide: 'max-w-[1400px]',
  '7xl': 'max-w-7xl',
  '6xl': 'max-w-6xl',
  '5xl': 'max-w-5xl',
  '4xl': 'max-w-4xl',
  '3xl': 'max-w-3xl',
};

/**
 * UI-REFRESH-FROM-BOLT-REFERENCE-1 — shared page container.
 *
 * Standardises the horizontal gutter + max-width + vertical padding that
 * every app page repeats inline today. Adopting it on a page is a pure
 * visual change (no logic), and it guarantees desktop layouts use the
 * full width band consistently instead of ad-hoc per-page values.
 *
 * Bolt-inspired: mirrors the reference `AppShell` main container
 * (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`).
 */
export function PageShell({
  children,
  width = '7xl',
  className = '',
}: PageShellProps) {
  return (
    <div
      className={[
        'mx-auto w-full px-4 py-8 sm:px-6 lg:px-8',
        widthClasses[width],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
