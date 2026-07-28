import Link from 'next/link';
import Image from 'next/image';
import { HandbookArticle } from '@/data/mock/handbookArticles';

export function FeaturedArticleList({ articles }: { articles: HandbookArticle[] }) {
  if (!articles || articles.length === 0) return null;

  const mainArticle = articles[0];

  return (
    <div className="mb-10 w-full">
      <Link href={`/handbook/${mainArticle.slug}`} className="group relative block h-full min-h-[300px] lg:min-h-[400px] w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition-all hover:shadow-md">
        <Image
          src={mainArticle.imageUrl}
          alt={mainArticle.imageAlt}
          fill
          sizes="100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="absolute bottom-4 right-4 h-8 w-24 opacity-90 brightness-0 invert">
          <Image src="/images/handbook/logo-cale.png" alt="CaLẻ" fill sizes="100px" className="object-contain" />
        </div>

        <div className="absolute bottom-0 left-0 p-6 sm:p-8">
          <span className="mb-3 inline-block rounded bg-orange-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
            {mainArticle.categoryLabel}
          </span>
          <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
            {mainArticle.title}
          </h2>
          <p className="mt-3 text-sm text-gray-200 line-clamp-2 sm:text-base max-w-3xl">
            {mainArticle.excerpt}
          </p>
          <div className="mt-4 flex items-center gap-3 text-xs text-gray-300">
            <span>{mainArticle.author}</span>
            <span>•</span>
            <span>{mainArticle.readingTime} phút đọc</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
