import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  SERVER_NOTIFICATION_KINDS,
  toAppNotification,
  type ServerNotificationRow,
} from '@/domain/serverNotification';

// Thông báo phía server (migration 0031): kind + params → thông báo trong app,
// câu chữ dựng ở client (không lưu chữ trên server).

const USER = 'u1';
const fmt = {
  t: (key: string) => `[${key}] {code} {amount} {note}`,
  money: (n: number) => `${n}đ`,
};
const row = (over: Partial<ServerNotificationRow> = {}): ServerNotificationRow => ({
  id: 'n1',
  kind: 'PaymentReviewCredited',
  params: { orderCode: 123, creditedAmount: 49000, paidAmount: 49000, note: 'Khớp sao kê' },
  readAt: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  ...over,
});

describe('SERVER_NOTIFICATION_KINDS — khớp check constraint 0031', () => {
  it('2 loại: cộng / không cộng sau kiểm tra', () => {
    expect([...SERVER_NOTIFICATION_KINDS].sort()).toEqual(['PaymentReviewCredited', 'PaymentReviewDismissed']);
  });
});

describe('toAppNotification', () => {
  it('đã cộng: điền mã đơn, số đã cộng, ghi chú; chưa đọc; nguồn server', () => {
    const n = toAppNotification(row(), USER, fmt);
    expect(n).toMatchObject({
      id: 'server:n1',
      serverId: 'n1',
      userId: USER,
      kind: 'PaymentReviewCredited',
      read: false,
      createdAt: '2026-10-01T10:00:00.000Z',
      source: 'server',
    });
    expect(n?.title).toBe('[notification.paymentReview.credited.title] 123 49000đ Khớp sao kê');
    expect(n?.body).toBe('[notification.paymentReview.credited.body] 123 49000đ Khớp sao kê');
  });

  it('không cộng: dùng mẫu câu riêng; readAt có → đã đọc', () => {
    const n = toAppNotification(
      row({ kind: 'PaymentReviewDismissed', readAt: '2026-10-01T11:00:00.000Z', params: { orderCode: 9, note: 'Đã hoàn tay' } }),
      USER,
      fmt,
    );
    expect(n?.read).toBe(true);
    expect(n?.body).toBe('[notification.paymentReview.dismissed.body] 9 {amount} Đã hoàn tay');
  });

  it('thiếu ghi chú → chuỗi rỗng, không để lộ "{note}"', () => {
    const n = toAppNotification(row({ params: { orderCode: 1, creditedAmount: 1000 } }), USER, fmt);
    expect(n?.body).toBe('[notification.paymentReview.credited.body] 1 1000đ ');
  });

  it('loại lạ / id rỗng → null (bỏ qua, không làm vỡ chuông)', () => {
    expect(toAppNotification(row({ kind: 'Bogus' }), USER, fmt)).toBeNull();
    expect(toAppNotification(row({ id: '' }), USER, fmt)).toBeNull();
  });

  it('ghi chú chứa "{amount}" không bị điền tiếp (điền một lượt)', () => {
    const n = toAppNotification(row({ params: { orderCode: 1, creditedAmount: 5, note: '{amount}' } }), USER, fmt);
    expect(n?.body).toBe('[notification.paymentReview.credited.body] 1 5đ {amount}');
  });

  it('property: params bất kỳ không làm hàm ném lỗi; kết quả null hoặc đúng người nhận', () => {
    fc.assert(
      fc.property(fc.string(), fc.jsonValue(), (kind, params) => {
        const n = toAppNotification(
          row({ kind, params: (params && typeof params === 'object' && !Array.isArray(params) ? params : {}) as Record<string, unknown> }),
          USER,
          fmt,
        );
        return n === null || (n.userId === USER && n.source === 'server');
      }),
    );
  });
});
