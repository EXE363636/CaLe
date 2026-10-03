'use client';

/**
 * Nền trang đổi màu khi cuộn (02/10): mỗi khối con khai báo `data-tone="…"`; khối
 * nào đang cắt ngang giữa màn hình thì nền của CẢ vùng bọc chuyển dần sang tông
 * đó (`--tone-<tên>` trong globals.css, có bản giao diện tối). Các khối bên trong
 * để nền trong suốt; khối có nền riêng (dải mực) không cần `data-tone`.
 *
 * Chỉ đổi màu nền, không dịch chuyển gì; giảm chuyển động → đổi ngay, không chuyển
 * dần (CSS `.tone-scroll`). Bản server vẽ với tông đầu tiên.
 * 03/10: thêm hiện dần khi cuộn cho nội dung các khối (`useScrollReveal`).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useScrollReveal } from './useScrollReveal';

export function ToneScroll({
  initial,
  className,
  children,
}: {
  /** Tông lúc đầu — của khối trên cùng. */
  initial: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tone, setTone] = useState(initial);
  // Hiện dần khi cuộn cho mọi khối (trừ màn đầu) — 03/10.
  useScrollReveal(ref);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-tone]'));
    // Khối nào cắt ngang đường giữa màn hình là khối "đang xem". Tính lại tối đa một
    // lần mỗi khung hình khi cuộn / đổi cỡ (không dùng IntersectionObserver: rootMargin
    // bị bỏ qua khi trang nằm trong iframe khác nguồn).
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      for (const el of sections) {
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) {
          if (el.dataset.tone) setTone(el.dataset.tone);
          return;
        }
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  // Mở bằng link `#khối` (vd chuyển hướng từ trang hướng dẫn cũ, 03/10): trình duyệt cuộn
  // tới khối trước khi minh hoạ phía trên dựng xong nên dừng lệch. Cuộn lại MỘT lần khi
  // trang đã vẽ xong (không lặp, không theo dõi).
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    }, 300);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div ref={ref} data-active-tone={tone} className={['tone-scroll public-skin', className ?? ''].join(' ')} style={{ backgroundColor: `var(--tone-${tone})` }}>
      {children}
    </div>
  );
}
