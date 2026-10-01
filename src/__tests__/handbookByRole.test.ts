import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  HANDBOOK_CATEGORIES,
  handbookArticles,
  handbookArticlesFor,
  handbookCategoriesFor,
  type HandbookAudience,
} from '@/data/mock/handbookArticles';
import { handbookArticlesEn } from '@/data/mock/handbookArticlesEn';

// Cẩm nang tách riêng người lao động / nhà tuyển dụng (01/10): mỗi danh mục,
// mỗi bài, mỗi "bài liên quan" thuộc đúng MỘT vai trò — không trộn.

const AUDIENCES: HandbookAudience[] = ['worker', 'employer'];
const ROOT = join(__dirname, '..', '..');

describe('Cẩm nang theo vai trò', () => {
  it('danh mục: id không trùng, mỗi vai trò có danh mục riêng', () => {
    const ids = HANDBOOK_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const aud of AUDIENCES) expect(handbookCategoriesFor(aud).length).toBeGreaterThan(0);
  });

  it('mỗi bài thuộc danh mục CÙNG vai trò, nhãn danh mục khớp', () => {
    for (const a of handbookArticles) {
      const cat = HANDBOOK_CATEGORIES.find((c) => c.id === a.categoryId);
      expect(cat, `${a.slug}: danh mục ${a.categoryId}`).toBeDefined();
      expect(cat?.audience, a.slug).toBe(a.audience);
      expect(a.categoryLabel, a.slug).toBe(cat?.label);
    }
  });

  it('slug không trùng; bài liên quan tồn tại và cùng vai trò', () => {
    const slugs = handbookArticles.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const a of handbookArticles) {
      for (const rel of a.relatedSlugs) {
        const r = handbookArticles.find((x) => x.slug === rel);
        expect(r, `${a.slug} → ${rel}`).toBeDefined();
        expect(r?.audience, `${a.slug} → ${rel}`).toBe(a.audience);
      }
    }
  });

  it('handbookArticlesFor không bao giờ trộn vai trò; mỗi vai trò có bài nổi bật', () => {
    for (const aud of AUDIENCES) {
      const list = handbookArticlesFor(aud);
      expect(list.length).toBeGreaterThan(0);
      expect(list.every((a) => a.audience === aud)).toBe(true);
      expect(list.some((a) => a.featured)).toBe(true);
      for (const cat of handbookCategoriesFor(aud)) {
        expect(handbookArticlesFor(aud, cat.id).every((a) => a.audience === aud)).toBe(true);
      }
    }
    // Danh mục của vai trò kia → rỗng (không lộ bài sang vai trò khác).
    const employerCat = handbookCategoriesFor('employer')[0].id;
    expect(handbookArticlesFor('worker', employerCat)).toEqual([]);
  });

  it('link "tìm hiểu thêm" trỏ đúng bài của vai trò: form đăng ca → bài NTD, thẻ ca → bài NLĐ', () => {
    const linkIn = (file: string) => {
      const m = /learnMoreHref="\/handbook\/([^"]+)"/.exec(readFileSync(join(ROOT, file), 'utf8'));
      return handbookArticles.find((a) => a.slug === m?.[1]);
    };
    expect(linkIn('src/components/forms/ShiftForm.tsx')?.audience).toBe('employer');
    expect(linkIn('src/components/shift/PaymentEvidenceCard.tsx')?.audience).toBe('worker');
  });

  it('bản tiếng Anh: đủ mọi bài, cùng số mục nội dung', () => {
    for (const a of handbookArticles) {
      const e = handbookArticlesEn[a.id];
      expect(e, a.id).toBeDefined();
      expect(e.content.length, a.id).toBe(a.content.length);
      expect(`${e.title} ${e.excerpt}`).not.toMatch(/VNĐ|₫/);
    }
    for (const c of HANDBOOK_CATEGORIES) expect(c.labelEn.length).toBeGreaterThan(0);
  });
});
