'use client';

/**
 * Chữ "đánh máy" khi cuộn tới: lần đầu khối lọt vào màn hình, chữ hiện dần từng
 * ký tự kèm con trỏ cam, gõ xong con trỏ mờ dần rồi tắt. Chỉ chạy MỘT lần.
 * Dùng TIẾT CHẾ: mỗi trang landing chỉ 2 câu then chốt (tiêu đề lời hứa giữa trang +
 * câu chốt cuối trang). Không dùng cho đoạn văn, danh sách, FAQ: chữ cần đọc phải
 * hiện ngay, gõ ra chỉ làm người xem phải chờ.
 *
 * - Khối đã nằm trong màn hình lúc tải trang → hiện đủ luôn, không gõ (chỉ gõ cho
 *   chỗ người xem cuộn tới).
 * - Giảm chuyển động / chưa chạy JS → hiện đủ chữ.
 * - Chữ THẬT luôn nằm trong DOM (trình đọc màn hình, tìm trong trang, test e2e đều
 *   thấy đúng một bản); lúc gõ nó chỉ trong suốt và giữ chỗ, phần đang gõ vẽ đè
 *   lên cùng ô lưới bằng `::before { content: attr(data-typed) }` — không xô lệch
 *   bố cục, không nhân đôi chữ.
 * - `delay` (ms) để các dòng trong một khối gõ lần lượt (tiêu đề trước, mô tả sau).
 *
 * Hẹn giờ ở đây chỉ để trình bày, không liên quan đồng bộ lifecycle (CLAUDE.md §5.6).
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { inViewport, watchReplay } from './viewReplay';

/** Cả câu gõ trong 0,35–1,5 giây: câu ngắn ~30ms/ký tự, đoạn dài nhanh dần. */
function typingMs(length: number) {
  return Math.max(350, Math.min(1500, length * 30));
}
/** Gõ xong giữ con trỏ thêm chừng này rồi trả về chữ thật. */
const CARET_TAIL_MS = 1000;

type Phase = 'full' | 'armed' | 'typing' | 'done';

export function TypeOnView({ text, delay = 0 }: { text: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const chars = useMemo(() => Array.from(text.normalize('NFC')), [text]);
  const [phase, setPhase] = useState<Phase>('full');
  const [count, setCount] = useState(0);

  // Lần đo đầu: đang trong màn hình → giữ nguyên; nằm dưới → ẩn chữ, chờ cuộn tới.
  // Khuất hẳn rồi cuộn tới lại → gõ lại từ đầu (04/10).
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const startInside = inViewport(el);
    const arm = () => {
      setCount(0);
      setPhase('armed');
    };
     
    if (!startInside) arm();
    return watchReplay(el, {
      rootMargin: '0px 0px -10% 0px',
      startInside,
      onEnter: () => {
        setCount(0);
        setPhase('typing');
      },
      onLeave: arm,
    });
  }, []);

  useEffect(() => {
    if (phase !== 'typing') return;
    const total = chars.length;
    const duration = typingMs(total);
    const start = performance.now() + delay;
    let raf = 0;
    // 04/10: chỉ setState khi số ký tự hiện ra đổi (không render lại mỗi khung hình).
    let last = -1;
    const tick = (now: number) => {
      const n = Math.max(0, Math.min(total, Math.ceil(((now - start) / duration) * total)));
      if (n !== last) {
        last = n;
        setCount(n);
      }
      if (n >= total) {
        setPhase('done');
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, chars.length, delay]);

  useEffect(() => {
    if (phase !== 'done') return;
    const id = window.setTimeout(() => setPhase('full'), CARET_TAIL_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  const overlay = phase !== 'full';

  return (
    <span ref={ref} className="grid">
      <span className={['col-start-1 row-start-1', overlay ? 'type-ghost' : ''].join(' ')}>{text}</span>
      {overlay && (
        <span
          aria-hidden="true"
          className="type-overlay pointer-events-none col-start-1 row-start-1"
          data-typed={chars.slice(0, count).join('')}
        >
          {/* Con trỏ chỉ hiện khi dòng này đang gõ (không hiện lúc chờ `delay`) → một
              khối nhiều dòng không nhấp nháy cả loạt con trỏ cùng lúc. */}
          {((phase === 'typing' && count > 0) || phase === 'done') && (
            <span className={['type-caret', phase === 'done' ? 'type-caret-out' : ''].join(' ')} />
          )}
        </span>
      )}
    </span>
  );
}
