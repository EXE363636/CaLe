'use client';

/**
 * Đăng nhập Google lần đầu (chưa có hồ sơ) → luôn đưa về bước "Hoàn tất đăng ký",
 * dù Supabase trả người dùng về trang nào (vd trang chủ khi redirect URL chưa
 * được cho phép). Chỉ có tác dụng khi authStore.pendingOAuth được đặt (supabase).
 */

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuthStore } from '@/stores/authStore';

export function OAuthOnboardingRedirect() {
  const pendingOAuth = useAuthStore((s) => s.pendingOAuth);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pendingOAuth && pathname !== '/register') {
      router.replace('/register?complete=google');
    }
  }, [pendingOAuth, pathname, router]);

  return null;
}
