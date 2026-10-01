/**
 * Cẩm nang theo ngôn ngữ (VI/EN) — hàm thuần, dùng ở server component.
 *
 * `localizeArticle`: bản Anh (handbookArticlesEn) thay chữ theo TỪNG mục, giữ ảnh
 * của bản Việt; thiếu bản Anh / số mục lệch → giữ nguyên bản Việt.
 */

import {
  HANDBOOK_CATEGORIES,
  type HandbookArticle,
  type HandbookAudience,
  type HandbookCategory,
} from '@/data/mock/handbookArticles';
import { handbookArticlesEn } from '@/data/mock/handbookArticlesEn';
import type { Locale } from '@/i18n/locale';

export function categoryLabel(category: HandbookCategory, locale: Locale): string {
  return locale === 'en' ? category.labelEn : category.label;
}

export function localizeArticle(article: HandbookArticle, locale: Locale): HandbookArticle {
  if (locale !== 'en') return article;
  const en = handbookArticlesEn[article.id];
  if (!en || en.content.length !== article.content.length) return article;
  const cat = HANDBOOK_CATEGORIES.find((c) => c.id === article.categoryId);
  return {
    ...article,
    title: en.title,
    excerpt: en.excerpt,
    imageAlt: en.imageAlt,
    categoryLabel: cat ? cat.labelEn : article.categoryLabel,
    content: article.content.map((section, i) => ({ ...en.content[i], imageUrl: section.imageUrl })),
  };
}

/** Đường dẫn danh sách cẩm nang của một vai trò (có thể kèm danh mục). */
export function handbookListHref(audience: HandbookAudience, categoryId?: string): string {
  const q = new URLSearchParams({ for: audience });
  if (categoryId) q.set('category', categoryId);
  return `/handbook?${q.toString()}`;
}
