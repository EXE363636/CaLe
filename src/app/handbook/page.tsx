import Link from 'next/link';

import {
  handbookArticlesFor,
  handbookCategoriesFor,
  isHandbookAudience,
  type HandbookAudience,
} from '@/data/mock/handbookArticles';
import { HandbookAudienceSwitch } from '@/components/handbook/HandbookAudienceSwitch';
import { HandbookCategoryMenu } from '@/components/handbook/HandbookCategoryMenu';
import { FeaturedArticleList } from '@/components/handbook/FeaturedArticleList';
import { ArticleGrid } from '@/components/handbook/ArticleGrid';
import { getLocale, getTx } from '@/i18n/server';
import { categoryLabel, handbookListHref, localizeArticle } from '@/lib/handbook';

export const dynamic = 'force-dynamic';

/**
 * Cẩm nang làm việc — HAI cẩm nang riêng, không trộn bài (01/10):
 *   - `/handbook`                    → chọn cẩm nang (người lao động / nhà tuyển dụng);
 *   - `/handbook?for=worker|employer` → danh mục + bài của đúng vai trò đó;
 *   - `&category=<id>`               → lọc trong vai trò (danh mục vai trò kia → bỏ qua).
 */
export default async function HandbookPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string; category?: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const tx = await getTx();
  const audience = isHandbookAudience(params.for) ? params.for : null;

  if (!audience) return <HandbookChooser locale={locale} tx={tx} />;

  const categories = handbookCategoriesFor(audience);
  const current = categories.find((c) => c.id === params.category);
  const currentCategory = current ? current.id : 'all';
  const articles = handbookArticlesFor(audience, current?.id).map((a) => localizeArticle(a, locale));

  const featuredPick = articles.filter((a) => a.featured).sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99));
  const featured = (featuredPick.length ? featuredPick : articles).slice(0, 1);
  const featuredIds = new Set(featured.map((a) => a.id));
  const gridArticles = articles.filter((a) => !featuredIds.has(a.id)).slice(0, 12);
  const meta = {
    readingTime: tx('{n} phút đọc'),
    dateLocale: locale === 'en' ? 'en-GB' : 'vi-VN',
  };
  const isWorker = audience === 'worker';

  return (
    <div className="bg-white">
      <div className="bg-orange-50/30 pb-12 pt-16 lg:pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-700">
            {tx('Cẩm nang làm việc')}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            {isWorker ? tx('Cẩm nang người lao động') : tx('Cẩm nang nhà tuyển dụng')}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-gray-600">
            {isWorker
              ? tx('Chuẩn bị cho ca đầu tiên, giữ điểm uy tín, hiểu cách nhận tiền công và đi làm an toàn.')
              : tx('Viết tin đăng, chọn người phù hợp, hiểu tiền giữ - phí - hoàn tiền và xử lý khi người lao động vắng mặt.')}
          </p>
          <HandbookAudienceSwitch
            current={audience}
            labels={{
              nav: tx('Chọn cẩm nang theo vai trò'),
              worker: tx('Người lao động'),
              employer: tx('Nhà tuyển dụng'),
            }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-10">
          <aside className="mb-8 w-full shrink-0 lg:mb-0 lg:w-64">
            <HandbookCategoryMenu
              audience={audience}
              categories={categories}
              currentCategory={currentCategory}
              locale={locale}
              labels={{
                heading: tx('Danh mục'),
                all: tx('Tất cả bài viết'),
                nav: isWorker ? tx('Danh mục cẩm nang người lao động') : tx('Danh mục cẩm nang nhà tuyển dụng'),
              }}
            />
          </aside>

          <main className="min-w-0 flex-1">
            <FeaturedArticleList articles={featured} meta={meta} />
            <ArticleGrid
              articles={gridArticles}
              meta={meta}
              emptyText={tx('Không tìm thấy bài viết nào.')}
              title={
                current
                  ? tx('Bài viết thuộc danh mục "{category}"').replace('{category}', categoryLabel(current, locale))
                  : tx('Bài viết khác')
              }
            />
          </main>
        </div>
      </div>
    </div>
  );
}

/** `/handbook` chưa chọn vai trò: hai cẩm nang riêng, mỗi thẻ dẫn vào một bên. */
function HandbookChooser({ locale, tx }: { locale: 'vi' | 'en'; tx: (s: string) => string }) {
  const cards: { audience: HandbookAudience; title: string; lead: string; cta: string }[] = [
    {
      audience: 'worker',
      title: tx('Cẩm nang người lao động'),
      lead: tx('Chuẩn bị cho ca đầu tiên, giữ điểm uy tín, hiểu cách nhận tiền công và đi làm an toàn.'),
      cta: tx('Đọc cẩm nang người lao động'),
    },
    {
      audience: 'employer',
      title: tx('Cẩm nang nhà tuyển dụng'),
      lead: tx('Viết tin đăng, chọn người phù hợp, hiểu tiền giữ - phí - hoàn tiền và xử lý khi người lao động vắng mặt.'),
      cta: tx('Đọc cẩm nang nhà tuyển dụng'),
    },
  ];
  return (
    <div className="bg-white">
      <div className="bg-orange-50/30 pb-12 pt-16 lg:pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">{tx('Cẩm nang làm việc')}</h1>
          <p className="mt-4 max-w-3xl text-lg text-gray-600">
            {tx('Hai cẩm nang riêng cho hai vai trò. Chọn cẩm nang dành cho bạn.')}
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ul className="grid gap-6 md:grid-cols-2">
          {cards.map((card) => {
            const count = handbookArticlesFor(card.audience).length;
            return (
              <li key={card.audience}>
                <Link
                  href={handbookListHref(card.audience)}
                  className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:ring-1 hover:ring-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <h2 className="text-2xl font-bold text-gray-900 group-hover:text-orange-700">{card.title}</h2>
                  <p className="mt-2 text-gray-600">{card.lead}</p>
                  <p className="mt-4 text-sm text-gray-500">
                    {tx('{n} bài viết').replace('{n}', String(count))}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {handbookCategoriesFor(card.audience).map((c) => (
                      <li
                        key={c.id}
                        className="rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                      >
                        {categoryLabel(c, locale)}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-auto pt-6 text-sm font-semibold text-orange-700">
                    {card.cta} <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
