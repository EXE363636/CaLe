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
    let raf = 0;
    const reveal = () => {
      el.dataset.in = 'true';
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) reveal();
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    // Dự phòng (03/10): có lúc IntersectionObserver không báo (cuộn rất nhanh qua khối, mở
    // bằng link `#khối` nằm dưới, tab vừa hiện lại) → khối nằm trống mãi. Kiểm tra thêm khi
    // cuộn / đổi cỡ: đầu khối đã lên tới 85% màn hình, hoặc đã cuộn qua hẳn → hiện.
    const check = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.85 || r.bottom < 0) reveal();
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    io.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
