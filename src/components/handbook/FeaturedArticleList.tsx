import Link from 'next/link';
import Image from 'next/image';
import type { HandbookArticle } from '@/data/mock/handbookArticles';
import type { ArticleMetaLabels } from './ArticleCard';

/** Bài nổi bật — 03/10: thẻ sáng hai cột (ảnh | chữ) thay khối ảnh tối phủ chữ. */
export function FeaturedArticleList({
  articles,
  meta,
}: {
  articles: HandbookArticle[];
  meta: ArticleMetaLabels;
}) {
  if (!articles || articles.length === 0) return null;

  const mainArticle = articles[0];

  return (
    <Link
      href={`/handbook/${mainArticle.slug}`}
      className="group grid overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-black/5 transition-shadow hover:shadow-lg hover:ring-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100 md:aspect-auto md:min-h-[320px]">
        <Image
          src={mainArticle.imageUrl}
          alt={mainArticle.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 55vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <span className="self-start rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
          {mainArticle.categoryLabel}
        </span>
        <h2 className="mt-4 text-balance text-2xl font-bold leading-tight tracking-tight text-gray-900 group-hover:text-orange-700 sm:text-3xl">
          {mainArticle.title}
        </h2>
        <p className="mt-3 line-clamp-3 leading-relaxed text-gray-600">{mainArticle.excerpt}</p>
        <p className="mt-5 text-sm text-gray-500">
          {mainArticle.author}
          <span aria-hidden="true"> · </span>
          {meta.readingTime.replace('{n}', String(mainArticle.readingTime))}
        </p>
      </div>
    </Link>
  );
}
