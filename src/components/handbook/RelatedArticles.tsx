import { handbookArticles, type HandbookArticle } from '@/data/mock/handbookArticles';
import type { Locale } from '@/i18n/locale';
import { localizeArticle } from '@/lib/handbook';
import { ArticleCard, type ArticleMetaLabels } from './ArticleCard';

/**
 * Bài liên quan — CHỈ lấy bài cùng vai trò với bài đang đọc (không gợi ý bài
 * của nhà tuyển dụng cho người lao động và ngược lại). Ưu tiên `relatedSlugs`,
 * rồi cùng danh mục, rồi cùng vai trò.
 */
export function RelatedArticles({
  article,
  locale,
  title,
  meta,
}: {
  article: HandbookArticle;
  locale: Locale;
  title: string;
  meta: ArticleMetaLabels;
}) {
  const sameAudience = handbookArticles.filter(
    (a) => a.audience === article.audience && a.slug !== article.slug,
  );
  const picked: HandbookArticle[] = [];
  const add = (list: HandbookArticle[]) => {
    for (const a of list) {
      if (picked.length >= 3) return;
      if (!picked.some((p) => p.slug === a.slug)) picked.push(a);
    }
  };
  add(article.relatedSlugs.map((slug) => sameAudience.find((a) => a.slug === slug)).filter((a): a is HandbookArticle => !!a));
  add(sameAudience.filter((a) => a.categoryId === article.categoryId));
  add(sameAudience);

  if (picked.length === 0) return null;

  return (
    <section className="mt-16 border-t border-black/5 pt-12 sm:mt-20 sm:pt-16">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-3">
        {picked.map((a) => (
          <ArticleCard key={a.id} article={localizeArticle(a, locale)} meta={meta} />
        ))}
      </div>
    </section>
  );
}
