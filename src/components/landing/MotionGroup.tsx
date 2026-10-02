'use client';

/**
 * MotionGroup — bật chuyển động "vào khung nhìn" cho một khối landing.
 *
 * Nội dung LUÔN hiện ở bản server (SSR) và khi JavaScript lỗi: CSS chỉ ẩn phần
 * tử con khi khối mang `data-motion="armed"`, mà thuộc tính đó chỉ được gắn ở
 * trình duyệt cho khối CHƯA nằm trong khung nhìn. Khi khối cuộn tới, gắn
 * `data-in` → các lớp `m-*` trong globals.css chạy chuyển động một lần.
 *
 * `prefers-reduced-motion: reduce` → không gắn gì, khối tĩnh như bản server.
 * Không phải đồng bộ lifecycle (CLAUDE.md §5.6) — chỉ là hiệu ứng trình bày.
 */

import { useLayoutEffect, useRef, type ReactNode } from 'react';

export function MotionGroup({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = el.getBoundingClientRect();
    // Đã nằm trong khung nhìn lúc tải trang → giữ nguyên, không nháy ẩn rồi hiện.
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    el.dataset.motion = 'armed';
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.in = 'true';
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
