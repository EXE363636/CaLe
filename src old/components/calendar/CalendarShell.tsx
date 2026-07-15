import type { ReactNode } from 'react';

interface CalendarShellProps {
  /** Left-rail content (mini-month, legend, optional CTAs). */
  sidebar: ReactNode;
  /** Top toolbar content (date title, view switcher, range nav). */
  toolbar: ReactNode;
  /** Main body — typically a Day / Week / Agenda view. */
  body: ReactNode;
  /** Optional extra classes appended to the outer wrapper. */
  className?: string;
}

/**
 * Presentational two-column layout for the Phase 8 calendar pages.
 *
 * Layout:
 *   - Below `lg`: stacked. Sidebar on top, main column below — better for
 *     phones / tablets where horizontal real estate is scarce.
 *   - At `lg` and up: two columns. Fixed-width sidebar on the left, main
 *     column (toolbar + body) takes the remaining space.
 *
 * The body is wrapped in `overflow-x-auto` so wide week / day timetables
 * (which use `min-w-[720px]` per the timetable convention) can scroll
 * horizontally without forcing the whole page to scroll. `min-w-0` on the
 * flex child is required for that overflow to take effect inside a
 * flex row — otherwise intrinsic-width children stretch the column.
 *
 * No store reads, no routing, no i18n calls. All visible text comes from
 * the slot props the parent supplies. Safe to render inside a React
 * Server Component (no `'use client'` needed) so the parent page picks
 * the boundary.
 */
export function CalendarShell({
  sidebar,
  toolbar,
  body,
  className,
}: CalendarShellProps) {
  return (
    <div
      className={[
        'flex flex-col gap-4 lg:flex-row lg:gap-6',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <aside
        aria-label="Calendar sidebar"
        className="w-full lg:w-72 lg:shrink-0"
      >
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="w-full">{toolbar}</div>
        <div className="w-full overflow-x-auto">{body}</div>
      </div>
    </div>
  );
}
