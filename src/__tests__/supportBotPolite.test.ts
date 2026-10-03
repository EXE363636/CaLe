/**
 * Trợ lý trả lời lễ phép (04/10): bộ hỏi đáp viết gọn kiểu tài liệu ("Không. …",
 * "Bấm …"), trả nguyên văn nghe cộc lốc ("trống không"). `politeAnswer` thêm lời mở
 * "Dạ" + lời kết; mọi kiểu trả lời tiếng Việt đều phải có "Dạ" / "ạ" / "nhé".
 */

import { describe, expect, it } from 'vitest';

import { SUPPORT_KB } from '@/data/supportKb';
import {
  answerSupportQuestion,
  politeAnswer,
  SUPPORT_BOT_COPY,
  type SupportQueryOptions,
} from '@/domain/supportBot';

const base: SupportQueryOptions = { kb: SUPPORT_KB, locale: 'vi', live: false, role: 'guest' };
const ask = (q: string, opts: Partial<SupportQueryOptions> = {}) => answerSupportQuestion(q, { ...base, ...opts });
const POLITE_VI = /(^Dạ[\s,]|\sạ[\s.!?,]|nhé)/;

describe('politeAnswer — lời mở', () => {
  it('"Không." / "Được." / "Có." đầu câu → "Dạ không ạ." …', () => {
    expect(politeAnswer('Không. Theo Điều khoản…', 'vi', 0)).toMatch(/^Dạ không ạ\. Theo Điều khoản…/);
    expect(politeAnswer('Được. Bạn vào Ví.', 'vi', 0)).toMatch(/^Dạ được ạ\. Bạn vào Ví\./);
    expect(politeAnswer('Được, miễn là ca chưa bắt đầu.', 'vi', 0)).toMatch(/^Dạ được ạ, miễn là ca chưa bắt đầu\./);
    expect(politeAnswer('Có. Mỗi ca ghi rõ.', 'vi', 0)).toMatch(/^Dạ có ạ\. Mỗi ca ghi rõ\./);
  });

  it('câu mệnh lệnh ("Bấm …") → "Dạ, bạn bấm …"', () => {
    expect(politeAnswer('Bấm "Đăng ký" ở góc trên.', 'vi', 0)).toMatch(/^Dạ, bạn bấm "Đăng ký" ở góc trên\./);
    expect(politeAnswer('Mở Ví → Rút tiền.', 'vi', 0)).toMatch(/^Dạ, bạn mở Ví → Rút tiền\./);
  });

  it('câu thường → "Dạ, " + chữ thường đầu; tên riêng / viết tắt giữ nguyên', () => {
    expect(politeAnswer('Người lao động không mất phí.', 'vi', 0)).toMatch(/^Dạ, người lao động không mất phí\./);
    expect(politeAnswer('CaLẻ là sàn việc làm theo ca.', 'vi', 0)).toMatch(/^Dạ, CaLẻ là sàn/);
    expect(politeAnswer('CCCD cần rõ nét.', 'vi', 0)).toMatch(/^Dạ, CCCD cần/);
    expect(politeAnswer('PayOS xử lý thanh toán.', 'vi', 0)).toMatch(/^Dạ, PayOS xử lý/);
    expect(politeAnswer('"Tổng quan" là trang chính.', 'vi', 0)).toMatch(/^Dạ, "Tổng quan" là/);
  });

  it('đã có "Dạ" thì không thêm lần nữa', () => {
    expect(politeAnswer('Dạ, bạn vào Ví.', 'vi', 0)).toMatch(/^Dạ, bạn vào Ví\./);
    expect(politeAnswer('Dạ, bạn vào Ví.', 'vi', 0)).not.toMatch(/Dạ.*Dạ,/);
  });
});

describe('politeAnswer — lời kết', () => {
  it('thêm một câu kết hỏi han, đổi theo `seed`', () => {
    const endings = new Set([0, 1, 2, 3, 4, 5].map((s) => politeAnswer('Bạn vào Ví.', 'vi', s).replace(/^Dạ, bạn vào Ví\. /, '')));
    expect(endings.size).toBeGreaterThanOrEqual(2);
    for (const e of endings) expect(e).toMatch(POLITE_VI);
  });

  it('tiếng Anh: không có "Dạ", giữ nguyên chữ hoa, có lời kết lịch sự', () => {
    const r = politeAnswer('Open Wallet → Withdraw.', 'en', 0);
    expect(r).toMatch(/^Open Wallet → Withdraw\. /);
    expect(r).not.toMatch(/Dạ/);
    expect(r.length).toBeGreaterThan('Open Wallet → Withdraw.'.length);
  });

  it('không có lời kết khi `closing: false` (tin nhiều câu hỏi)', () => {
    expect(politeAnswer('Bạn vào Ví.', 'vi', 0, { closing: false })).toBe('Dạ, bạn vào Ví.');
  });
});

describe('Trợ lý tiếng Việt không trả lời trống không', () => {
  it('mọi mục trong kho: câu trả lời mở đầu bằng "Dạ"', () => {
    for (const entry of SUPPORT_KB) {
      const role = entry.roles?.[0] ?? 'worker';
      if (role === 'admin') continue;
      const r = ask(entry.questions.vi[0], { role });
      if (r.kind !== 'answer') continue;
      expect(r.text, entry.id).toMatch(/^Dạ[\s,]/);
    }
  });

  it('xã giao, hỏi lại, không hiểu, cá nhân: đều có "Dạ" / "ạ" / "nhé"', () => {
    const replies = [
      ask('xin chào'),
      ask('cảm ơn'),
      ask('tạm biệt'),
      ask('bạn là ai'),
      ask('cho mình gặp người thật'),
      ask('giá vàng hôm nay'),
      ask('giá vàng hôm nay', { recentFallbacks: 2 }),
      ask('cọc'),
      ask('sai rồi'),
      ask('app như cái gì vậy, tệ quá'),
      ask('số dư của tôi còn bao nhiêu'),
    ];
    for (const r of replies) expect(r.text, r.text).toMatch(POLITE_VI);
  });

  it('lời chào mở đầu cũng lễ phép', () => {
    expect(SUPPORT_BOT_COPY.welcome.vi).toMatch(POLITE_VI);
  });

  it('đang bực mà vẫn hỏi rõ: xin lỗi trước, không lặp "Dạ"', () => {
    const r = ask('tệ quá, rút tiền thế nào');
    expect(r.kind).toBe('answer');
    expect(r.text).toMatch(/^Dạ, mình rất xin lỗi/);
    expect(r.text.match(/Dạ/g)?.length).toBe(1);
  });
});
