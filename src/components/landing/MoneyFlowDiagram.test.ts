/**
 * Sơ đồ dòng tiền ở trang chủ (02/10): ví dụ ca 2 người × 4 giờ × 45.000 đ, một người
 * vắng mặt. Số phải khớp luồng server: production giữ tiền công + 10% phí, phí chỉ
 * tính phần có người làm, phần còn lại (tiền công + phí của người vắng) hoàn về ví;
 * demo chưa thu phí. Mọi đồng giữ trước đi về đúng một trong ba nơi.
 */

import { describe, expect, it } from 'vitest';

import { flowAmounts } from './MoneyFlowDiagram';

describe('flowAmounts', () => {
  it('demo: giữ tiền công, không phí, hoàn phần người vắng', () => {
    expect(flowAmounts(false)).toEqual({ held: 360_000, paid: 180_000, fee: 0, refund: 180_000 });
  });

  it('production: giữ tiền công + 10%, phí chỉ trên phần đã làm', () => {
    expect(flowAmounts(true)).toEqual({ held: 396_000, paid: 180_000, fee: 18_000, refund: 198_000 });
  });

  it('giữ trước = trả + phí + hoàn lại (cả hai chế độ)', () => {
    for (const live of [false, true]) {
      const a = flowAmounts(live);
      expect(a.paid + a.fee + a.refund).toBe(a.held);
      expect(a.refund).toBeGreaterThan(0);
    }
  });
});
