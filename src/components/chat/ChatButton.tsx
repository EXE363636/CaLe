'use client';

/**
 * Nút mở khung chat (0035) kèm số tin chưa đọc. Số chưa đọc không chỉ dựa vào
 * màu: luôn có chữ cho trình đọc màn hình ("2 tin chưa đọc").
 */

import { forwardRef } from 'react';

import { buttonClassName, type ButtonVariant } from '@/components/ui';
import { useT } from '@/i18n/LocaleProvider';

interface ChatButtonProps {
  label: string;
  /** Tên đầy đủ cho trình đọc màn hình (vd. "Nhắn tin với Nguyễn An"). */
  ariaLabel?: string;
  unread?: number;
  expanded?: boolean;
  controls?: string;
  variant?: ButtonVariant;
  onClick: () => void;
}

export const ChatButton = forwardRef<HTMLButtonElement, ChatButtonProps>(function ChatButton(
  { label, ariaLabel, unread = 0, expanded, controls, variant = 'secondary', onClick },
  ref,
) {
  const t = useT();
  const unreadText = unread > 0 ? t('chat.unread').replace('{count}', String(unread)) : '';
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={ariaLabel ? [ariaLabel, unreadText].filter(Boolean).join(', ') : undefined}
      className={buttonClassName(variant, 'md', 'inline-flex items-center gap-2')}
    >
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M3.43 2.524A41.29 41.29 0 0110 2c2.236 0 4.43.18 6.57.524 1.437.231 2.43 1.49 2.43 2.902v5.148c0 1.413-.993 2.67-2.43 2.902a41.202 41.202 0 01-5.183.501.78.78 0 00-.528.224l-3.579 3.58A.75.75 0 016 17.25v-3.443a41.033 41.033 0 01-2.57-.33C1.993 13.244 1 11.986 1 10.574V5.426c0-1.413.993-2.67 2.43-2.902z"
          clipRule="evenodd"
        />
      </svg>
      <span>{label}</span>
      {unread > 0 && (
        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
          <span aria-hidden="true">{unread > 99 ? '99+' : unread}</span>
          {!ariaLabel && <span className="sr-only">{unreadText}</span>}
        </span>
      )}
    </button>
  );
});
