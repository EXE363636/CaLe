'use client';

/**
 * Tab "Hộp thư" của bong bóng hỗ trợ — CHỈ hiện khi đã đăng nhập. Hai mục:
 *   1. Tin nhắn: cuộc trò chuyện theo đơn ứng tuyển (0035) — tên người kia, tên ca,
 *      tin cuối, số chưa đọc. Bấm → khung chat trên trang chi tiết ca (`chatLink`,
 *      cùng deeplink với thông báo).
 *   2. Thông báo: 10 thông báo gần nhất từ `notificationStore`, dùng lại dòng
 *      `NotificationItem` và `handleNotificationClick` của chuông (đánh dấu đã đọc
 *      + điều hướng đúng ngữ cảnh). Thông báo chat trùng dòng chat bị ẩn — quy tắc
 *      ở `inboxRules.ts`.
 *
 * Dữ liệu qua store (demo: localStorage; production: RPC). Nạp lại cuộc trò
 * chuyện khi tab được mở; không polling.
 */

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { NotificationItem } from '@/components/layout/NotificationBell';
import { useT } from '@/i18n/LocaleProvider';
import { handleNotificationClick } from '@/lib/notificationAction';
import { chatLink } from '@/lib/notificationTarget';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useNotificationStore } from '@/stores/notificationStore';

import { INBOX_NOTIFICATION_LIMIT, inboxNotifications } from './inboxRules';

export interface SupportInboxProps {
  userId: string;
  /** Tab đang hiện → nạp lại danh sách cuộc trò chuyện. */
  active: boolean;
  /** Gọi khi người dùng chọn một mục (đóng khung hỗ trợ). */
  onNavigate: () => void;
}

const FOCUS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2';

export function SupportInbox({ userId, active, onNavigate }: SupportInboxProps) {
  const t = useT();
  const baseId = useId();
  const msgId = `${baseId}-messages`;
  const noteId = `${baseId}-notifications`;
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const threads = useChatStore((s) => s.threads);
  const loadThreads = useChatStore((s) => s.loadThreads);
  const allNotifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  // Mốc "bây giờ" cho giờ tương đối — đọc lại mỗi lần mở tab (không chạy đồng hồ).
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());

  const reload = useCallback(() => {
    setStatus('loading');
    loadThreads(userId, () => isCurrentUser(userId))
      .then(() => setStatus('idle'))
      .catch(() => setStatus('error'));
  }, [userId, loadThreads]);

  useEffect(() => {
    if (!active) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nạp lại khi tab được mở
    setNowIso(new Date().toISOString());
    reload();
  }, [active, reload]);

  const notifications = useMemo(
    () => inboxNotifications(allNotifications, userId, threads),
    [allNotifications, userId, threads],
  );
  const recent = notifications.slice(0, INBOX_NOTIFICATION_LIMIT);
  const unreadNotes = notifications.some((n) => !n.read);

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby={msgId} className="min-w-0">
        <h3 id={msgId} className="mb-2 text-sm font-bold text-gray-900">
          {t('supportBubble.inbox.messages')}
        </h3>
        {status === 'error' && threads.length === 0 ? (
          <div className="flex flex-col items-start gap-1 text-sm text-gray-700" role="alert">
            <p>{t('supportBubble.threads.error')}</p>
            <button
              type="button"
              onClick={reload}
              className={`inline-flex min-h-11 items-center rounded font-semibold text-orange-700 underline underline-offset-4 ${FOCUS}`}
            >
              {t('supportBubble.threads.retry')}
            </button>
          </div>
        ) : threads.length === 0 ? (
          <p className="text-sm text-gray-700" aria-busy={status === 'loading'}>
            {status === 'loading' ? t('chat.loading') : t('supportBubble.threads.empty')}
          </p>
        ) : (
          <ul aria-label={t('supportBubble.threads.listLabel')} className="flex flex-col gap-2">
            {threads.map((th) => {
              const href = chatLink(th.myRole, th.shiftId, th.applicationId) ?? '/';
              const name = th.otherName || t('supportBubble.threads.unknownName');
              const preview = th.lastBody
                ? `${th.lastSenderId === userId ? `${t('chat.sender.me')}: ` : ''}${th.lastBody}`
                : t('supportBubble.threads.noMessages');
              const unreadText = th.unread > 0 ? t('chat.unread').replace('{count}', String(th.unread)) : '';
              return (
                <li key={th.applicationId} className="min-w-0">
                  <Link
                    href={href}
                    onClick={onNavigate}
                    className={[
                      'flex min-h-11 min-w-0 items-start gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5',
                      'hover:border-orange-300 hover:bg-orange-50',
                      FOCUS,
                    ].join(' ')}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`min-w-0 text-[15px] leading-snug text-gray-900 [overflow-wrap:anywhere] ${th.unread > 0 ? 'font-bold' : 'font-semibold'}`}>
                          {name}
                        </span>
                        {th.access === 'readonly' && (
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                            {t('supportBubble.threads.closed')}
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-medium leading-snug text-gray-700 [overflow-wrap:anywhere]">{th.shiftTitle}</span>
                      {/* Ngoại lệ duy nhất: tin cuối có thể dài → tối đa 2 dòng. */}
                      <span className="line-clamp-2 text-sm leading-snug text-gray-600 [overflow-wrap:anywhere]">{preview}</span>
                    </span>
                    {th.unread > 0 && (
                      <span className="mt-0.5 inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                        <span aria-hidden="true">{th.unread > 99 ? '99+' : th.unread}</span>
                        <span className="sr-only">{unreadText}</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby={noteId} className="min-w-0">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 id={noteId} className="text-sm font-bold text-gray-900">
            {t('supportBubble.inbox.notifications')}
          </h3>
          {unreadNotes && (
            <button
              type="button"
              onClick={() => markAllRead(userId)}
              className={`inline-flex min-h-11 items-center rounded px-1 text-xs font-medium text-orange-700 underline underline-offset-4 ${FOCUS}`}
            >
              {t('btn.markAllRead')}
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-700">{t('supportBubble.inbox.noNotifications')}</p>
        ) : (
          <ul className="-mx-4 divide-y divide-gray-100">
            {recent.map((n) => (
              <li key={n.id}>
                <NotificationItem
                  notification={n}
                  nowIso={nowIso}
                  clampBody={false}
                  onActivate={() => {
                    handleNotificationClick(n, { markRead, router, pathname });
                    if (n.link) onNavigate();
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Kết quả nạp về muộn của tài khoản cũ bị bỏ (đăng xuất / đổi tài khoản giữa chừng). */
function isCurrentUser(userId: string): boolean {
  return useAuthStore.getState().currentUserId === userId;
}
