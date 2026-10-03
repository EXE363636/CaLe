import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { handbookArticles } from '@/data/mock/handbookArticles';
import { ArticleContent } from '@/components/handbook/ArticleContent';
import { RelatedArticles } from '@/components/handbook/RelatedArticles';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getLocale, getTx } from '@/i18n/server';
import { applyDataMode, handbookListHref, localizeArticle } from '@/lib/handbook';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const article = handbookArticles.find((item) => item.slug === resolvedParams.slug);
  // Tên tab giữ nguyên "CaLẻ" (title ở layout gốc); chỉ đặt mô tả cho SEO.
  if (!article) return {};
  return { description: localizeArticle(article, await getLocale()).excerpt };
}

/**
 * Trang bài cẩm nang. 03/10 — làm lại theo ngôn ngữ landing (phần đầu nền kem, chữ
 * căn trái trong cột đọc ~70 ký tự, ghi chú dạng khối nhấn) và chữ theo chế độ dữ
 * liệu: câu mặc định là của bản thật, bản demo thay các mục có `demo`
 * (`applyDataMode`) và bài về tiền (`demoNotice`) có ghi chú "mô phỏng" ở đầu.
 */
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const source = handbookArticles.find((item) => item.slug === resolvedParams.slug);
  if (!source) notFound();

  const locale = await getLocale();
  const tx = await getTx();
  const live = isSupabaseEnv();
  const article = applyDataMode(localizeArticle(source, locale), live);
  const isWorker = article.audience === 'worker';
  const audienceHandbook = isWorker ? tx('Cẩm nang người lao động') : tx('Cẩm nang nhà tuyển dụng');
  const meta = {
    readingTime: tx('{n} phút đọc'),
    dateLocale: locale === 'en' ? 'en-GB' : 'vi-VN',
  };

  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <section data-tone="cream" className="hero-decor relative px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
              <li>
                <Link href="/handbook" className="rounded hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                  {tx('Cẩm nang làm việc')}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={handbookListHref(article.audience)} className="rounded hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                  {isWorker ? tx('Người lao động') : tx('Nhà tuyển dụng')}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={handbookListHref(article.audience, article.categoryId)}
                  className="rounded hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  {article.categoryLabel}
                </Link>
              </li>
            </ol>
          </nav>

          <p className="mt-6 text-sm font-semibold text-orange-700">{isWorker ? tx('Dành cho người lao động') : tx('Dành cho nhà tuyển dụng')}</p>
          <h1 className="mt-2 text-balance text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            {article.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">{article.excerpt}</p>
          <p className="mt-5 flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
            <span className="font-medium text-gray-900">{article.author}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={article.updatedAt ?? article.publishedAt}>
              {new Date(article.updatedAt ?? article.publishedAt).toLocaleDateString(meta.dateLocale)}
            </time>
            <span aria-hidden="true">·</span>
            <span>{meta.readingTime.replace('{n}', String(article.readingTime))}</span>
          </p>
        </div>
      </section>

      <section data-tone="paper" className="px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="relative -mt-2 aspect-video w-full overflow-hidden rounded-3xl bg-gray-100 shadow-card ring-1 ring-black/5">
            <Image src={article.imageUrl} alt={article.imageAlt} fill sizes="(max-width: 896px) 100vw, 896px" className="object-cover" priority />
          </div>

          <div className="mx-auto mt-10 max-w-[70ch]">
            {article.demoNotice && !live && (
              <p className="mb-8 rounded-2xl bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
                {tx('Bản demo: nạp, giữ tiền, trả công, hoàn tiền và rút tiền trong bài đều là mô phỏng (sổ cái mô phỏng), không qua PayOS và không tính phí dịch vụ.')}
              </p>
            )}

            <ArticleContent content={article.content} fallbackAlt={tx('Minh họa bài viết')} />

            <Link
              href={handbookListHref(article.audience)}
              className="mt-12 inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              <span aria-hidden="true">←</span> {tx('Quay lại')} {audienceHandbook}
            </Link>
          </div>

          <RelatedArticles
            article={source}
            locale={locale}
            title={isWorker ? tx('Bài khác cho người lao động') : tx('Bài khác cho nhà tuyển dụng')}
            meta={meta}
          />
        </div>
      </section>
    </ToneScroll>
  );
}
