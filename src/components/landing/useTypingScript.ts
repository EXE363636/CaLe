'use client';

/**
 * Chạy một kịch bản `typingScript` MỘT lần khi khối lần đầu cuộn tới (03/10).
 *
 * - Bản server, chưa chạy JS và khi giảm chuyển động: trạng thái CUỐI (mọi ô đủ chữ,
 *   mọi mốc đã qua) — đọc được trọn, không phải chờ.
 * - Ở trình duyệt: về trạng thái trống ngay sau khi tải, cuộn tới thì gõ theo đồng hồ
 *   (requestAnimationFrame). Xong thì dừng; `replay()` chạy lại, `stop()` nhảy tới
 *   cuối (vd người xem bấm vào ô để tự sửa số).
 *
 * Hiệu ứng trình bày, không phải đồng bộ lifecycle (CLAUDE.md §5.6).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import { scriptDuration, scriptState, type ScriptItem, type ScriptState } from './typingScript';

export function useTypingScript(
  ref: RefObject<HTMLElement | null>,
  script: ScriptItem[],
  threshold = 0.4,
): { state: ScriptState; finished: boolean; reduced: boolean; replay: () => void; stop: () => void } {
  const total = useMemo(() => scriptDuration(script), [script]);
  const [elapsed, setElapsed] = useState(Number.POSITIVE_INFINITY);
  const [reduced, setReduced] = useState(false);
  const raf = useRef(0);

  const replay = useCallback(() => {
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    const tick = (now: number) => {
      const e = now - start;
      setElapsed(Math.min(e, total));
      if (e < total) raf.current = requestAnimationFrame(tick);
    };
    setElapsed(0);
    raf.current = requestAnimationFrame(tick);
  }, [total]);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setElapsed(Number.POSITIVE_INFINITY);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const r = requestAnimationFrame(() => setReduced(true));
      return () => cancelAnimationFrame(r);
    }
    // Về trạng thái trống (trong khung hình, không đồng bộ trong effect) rồi chờ cuộn tới.
    const arm = requestAnimationFrame(() => setElapsed(0));
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        replay();
      },
      { threshold },
    );
    io.observe(el);
    const pending = raf;
    return () => {
      cancelAnimationFrame(arm);
      io.disconnect();
      cancelAnimationFrame(pending.current);
    };
  }, [ref, replay, threshold]);

  const state = useMemo(() => scriptState(script, elapsed), [script, elapsed]);
  return { state, finished: elapsed >= total, reduced, replay, stop };
}
