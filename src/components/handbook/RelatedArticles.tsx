import { HandbookArticle, handbookArticles } from '@/data/mock/handbookArticles';
import { ArticleCard } from './ArticleCard';

export function RelatedArticles({ currentArticleSlug, relatedSlugs }: { currentArticleSlug: string; relatedSlugs: string[] }) {
  // Try to find the exact related articles
  let articles = relatedSlugs
    .map(slug => handbookArticles.find(a => a.slug === slug))
    .filter((a): a is HandbookArticle => a !== undefined && a.slug !== currentArticleSlug);

  // If not enough, find others in the same category
  if (articles.length < 3) {
    const currentArticle = handbookArticles.find(a => a.slug === currentArticleSlug);
    if (currentArticle) {
      const more = handbookArticles.filter(
        a => a.categoryId === currentArticle.categoryId && 
             a.slug !== currentArticleSlug && 
             !articles.some(exist => exist.slug === a.slug)
      );
      articles = [...articles, ...more].slice(0, 3);
    }
  }

  // If still not enough, just pick some random ones for the same audience
  if (articles.length < 3) {
    const currentArticle = handbookArticles.find(a => a.slug === currentArticleSlug);
    if (currentArticle) {
      const more = handbookArticles.filter(
        a => a.audience === currentArticle.audience && 
             a.slug !== currentArticleSlug && 
             !articles.some(exist => exist.slug === a.slug)
      );
      articles = [...articles, ...more].slice(0, 3);
    }
  }

  if (articles.length === 0) return null;

  return (
    <section className="mt-16 border-t border-gray-100 pt-16">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Bài viết liên quan</h2>
      <div className="grid gap-6 sm:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
