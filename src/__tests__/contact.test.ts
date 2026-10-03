/**
 * Kênh liên hệ chung (`lib/contact.ts`): `tel:` và phiếu hỗ trợ `mailto:` (mã hoá
 * tiêu đề / thân thư, kèm mã tài khoản / email / trang, không chèn được dòng lạ).
 */

import { describe, expect, it } from 'vitest';

import {
  FACEBOOK_URL,
  SUPPORT_EMAIL,
  SUPPORT_HOTLINE,
  SUPPORT_TICKET_SUBJECT,
  ZALO_URL,
  supportMailto,
  telHref,
} from '@/lib/contact';

function parse(href: string) {
  expect(href.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
  const params = new URLSearchParams(href.slice(href.indexOf('?') + 1));
  return { subject: params.get('subject') ?? '', body: params.get('body') ?? '', raw: href };
}

describe('contact', () => {
  it('hằng số liên hệ', () => {
    expect(SUPPORT_HOTLINE).toBe('0868325698');
    expect(FACEBOOK_URL).toBe('https://www.facebook.com/profile.php?id=61594143497455');
    expect(ZALO_URL).toBe('https://zalo.me/0868325698');
  });

  it('telHref bỏ khoảng trắng / dấu chấm', () => {
    expect(telHref()).toBe('tel:0868325698');
    expect(telHref('0868 325.698')).toBe('tel:0868325698');
    expect(telHref('+84 868-325-698')).toBe('tel:+84868325698');
  });

  it('mailto: tiêu đề cố định, mã hoá đúng (không còn khoảng trắng / dấu ngoặc thô)', () => {
    const { subject, body, raw } = parse(supportMailto());
    expect(subject).toBe(SUPPORT_TICKET_SUBJECT);
    expect(subject).toBe('[CaLẻ] Yêu cầu hỗ trợ');
    expect(raw).toContain('subject=%5BCaL%E1%BA%BB%5D%20Y%C3%AAu');
    expect(raw).not.toMatch(/\s/);
    expect(body).toContain('Mô tả vấn đề:');
    expect(body).not.toContain('Mã tài khoản');
    expect(body).not.toContain('Email tài khoản');
  });

  it('thân thư kèm mã tài khoản, email, trang; xuống dòng là CRLF', () => {
    const { body, raw } = parse(
      supportMailto({ userId: 'u_123', email: 'an+test@example.com', path: '/shifts/sh1' }),
    );
    expect(body).toContain('Mã tài khoản: u_123');
    expect(body).toContain('Email tài khoản: an+test@example.com');
    expect(body).toContain('Trang: /shifts/sh1');
    expect(raw).toContain('%0D%0A');
    // "+" và "&" phải được mã hoá, không làm vỡ tham số.
    expect(raw).toContain('an%2Btest%40example.com');
    expect(raw.split('&').length).toBe(2);
  });

  it('giá trị có xuống dòng / ký tự điều khiển không chèn được dòng mới', () => {
    const { body } = parse(supportMailto({ email: 'a@b.c\r\nBcc: x@y.z', path: '/x?y=1&z=2' }));
    expect(body).toContain('Email tài khoản: a@b.c Bcc: x@y.z');
    expect(body.split('\r\n').filter((l) => l.startsWith('Bcc'))).toEqual([]);
    expect(body).toContain('Trang: /x?y=1&z=2');
  });

  it('bản tiếng Anh', () => {
    const { subject, body } = parse(supportMailto({ userId: 'u1', locale: 'en' }));
    expect(subject).toBe('[CaLẻ] Support request');
    expect(body).toContain('Account ID: u1');
  });
});

describe('supportMailto — kèm câu đã hỏi trợ lý', () => {
  it('câu hỏi nằm ngay dưới "Mô tả vấn đề", đã mã hoá, bỏ xuống dòng', async () => {
    const { supportMailto } = await import('@/lib/contact');
    const href = supportMailto({ question: 'rút tiền\nlâu quá' });
    const body = decodeURIComponent(href.split('&body=')[1]);
    expect(body.startsWith('Mô tả vấn đề:\r\nrút tiền lâu quá\r\n')).toBe(true);
  });
});
