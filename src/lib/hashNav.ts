/**
 * Link nội bộ có `#khối` (03/10). Next 16.2 lưu `canonicalUrl` của tuyến KÈM hash khi đi
 * tới `/trang#khối` bằng điều hướng phía client, rồi lần sau cộng thêm hash mới vào sau
 * (`/for-workers#a#b`) hoặc giữ hash cũ khi bấm `/for-workers`. Bấm lại đúng `#khối` đang
 * mở thì Next coi là cùng trang và cuộn về đầu. Vì vậy app tự xử lý các link này
 * (`HashLinkHandler`): cùng trang thì cuộn tới khối; khác trang thì điều hướng KHÔNG kèm
 * hash, vẽ xong mới cuộn và ghi hash vào thanh địa chỉ.
 */

export interface HashTarget {
  /** Đường dẫn + query, không hash (vd `/for-workers`). */
  path: string;
  /** id của khối (đã giải mã). */
  id: string;
  /** URL đầy đủ để ghi vào thanh địa chỉ (vd `/for-workers#worker-cancel`). */
  url: string;
}

/**
 * Trả về đích nếu `href` là link CÙNG nguồn, có đường dẫn (không bắt đầu bằng `#`) và có
 * hash khác rỗng; ngược lại `null` (để trình duyệt / Next xử lý như thường). Link chỉ có
 * `#khối` giữ hành vi gốc của trình duyệt (vd link "Bỏ qua tới nội dung" chuyển focus).
 */
export function parseHashHref(href: string, currentHref: string): HashTarget | null {
  if (!href || href.startsWith('#')) return null;
  let url: URL;
  let base: URL;
  try {
    base = new URL(currentHref);
    url = new URL(href, base);
  } catch {
    return null;
  }
  if (url.origin !== base.origin) return null;
  if (url.hash.length <= 1) return null;
  let id: string;
  try {
    id = decodeURIComponent(url.hash.slice(1));
  } catch {
    id = url.hash.slice(1);
  }
  const path = `${url.pathname}${url.search}`;
  return { path, id, url: `${path}${url.hash}` };
}
