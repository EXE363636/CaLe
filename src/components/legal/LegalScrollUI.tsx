'use client';

/**
 * Phần chạy theo cuộn của trang pháp lý (03/10, làm lại):
 *   - `LegalTocNav`: mục lục cột trái (từ `lg`, dính khi cuộn), sáng mục đang đọc —
 *     mục cuối cùng có tiêu đề đã qua mép dưới header (~140px), `aria-current="location"`.
 *   - `LegalProgress`: vạch cam mảnh trên cùng màn hình theo phần bài đã đọc (chỉ đổi bề
 *     rộng, không chuyển động trang trí). `aria-hidden`.
 * Cả hai tính lại trong `requestAnimationFrame` khi cuộn / đổi cỡ, không polling.
 */

import { useEffect, useRef, useState } from 'react';

export interface LegalTocItem {
  id: string;
  n: number;
  title: string;
}

const ANCHOR_LINE = 140;

export function LegalTocNav({ label, items }: { label: string; items: LegalTocItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '');

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      let current = items[0]?.id ?? '';
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= ANCHOR_LINE) current = it.id;
      }
      // Cuộn chạm đáy trang → mục cuối (mục ngắn không bao giờ lên tới vạch).
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = items[items.length - 1]?.id ?? current;
      }
      setActive(current);
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
  }, [items]);

  return (
    <nav aria-label={label} className="hidden lg:sticky lg:top-32 lg:block lg:self-start">
      <p className="mb-3 px-4 text-sm font-semibold text-gray-900">{label}</p>
      <ol className="flex flex-col border-l-2 border-orange-100">
        {items.map((it) => {
          const on = it.id === active;
          return (
            <li key={it.id} className="-ml-0.5">
              <a
                href={`#${it.id}`}
                aria-current={on ? 'location' : undefined}
                className={[
                  'flex min-h-[44px] items-center gap-3 border-l-2 py-2 pl-4 pr-3 text-sm leading-snug transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 motion-reduce:transition-none',
                  on ? 'border-orange-500 font-semibold text-gray-900' : 'border-transparent text-gray-600 hover:text-gray-900',
                ].join(' ')}
              >
                <span className={['w-5 shrink-0 text-xs tabular-nums', on ? 'text-orange-700' : 'text-gray-500'].join(' ')}>
                  {String(it.n).padStart(2, '0')}
                </span>
                <span className="min-w-0">{it.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function LegalProgress({ targetId }: { targetId: string }) {
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = document.getElementById(targetId);
      const bar = barRef.current;
      if (!el || !bar) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.5;
      const done = total > 0 ? Math.min(1, Math.max(0, (ANCHOR_LINE - r.top) / total)) : 1;
      bar.style.transform = `scaleX(${done})`;
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
  }, [targetId]);

  return (
    <span aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1">
      <span ref={barRef} className="block h-full origin-left bg-orange-500" style={{ transform: 'scaleX(0)' }} />
    </span>
  );
}
