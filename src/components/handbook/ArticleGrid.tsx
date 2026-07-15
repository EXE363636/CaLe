import { HandbookArticle } from '@/data/mock/handbookArticles';
import { ArticleCard } from './ArticleCard';

export function ArticleGrid({ articles, title }: { articles: HandbookArticle[], title: string }) {
  if (!articles || articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Không tìm thấy bài viết nào.</p>
      </div>
    );
  }

  return (
    <section className="mt-12 lg:mt-16">
      <h2 className="mb-6 text-xl font-bold text-gray-900">{title}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
