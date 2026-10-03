import { describe, expect, it } from 'vitest';

import type { HandbookArticle } from '@/data/mock/handbookArticles';
import { handbookArticles } from '@/data/mock/handbookArticles';
import { handbookArticlesEn } from '@/data/mock/handbookArticlesEn';
import { applyDataMode } from '@/lib/handbook';

/**
 * 03/10 — cẩm nang theo chế độ dữ liệu: câu mặc định là của bản thật; mục có `demo`
 * thì bản demo thay đúng các trường đó (đoạn / gạch đầu dòng / ghi chú).
 */
const base: HandbookArticle = {
  ...handbookArticles[0],
  id: 'x',
  content: [
    { heading: 'A', paragraphs: ['thật 1'], note: 'ghi chú thật', demo: { paragraphs: ['demo 1'] } },
    { heading: 'B', bullets: ['b1'] },
  ],
};

describe('applyDataMode', () => {
  it('production: giữ nguyên bài (cùng tham chiếu)', () => {
    expect(applyDataMode(base, true)).toBe(base);
  });

  it('demo: thay đúng trường có trong `demo`, giữ các trường khác', () => {
    const out = applyDataMode(base, false);
    expect(out.content[0].paragraphs).toEqual(['demo 1']);
    expect(out.content[0].note).toBe('ghi chú thật');
    expect(out.content[0].heading).toBe('A');
    expect(out.content[1]).toBe(base.content[1]);
  });

  it('demo: không mục nào có `demo` → giữ nguyên bài', () => {
    const plain = { ...base, content: [base.content[1]] };
    expect(applyDataMode(plain, false)).toBe(plain);
  });

  it('mục có `demo` ở bản Việt thì bản Anh cũng có ở đúng vị trí đó', () => {
    for (const a of handbookArticles) {
      const en = handbookArticlesEn[a.id];
      if (!en) continue;
      a.content.forEach((s, i) => {
        expect(Boolean(en.content[i]?.demo), `${a.id} mục ${i}`).toBe(Boolean(s.demo));
      });
    }
  });
});
