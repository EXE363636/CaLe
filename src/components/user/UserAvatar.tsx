/**
 * UserAvatar
 *
 * Renders a profile photo when `avatarUrl` is provided, otherwise falls back
 * to a coloured circle showing the user's initials (up to 2 letters).
 *
 * The background colour is deterministic: it is derived from the char-code of
 * the first character of `name` so the same name always produces the same
 * colour across renders and sessions.
 *
 * No hooks → no 'use client' needed.
 */

import { getUserInitials } from '@/lib/initials';

export interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

// Tinted fill + deep ink of the same hue (DESIGN.md status-pair pattern).
// White initials on *-400 fills measured 2–2.6:1 (fails WCAG AA); these
// pairs all clear 4.5:1.
// P1 feedback F2 — chỉ họ màu thương hiệu (cam / mực): bỏ xanh dương, xanh
// lá, tím, hồng, xanh ngọc — các màu đó dành cho trạng thái, không trang trí.
const bgColors = [
  'bg-orange-100 text-orange-800',
  'bg-orange-200 text-gray-900',
  'bg-gray-200 text-gray-900',
  'bg-gray-900 text-white',
];

function getInitials(name: string): string {
  return getUserInitials(name);
}

function getBgColor(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return bgColors[code % bgColors.length];
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const sizeClasses = sizeMap[size];
  const base = `inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden ${sizeClasses} ${className}`;

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={`${base} object-cover`}
      />
    );
  }

  const initials = getInitials(name);
  const bg = getBgColor(name);

  return (
    <span className={`${base} ${bg} font-semibold select-none`}>
      {initials}
    </span>
  );
}
