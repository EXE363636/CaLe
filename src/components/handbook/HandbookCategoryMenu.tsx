import Link from 'next/link';

interface Category {
  id: string;
  label: string;
}

const CATEGORIES: Category[] = [
  { id: 'all', label: 'Tất cả bài viết' },
  { id: 'bat-dau-lam-ca', label: 'Bắt đầu làm ca' },
  { id: 'kinh-nghiem-di-lam', label: 'Kinh nghiệm đi làm' },
  { id: 'luong-quyen-loi', label: 'Lương & quyền lợi' },
  { id: 'an-toan-nhan-ca', label: 'An toàn khi nhận ca' },
  { id: 'danh-cho-doanh-nghiep', label: 'Dành cho doanh nghiệp' },
];

export function HandbookCategoryMenu({ currentCategory }: { currentCategory: string }) {
  return (
    <nav aria-label="Danh mục Cẩm nang làm việc" className="flex flex-col gap-2">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2 px-3 lg:px-0">
        Danh mục
      </h3>
      <ul className="flex overflow-x-auto lg:flex-col lg:overflow-visible gap-2 px-3 lg:px-0 pb-2 lg:pb-0 hide-scrollbar">
        {CATEGORIES.map((cat) => {
          const isActive =
            cat.id === 'all'
              ? !currentCategory || currentCategory === 'all'
              : currentCategory === cat.id;

          const href = cat.id === 'all' ? '/handbook' : `/handbook?category=${cat.id}`;

          return (
            <li key={cat.id} className="shrink-0">
              <a
                href={href}
                className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {cat.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
