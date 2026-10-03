import { describe, expect, it } from 'vitest';
import { isPublicSkinPath } from '@/lib/publicSkin';

describe('isPublicSkinPath — trang mang da "giấy trắng, cam rõ" (03/10)', () => {
  it('trang chủ, trang vai trò, trang thông tin, cẩm nang, đăng nhập là trang công khai', () => {
    for (const p of [
      '/',
      '/for-workers',
      '/for-employers',
      '/handbook',
      '/handbook/bai-viet',
      '/faq',
      '/terms',
      '/privacy',
      '/disputes',
      '/support',
      '/user-guide',
      '/login',
      '/register',
      '/forgot-password',
      '/shifts',
    ]) {
      expect(isPublicSkinPath(p), p).toBe(true);
    }
  });

  it('app (dashboard, lịch, trang ca, quản trị) giữ màu cũ', () => {
    for (const p of ['/about', '/pricing', '/safety', '/how-it-works', '/shifts/abc', '/worker/dashboard', '/employer/schedule', '/admin/dashboard', '/for-workersx', '']) {
      expect(isPublicSkinPath(p), p).toBe(false);
    }
  });
});
