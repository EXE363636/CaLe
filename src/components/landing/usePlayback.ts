'use client';

/**
 * Chạy lần lượt các bước của một minh hoạ landing (`durations[i]` = thời gian
 * dừng ở bước i), lặp lại, chỉ khi `ref` đang trong khung nhìn và tab hiện.
 * `durations` có thể là hàm theo vòng (`round => number[]`) khi mỗi vòng có số
 * bước khác nhau (vd minh hoạ nhà tuyển dụng: số người cần duyệt, ca bị huỷ).
 * Trả về `step` (chỉ số bước) và `round` (số lần đã quay lại bước 0 — để minh
 * hoạ đổi sang ca mẫu khác mỗi vòng). `initial` là bước hiện ở bản server và khi
 * giảm chuyển động (`prefers-reduced-motion`) — minh hoạ đứng yên ở đó.
 *
 * Đây là hiệu ứng trình bày, không phải đồng bộ lifecycle của app (CLAUDE.md §5.6).
 */

import { useEffect, useRef, useState, type RefObject } from 'react';

export function usePlayback(
  ref: RefObject<HTMLElement | null>,
  durations: number[] | ((round: number) => number[]),
  initial = 0,
): { step: number; round: number } {
  const [pos, setPos] = useState({ step: initial, round: 0 });
  const stepRef = useRef(initial);
  const roundRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let visible = false;
    let timer: number | undefined;
    const run = () => {
      window.clearTimeout(timer);
      if (!visible || document.hidden) {
        el.dataset.playback = 'paused';
        return;
      }
      const list = typeof durations === 'function' ? durations(roundRef.current) : durations;
      timer = window.setTimeout(() => {
        stepRef.current += 1;
        if (stepRef.current >= list.length) {
          stepRef.current = 0;
          roundRef.current += 1;
        }
        setPos({ step: stepRef.current, round: roundRef.current });
        run();
      }, list[stepRef.current]);
      // Mốc cho e2e: hẹn giờ của bước hiện tại đã đặt (đã hydrate + đang trong khung nhìn).
      el.dataset.playback = 'running';
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        // Chỉ đặt lại hẹn giờ khi đổi hiện ↔ ẩn: callback lặp lại (vd đổi tỉ lệ giao)
        // không được làm bước hiện tại chạy lại từ đầu.
        if (entry.isIntersecting === visible) return;
        visible = entry.isIntersecting;
        run();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    document.addEventListener('visibilitychange', run);
    return () => {
      window.clearTimeout(timer);
      io.disconnect();
      document.removeEventListener('visibilitychange', run);
      delete el.dataset.playback;
    };
    // durations là hằng số của từng minh hoạ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return pos;
}
