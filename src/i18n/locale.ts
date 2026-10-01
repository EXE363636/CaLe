/**
 * Chọn ngôn ngữ hiển thị (VI / EN) — đợt 1: trang công khai.
 *
 * - Ngôn ngữ lưu ở cookie `cale.lang` ('vi' | 'en'); mặc định 'vi'.
 * - `translate(locale, key)`: EN lấy từ `en.ts`, thiếu thì rơi về tiếng Việt
 *   (chỗ chưa dịch vẫn hiện tiếng Việt, không bao giờ hiện key trống).
 * - `translateText(locale, câuViệt)`: cho chữ còn viết cứng trong code (menu,
 *   footer, bảng giá) — tra bảng `enText` theo đúng câu tiếng Việt, thiếu thì giữ
 *   nguyên. Nhờ vậy các hằng tiếng Việt (và test kiểm chúng) không phải đổi.
 * - Client component: `useT()` / `useTx()` (`LocaleProvider.tsx`). Server
 *   component: `await getT()` / `await getTx()` (`server.ts`). `t` toàn cục trong `vi.ts` vẫn luôn là tiếng Việt
 *   cho các màn chưa chuyển.
 */

import { en, enText } from './en';
import { t as tVi, vi } from './vi';

export type Locale = 'vi' | 'en';
export const LOCALES: readonly Locale[] = ['vi', 'en'];
export const DEFAULT_LOCALE: Locale = 'vi';
export const LOCALE_COOKIE = 'cale.lang';

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === 'en' ? 'en' : 'vi';
}

export type TFunction = (key: string) => string;

export function translate(locale: Locale, key: string): string {
  if (locale === 'en') {
    const value = en[key];
    if (value !== undefined) return value;
  }
  return tVi(key);
}

export function makeT(locale: Locale): TFunction {
  return (key: string) => translate(locale, key);
}

export function translateText(locale: Locale, viText: string): string {
  if (locale === 'en') return enText[viText] ?? viText;
  return viText;
}

export function makeTx(locale: Locale): TFunction {
  return (viText: string) => translateText(locale, viText);
}

/**
 * Ngôn ngữ đang hiển thị, đọc từ `<html lang>` (root layout đặt theo cookie,
 * nút VI/EN làm mới lại). Dành cho code ngoài React — `errorMap`, store — không
 * dùng được hook `useT`. Server / test (không có `document`) → tiếng Việt.
 */
export function currentLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  return normalizeLocale(document.documentElement.lang);
}

/** `t` theo ngôn ngữ đang hiển thị (xem `currentLocale`). */
export const tCurrent: TFunction = (key: string) => translate(currentLocale(), key);

/** `tx` theo ngôn ngữ đang hiển thị — chỉ dùng trong xử lý sự kiện, không trong render. */
export const txCurrent: TFunction = (viText: string) => translateText(currentLocale(), viText);

/** Khoá có trong `en.ts` nhưng không có trong `vi.ts` (gõ nhầm khoá) — dùng trong test. */
export function unknownEnglishKeys(): string[] {
  return Object.keys(en).filter((k) => !(k in vi));
}
