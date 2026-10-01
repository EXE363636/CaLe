import Link from 'next/link';
import Image from 'next/image';

import type { HandbookArticle } from '@/data/mock/handbookArticles';

export interface ArticleMetaLabels {
  /** Mẫu "{n} phút đọc" / "{n} min read". */
  readingTime: string;
  /** Định dạng ngày theo ngôn ngữ ('vi-VN' / 'en-GB'). */
  dateLocale: string;
}

export function ArticleCard({ article, meta }: { article: HandbookArticle; meta: ArticleMetaLabels }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:ring-1 hover:ring-orange-200">
      <Link href={`/handbook/${article.slug}`} className="relative block aspect-video w-full overflow-hidden bg-gray-100">
        <Image
          src={article.imageUrl}
          alt={article.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute bottom-2 right-2 h-6 w-16 opacity-80 mix-blend-multiply">
          <Image src="/images/handbook/logo-cale.png" alt="CaLẻ" fill sizes="100px" className="object-contain" />
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
            {article.categoryLabel}
          </span>
          <span className="text-xs text-gray-500">
            {meta.readingTime.replace('{n}', String(article.readingTime))}
          </span>
        </div>
        <Link href={`/handbook/${article.slug}`} className="block group-hover:text-orange-600">
          <h3 className="line-clamp-2 text-lg font-bold leading-snug text-gray-900">{article.title}</h3>
        </Link>
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{article.excerpt}</p>
        <div className="mt-auto pt-4 text-xs text-gray-500">
          {new Date(article.updatedAt ?? article.publishedAt).toLocaleDateString(meta.dateLocale)}
        </div>
      </div>
    </div>
  );
}
