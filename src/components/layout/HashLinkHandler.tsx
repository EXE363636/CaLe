'use client';

/**
 * Tự xử lý mọi cú bấm vào link nội bộ dạng `/trang#khối` (03/10, xem `lib/hashNav.ts` về
 * lỗi hash của Next 16.2). Nghe ở pha capture trên `document` để `preventDefault` TRƯỚC
 * khi `<Link>` của Next xử lý (Link bỏ qua sự kiện đã bị chặn); các `onClick` riêng của
 * link (đóng menu…) vẫn chạy.
 *   - Cùng trang: cuộn tới khối (mượt, trừ khi giảm chuyển động) và ghi hash.
 *   - Khác trang: điều hướng tới trang KHÔNG kèm hash; khi trang mới có khối thì cuộn tới
 *     và ghi hash bằng `replaceState`, cuộn lại một lần sau 300ms (minh hoạ phía trên dựng
 *     xong làm lệch vị trí).
 * Bỏ qua: phím bổ trợ, nút chuột khác, `target` khác `_self`, `download`, link chỉ có `#`.
 */

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { parseHashHref, type HashTarget } from '@/lib/hashNav';

function scrollToId(id: string, smooth: boolean): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  // Khối đích còn chờ "hiện dần khi cuộn" (`useScrollReveal`, đang dịch xuống 16px) → cho
  // hiện ngay trước khi cuộn, nếu không trang cuộn tới vị trí đã dịch và tiêu đề dừng
  // lệch lên dưới header khi hiệu ứng xong (e2e 41, 03/10).
  const armed = el.dataset.reveal ? el : el.closest<HTMLElement>('[data-reveal]');
  if (armed) {
    delete armed.dataset.reveal;
    armed.style.removeProperty('--ri');
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ block: 'start', behavior: smooth && !reduced ? 'smooth' : 'auto' });
  return true;
}

export function HashLinkHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const pending = useRef<HashTarget | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const target = parseHashHref(a.getAttribute('href') ?? '', window.location.href);
      if (!target) return;
      e.preventDefault();
      const here = `${window.location.pathname}${window.location.search}`;
      if (target.path === here) {
        scrollToId(target.id, true);
        if (`${here}${window.location.hash}` !== target.url) window.history.pushState(null, '', target.url);
        return;
      }
      pending.current = target;
      router.push(target.path);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [router]);

  // Trang mới đã gắn: chờ khối xuất hiện (tối đa ~2 giây) rồi cuộn + ghi hash.
  useEffect(() => {
    const target = pending.current;
    if (!target) return;
    const targetPath = target.path.split('?')[0];
    if (pathname !== targetPath) return;
    pending.current = null;
    let frame = 0;
    let tries = 0;
    let again = 0;
    const attempt = () => {
      if (scrollToId(target.id, false)) {
        window.history.replaceState(null, '', target.url);
        again = window.setTimeout(() => scrollToId(target.id, false), 300);
        return;
      }
      if (++tries < 120) frame = requestAnimationFrame(attempt);
    };
    frame = requestAnimationFrame(attempt);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(again);
    };
  }, [pathname]);

  return null;
}
