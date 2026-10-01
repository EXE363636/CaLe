import { describe, expect, it } from 'vitest';

import { handbookArticles } from '@/data/mock/handbookArticles';
import { handbookArticlesEn } from '@/data/mock/handbookArticlesEn';
import { handbookListHref, localizeArticle } from '@/lib/handbook';

const article = handbookArticles.find((a) => a.id === '1')!;

describe('localizeArticle', () => {
  it('vi: trả nguyên bài', () => {
    expect(localizeArticle(article, 'vi')).toBe(article);
  });

  it('en: thay chữ theo từng mục, giữ ảnh của bản Việt, nhãn danh mục tiếng Anh', () => {
    const en = localizeArticle(article, 'en');
    expect(en.title).toBe(handbookArticlesEn['1'].title);
    expect(en.categoryLabel).toBe('Getting started');
    expect(en.content.length).toBe(article.content.length);
    article.content.forEach((s, i) => {
      expect(en.content[i].imageUrl).toBe(s.imageUrl);
      expect(en.content[i].heading).toBe(handbookArticlesEn['1'].content[i].heading);
    });
    // Không đổi các trường không phải chữ.
    expect(en.slug).toBe(article.slug);
    expect(en.audience).toBe(article.audience);
  });

  it('en: thiếu bản Anh → giữ bản Việt', () => {
    const orphan = { ...article, id: 'khong-co-ban-anh' };
    expect(localizeArticle(orphan, 'en')).toBe(orphan);
  });
});

describe('handbookListHref', () => {
  it('đường dẫn theo vai trò, kèm danh mục nếu có', () => {
    expect(handbookListHref('worker')).toBe('/handbook?for=worker');
    expect(handbookListHref('employer', 'xu-ly-su-co')).toBe('/handbook?for=employer&category=xu-ly-su-co');
  });
});
