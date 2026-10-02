import type { Metadata } from 'next';

/**
 * Metadata cho thẻ chia sẻ link (Facebook, Zalo, X…) — 02/10. Ảnh là file
 * `opengraph-image.png` cạnh `page.tsx` (tạo bằng `scripts/generate-og-images.mjs`),
 * Next tự gắn og:image theo vị trí file. Tên tab trình duyệt vẫn giữ "CaLẻ" (title ở
 * layout gốc) — ở đây chỉ đặt tiêu đề / mô tả cho thẻ chia sẻ và mô tả SEO.
 *
 * Next ghép metadata theo từng khoá cấp một: trang đặt `openGraph` là thay cả khối
 * của layout, nên mỗi lần gọi đều trả đủ siteName / locale / type.
 */
export function shareMeta(title: string, description: string): Metadata {
  return {
    description,
    openGraph: { title, description, siteName: 'CaLẻ', locale: 'vi_VN', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}
