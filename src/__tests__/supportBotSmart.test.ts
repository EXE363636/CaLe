/**
 * Trợ lý hỗ trợ "khôn" hơn (04/10): hỏi nối tiếp theo ngữ cảnh, hỏi lại khi câu mơ hồ,
 * trả lời hai câu trong một tin, dữ liệu của chính người hỏi (số dư, ca tới, đơn, tin
 * nhắn), sửa chữ gõ Telex không bộ gõ, đáp xã giao theo tên / giờ, đồng cảm khi bực.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { SUPPORT_KB } from '@/data/supportKb';
import {
  answerSupportQuestion,
  type PersonalSnapshot,
  type SupportQueryOptions,
  type SupportReply,
} from '@/domain/supportBot';

const base: SupportQueryOptions = { kb: SUPPORT_KB, locale: 'vi', live: true, role: 'worker' };
const ask = (q: string, opts: Partial<SupportQueryOptions> = {}): SupportReply =>
  answerSupportQuestion(q, { ...base, ...opts });
const idOf = (r: SupportReply) => (r.kind === 'answer' ? r.entryId : r.kind);

describe('hỏi nối tiếp theo ngữ cảnh', () => {
  it('"bao lâu?" sau câu rút tiền → thời gian rút tiền', () => {
    const first = ask('rút tiền về ngân hàng thế nào');
    expect(idOf(first)).toBe('wallet-withdraw');
    const r = ask('bao lâu thì về?', { previous: { question: 'rút tiền về ngân hàng thế nào', entryId: 'wallet-withdraw' } });
    expect(idOf(r)).toBe('wallet-withdraw-time');
  });

  it('"có mất phí không" sau câu rút tiền → phí rút tiền', () => {
    const r = ask('có mất phí không', { previous: { question: 'rút tiền thế nào', entryId: 'wallet-withdraw' } });
    expect(idOf(r)).toBe('wallet-withdraw-fee');
  });

  it('"còn nhà tuyển dụng huỷ thì sao" sau câu huỷ ca của người lao động → NTD huỷ ca', () => {
    const r = ask('còn nhà tuyển dụng huỷ thì sao', {
      previous: { question: 'huỷ ca có bị trừ điểm không', entryId: 'cancel-penalty' },
    });
    expect(['cancel-by-employer', 'employer-cancel-shift']).toContain(idOf(r));
  });

  it('câu mới đầy đủ thì KHÔNG bị kéo theo ngữ cảnh cũ', () => {
    const r = ask('quên mật khẩu đăng nhập', { previous: { question: 'rút tiền thế nào', entryId: 'wallet-withdraw' } });
    expect(idOf(r)).toBe('account-forgot-password');
  });
});

describe('hỏi lại khi câu quá mơ hồ', () => {
  it('"cọc" → hỏi lại, đưa 2–3 lựa chọn khác nhau', () => {
    const r = ask('cọc', { role: 'guest' });
    expect(r.kind).toBe('clarify');
    if (r.kind === 'clarify') {
      expect(r.options.length).toBeGreaterThanOrEqual(2);
      expect(r.options.length).toBeLessThanOrEqual(3);
      expect(new Set(r.options).size).toBe(r.options.length);
    }
  });

  it('câu rõ ràng thì trả lời luôn, không hỏi lại', () => {
    expect(ask('nạp tiền vào ví thế nào', { role: 'employer' }).kind).toBe('answer');
  });
});

describe('hai câu trong một tin', () => {
  it('"rút tiền thế nào? có mất phí không?" → trả lời cả hai', () => {
    const r = ask('rút tiền thế nào? rút có mất phí không?');
    expect(r.kind).toBe('answer');
    if (r.kind === 'answer') {
      const ids = [r.entryId, ...(r.also ?? []).map((a) => a.entryId)];
      expect(ids).toContain('wallet-withdraw');
      expect(ids).toContain('wallet-withdraw-fee');
      expect(r.also?.every((a) => a.text.length > 0)).toBe(true);
    }
  });

  it('"quên mật khẩu và đổi số điện thoại" → hai mục', () => {
    const r = ask('quên mật khẩu và đổi số điện thoại');
    const ids = r.kind === 'answer' ? [r.entryId, ...(r.also ?? []).map((a) => a.entryId)] : [];
    expect(ids).toEqual(expect.arrayContaining(['account-forgot-password', 'account-change-phone']));
  });
});

describe('dữ liệu của chính người hỏi', () => {
  const me: PersonalSnapshot = {
    name: 'An',
    balance: 1250000,
    nextShift: { title: 'Phục vụ tiệc cưới', when: 'Thứ 7, 18:00–22:00', href: '/shifts/s1' },
    applications: { pending: 2, approved: 1 },
    unreadMessages: 3,
  };

  it('số dư → đọc số dư thật, có đơn vị đ', () => {
    const r = ask('số dư của tôi còn bao nhiêu', { personal: me });
    expect(r.kind).toBe('personal');
    expect(r.text).toContain('1.250.000đ');
  });

  it('ca tiếp theo → tên ca + thời gian + link', () => {
    const r = ask('ca tiếp theo của mình là khi nào', { personal: me });
    expect(r.kind).toBe('personal');
    expect(r.text).toContain('Phục vụ tiệc cưới');
    expect(r.text).toContain('Thứ 7, 18:00–22:00');
    if (r.kind === 'personal') expect(r.links?.[0]?.href).toBe('/shifts/s1');
  });

  it('đơn của tôi → số đơn chờ duyệt / đã duyệt', () => {
    const r = ask('đơn của tôi duyệt chưa', { personal: me });
    expect(r.kind).toBe('personal');
    expect(r.text).toMatch(/2/);
    expect(r.text).toMatch(/1/);
  });

  it('tin nhắn mới → số chưa đọc', () => {
    const r = ask('có tin nhắn mới không', { personal: me });
    expect(r.kind).toBe('personal');
    expect(r.text).toContain('3');
  });

  it('chưa có ca nào sắp tới → nói rõ, gợi ý tìm ca', () => {
    const r = ask('ca tiếp theo của tôi', { personal: { ...me, nextShift: null } });
    expect(r.kind).toBe('personal');
    if (r.kind === 'personal') expect(r.links?.some((l) => l.href === '/shifts')).toBe(true);
  });

  it('khách (chưa đăng nhập) hỏi số dư → mời đăng nhập, không bịa số', () => {
    const r = ask('số dư của tôi còn bao nhiêu', { role: 'guest', personal: null });
    expect(r.kind).toBe('personal');
    expect(r.text).not.toMatch(/\d/);
    if (r.kind === 'personal') expect(r.links?.some((l) => l.href === '/login')).toBe(true);
  });

  it('câu "xem số dư ở đâu" vẫn là câu hỏi hướng dẫn, không phải dữ liệu cá nhân', () => {
    expect(ask('xem số dư ở đâu', { personal: me }).kind).toBe('answer');
  });
});

describe('gõ Telex không bật bộ gõ', () => {
  it.each([
    ['ruts tieenf veef ngaan hangf', 'wallet-withdraw'],
    ['queen maajt khaaur', 'account-forgot-password'],
    ['huyr ca cos bij truwf ddieemr khoong', 'cancel-penalty'],
  ])('%s → %s', (q, id) => {
    expect(idOf(ask(q))).toBe(id);
  });
});

describe('xã giao tự nhiên', () => {
  it('chào theo tên và buổi trong ngày', () => {
    const r = ask('xin chào', { personal: { name: 'An' }, hour: 8 });
    expect(r.kind).toBe('smalltalk');
    expect(r.text).toContain('An');
    expect(r.text.toLowerCase()).toContain('buổi sáng');
  });

  it('câu đáp thay đổi theo lượt (seed), không lặp y hệt', () => {
    const texts = new Set([0, 1, 2, 3].map((seed) => ask('cảm ơn', { seed }).text));
    expect(texts.size).toBeGreaterThan(1);
  });

  it.each(['bực quá app lỗi hoài', 'tệ thật sự', 'ức chế ghê'])('bực bội "%s" → đồng cảm + kênh liên hệ', (q) => {
    const r = ask(q);
    expect(r.kind).toBe('smalltalk');
    if (r.kind === 'smalltalk') expect(r.intent).toBe('complaint');
    expect(r.showContacts).toBe(true);
  });

  it('"sai rồi" sau một câu trả lời → xin lỗi, gợi ý mục gần nhất khác + liên hệ', () => {
    const r = ask('sai rồi, không phải ý mình', { previous: { question: 'rút tiền về ngân hàng', entryId: 'wallet-withdraw' } });
    expect(r.kind).toBe('smalltalk');
    if (r.kind === 'smalltalk') {
      expect(r.intent).toBe('notHelpful');
      expect(r.related).not.toContain('wallet-withdraw');
      expect(r.related.length).toBeGreaterThan(0);
    }
    expect(r.showContacts).toBe(true);
  });
});

describe('bất biến', () => {
  it('property: với mọi chuỗi, ngữ cảnh và dữ liệu bất kỳ → không ném, text không rỗng', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), fc.string({ maxLength: 80 }), fc.integer({ min: 0, max: 23 }), (q, prev, hour) => {
        const r = ask(q, { previous: { question: prev, entryId: 'wallet-withdraw' }, hour, seed: hour, personal: { name: prev } });
        expect(r.text.length).toBeGreaterThan(0);
      }),
      { numRuns: 300 },
    );
  });
});

describe('supportWelcome', () => {
  it('khách: lời chào chung', async () => {
    const { supportWelcome, SUPPORT_BOT_COPY } = await import('@/domain/supportBot');
    expect(supportWelcome('vi')).toBe(SUPPORT_BOT_COPY.welcome.vi);
  });
  it('đã đăng nhập: gọi tên + buổi, vẫn nói chỉ trả lời về CaLẻ', async () => {
    const { supportWelcome } = await import('@/domain/supportBot');
    const t = supportWelcome('vi', 'Nguyễn Văn An', 20);
    expect(t.startsWith('Dạ, chào An ạ!')).toBe(true);
    expect(t).toContain('buổi tối');
    expect(t).toContain('chỉ trả lời các câu hỏi về CaLẻ');
    const en = supportWelcome('en', 'An', 9);
    expect(en.startsWith('Hi An!')).toBe(true);
    expect(en).toContain('Good morning');
  });
});

describe('mục chỉ dành cho quản trị viên', () => {
  it.each(['worker', 'employer', 'guest'] as const)('%s không bao giờ được trả lời / gợi ý mục admin', (role) => {
    const adminIds = new Set(SUPPORT_KB.filter((e) => e.roles?.length && e.roles.every((r) => r === 'admin')).map((e) => e.id));
    for (const q of ['duyệt cccd cho người dùng ở đâu', 'admin bật cọc người lao động', 'huỷ ca thì tiền giữ có được hoàn không', 'cọc']) {
      const r = ask(q, { role });
      const ids = [
        ...(r.kind === 'answer' ? [r.entryId, ...(r.also ?? []).map((a) => a.entryId)] : []),
        ...(r.kind === 'clarify' ? r.options : []),
        ...r.related,
      ];
      expect(ids.filter((id) => adminIds.has(id))).toEqual([]);
    }
  });
});

describe('so khớp theo ký tự (gõ dính liền / sai chính tả nặng)', () => {
  it.each([
    ['ruttienvenganhang', 'wallet-withdraw'],
    ['quenmatkhau', 'account-forgot-password'],
  ])('%s → %s', (q, id) => {
    const r = ask(q, { role: 'worker' });
    const ids = r.kind === 'answer' ? [r.entryId] : r.related;
    expect(ids).toContain(id);
  });

  it.each(['asdfghjkl', 'thoitiethomnay', 'giavanghomnay'])('chuỗi lạ "%s" vẫn là fallback', (q) => {
    expect(ask(q).kind).toBe('fallback');
  });
});

describe('dùng dấu khi người dùng có gõ dấu', () => {
  it('"ví" (có dấu) ưu tiên mục ví tiền', () => {
    const r = ask('ví của mình dùng để làm gì', { role: 'worker' });
    expect(idOf(r)).toBe('wallet-overview');
  });
});

describe('chuyển sang người thật sau nhiều lần không hiểu', () => {
  it('lần thứ hai liên tiếp không hiểu → câu khuyên liên hệ đội hỗ trợ, khác câu thường', () => {
    const first = ask('asdkjh qwe', { recentFallbacks: 0 });
    const second = ask('zzz qqq', { recentFallbacks: 1 });
    expect(second.kind).toBe('fallback');
    expect(second.text).not.toBe(first.text);
    expect(second.text.toLowerCase()).toContain('đội hỗ trợ');
    expect(second.showContacts).toBe(true);
  });
});

describe('tiếng Anh: điểm uy tín khi huỷ ca', () => {
  it.each(['do i lose points if i cancel', 'will i lose points if i cancel a shift'])('%s → cancel-penalty', (q) => {
    expect(idOf(ask(q, { locale: 'en' }))).toBe('cancel-penalty');
  });
});
