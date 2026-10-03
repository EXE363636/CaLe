/**
 * Trợ lý hỗ trợ nội bộ (bong bóng chat): hiểu câu hỏi đời thường (có / không dấu,
 * viết tắt), đáp xã giao, chọn mục hỏi đáp khớp nhất, không chắc thì nói thật và
 * đưa kênh liên hệ. Logic thuần; kho hỏi đáp truyền vào (ở đây là kho mẫu).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { answerSupportQuestion, foldText, type SupportEntry } from '@/domain/supportBot';

const KB: SupportEntry[] = [
  {
    id: 'wallet-withdraw',
    roles: ['worker', 'employer'],
    questions: {
      vi: ['Rút tiền về tài khoản ngân hàng thế nào?', 'Bao lâu thì tiền rút về ngân hàng?'],
      en: ['How do I withdraw money to my bank account?'],
    },
    keywords: ['rut tien', 'withdraw', 'ngan hang', 'chuyen khoan', 'so tai khoan'],
    answer: { vi: 'Vào Ví → Rút tiền.', en: 'Open Wallet → Withdraw.' },
  },
  {
    id: 'worker-cancel',
    roles: ['worker'],
    questions: {
      vi: ['Huỷ ca đã được duyệt có bị trừ điểm không?', 'Tôi muốn huỷ ca'],
      en: ['Can I cancel an approved shift?'],
    },
    keywords: ['huy ca', 'cancel', 'tru diem', 'uy tin'],
    answer: { vi: 'Huỷ trước 3 giờ thì tự huỷ được.', en: 'Cancel at least 3 hours before.' },
  },
  {
    id: 'employer-post',
    roles: ['employer'],
    questions: {
      vi: ['Đăng ca tuyển người thế nào?', 'Làm sao để đăng một ca mới'],
      en: ['How do I post a shift?'],
    },
    keywords: ['dang ca', 'post shift', 'tuyen nguoi'],
    answer: { vi: 'Dashboard → Đăng ca.', en: 'Dashboard → Post a shift.' },
  },
  {
    id: 'payout-timing',
    questions: {
      vi: ['Làm xong ca bao lâu thì nhận được tiền công?', 'Khi nào tiền công về ví?'],
      en: ['When do I get paid after a shift?'],
    },
    keywords: ['tien cong', 'nhan tien', 'tra cong', 'get paid', 'payout'],
    answer: {
      vi: 'Sau khi nhà tuyển dụng xác nhận.',
      en: 'After the employer confirms.',
      live: { vi: 'Tiền thật về ví sau khi xác nhận.', en: 'Real money after confirmation.' },
    },
  },
];

const ask = (q: string, opts: Partial<Parameters<typeof answerSupportQuestion>[1]> = {}) =>
  answerSupportQuestion(q, { kb: KB, locale: 'vi', live: false, ...opts });

describe('foldText', () => {
  it('bỏ dấu, chữ thường, đ → d, gộp khoảng trắng, bỏ dấu câu', () => {
    expect(foldText('  Rút TIỀN  về Đâu???')).toBe('rut tien ve dau');
  });

  it('mở viết tắt thường gặp', () => {
    expect(foldText('ck cho ntd dc ko')).toBe('chuyen khoan cho nha tuyen dung duoc khong');
    expect(foldText('stk của nld')).toBe('so tai khoan cua nguoi lao dong');
  });
});

describe('answerSupportQuestion — mục hỏi đáp', () => {
  it.each([
    ['Rút tiền về ngân hàng sao vậy', 'wallet-withdraw'],
    ['rut tien bao lau ve', 'wallet-withdraw'],
    ['muon rut tien ve stk', 'wallet-withdraw'],
    ['huỷ ca có bị trừ uy tín ko', 'worker-cancel'],
    ['huy ca duoc khong', 'worker-cancel'],
    ['làm sao đăng ca tuyển người', 'employer-post'],
    ['xong ca bao lâu có tiền công', 'payout-timing'],
  ])('%s → %s', (q, id) => {
    const r = ask(q);
    expect(r.kind).toBe('answer');
    expect(r.kind === 'answer' && r.entryId).toBe(id);
  });

  it('tiếng Anh', () => {
    const r = ask('how to withdraw to bank', { locale: 'en' });
    expect(r.kind === 'answer' && r.entryId).toBe('wallet-withdraw');
    expect(r.text).toMatch(/^Open Wallet → Withdraw\. /);
  });

  it('bản thật dùng câu trả lời `live` nếu có', () => {
    expect(ask('khi nào tiền công về ví', { live: true }).text).toMatch(/^Dạ, tiền thật về ví sau khi xác nhận\. /);
    expect(ask('khi nào tiền công về ví', { live: false }).text).toMatch(/^Dạ, sau khi nhà tuyển dụng xác nhận\. /);
  });

  it('ưu tiên mục đúng vai trò khi điểm sát nhau', () => {
    const r = ask('đăng ca', { role: 'employer' });
    expect(r.kind === 'answer' && r.entryId).toBe('employer-post');
  });

  it('gợi ý thêm tối đa 2 mục liên quan, không trùng mục chính', () => {
    const r = ask('tiền về ví và rút tiền');
    expect(r.kind).toBe('answer');
    if (r.kind === 'answer') {
      expect(r.related.length).toBeLessThanOrEqual(2);
      expect(r.related).not.toContain(r.entryId);
    }
  });
});

describe('answerSupportQuestion — xã giao', () => {
  it.each([
    ['xin chào', 'greeting'],
    ['Hello', 'greeting'],
    ['chao ban', 'greeting'],
    ['cảm ơn nhé', 'thanks'],
    ['thanks', 'thanks'],
    ['bạn là ai', 'whoami'],
    ['bạn là AI à', 'whoami'],
    ['cho tôi gặp người thật', 'human'],
    ['nói chuyện với nhân viên hỗ trợ', 'human'],
    ['tạm biệt', 'bye'],
  ])('%s → %s', (q, intent) => {
    const r = ask(q);
    expect(r.kind).toBe('smalltalk');
    expect(r.kind === 'smalltalk' && r.intent).toBe(intent);
  });

  it('"chào, rút tiền sao?" → trả lời câu hỏi, không chỉ chào', () => {
    const r = ask('chào bạn, rút tiền sao?');
    expect(r.kind === 'answer' && r.entryId).toBe('wallet-withdraw');
  });

  it('gặp người thật → kèm kênh liên hệ', () => {
    const r = ask('cho gặp người thật');
    expect(r.showContacts).toBe(true);
  });
});

describe('answerSupportQuestion — không chắc', () => {
  it.each(['thời tiết hôm nay thế nào', 'giá vàng', 'asdkjh qwe', '???'])('%s → fallback + liên hệ', (q) => {
    const r = ask(q);
    expect(r.kind).toBe('fallback');
    expect(r.showContacts).toBe(true);
  });

  it('chuỗi rỗng → fallback', () => {
    expect(ask('   ').kind).toBe('fallback');
  });

  it('property: không bao giờ ném lỗi, luôn trả text không rỗng', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (s) => {
        const r = ask(s);
        expect(r.text.length).toBeGreaterThan(0);
      }),
    );
  });
});
