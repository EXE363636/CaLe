import Link from 'next/link';
import Image from 'next/image';
import { HandbookArticle } from '@/data/mock/handbookArticles';

export function FeaturedArticleList({ articles }: { articles: HandbookArticle[] }) {
  if (!articles || articles.length === 0) return null;

  const mainArticle = articles[0];
  const sideArticles = articles.slice(1, 4); // Show up to 3 on the side

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main featured */}
      <div className="lg:col-span-2">
        <Link href={`/handbook/${mainArticle.slug}`} className="group relative block h-full min-h-[300px] lg:min-h-[400px] w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition-all hover:shadow-md">
          <Image
            src={mainArticle.imageUrl}
            alt={mainArticle.imageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 66vw"
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
            <p className="mt-3 text-sm text-gray-200 line-clamp-2 sm:text-base">
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

      {/* Side featured */}
      <div className="flex flex-col gap-6">
        {sideArticles.map((article) => (
          <Link key={article.id} href={`/handbook/${article.slug}`} className="group flex gap-4 overflow-hidden rounded-xl bg-transparent transition-all hover:bg-gray-50 p-2 -m-2">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={article.imageUrl}
                alt={article.imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute bottom-1 right-1 h-3 w-8 opacity-80 mix-blend-multiply">
                <Image src="/images/handbook/logo-cale.png" alt="CaLẻ" fill className="object-contain" />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <span className="mb-1 text-xs font-medium text-orange-600">
                {article.categoryLabel}
              </span>
              <h3 className="text-sm font-bold leading-snug text-gray-900 line-clamp-2 group-hover:text-orange-700">
                {article.title}
              </h3>
              <div className="mt-2 text-xs text-gray-500">
                {new Date(article.publishedAt).toLocaleDateString('vi-VN')}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
