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
import { GuideHero } from '@/components/landing/GuideHero';
import { LandingIconGlyph } from '@/components/landing/LandingSections';
import { RoleBand } from '@/components/landing/RoleBand';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { getLocale, getTx } from '@/i18n/server';
import { categoryLabel, handbookListHref, localizeArticle } from '@/lib/handbook';

export const dynamic = 'force-dynamic';

/**
 * Cẩm nang làm việc — HAI cẩm nang riêng, không trộn bài (01/10):
 *   - `/handbook`                    → chọn cẩm nang (người lao động / nhà tuyển dụng);
 *   - `/handbook?for=worker|employer` → danh mục + bài của đúng vai trò đó;
 *   - `&category=<id>`               → lọc trong vai trò (danh mục vai trò kia → bỏ qua).
 *
 * 03/10 — làm lại theo ngôn ngữ landing: phần đầu `GuideHero` trên nền kem, danh mục
 * thành hàng chip phía trên bài (thay cột trái), bài nổi bật dạng thẻ sáng hai cột,
 * dải cuối trang theo vai trò (`RoleBand`).
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
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      {/* Không dòng nhãn "Cẩm nang làm việc": trùng ý tiêu đề "Cẩm nang người lao động / nhà tuyển dụng". */}
      <GuideHero
        title={isWorker ? tx('Cẩm nang người lao động') : tx('Cẩm nang nhà tuyển dụng')}
        top={
          <HandbookAudienceSwitch
            current={audience}
            labels={{
              nav: tx('Chọn cẩm nang theo vai trò'),
              worker: tx('Người lao động'),
              employer: tx('Nhà tuyển dụng'),
            }}
          />
        }
        lead={
          isWorker
            ? tx('Chuẩn bị cho ca đầu tiên, giữ đánh giá tốt, hiểu cách nhận tiền công và đi làm an toàn.')
            : tx('Viết tin đăng, chọn người phù hợp, hiểu tiền giữ, phí, hoàn tiền và xử lý khi người lao động vắng mặt.')
        }
      />

      <section data-tone="paper" className="px-4 pb-16 pt-2 sm:px-6 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
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
          <div className="mt-8">
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
          </div>
        </div>
      </section>
      <RoleBand audience={audience} />
    </ToneScroll>
  );
}

/** `/handbook` chưa chọn vai trò: hai cẩm nang riêng, mỗi thẻ dẫn vào một bên. */
function HandbookChooser({ locale, tx }: { locale: 'vi' | 'en'; tx: (s: string) => string }) {
  const cards: { audience: HandbookAudience; icon: 'calendar' | 'status'; title: string; lead: string; cta: string }[] = [
    {
      audience: 'worker',
      icon: 'calendar',
      title: tx('Cẩm nang người lao động'),
      lead: tx('Chuẩn bị cho ca đầu tiên, giữ đánh giá tốt, hiểu cách nhận tiền công và đi làm an toàn.'),
      cta: tx('Đọc cẩm nang người lao động'),
    },
    {
      audience: 'employer',
      icon: 'status',
      title: tx('Cẩm nang nhà tuyển dụng'),
      lead: tx('Viết tin đăng, chọn người phù hợp, hiểu tiền giữ, phí, hoàn tiền và xử lý khi người lao động vắng mặt.'),
      cta: tx('Đọc cẩm nang nhà tuyển dụng'),
    },
  ];
  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Hướng dẫn theo vai trò')}
        title={tx('Cẩm nang làm việc')}
        lead={tx('Hai cẩm nang riêng cho hai vai trò. Chọn cẩm nang dành cho bạn.')}
      />
      <section data-tone="paper" className="px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14 lg:px-8">
        <ul className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          {cards.map((card) => {
            const count = handbookArticlesFor(card.audience).length;
            return (
              <li key={card.audience}>
                <Link
                  href={handbookListHref(card.audience)}
                  className="group flex h-full flex-col rounded-3xl bg-white p-6 shadow-card ring-1 ring-black/5 transition-shadow hover:shadow-lg hover:ring-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:p-8"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                    <LandingIconGlyph name={card.icon} />
                  </span>
                  <h2 className="mt-5 text-2xl font-bold tracking-tight text-gray-900 group-hover:text-orange-700">{card.title}</h2>
                  <p className="mt-2 leading-relaxed text-gray-600">{card.lead}</p>
                  <p className="mt-5 text-sm font-semibold text-gray-900">
                    {tx('{n} bài viết').replace('{n}', String(count))}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {handbookCategoriesFor(card.audience).map((c) => (
                      <li key={c.id} className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-800">
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
      </section>
    </ToneScroll>
  );
}
