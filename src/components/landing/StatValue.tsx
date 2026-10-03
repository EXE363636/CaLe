'use client';

/**
 * Số liệu lớn ở khối "Vì sao CaLẻ ra đời?" (02/10): lần đầu cuộn tới, số đếm lên
 * từ 0 tới giá trị thật (~1,2 giây) bằng màu chữ thường, đếm xong chuyển dần sang
 * cam đậm (`.stat-mark`). Chỉ chạy MỘT lần.
 *
 * - Giữ nguyên cách viết số theo ngôn ngữ: "2,53 triệu" / "329.500" (vi), "2.53
 *   million" / "329,500" (en) — tách phần số trong chuỗi đã dịch, đếm, định dạng lại
 *   với đúng số chữ số thập phân.
 * - Đã trong màn hình lúc tải / giảm chuyển động / chưa chạy JS → hiện đủ số, màu cam
 *   sẵn (không đếm lại từ 0 trước mắt người xem).
 * - Không xô lệch: số thật (đã đủ) giữ chỗ, số đang đếm vẽ đè trên cùng ô lưới.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import type { Locale } from '@/i18n/locale';

import { inViewport, watchReplay } from './viewReplay';

const DURATION_MS = 1200;

/** Tách "2,53 triệu" → { prefix: '', num: 2.53, decimals: 2, suffix: ' triệu' }. */
function parse(value: string, locale: Locale) {
  const m = value.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return null;
  const raw = m[0];
  const decimalSep = locale === 'vi' ? ',' : '.';
  const groupSep = locale === 'vi' ? '.' : ',';
  const normalized = raw.split(groupSep).join('').replace(decimalSep, '.');
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  const decimals = raw.includes(decimalSep) ? raw.length - raw.indexOf(decimalSep) - 1 : 0;
  return { prefix: value.slice(0, m.index), num, decimals, suffix: value.slice(m.index + raw.length) };
}

type Phase = 'static' | 'armed' | 'counting' | 'done';

export function StatValue({ value, locale, className }: { value: string; locale: Locale; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const parts = useMemo(() => parse(value, locale), [value, locale]);
  const [phase, setPhase] = useState<Phase>('static');
  const [shown, setShown] = useState<number | null>(null);
  // 04/10: tạo bộ định dạng một lần (không tạo lại mỗi khung hình khi đang đếm).
  const fmt = useMemo(
    () =>
      parts
        ? new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
            minimumFractionDigits: parts.decimals,
            maximumFractionDigits: parts.decimals,
          })
        : null,
    [parts, locale],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || !parts || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Đã thấy lúc tải: giữ số thật. Khuất hẳn rồi cuộn tới lại → đếm lại từ 0 (04/10).
    const startInside = inViewport(el);
    const arm = () => {
      setShown(0);
      setPhase('armed');
    };
     
    if (startInside) setPhase('done');
    else arm();
    return watchReplay(el, {
      threshold: 0.6,
      startInside,
      onEnter: () => {
        setShown(0);
        setPhase('counting');
      },
      onLeave: arm,
    });
  }, [parts]);

  useEffect(() => {
    if (phase !== 'counting' || !parts) return;
    const start = performance.now();
    let raf = 0;
    // 04/10: làm tròn theo số chữ số thập phân hiển thị; chỉ setState khi con số
    // NHÌN THẤY đổi (không render lại mỗi khung hình).
    const unit = Math.pow(10, parts.decimals);
    let last = -1;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const step = Math.round(parts.num * eased * unit);
      if (step !== last) {
        last = step;
        setShown(step / unit);
      }
      if (t < 1) raf = requestAnimationFrame(tick);
      else setPhase('done');
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, parts]);

  const counting = parts !== null && shown !== null && (phase === 'armed' || phase === 'counting');
  const text = counting && fmt ? `${parts.prefix}${fmt.format(shown)}${parts.suffix}` : value;

  // Số thật luôn ở DOM (trình đọc màn hình, tìm trong trang, test đều thấy đúng một
  // bản); lúc đếm nó trong suốt giữ chỗ, số đang đếm vẽ đè bằng ::before (attr).
  return (
    <span ref={ref} data-phase={phase} className={['stat-mark inline-grid', className ?? ''].join(' ')}>
      <span className={['col-start-1 row-start-1', counting ? 'text-transparent' : ''].join(' ')}>{value}</span>
      {counting && <span aria-hidden="true" className="stat-count col-start-1 row-start-1" data-v={text} />}
    </span>
  );
}
