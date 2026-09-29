/**
 * Giao diện sáng / tối. Lưu ở cookie `cale.theme`; root layout đọc cookie và
 * đặt `<html data-theme>` ngay khi render ở server (không nháy trắng). Màu tối
 * định nghĩa trong `src/app/globals.css` (khối `:root[data-theme="dark"]`).
 */

export type Theme = 'light' | 'dark';
export const THEME_COOKIE = 'cale.theme';

export function normalizeTheme(value: string | undefined | null): Theme {
  return value === 'dark' ? 'dark' : 'light';
}
