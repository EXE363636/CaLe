'use client';

/**
 * DashboardNotificationCard (Phase 9M, refactored Phase 9N).
 *
 * In-dashboard notification list item used by the worker and employer
 * dashboards' right rail. Click behavior is delegated to the shared
 * {@link handleNotificationClick} helper so the bell dropdown and the
 * dashboard cards stay in lock-step.
 *
 * The card stays a native `<button>` so keyboard `Enter` / `Space`
 * activates the click and the focus ring is visible to keyboard users.
 * A "Xem chi tiết →" affordance hovers in only when the notification
 * actually has a `link`.
 */

import { usePathname, useRouter } from 'next/navigation';
import { handleNotificationClick } from '@/lib/notificationAction';
import { formatLogDateTime } from '@/lib/format';
import { t } from '@/i18n/vi';
import type { Notification } from '@/types';

interface DashboardNotificationCardProps {
  notification: Notification;
  /** Called whenever the user clicks the card (whether it navigates or not). */
  onRead: (id: string) => void;
}

export function DashboardNotificationCard({
  notification,
  onRead,
}: DashboardNotificationCardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActionable = Boolean(notification.link);

  function handleClick() {
    handleNotificationClick(notification, {
      markRead: onRead,
      router,
      pathname,
    });
  }

  const cardClasses = [
    'group flex w-full flex-col px-4 py-3 text-left text-sm transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-inset',
    !notification.read ? 'bg-orange-50' : '',
    isActionable ? 'cursor-pointer hover:bg-orange-100/60' : 'cursor-default',
  ].join(' ');

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cardClasses}
      aria-label={notification.title}
    >
      <p className="font-medium text-gray-900">{notification.title}</p>
      <p className="mt-0.5 text-xs text-gray-600">{notification.body}</p>
      {/* CORE-STABILITY-6 Part 2 — timestamp so the user knows when it fired. */}
      <p className="mt-1 font-mono text-[11px] text-gray-400">
        {formatLogDateTime(notification.createdAt)}
      </p>
      {isActionable && (
        <span
          aria-hidden="true"
          className="mt-1 inline-flex items-center text-[11px] font-medium text-orange-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {t('notification.viewDetail')} →
        </span>
      )}
    </button>
  );
}
