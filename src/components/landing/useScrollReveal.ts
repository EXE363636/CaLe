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
 * Hiện khi phần tử vào giữa màn hình (đầu lên tới 90%, đáy còn dưới 10%). Phần tử khuất
 * HẲN khỏi màn hình (trên hoặc dưới) thì được gài lại — người xem không thấy — nên kéo
 * lên kéo xuống là hiệu ứng chạy lại (04/10, chủ dự án). Đo bằng
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

    if (picked.length === 0) return;
    const vh = window.innerHeight;
    // Trạng thái từng phần tử: gài (ẩn, chờ vào màn hình) / đang hiện / đã hiện xong.
    // Lúc tải: nằm dưới màn hình → gài; đang thấy hoặc ở trên → coi như đã hiện (không
    // nháy ẩn rồi hiện), khuất hẳn rồi mới gài.
    const state = new Map<HTMLElement, 'armed' | 'in' | 'shown'>();
    const timers = new Map<HTMLElement, number>();
    for (const el of picked) {
      if (el.getBoundingClientRect().top >= vh) {
        el.dataset.reveal = 'armed';
        state.set(el, 'armed');
      } else {
        state.set(el, 'shown');
      }
    }
    let raf = 0;

    const clearTimer = (el: HTMLElement) => {
      const t = timers.get(el);
      if (t !== undefined) {
        window.clearTimeout(t);
        timers.delete(el);
      }
    };

    const check = () => {
      raf = 0;
      const h = window.innerHeight;
      const line = h * LINE;
      // Đọc hết vị trí trước, rồi mới ghi (không đo xen ghi → không tính lại bố cục).
      const rects = picked.map((el) => el.getBoundingClientRect());
      const now: HTMLElement[] = [];
      picked.forEach((el, i) => {
        const r = rects[i];
        const st = state.get(el);
        if (r.bottom <= 0 || r.top >= h) {
          // Khuất hẳn → gài lại cho lần cuộn tới sau (không có chuyển tiếp khi gài).
          if (st !== 'armed') {
            clearTimer(el);
            el.style.removeProperty('--ri');
            el.dataset.reveal = 'armed';
            state.set(el, 'armed');
          }
        } else if (st === 'armed' && r.top < line && r.bottom > h - line) {
          now.push(el);
        }
      });
      now.forEach((el, i) => {
        el.style.setProperty('--ri', String(Math.min(i, MAX_STEPS)));
        el.dataset.reveal = 'in';
        state.set(el, 'in');
        // Xong chuyển động: gỡ thuộc tính, trả transition / transform gốc (hover…).
        timers.set(
          el,
          window.setTimeout(() => {
            timers.delete(el);
            if (state.get(el) !== 'in') return;
            delete el.dataset.reveal;
            el.style.removeProperty('--ri');
            state.set(el, 'shown');
          }, DONE_MS + MAX_STEPS * STEP_MS),
        );
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(raf);
      for (const t of timers.values()) window.clearTimeout(t);
      // Rời trang giữa chừng: trả mọi phần tử về trạng thái hiện đủ.
      for (const el of picked) {
        delete el.dataset.reveal;
        el.style.removeProperty('--ri');
      }
    };
  }, [rootRef]);
}
