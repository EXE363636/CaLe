import { describe, expect, it } from 'vitest';

import { formatNotificationTime } from '@/lib/notificationTime';

/**
 * 03/10 — giờ trong bảng thông báo: tương đối khi gần, ngày ngắn khi xa. Dựng mốc bằng
 * giờ địa phương (`new Date(y, m, d, h, min)`) để test không phụ thuộc múi giờ máy chạy.
 */
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const NOW = at(2026, 10, 3, 10, 0);

describe('formatNotificationTime', () => {
  it('dưới 1 phút → "Vừa xong"', () => {
    expect(formatNotificationTime(at(2026, 10, 3, 9, 59, ), NOW, 'vi')).toBe('1 phút trước');
    expect(formatNotificationTime(NOW, NOW, 'vi')).toBe('Vừa xong');
    expect(formatNotificationTime(NOW, NOW, 'en')).toBe('Just now');
  });

  it('dưới 1 giờ → "n phút trước"', () => {
    expect(formatNotificationTime(at(2026, 10, 3, 9, 35), NOW, 'vi')).toBe('25 phút trước');
    expect(formatNotificationTime(at(2026, 10, 3, 9, 35), NOW, 'en')).toBe('25 min ago');
  });

  it('cùng ngày → "n giờ trước"', () => {
    expect(formatNotificationTime(at(2026, 10, 3, 1, 0), NOW, 'vi')).toBe('9 giờ trước');
    expect(formatNotificationTime(at(2026, 10, 3, 1, 0), NOW, 'en')).toBe('9 h ago');
  });

  it('hôm qua → "Hôm qua HH:mm"', () => {
    expect(formatNotificationTime(at(2026, 10, 2, 16, 5), NOW, 'vi')).toBe('Hôm qua 16:05');
    expect(formatNotificationTime(at(2026, 10, 2, 16, 5), NOW, 'en')).toBe('Yesterday 16:05');
  });

  it('cũ hơn trong năm → "dd/MM"; khác năm → "dd/MM/yyyy"', () => {
    expect(formatNotificationTime(at(2026, 7, 10, 16, 15), NOW, 'vi')).toBe('10/07');
    expect(formatNotificationTime(at(2025, 12, 31, 8, 0), NOW, 'vi')).toBe('31/12/2025');
  });

  it('thời điểm ở tương lai (lệch đồng hồ) → "Vừa xong", ISO hỏng → chuỗi rỗng', () => {
    expect(formatNotificationTime(at(2026, 10, 3, 10, 5), NOW, 'vi')).toBe('Vừa xong');
    expect(formatNotificationTime('không-phải-ngày', NOW, 'vi')).toBe('');
  });
});
