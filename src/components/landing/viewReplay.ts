/**
 * Hiệu ứng "vào khung nhìn" chạy LẠI mỗi lần cuộn tới (04/10 — chủ dự án: kéo lên kéo
 * xuống thì hiệu ứng phải chạy lại).
 *
 * `onEnter` khi phần tử vào vùng kích hoạt (`threshold` / `rootMargin` như từng hiệu ứng
 * vẫn dùng); `onLeave` khi phần tử đã khuất HẲN khỏi màn hình — đặt lại trạng thái đầu
 * lúc người xem không nhìn thấy, nên không có cảnh nội dung "biến mất" trước mắt.
 * `startInside`: phần tử đang nằm trong màn hình lúc gắn (không chạy, chờ ra rồi vào lại).
 *
 * Hiệu ứng trình bày, không phải đồng bộ lifecycle (CLAUDE.md §5.6).
 */

export interface ViewReplayOptions {
  threshold?: number;
  rootMargin?: string;
  startInside?: boolean;
  onEnter: () => void;
  onLeave: () => void;
}

/** Phần tử có phần nào nằm trong màn hình không (đo trực tiếp). */
export function inViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight && r.bottom > 0;
}

/** Theo dõi vào / ra khung nhìn; trả về hàm huỷ theo dõi. */
export function watchReplay(el: Element, opts: ViewReplayOptions): () => void {
  let inside = opts.startInside ?? false;
  const enter = new IntersectionObserver(
    (entries) => {
      if (!inside && entries.some((e) => e.isIntersecting)) {
        inside = true;
        opts.onEnter();
      }
    },
    { threshold: opts.threshold ?? 0, rootMargin: opts.rootMargin ?? '0px' },
  );
  const leave = new IntersectionObserver((entries) => {
    if (inside && entries.every((e) => !e.isIntersecting)) {
      inside = false;
      opts.onLeave();
    }
  });
  enter.observe(el);
  leave.observe(el);
  return () => {
    enter.disconnect();
    leave.disconnect();
  };
}
