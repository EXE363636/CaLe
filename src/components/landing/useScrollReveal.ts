'use client';

/**
 * Hiện dần khi cuộn cho trang công khai (03/10, chủ dự án chọn nhóm "hiện dần khi cuộn").
 * Gắn trong `ToneScroll` → mọi trang dùng khung đó tự có, không sửa từng trang.
 *
 * Phần tử được làm hiệu ứng (trong mỗi khối con của gốc, BỎ khối đầu = màn đầu):
 * tiêu đề `h2`, đoạn ngay sau `h2`, từng mục cấp một của danh sách (`ul/ol > li`), hình
 * minh hoạ (`figure`), ảnh (`img`) và phần tử có `data-reveal-item`. Bỏ qua:
 *   - thứ đã có hiệu ứng riêng: trong `[data-motion]` (MotionGroup), `[data-reveal-skip]`
 *     (vd vòng thẻ loại việc `JobRing`), lớp `m-*`, `hero-in`, `motion-*`; bên trong `[aria-hidden="true"]` (ruột minh hoạ tự chạy);
 *   - mục của khung cuộn ngang (thanh trượt "Đội ngũ"), menu (`nav`), `details` đang đóng;
 *   - phần tử nằm trong một phần tử khác đã được chọn (không lồng hai lớp chuyển động);
 *   - phần tử đang nằm trên / trong màn hình lúc tải (không nháy ẩn rồi hiện).
 *
 * Hiện khi đầu phần tử lên tới 90% chiều cao màn hình (hoặc đã bị cuộn qua). Đo bằng
 * `getBoundingClientRect` mỗi khung hình khi cuộn / đổi cỡ, KHÔNG dùng IntersectionObserver
 * (rootMargin bị bỏ qua trong iframe khác nguồn → có lúc khối nằm trống mãi). Những phần
 * tử hiện cùng một khung hình nối nhau 70ms (tối đa 6 bậc). Xong chuyển động thì gỡ
 * thuộc tính để trả lại transition / transform gốc của phần tử (hover…).
 * Giảm chuyển động → không làm gì.
 */

import { useEffect, type RefObject } from 'react';

const ITEM = 'h2, h2 + p, ul > li, ol > li, figure, img, [data-reveal-item]';
const SKIP_INSIDE = '[data-motion], [data-reveal-skip], [aria-hidden="true"], nav, details:not([open]), .hero-in';
const SKIP_CLASS = /(^|\s)(m-[a-z]+|hero-in|motion-[a-z-]+)(\s|$)/;
const LINE = 0.9;
const STEP_MS = 70;
const MAX_STEPS = 6;
const DONE_MS = 1200;

function scrollsHorizontally(el: Element | null): boolean {
  if (!el) return false;
  const ox = getComputedStyle(el).overflowX;
  return ox === 'auto' || ox === 'scroll';
}

export function useScrollReveal(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const blocks = Array.from(root.children).slice(1);
    const picked: HTMLElement[] = [];
    for (const block of blocks) {
      for (const el of Array.from(block.querySelectorAll<HTMLElement>(ITEM))) {
        if (SKIP_CLASS.test(el.className && typeof el.className === 'string' ? el.className : '')) continue;
        if (el.parentElement?.closest(SKIP_INSIDE) || el.matches('[data-motion], [data-reveal-skip], [aria-hidden="true"]')) continue;
        if (el.tagName === 'LI' && scrollsHorizontally(el.parentElement)) continue;
        if (picked.some((p) => p.contains(el))) continue;
        picked.push(el);
      }
    }

    const vh = window.innerHeight;
    const armed = picked.filter((el) => el.getBoundingClientRect().top >= vh);
    if (armed.length === 0) return;
    for (const el of armed) el.dataset.reveal = 'armed';

    const timers: number[] = [];
    let pending = armed.slice();
    let raf = 0;

    const check = () => {
      raf = 0;
      const line = window.innerHeight * LINE;
      const now: HTMLElement[] = [];
      pending = pending.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < line || r.bottom < 0) {
          now.push(el);
          return false;
        }
        return true;
      });
      now.forEach((el, i) => {
        el.style.setProperty('--ri', String(Math.min(i, MAX_STEPS)));
        el.dataset.reveal = 'in';
      });
      if (now.length) {
        timers.push(
          window.setTimeout(() => {
            for (const el of now) {
              delete el.dataset.reveal;
              el.style.removeProperty('--ri');
            }
          }, DONE_MS + MAX_STEPS * STEP_MS),
        );
      }
      if (pending.length === 0) stop();
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    const stop = () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();

    return () => {
      stop();
      cancelAnimationFrame(raf);
      for (const t of timers) window.clearTimeout(t);
      // Rời trang giữa chừng: trả mọi phần tử về trạng thái hiện đủ.
      for (const el of armed) {
        delete el.dataset.reveal;
        el.style.removeProperty('--ri');
      }
    };
  }, [rootRef]);
}
