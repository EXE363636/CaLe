import type { HandbookArticle } from '@/data/mock/handbookArticles';
import { ArticleCard, type ArticleMetaLabels } from './ArticleCard';

export function ArticleGrid({
  articles,
  title,
  emptyText,
  meta,
}: {
  articles: HandbookArticle[];
  title: string;
  emptyText: string;
  meta: ArticleMetaLabels;
}) {
  if (!articles || articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <section className="mt-12 lg:mt-16">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} meta={meta} />
        ))}
      </div>
    </section>
  );
}
