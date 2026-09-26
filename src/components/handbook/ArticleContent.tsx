import { HandbookArticleSection } from '@/data/mock/handbookArticles';

export function ArticleContent({ content }: { content: HandbookArticleSection[] }) {
  if (!content || content.length === 0) return null;

  const renderText = (text: string) => {
    // Basic bold parsing for **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="prose prose-orange lg:prose-lg mx-auto max-w-none text-justify">
      {content.map((section, idx) => (
        <div key={idx} className="mb-8">
          {section.heading && (
            <h2 className="mb-4 text-2xl font-bold text-gray-900">{section.heading}</h2>
          )}
          {section.paragraphs && section.paragraphs.map((p, i) => (
            <p key={i} className="mb-4 leading-relaxed text-gray-700">
              {renderText(p)}
            </p>
          ))}
          {section.bullets && section.bullets.length > 0 && (
            <ul className="mb-4 list-disc pl-5 text-gray-700 space-y-2">
              {section.bullets.map((b, i) => (
                <li key={i}>{renderText(b)}</li>
              ))}
            </ul>
          )}
          {section.imageUrl && (
            <figure className="my-8">
              <img src={section.imageUrl} alt={section.imageCaption || section.heading || 'Minh họa bài viết'} className="w-full rounded-xl object-cover shadow-sm h-auto max-h-[500px]" />
              {section.imageCaption && (
                <figcaption className="mt-3 text-center text-sm text-gray-500 italic">
                  {section.imageCaption}
                </figcaption>
              )}
            </figure>
          )}
          {section.note && (
            <div className="my-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <p className="text-sm font-medium text-orange-900">{section.note}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
