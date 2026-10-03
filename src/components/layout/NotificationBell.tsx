'use client';

import { useState, useRef, useEffect, useMemo, useId } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useCurrentRole } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { handleNotificationClick } from '@/lib/notificationAction';
import { resolveNotificationTarget } from '@/lib/notificationTarget';
import { formatNotificationTime } from '@/lib/notificationTime';
import { useLocale, useT, useTx } from '@/i18n/LocaleProvider';
import type { Notification } from '@/types';

function BellIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 37.75 37.75 0 01-4.496 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function NotificationBell() {
  const t = useT();
  const [open, setOpen] = useState(false);
  // Mốc giờ cho "25 phút trước" — đọc lại mỗi lần mở danh sách (không chạy đồng hồ).
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const currentUserId = useAuthStore((s) => s.currentUserId);
  const role = useCurrentRole();
  const allNotifications = useNotificationStore((s) => s.notifications);
  const notifications = useMemo(
    () =>
      currentUserId
        ? allNotifications.filter((n) => n.userId === currentUserId)
        : [],
    [allNotifications, currentUserId],
  );
  const unread = useMemo(
    () => notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
    [notifications],
  );
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  // Close dropdown on logout (currentUserId becomes null) or any route change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional close-on-logout/route-change for the notification dropdown; refactor would change dismissal behavior
    setOpen(false);
  }, [currentUserId, pathname]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const recent = useMemo(
    () =>
      notifications
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 10),
    [notifications],
  );

  if (!currentUserId) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => {
          if (!open) setNowIso(new Date().toISOString());
          setOpen((v) => !v);
        }}
        aria-label={t('nav.notifications')}
        aria-expanded={open}
        className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        <BellIcon className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white shadow-modal sm:w-96"
          role="dialog"
          aria-label={t('nav.notifications')}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">
              {t('nav.notifications')}
            </span>
            {unread > 0 && (
              <button
                onClick={() => {
                  markAllRead(currentUserId);
                }}
                className="text-xs text-orange-700 hover:underline"
              >
                {t('btn.markAllRead')}
              </button>
            )}
          </div>

          {/* List */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {recent.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-gray-400">
                {t('notification.empty')}
              </li>
            ) : (
              recent.map((n: Notification) => (
                <li key={n.id}>
                  <NotificationItem
                    notification={n}
                    nowIso={nowIso}
                    onActivate={() => {
                      // Thông báo phía server (0031) không mang link — đích tuỳ vai trò
                      // người nhận, nên tra lúc bấm theo vai trò hiện tại.
                      const target =
                        n.source === 'server' && !n.link
                          ? { ...n, link: resolveNotificationTarget(n, role ?? undefined) }
                          : n;
                      handleNotificationClick(target, {
                        markRead,
                        router,
                        pathname,
                      });
                      setOpen(false);
                    }}
                  />
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onActivate,
  nowIso,
}: {
  notification: Notification;
  onActivate: () => void;
  /** Mốc "bây giờ" đọc một lần khi mở danh sách. */
  nowIso: string;
}) {
  const locale = useLocale();
  const tx = useTx();
  const descId = useId();
  // 03/10 — chưa đọc: chấm cam + tiêu đề đậm (không tô nền cả dòng); giờ tương đối
  // ("25 phút trước", "Hôm qua 16:05", "10/07") thay giờ đầy đủ chữ đơn cách.
  const unread = !notification.read;
  const content = (
    <div className="flex gap-3 px-4 py-3 text-sm transition-colors hover:bg-orange-50">
      <span
        className={['mt-1.5 h-2 w-2 shrink-0 rounded-full', unread ? 'bg-orange-500' : 'bg-transparent'].join(' ')}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-3">
          <span className={['min-w-0 text-gray-900', unread ? 'font-semibold' : 'font-medium'].join(' ')}>{notification.title}</span>
          {/* CORE-STABILITY-6 Part 2 — show when the notification fired. */}
          <time dateTime={notification.createdAt} className="shrink-0 text-xs text-gray-500 tabular-nums">
            {formatNotificationTime(notification.createdAt, nowIso, locale)}
          </time>
        </p>
        <p className="mt-0.5 line-clamp-2 text-gray-600">{notification.body}</p>
        {/* Tên nút là tiêu đề; mô tả cho trình đọc màn hình: trạng thái chưa đọc (không chỉ
            dựa vào chấm cam / chữ đậm) + giờ + nội dung. */}
        <span id={descId} className="sr-only">
          {[unread ? tx('Chưa đọc') : '', formatNotificationTime(notification.createdAt, nowIso, locale), notification.body]
            .filter(Boolean)
            .join('. ')}
        </span>
      </div>
    </div>
  );

  // Phase 9N: a single `<button>` for both "has link" and "no link"
  // notifications. The shared `handleNotificationClick` helper either
  // dispatches a same-page event, calls `router.push`, or just marks
  // read — depending on the link target. Avoids the prior split between
  // `<Link>` and `<button>` that bypassed our same-page handoff.
  return (
    <button
      type="button"
      onClick={onActivate}
      className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-inset"
      aria-label={notification.title}
      aria-describedby={descId}
    >
      {content}
    </button>
  );
}
