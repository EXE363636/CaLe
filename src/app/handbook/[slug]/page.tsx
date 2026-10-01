import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { handbookArticles } from '@/data/mock/handbookArticles';
import { ArticleContent } from '@/components/handbook/ArticleContent';
import { RelatedArticles } from '@/components/handbook/RelatedArticles';
import { getLocale, getTx } from '@/i18n/server';
import { handbookListHref, localizeArticle } from '@/lib/handbook';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const article = handbookArticles.find((item) => item.slug === resolvedParams.slug);
  // Tên tab giữ nguyên "CaLẻ" (title ở layout gốc); chỉ đặt mô tả cho SEO.
  if (!article) return {};
  return { description: localizeArticle(article, await getLocale()).excerpt };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const source = handbookArticles.find((item) => item.slug === resolvedParams.slug);
  if (!source) notFound();

  const locale = await getLocale();
  const tx = await getTx();
  const article = localizeArticle(source, locale);
  const isWorker = article.audience === 'worker';
  const audienceHandbook = isWorker ? tx('Cẩm nang người lao động') : tx('Cẩm nang nhà tuyển dụng');
  const meta = {
    readingTime: tx('{n} phút đọc'),
    dateLocale: locale === 'en' ? 'en-GB' : 'vi-VN',
  };

  return (
    <div className="bg-white pb-24 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/handbook" className="hover:text-orange-600">{tx('Cẩm nang làm việc')}</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={handbookListHref(article.audience)} className="hover:text-orange-600">
                {isWorker ? tx('Người lao động') : tx('Nhà tuyển dụng')}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={handbookListHref(article.audience, article.categoryId)} className="hover:text-orange-600">
                {article.categoryLabel}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="min-w-0 truncate text-gray-900" aria-current="page">{article.title}</li>
          </ol>
        </nav>

        <header className="mb-10 text-center">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-block rounded-md bg-orange-600 px-3 py-1 text-sm font-semibold text-white">
              {isWorker ? tx('Dành cho người lao động') : tx('Dành cho nhà tuyển dụng')}
            </span>
            <span className="inline-block rounded-md bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700 ring-1 ring-inset ring-orange-600/20">
              {article.categoryLabel}
            </span>
          </div>
          <h1 className="mb-6 text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl lg:text-5xl">
            {article.title}
          </h1>
          <p className="mx-auto mb-6 max-w-2xl text-lg text-gray-600">{article.excerpt}</p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="font-medium text-gray-900">{article.author}</span>
            <span aria-hidden="true">•</span>
            <time dateTime={article.updatedAt ?? article.publishedAt}>
              {new Date(article.updatedAt ?? article.publishedAt).toLocaleDateString(meta.dateLocale)}
            </time>
            <span aria-hidden="true">•</span>
            <span>{meta.readingTime.replace('{n}', String(article.readingTime))}</span>
          </div>
        </header>

        <div className="relative mb-12 aspect-video w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
          <Image src={article.imageUrl} alt={article.imageAlt} fill sizes="100vw" className="object-cover" priority />
          <div className="absolute bottom-4 right-4 h-8 w-24 opacity-80 mix-blend-multiply">
            <Image src="/images/handbook/logo-cale.png" alt="CaLẻ" fill sizes="100px" className="object-contain" />
          </div>
        </div>

        <ArticleContent content={article.content} fallbackAlt={tx('Minh họa bài viết')} />

        <div className="mt-16 text-center">
          <Link
            href={handbookListHref(article.audience)}
            className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
          >
            ← {tx('Quay lại')} {audienceHandbook}
          </Link>
        </div>

        <RelatedArticles
          article={source}
          locale={locale}
          title={isWorker ? tx('Bài khác cho người lao động') : tx('Bài khác cho nhà tuyển dụng')}
          meta={meta}
        />
      </div>
    </div>
  );
}
