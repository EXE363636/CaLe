'use client';

/**
 * Trang chủ — "Ca làm cho nhiều loại việc": dải thẻ uốn cong như mặt trong một
 * vòng tròn, xoay liên tục thành vòng lặp (thẻ giữa lùi xa, thẻ hai bên nghiêng
 * về phía người xem). Ấn một thẻ → vòng dừng, thẻ đó về giữa, khung chi tiết bên
 * dưới hiện 3 ý: việc gồm gì → một ca thường thế nào → cần gì để làm (+ nút tìm ca
 * / đăng ca).
 *
 * Vòng tự xoay chỉ khi: không rê chuột / focus trong vòng, không chọn thẻ nào,
 * người xem không bấm "Tạm dừng", vòng đang trong màn hình và tab đang mở. Giảm
 * chuyển động → không tự xoay (vẫn dùng nút ‹ › và kéo được). Kéo ngang để xoay
 * bằng tay; nút ‹ › xoay đúng một thẻ; Tab tới thẻ nào thì thẻ đó về giữa.
 *
 * Vị trí thẻ tính mỗi khung hình bằng requestAnimationFrame và ghi thẳng vào
 * `style.transform` (không render lại React). Thẻ ở xa ngoài khung nhìn bị ẩn, nên
 * chỗ "nối vòng" (thẻ cuối nhảy về đầu) luôn nằm khuất; vòng hẹp hơn khung nhìn
 * thì nhân bản danh sách (bản sao `aria-hidden` + `inert`).
 *
 * Đây là nội dung trình bày (mô tả chung, không phải ca thật), không phải đồng bộ
 * lifecycle (CLAUDE.md §5.6). Câu chữ của từng việc đến từ `homeJobs.ts`.
 */

import Image from 'next/image';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import { useTx } from '@/i18n/LocaleProvider';

import type { HomeJob } from './homeJobs';

interface RingCopy {
  /** Tiêu đề 3 ý trong khung chi tiết. */
  frameTitles: [string, string, string];
  findLabel: string;
  postLabel: string;
  /** Ghi chú cuối khung: mô tả chung, giờ / yêu cầu cụ thể nằm trên từng ca. */
  note: string;
}

/** Tốc độ tự xoay: số px cung tròn mỗi giây (≈ một thẻ mỗi 6 giây). */
const AUTO_PX_PER_S = 46;
/** Kéo quá ngưỡng này (px) thì không tính là ấn thẻ. */
const DRAG_SLOP = 6;

interface Geometry {
  /** Bề rộng thẻ (px). */
  card: number;
  /** Bán kính vòng (px). */
  radius: number;
  /** Phối cảnh của khung (px). */
  perspective: number;
  /** Góc giữa hai thẻ liền nhau (radian). */
  step: number;
  /** Số bản danh sách cần để vòng phủ kín khung nhìn. */
  copies: number;
  /** Góc mà ngoài đó thẻ chắc chắn khuất (radian). */
  visible: number;
  /** Chiều cao khung: đủ cho thẻ phóng to nhất (ở hai mép) không bị cắt. */
  height: number;
}

function measure(width: number, count: number): Geometry {
  const narrow = width < 640;
  const card = narrow ? Math.min(Math.round(width * 0.58), 240) : Math.round(Math.min(340, Math.max(260, width * 0.2)));
  const gap = narrow ? 14 : 22;
  // Bán kính nhỏ → cong rõ: thẻ giữa lùi xa, thẻ hai mép to và nghiêng vào trong.
  const radius = narrow ? width * 0.95 : Math.max(760, width * 0.6);
  const perspective = radius * 1.1;
  const step = (card + gap) / radius;

  // Tìm góc mà từ đó mép trong của thẻ đã ra khỏi khung nhìn.
  let visible = step;
  while (visible < Math.PI / 2) {
    const x = radius * Math.sin(visible);
    const z = radius * (1 - Math.cos(visible));
    if (z >= perspective * 0.85) break;
    const scale = perspective / (perspective - z);
    if ((x - (card / 2) * Math.cos(visible)) * scale > width / 2) break;
    visible += 0.01;
  }
  // Điểm nối vòng (±nửa vòng) phải nằm ngoài vùng nhìn thấy ít nhất một thẻ.
  let copies = 1;
  while ((copies * count * step) / 2 < visible + step) copies += 1;
  const edgeZ = radius * (1 - Math.cos(Math.max(0, visible - step / 2)));
  const maxScale = Math.min(1.6, perspective / (perspective - edgeZ));
  const height = Math.round(card * 1.25 * maxScale + 24);
  return { card, radius, perspective, step, copies, visible, height };
}

/** Đưa góc về khoảng [-span/2, span/2). */
function wrap(angle: number, span: number) {
  return ((((angle + span / 2) % span) + span) % span) - span / 2;
}

export function JobRing({
  jobs,
  copy,
  links,
}: {
  jobs: HomeJob[];
  copy: RingCopy;
  /** Lối đi thẳng dưới nút điều khiển (không bắt ấn thẻ): "Xem ca đang tuyển"… */
  links?: ReactNode;
}) {
  const tx = useTx();
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<Array<HTMLLIElement | null>>([]);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  // Trạng thái đổi mỗi khung hình → giữ trong ref, vòng rAF đọc trực tiếp.
  const offset = useRef(0);
  const target = useRef<number | null>(null);
  const velocity = useRef(0);
  const hover = useRef(false);
  const focusInside = useRef(false);
  const onScreen = useRef(true);
  const drag = useRef<{ x: number; last: number; t: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const live = useRef({ selected, userPaused, reduced });
  useEffect(() => {
    live.current = { selected, userPaused, reduced };
  }, [selected, userPaused, reduced]);

  // Đo khung, tính hình học; đo lại khi đổi cỡ.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const update = () => setGeo(measure(el.clientWidth, jobs.length));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [jobs.length]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Vòng vẽ: tính vị trí từng thẻ theo `offset`.
  useEffect(() => {
    if (!geo) return;
    const { radius, step, visible } = geo;
    const total = jobs.length * geo.copies;
    const span = total * step;

    const paint = () => {
      for (let k = 0; k < total; k += 1) {
        const li = cards.current[k];
        if (!li) continue;
        const phi = wrap(k * step + offset.current, span);
        if (Math.abs(phi) > visible + step / 2) {
          li.style.visibility = 'hidden';
          continue;
        }
        const x = radius * Math.sin(phi);
        const z = radius * (1 - Math.cos(phi));
        li.style.visibility = 'visible';
        li.style.zIndex = String(Math.round(z));
        li.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, 0, ${z.toFixed(2)}px) rotateY(${(-phi).toFixed(4)}rad)`;
      }
    };

    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - prev) / 1000;
      prev = now;
      const { selected: sel, userPaused: paused, reduced: still } = live.current;
      if (drag.current) {
        // Kéo tay: offset đã cập nhật trong pointermove.
      } else if (target.current !== null) {
        const d = target.current - offset.current;
        if (still || Math.abs(d) < 0.0005) {
          offset.current = target.current;
          target.current = null;
        } else {
          offset.current += d * Math.min(1, dt * 9);
        }
      } else if (Math.abs(velocity.current) > 0.0004) {
        // Quán tính sau khi thả tay.
        offset.current += velocity.current * dt * 60;
        velocity.current *= Math.pow(0.92, dt * 60);
      } else {
        velocity.current = 0;
        const auto = !still && !paused && sel === null && !hover.current && !focusInside.current;
        if (auto && onScreen.current && !document.hidden) {
          offset.current -= (AUTO_PX_PER_S / radius) * dt;
        }
      }
      // Giữ offset trong một vòng để số không phình mãi.
      offset.current = wrap(offset.current, span);
      if (target.current !== null) target.current = offset.current + wrap(target.current - offset.current, span);
      paint();
      raf = requestAnimationFrame(tick);
    };
    paint();
    stage.current?.setAttribute('data-ready', '');
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [geo, jobs.length]);

  /** Xoay để thẻ `k` (chỉ số trong danh sách gốc) về giữa, theo đường gần nhất. */
  const centerOn = useCallback(
    (k: number) => {
      if (!geo) return;
      const span = jobs.length * geo.copies * geo.step;
      velocity.current = 0;
      target.current = offset.current + wrap(-k * geo.step - offset.current, span);
    },
    [geo, jobs.length],
  );

  const turn = (dir: 1 | -1) => {
    if (!geo) return;
    velocity.current = 0;
    const base = target.current ?? offset.current;
    target.current = Math.round(base / geo.step) * geo.step - dir * geo.step;
  };

  const choose = (k: number) => {
    if (suppressClick.current) return;
    if (selected === k) {
      setSelected(null);
      return;
    }
    setSelected(k);
    centerOn(k);
  };

  // Kéo ngang để xoay (chuột / tay). Theo dõi trên window để không mất khi ra khỏi thẻ.
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!geo || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag.current = { x: e.clientX, last: e.clientX, t: performance.now(), moved: false };
    suppressClick.current = false;
    target.current = null;
    velocity.current = 0;
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (!d.moved && Math.abs(ev.clientX - d.x) > DRAG_SLOP) d.moved = true;
      if (!d.moved) return;
      const now = performance.now();
      const delta = (ev.clientX - d.last) / geo.radius;
      offset.current += delta;
      velocity.current = (delta / Math.max(1, now - d.t)) * (1000 / 60);
      d.last = ev.clientX;
      d.t = now;
    };
    const up = () => {
      if (drag.current?.moved) {
        // Chặn cú click ngay sau khi thả tay, rồi trả lại bình thường.
        suppressClick.current = true;
        window.setTimeout(() => {
          suppressClick.current = false;
        }, 0);
        // Thả tay chậm (không vuốt) thì không trôi tiếp.
        if (performance.now() - (drag.current?.t ?? 0) > 80) velocity.current = 0;
      }
      drag.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const total = geo ? jobs.length * geo.copies : jobs.length;
  const job = selected === null ? null : jobs[selected];
  const autoOn = !reduced && !userPaused && selected === null;

  return (
    // Vòng thẻ tự có chuyển động → không hiện dần khi cuộn (chủ dự án, 03/10).
    <div data-reveal-skip>
      <div
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') hover.current = true;
        }}
        onPointerLeave={() => {
          hover.current = false;
        }}
        onFocus={(e: FocusEvent<HTMLDivElement>) => {
          // Chỉ dừng khi focus bằng bàn phím (ấn chuột vào thẻ đã có `selected`).
          if ((e.target as HTMLElement).matches(':focus-visible')) focusInside.current = true;
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focusInside.current = false;
        }}
        className="job-ring relative left-1/2 w-screen -translate-x-1/2 touch-pan-y select-none"
        style={{ height: geo ? `${geo.height}px` : '28rem' }}
      >
        <ul className="absolute inset-0" style={{ perspective: geo ? `${geo.perspective}px` : undefined }}>
          {Array.from({ length: total }, (_, i) => {
            const k = i % jobs.length;
            const item = jobs[k];
            const copyOf = i >= jobs.length;
            const active = selected === k && !copyOf;
            return (
              <li
                key={`${item.id}-${i}`}
                ref={(el) => {
                  cards.current[i] = el;
                }}
                aria-hidden={copyOf || undefined}
                inert={copyOf || undefined}
                className="job-ring-card absolute left-1/2 top-1/2"
                style={{ width: geo ? `${geo.card}px` : '15rem' }}
              >
                <button
                  type="button"
                  onClick={() => choose(k)}
                  onFocus={(e) => {
                    // Tab tới thẻ → đưa về giữa (không làm khi ấn chuột: tránh giật sau khi kéo).
                    if (!copyOf && e.currentTarget.matches(':focus-visible')) centerOn(k);
                  }}
                  aria-label={item.label}
                  aria-expanded={copyOf ? undefined : selected === k}
                  aria-controls={copyOf ? undefined : 'home-job-detail'}
                  tabIndex={copyOf ? -1 : undefined}
                  className={[
                    'group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-200 text-left shadow-modal transition-shadow duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-400 motion-reduce:transition-none',
                    active ? 'ring-4 ring-brand' : '',
                  ].join(' ')}
                >
                  <Image
                    src={item.img}
                    alt={copyOf ? '' : item.alt}
                    fill
                    draggable={false}
                    sizes="(min-width: 640px) 360px, 70vw"
                    className="pointer-events-none object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
                  />
                  <span className="job-scrim absolute inset-x-0 bottom-0 px-4 pb-4 pt-16 text-white">
                    <span className="block text-lg font-semibold leading-snug">{item.label}</span>
                    <span className="mt-0.5 line-clamp-2 block min-h-[2.75em] text-sm leading-snug text-white opacity-90">
                      {item.desc}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Điều khiển: xoay một thẻ, tạm dừng / tiếp tục (vòng tự chạy > 5 giây — WCAG 2.2.2). */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <RoundButton label={tx('Việc trước')} onClick={() => turn(-1)}>
          <path d="M12 4l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </RoundButton>
        {!reduced && (
          <RoundButton
            label={autoOn ? tx('Tạm dừng') : tx('Tiếp tục')}
            onClick={() => {
              if (selected !== null) {
                setSelected(null);
                setUserPaused(false);
              } else {
                setUserPaused((v) => !v);
              }
            }}
          >
            {autoOn ? <path d="M6 4h3v12H6zM11 4h3v12h-3z" fill="currentColor" /> : <path d="M6 4.5v11l9-5.5-9-5.5Z" fill="currentColor" />}
          </RoundButton>
        )}
        <RoundButton label={tx('Việc sau')} onClick={() => turn(1)}>
          <path d="M8 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </RoundButton>
      </div>

      {links && <div className="mt-4 flex flex-wrap justify-center gap-x-8 text-sm font-semibold">{links}</div>}

      <div id="home-job-detail" aria-live="polite">
        {job && (
          <div
            key={job.id}
            className="motion-fade-up mx-auto mt-8 max-w-5xl rounded-3xl bg-white p-5 shadow-card ring-1 ring-black/5 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 sm:text-2xl">{job.label}</h3>
                <p className="mt-1 text-sm text-gray-600 sm:text-base">{job.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={tx('Đóng')}
                className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>
            <ol className="mt-5 grid gap-5 sm:grid-cols-3 sm:gap-6">
              {job.frames.map((text, i) => (
                <li key={i} className="border-t-2 border-orange-200 pt-3">
                  <p className="text-sm font-semibold text-orange-800">
                    {i + 1}. {copy.frameTitles[i]}
                  </p>
                  <p className="mt-1.5 text-base leading-relaxed text-gray-800">{text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href={job.filter ? `/shifts?viec=${job.filter}` : '/shifts'}
                className="flex min-h-[44px] items-center justify-center rounded-xl bg-brand px-5 text-base font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
              >
                {copy.findLabel}
              </Link>
              <Link
                href="/employer/shifts/new"
                className="flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 px-5 text-base font-semibold text-gray-900 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                {copy.postLabel}
              </Link>
              <p className="text-xs text-gray-600 sm:ml-3">{copy.note}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-900 shadow-card transition-colors hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 motion-reduce:transition-none"
    >
      <svg className="h-5 w-5" viewBox="0 0 20 20" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
