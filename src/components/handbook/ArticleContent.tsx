import { HandbookArticleSection } from '@/data/mock/handbookArticles';

/**
 * Thân bài cẩm nang. 03/10: chữ căn trái (bỏ căn đều hai bên, khó đọc với tiếng Việt),
 * cột đọc do trang giới hạn; ghi chú là khối nhấn viền cam bên trái.
 */
export function ArticleContent({
  content,
  fallbackAlt,
}: {
  content: HandbookArticleSection[];
  /** Chữ thay thế khi mục ảnh không có chú thích / tiêu đề (theo ngôn ngữ). */
  fallbackAlt: string;
}) {
  if (!content || content.length === 0) return null;

  const renderText = (text: string) => {
    // Basic bold parsing for **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="text-base leading-relaxed text-gray-700 sm:text-[1.0625rem]">
      {content.map((section, idx) => (
        <div key={idx} className="mb-10 last:mb-0">
          {section.heading && (
            <h2 className="mb-4 text-balance text-2xl font-bold tracking-tight text-gray-900">{section.heading}</h2>
          )}
          {section.paragraphs && section.paragraphs.map((p, i) => (
            <p key={i} className="mb-4">
              {renderText(p)}
            </p>
          ))}
          {section.bullets && section.bullets.length > 0 && (
            <ul className="mb-4 list-disc space-y-2 pl-5 marker:text-orange-500">
              {section.bullets.map((b, i) => (
                <li key={i}>{renderText(b)}</li>
              ))}
            </ul>
          )}
          {section.imageUrl && (
            <figure className="my-8">
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh minh hoạ trong bài, cỡ tự nhiên */}
              <img
                src={section.imageUrl}
                alt={section.imageCaption || section.heading || fallbackAlt}
                className="h-auto max-h-[500px] w-full rounded-2xl object-cover ring-1 ring-black/5"
              />
              {section.imageCaption && (
                <figcaption className="mt-3 text-center text-sm text-gray-500">{section.imageCaption}</figcaption>
              )}
            </figure>
          )}
          {section.note && (
            <p className="my-6 rounded-r-2xl border-l-4 border-orange-400 bg-orange-50 px-5 py-4 text-sm font-medium leading-relaxed text-gray-800">
              {renderText(section.note)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
