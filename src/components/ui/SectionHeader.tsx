import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned actions (buttons, links). */
  actions?: ReactNode;
  /** Heading level for accessibility; defaults to h2. */
  as?: 'h2' | 'h3';
  className?: string;
}

/**
 * UI-REFRESH-FROM-BOLT-REFERENCE-1 — section heading row.
 *
 * Bolt-inspired (`PageHeader` layout): title + optional subtitle on the
 * left, optional actions on the right, stacking to one column on mobile.
 * Pure presentational; keeps Vietnamese copy passed in by the caller.
 */
export function SectionHeader({
  title,
  subtitle,
  actions,
  as: Tag = 'h2',
  className = '',
}: SectionHeaderProps) {
  return (
    <div
      className={[
        'mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="min-w-0">
        <Tag className="text-lg font-semibold text-gray-900">{title}</Tag>
        {subtitle && (
          <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
