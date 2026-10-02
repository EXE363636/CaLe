/**
 * Slug không dấu cho loại việc trên đường dẫn: `/shifts?viec=pha-che` mở danh
 * sách ca đã lọc sẵn loại việc (02/10 — thẻ loại việc ở trang chủ). Giá trị là
 * đúng chuỗi `jobType` của form đăng ca (`ShiftForm` JOB_TYPES). "Khác" không có
 * slug vì không ứng với một việc cụ thể.
 */

export const JOB_TYPE_SLUGS: Readonly<Record<string, string>> = {
  'phuc-vu': 'Phục vụ',
  'pha-che': 'Pha chế',
  'kho-van': 'Kho vận',
  'su-kien': 'Hỗ trợ sự kiện',
  'phat-to-roi': 'Phát tờ rơi',
  'bao-ve': 'Bảo vệ',
  'thu-ngan': 'Thu ngân',
};

/** `pha-che` → `Pha chế`; slug lạ / rỗng → `undefined` (không lọc). */
export function jobTypeFromSlug(slug: string | null | undefined): string | undefined {
  if (!slug || !Object.prototype.hasOwnProperty.call(JOB_TYPE_SLUGS, slug)) return undefined;
  return JOB_TYPE_SLUGS[slug];
}

/** `Pha chế` → `pha-che`; loại không có slug → `undefined`. */
export function jobTypeSlug(jobType: string): string | undefined {
  return Object.keys(JOB_TYPE_SLUGS).find((slug) => JOB_TYPE_SLUGS[slug] === jobType);
}
