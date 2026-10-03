'use client';

/**
 * Chạy một kịch bản `typingScript` khi khối cuộn tới, rồi TỰ LẶP (03/10; lặp từ 04/10).
 *
 * - Bản server, chưa chạy JS và khi giảm chuyển động: trạng thái CUỐI (mọi ô đủ chữ,
 *   mọi mốc đã qua) — đọc được trọn, không phải chờ.
 * - Ở trình duyệt: về trạng thái trống ngay sau khi tải, cuộn tới thì gõ theo đồng hồ
 *   (requestAnimationFrame). Xong thì giữ trạng thái cuối `LOOP_PAUSE_MS` cho người xem
 *   đọc rồi gõ lại từ đầu — chỉ khi khối còn trong màn hình và tab đang mở; cuộn đi rồi
 *   quay lại cũng gõ lại. Rê chuột vào khối → chờ, chưa gõ lại; người xem bấm / gõ /
 *   đưa tiêu điểm vào khối (đang tự thử) → thôi lặp cho tới khi cuộn đi rồi quay lại
 *   hoặc bấm `replay()`. `stop()` nhảy tới cuối và thôi lặp (vd bấm vào ô để tự sửa số).
 * - Chỉ setState khi phần NHÌN THẤY đổi (thêm một ký tự, đổi ô, qua mốc, xong), không
 *   phải mỗi khung hình.
 *
 * Hiệu ứng trình bày, không phải đồng bộ lifecycle (CLAUDE.md §5.6).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import { scriptDuration, scriptState, type ScriptItem, type ScriptState } from './typingScript';

/** Nghỉ ở trạng thái cuối bấy lâu rồi mới gõ lại (ms). */
export const LOOP_PAUSE_MS = 4500;

/** Khoá của phần nhìn thấy: chữ chỉ gõ thêm (tổng độ dài đủ phân biệt), ô đang gõ, số mốc, xong. */
function visibleKey(st: ScriptState): string {
  let len = 0;
  for (const v of Object.values(st.values)) len += v.length;
  return `${len}|${st.active ?? ''}|${st.marks.length}|${st.done ? 1 : 0}`;
}

export function useTypingScript(
  ref: RefObject<HTMLElement | null>,
  script: ScriptItem[],
  threshold = 0.4,
): { state: ScriptState; finished: boolean; reduced: boolean; replay: () => void; stop: () => void } {
  const total = useMemo(() => scriptDuration(script), [script]);
  const [elapsed, setElapsed] = useState(Number.POSITIVE_INFINITY);
  const [reduced, setReduced] = useState(false);
  /** Khối đang trong màn hình và tab đang mở. */
  const [visible, setVisible] = useState(false);
  /** Rê chuột trong khối (đang đọc) → chưa gõ lại. */
  const [hovered, setHovered] = useState(false);
  /** Người xem đã tự thao tác trong khối → thôi lặp (đổi state để huỷ hẹn giờ). */
  const [held, setHeld] = useState(false);
  const raf = useRef(0);
  /** Còn tự lặp không (`stop()` tắt, `replay()` bật lại). */
  const looping = useRef(true);
  const scriptRef = useRef(script);
  useEffect(() => {
    scriptRef.current = script;
  }, [script]);

  // Bản mới nhất cho bộ nghe IntersectionObserver (đọc trong callback).
  const elapsedRef = useRef(elapsed);
  const totalRef = useRef(total);
  useEffect(() => {
    elapsedRef.current = elapsed;
    totalRef.current = total;
  }, [elapsed, total]);

  const replay = useCallback(() => {
    cancelAnimationFrame(raf.current);
    looping.current = true;
    setHeld(false);
    const start = performance.now();
    let shownKey = visibleKey(scriptState(scriptRef.current, 0));
    const tick = (now: number) => {
      const e = Math.min(now - start, total);
      const key = visibleKey(scriptState(scriptRef.current, e));
      if (key !== shownKey || e >= total) {
        shownKey = key;
        setElapsed(e);
      }
      raf.current = e < total ? requestAnimationFrame(tick) : 0;
    };
    setElapsed(0);
    raf.current = requestAnimationFrame(tick);
  }, [total]);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    looping.current = false;
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
    let onScreen = false;
    let played = false;
    /** Khối đã khuất HẲN khỏi màn hình kể từ lượt trước (cuộn nhẹ khi bấm không tính). */
    let left = false;
    const update = () => {
      const shown = onScreen && !document.hidden;
      setVisible(shown);
      // Lần đầu cuộn tới, hoặc quay lại sau khi đã khuất hẳn mà lượt trước đã xong → gõ lại.
      const back = left && elapsedRef.current >= totalRef.current;
      if (shown && !raf.current && looping.current && (!played || back)) {
        played = true;
        left = false;
        replay();
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting && entry.intersectionRatio >= threshold - 0.01;
        if (!entry.isIntersecting && played) {
          // Cuộn đi hẳn → lần quay lại được lặp tiếp (bỏ "đang tự thử").
          left = true;
          looping.current = true;
          setHeld(false);
        }
        update();
      },
      { threshold: [0, threshold] },
    );
    io.observe(el);
    document.addEventListener('visibilitychange', update);
    const hold = () => {
      if (raf.current) return; // đang gõ: thao tác nào cũng không làm gián đoạn lượt này
      looping.current = false;
      setHeld(true);
    };
    const enter = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setHovered(true);
    };
    const leave = () => setHovered(false);
    el.addEventListener('pointerdown', hold);
    el.addEventListener('keydown', hold);
    el.addEventListener('focusin', hold);
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    const pending = raf;
    return () => {
      cancelAnimationFrame(arm);
      io.disconnect();
      document.removeEventListener('visibilitychange', update);
      el.removeEventListener('pointerdown', hold);
      el.removeEventListener('keydown', hold);
      el.removeEventListener('focusin', hold);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(pending.current);
      pending.current = 0;
    };
  }, [ref, replay, threshold]);

  const finished = elapsed >= total;
  // Xong một lượt mà khối vẫn trong màn hình: nghỉ một nhịp rồi gõ lại.
  useEffect(() => {
    if (reduced || !finished || !visible || hovered || held || !looping.current) return;
    if (elapsed === Number.POSITIVE_INFINITY) return;
    const timer = window.setTimeout(() => {
      if (looping.current) replay();
    }, LOOP_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [reduced, finished, visible, hovered, held, elapsed, replay]);

  const state = useMemo(() => scriptState(script, elapsed), [script, elapsed]);
  return { state, finished, reduced, replay, stop };
}
