/**
 * Giờ hiển thị trong bảng thông báo (03/10) — hàm thuần, theo giờ địa phương của máy:
 *   - dưới 1 phút (hoặc ở tương lai do lệch đồng hồ): "Vừa xong";
 *   - dưới 1 giờ: "25 phút trước"; cùng ngày: "9 giờ trước";
 *   - hôm qua: "Hôm qua 16:05";
 *   - cũ hơn: "10/07" (cùng năm) hoặc "31/12/2025".
 * ISO hỏng → chuỗi rỗng. Thay cho giờ đầy đủ chữ đơn cách trước đây.
 */

import type { Locale } from '@/i18n/locale';

const pad = (n: number) => String(n).padStart(2, '0');

export function formatNotificationTime(iso: string, nowIso: string, locale: Locale): string {
  const t = new Date(iso);
  const now = new Date(nowIso);
  if (Number.isNaN(t.getTime()) || Number.isNaN(now.getTime())) return '';
  const en = locale === 'en';
  const minutes = Math.floor((now.getTime() - t.getTime()) / 60_000);
  if (minutes < 1) return en ? 'Just now' : 'Vừa xong';
  if (minutes < 60) return en ? `${minutes} min ago` : `${minutes} phút trước`;

  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(t)) / 86_400_000);
  if (days === 0) {
    const hours = Math.floor(minutes / 60);
    return en ? `${hours} h ago` : `${hours} giờ trước`;
  }
  const hhmm = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
  if (days === 1) return en ? `Yesterday ${hhmm}` : `Hôm qua ${hhmm}`;
  const ddmm = `${pad(t.getDate())}/${pad(t.getMonth() + 1)}`;
  return t.getFullYear() === now.getFullYear() ? ddmm : `${ddmm}/${t.getFullYear()}`;
}
