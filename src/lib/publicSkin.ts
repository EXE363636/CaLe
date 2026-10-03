/**
 * Trang nào mang da công khai "giấy trắng, cam rõ" (`.public-skin` trong globals.css,
 * 03/10). Header và footer đọc hàm này để cùng màu với trang đang xem; app (dashboard,
 * lịch, trang ca, quản trị) giữ bảng màu cũ.
 */

const PUBLIC_PREFIXES = [
  '/for-workers',
  '/for-employers',
  '/handbook',
  '/faq',
  '/terms',
  '/privacy',
  '/disputes',
  '/support',
  '/user-guide',
  '/login',
  '/register',
  '/forgot-password',
];

export function isPublicSkinPath(pathname: string): boolean {
  // `/shifts` (danh sách ca) thuộc phần người lao động của trang công khai (03/10);
  // trang chi tiết ca `/shifts/[id]` vẫn là app.
  if (pathname === '/' || pathname === '/shifts') return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
