import { describe, expect, it } from 'vitest';
import { parseHashHref } from '@/lib/hashNav';

const HERE = 'http://localhost:3000/for-employers?x=1#employer-post';

describe('parseHashHref — link nội bộ có #khối (03/10)', () => {
  it('link cùng nguồn có đường dẫn + hash → đích không kèm hash', () => {
    expect(parseHashHref('/for-workers#worker-cancel', HERE)).toEqual({
      path: '/for-workers',
      id: 'worker-cancel',
      url: '/for-workers#worker-cancel',
    });
    expect(parseHashHref('/support?a=b#support-safety', HERE)).toEqual({
      path: '/support?a=b',
      id: 'support-safety',
      url: '/support?a=b#support-safety',
    });
  });

  it('giải mã id có ký tự đặc biệt', () => {
    expect(parseHashHref('/faq#c%C3%A2u-h%E1%BB%8Fi', HERE)?.id).toBe('câu-hỏi');
  });

  it('không xử lý: chỉ có #khối, không hash, hash rỗng, khác nguồn, href rỗng', () => {
    expect(parseHashHref('#main', HERE)).toBeNull();
    expect(parseHashHref('/for-workers', HERE)).toBeNull();
    expect(parseHashHref('/for-workers#', HERE)).toBeNull();
    expect(parseHashHref('https://example.com/a#b', HERE)).toBeNull();
    expect(parseHashHref('mailto:a@b.c', HERE)).toBeNull();
    expect(parseHashHref('', HERE)).toBeNull();
  });
});
