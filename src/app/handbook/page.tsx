import { handbookArticles } from '@/data/mock/handbookArticles';
import { HandbookCategoryMenu } from '@/components/handbook/HandbookCategoryMenu';
import { FeaturedArticleList } from '@/components/handbook/FeaturedArticleList';
import { ArticleGrid } from '@/components/handbook/ArticleGrid';

export const metadata = { title: 'Cẩm nang làm việc — CaLẻ / Now' };
export const dynamic = 'force-dynamic';

export default async function HandbookPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const resolvedParams = await searchParams;
  const currentCategory = resolvedParams.category || 'all';

  // Lọc bài viết theo danh mục
  const filteredArticles =
    currentCategory === 'all'
      ? handbookArticles
      : handbookArticles.filter((a) => a.categoryId === currentCategory);

  // Tìm bài nổi bật (ưu tiên bài nổi bật trong danh mục, nếu không có lấy bài nổi bật chung)
  let featured = filteredArticles.filter((a) => a.featured);
  if (featured.length === 0) {
    featured = filteredArticles.slice(0, 4);
  }
  // Giới hạn 1 bài nổi bật
  featured = featured.slice(0, 1);

  // Các bài còn lại hiển thị ở lưới
  const featuredIds = new Set(featured.map((a) => a.id));
  const gridArticles = filteredArticles.filter((a) => !featuredIds.has(a.id)).slice(0, 12);

  const gridTitle =
    currentCategory === 'all'
      ? 'Bài viết mới nhất'
      : `Bài viết thuộc danh mục "${filteredArticles[0]?.categoryLabel || currentCategory}"`;

  return (
    <div className="bg-white">
      {/* Header section (replaces InfoPage) */}
      <div className="bg-orange-50/30 pb-12 pt-16 lg:pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-base sm:text-lg font-bold uppercase tracking-wider text-orange-600">
            Cẩm nang
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            Cẩm nang làm việc
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-gray-600">
            Bí quyết tìm việc, kinh nghiệm quản lý nhân sự và những câu chuyện thực tế dành cho người lao động và nhà tuyển dụng.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-10">
          
          {/* Sidebar */}
          <aside className="mb-8 w-full shrink-0 lg:mb-0 lg:w-64">
            <HandbookCategoryMenu currentCategory={currentCategory} />
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1">
            <FeaturedArticleList articles={featured} />
            <ArticleGrid articles={gridArticles} title={gridTitle} />
          </main>

        </div>
      </div>
    </div>
  );
}
