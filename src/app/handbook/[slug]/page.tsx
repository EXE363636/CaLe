import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { handbookArticles } from '@/data/mock/handbookArticles';
import { ArticleContent } from '@/components/handbook/ArticleContent';
import { RelatedArticles } from '@/components/handbook/RelatedArticles';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const article = handbookArticles.find((item) => item.slug === resolvedParams.slug);
  if (!article) return { title: 'Không tìm thấy bài viết' };

  return {
    title: `${article.title} | Cẩm nang làm việc`,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const article = handbookArticles.find((item) => item.slug === resolvedParams.slug);

  if (!article) {
    notFound();
  }

  return (
    <div className="bg-white pb-24 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/handbook" className="hover:text-orange-600">Cẩm nang làm việc</Link>
            </li>
            <li>/</li>
            <li>
              <Link href={`/handbook?category=${article.categoryId}`} className="hover:text-orange-600">
                {article.categoryLabel}
              </Link>
            </li>
            <li>/</li>
            <li className="truncate text-gray-900" aria-current="page">
              {article.title}
            </li>
          </ol>
        </nav>

        {/* Article Header */}
        <header className="mb-10 text-center">
          <span className="mb-4 inline-block rounded-md bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700 ring-1 ring-inset ring-orange-600/20">
            {article.categoryLabel}
          </span>
          <h1 className="mb-6 text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl lg:text-5xl">
            {article.title}
          </h1>
          <p className="mx-auto mb-6 max-w-2xl text-lg text-gray-600">
            {article.excerpt}
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="font-medium text-gray-900">{article.author}</span>
            <span>•</span>
            <time dateTime={article.publishedAt}>
              {new Date(article.publishedAt).toLocaleDateString('vi-VN')}
            </time>
            <span>•</span>
            <span>{article.readingTime} phút đọc</span>
          </div>
        </header>

        {/* Cover Image */}
        <div className="relative mb-12 aspect-video w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
          <Image
            src={article.imageUrl}
            alt={article.imageAlt}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute bottom-4 right-4 h-8 w-24 opacity-80 mix-blend-multiply">
            <Image src="/images/handbook/logo-cale.png" alt="CaLẻ" fill sizes="100px" className="object-contain" />
          </div>
        </div>

        {/* Content */}
        <ArticleContent content={article.content} />

        {/* Back link & Related Articles */}
        <div className="mt-16 text-center">
          <Link
            href="/handbook"
            className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
          >
            ← Quay lại Cẩm nang
          </Link>
        </div>

        <RelatedArticles currentArticleSlug={article.slug} relatedSlugs={article.relatedSlugs} />
      </div>
    </div>
  );
}
