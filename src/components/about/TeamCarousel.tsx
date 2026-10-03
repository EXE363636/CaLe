'use client';

/**
 * Thanh trượt ngang "Đội ngũ" (03/10) — hàng riêng, trải hết bề ngang, trong khối "Về CaLẻ"
 * của trang chủ (`lg`: 3 thẻ trọn + một phần thẻ sau để báo còn cuộn được). Dữ liệu ở
 * `teamData.ts`.
 *   - Vòng lặp vô hạn (chủ dự án): vẽ 3 bộ thẻ giống hệt nhau, đứng ở bộ giữa; cuộn xong mà
 *     lệch sang bộ đầu / bộ cuối thì nhảy tức thì về vị trí tương ứng ở bộ giữa (thẻ giống
 *     hệt nên mắt không thấy). Hai bộ phụ `aria-hidden` để trình đọc màn hình chỉ đọc 1 lần.
 *   - Tự chạy (chủ dự án): mỗi 4 giây sang một thẻ. Có nút dừng / chạy (WCAG 2.2.2). Tạm
 *     nghỉ khi di chuột lên các thẻ, khi focus bằng bàn phím bên trong, 6 giây sau lần
 *     người dùng tự cuộn / vuốt / bấm ‹ ›, khi khối không nằm trên màn hình hoặc tab ẩn. Giảm chuyển động →
 *     mặc định KHÔNG tự chạy (bấm nút để bật).
 *   - Cuộn bằng `scroll-snap` (vuốt trên điện thoại, cuộn ngang / phím mũi tên khi khung
 *     đang focus).
 *   - Hàng nút căn giữa DƯỚI thanh trượt: ‹ (44px) · dừng / chạy · › ; ‹ › cuộn đúng một thẻ,
 *     luôn bấm được (không có đầu / cuối).
 *   - Giảm chuyển động → cuộn tức thì.
 */

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useTx } from '@/i18n/LocaleProvider';

import { TEAM_MEMBERS, type TeamMember } from './teamData';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function readReducedMotion() {
  return window.matchMedia(REDUCED_QUERY).matches;
}

const COPIES = 3;
const AUTOPLAY_MS = 4000;
const IDLE_AFTER_USER_MS = 6000;

export function TeamCarousel({ members = TEAM_MEMBERS, title, lead }: { members?: TeamMember[]; title: string; lead?: string }) {
  const tx = useTx();
  const trackRef = useRef<HTMLUListElement>(null);
  const n = members.length;
  const loop = n > 1;

  /** Bề rộng một bộ thẻ (từ thẻ đầu bộ 1 tới thẻ đầu bộ 2, đã gồm khoảng cách). */
  const setWidth = useCallback(() => {
    const el = trackRef.current;
    if (!el || !loop) return 0;
    const first = el.children[0] as HTMLElement | undefined;
    const second = el.children[n] as HTMLElement | undefined;
    return first && second ? second.offsetLeft - first.offsetLeft : 0;
  }, [loop, n]);

  /** Đưa vị trí về bộ giữa nếu đang ở bộ đầu / bộ cuối (nhảy tức thì). */
  const recenter = useCallback(() => {
    const el = trackRef.current;
    const w = setWidth();
    if (!el || !w) return;
    // Giữ thẻ đứng đầu luôn thuộc bộ giữa [w, 2w) — bộ không `aria-hidden`.
    if (el.scrollLeft < w - 4) el.scrollLeft += w;
    else if (el.scrollLeft >= 2 * w - 4) el.scrollLeft -= w;
  }, [setWidth]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !loop) return;
    el.scrollLeft = setWidth();
    let t = 0;
    const onScroll = () => {
      window.clearTimeout(t);
      t = window.setTimeout(recenter, 150);
    };
    const onEnd = () => {
      window.clearTimeout(t);
      recenter();
    };
    const onResize = () => {
      // Bề rộng thẻ đổi theo màn hình: giữ đúng thẻ đang đứng đầu.
      const w = setWidth();
      if (w) el.scrollLeft = w + (el.scrollLeft % w);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', onEnd);
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(t);
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', onEnd);
      window.removeEventListener('resize', onResize);
    };
  }, [loop, recenter, setWidth]);

  const step = useCallback(
    (dir: 1 | -1) => {
      const el = trackRef.current;
      if (!el) return;
      recenter();
      const card = el.querySelector<HTMLElement>('li');
      const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollBy({ left: dir * ((card?.offsetWidth ?? el.clientWidth) + gap), behavior: reduced ? 'auto' : 'smooth' });
    },
    [recenter],
  );

  // --- Tự chạy -------------------------------------------------------------
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);
  // null = người dùng chưa bấm nút → theo cài đặt giảm chuyển động.
  const [choice, setChoice] = useState<boolean | null>(null);
  const playing = choice ?? !reduced;
  const held = useRef({ hover: false, focus: false, userAt: 0 });

  // Tạm nghỉ (03/10, sửa "không tự xoay"):
  //   - di chuột lên CÁC THẺ (không tính hàng nút — đặt chuột lên nút dừng / chạy không
  //     được làm nó đứng yên);
  //   - focus bằng BÀN PHÍM bên trong khối (`:focus-visible`); bấm chuột vào nút để lại
  //     focus nhưng không tính, nếu không bấm "Tự chạy" xong là đứng yên mãi;
  //   - 6 giây sau khi người dùng tự cuộn / vuốt / bấm ‹ ›.
  useEffect(() => {
    const box = sectionRef.current;
    const el = trackRef.current;
    if (!box || !el || !loop) return;
    const h = held.current;
    const markUser = () => {
      h.userAt = Date.now();
    };
    const onEnter = () => (h.hover = true);
    const onLeave = () => (h.hover = false);
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as Element | null;
      h.focus = !!t && t.matches(':focus-visible');
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!box.contains(e.relatedTarget as Node | null)) h.focus = false;
    };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    box.addEventListener('focusin', onFocusIn);
    box.addEventListener('focusout', onFocusOut);
    el.addEventListener('pointerdown', markUser);
    el.addEventListener('wheel', markUser, { passive: true });
    el.addEventListener('touchstart', markUser, { passive: true });
    el.addEventListener('keydown', markUser);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      box.removeEventListener('focusin', onFocusIn);
      box.removeEventListener('focusout', onFocusOut);
      el.removeEventListener('pointerdown', markUser);
      el.removeEventListener('wheel', markUser);
      el.removeEventListener('touchstart', markUser);
      el.removeEventListener('keydown', markUser);
    };
  }, [loop]);

  useEffect(() => {
    if (!playing || !loop) return;
    const h = held.current;
    const id = window.setInterval(() => {
      const el = trackRef.current;
      if (!el || document.hidden || h.hover || h.focus) return;
      // Đang nằm trên màn hình? Đo trực tiếp (IntersectionObserver không đáng tin trong
      // iframe khác nguồn — lý do trước đây thanh trượt đứng yên).
      const r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= window.innerHeight) return;
      if (Date.now() - h.userAt < IDLE_AFTER_USER_MS) return;
      step(1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [playing, loop, step]);

  const press = (dir: 1 | -1) => {
    held.current.userAt = Date.now();
    step(dir);
  };

  const copies = loop ? COPIES : 1;
  const middle = loop ? 1 : 0;

  return (
    <section ref={sectionRef} aria-labelledby="home-team" aria-roledescription={tx('băng chuyền')} className="min-w-0">
      <h3 id="home-team" className="text-lg font-semibold text-gray-900">
        {title}
      </h3>
      {lead && <p className="mt-1 text-sm leading-relaxed text-gray-600">{lead}</p>}

      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label={title}
        className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain rounded-2xl pb-2 [scrollbar-width:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-4 [&::-webkit-scrollbar]:hidden"
      >
        {Array.from({ length: copies }, (_, c) =>
          members.map((m, i) => <MemberCard key={`${c}-${i}`} member={m} index={i} clone={c !== middle} />),
        )}
      </ul>

      {/* Nút điều khiển dưới thanh trượt, căn giữa (chủ dự án, 03/10): ‹  dừng / chạy  › */}
      {loop && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <RoundButton label={tx('Thành viên trước')} onClick={() => press(-1)} icon="prev" />
          <RoundButton
            label={playing ? tx('Dừng tự chạy') : tx('Tự chạy')}
            pressed={playing}
            onClick={() => setChoice(!playing)}
            icon={playing ? 'pause' : 'play'}
          />
          <RoundButton label={tx('Thành viên sau')} onClick={() => press(1)} icon="next" />
        </div>
      )}
    </section>
  );
}

/** Hai chữ cái đầu của hai tiếng cuối (vd "Phạm Ngọc Hưng" → "NH"). */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(-2).map((w) => w.charAt(0).toUpperCase()).join('');
}

/**
 * Thẻ thành viên gọn (03/10, làm lại): ảnh tròn 96px (chưa có ảnh → hai chữ cái đầu trên
 * nền mực / cam xen kẽ), số thứ tự, tên, vai trò. Không còn khung ảnh 4:5 to trống.
 */
function MemberCard({ member, index, clone }: { member: TeamMember; index: number; clone?: boolean }) {
  const tx = useTx();
  const name = member.name.trim() || tx('Thành viên {n}').replace('{n}', String(index + 1));
  const role = member.role.trim() ? tx(member.role.trim()) : tx('Đang cập nhật');
  const initials = initialsOf(member.name);
  return (
    <li
      aria-hidden={clone || undefined}
      className="flex w-[16rem] shrink-0 snap-start flex-col rounded-3xl bg-white p-5 shadow-card ring-1 ring-black/5 sm:w-[17rem] lg:w-[19.5rem] lg:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className={[
            'relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl font-extrabold tracking-tight ring-1 ring-black/10',
            index % 2 === 0 ? 'bg-gray-900 text-white' : 'bg-orange-500 text-gray-900',
          ].join(' ')}
        >
          {member.photo ? (
            // Tên đã ở ngay dưới → ảnh là trang trí (alt rỗng), tránh đọc tên 2 lần.
            <Image src={member.photo} alt="" fill sizes="96px" className="object-cover" />
          ) : initials ? (
            initials
          ) : (
            <svg className="h-9 w-9 opacity-80" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="8.5" r="4" />
              <path d="M4 20.5c0-4.1 3.6-7 8-7s8 2.9 8 7v.5H4z" />
            </svg>
          )}
        </span>
        <span aria-hidden="true" className="text-sm font-semibold text-gray-600 tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <p className="mt-5 text-lg font-semibold leading-snug text-gray-900">{name}</p>
      <p className="mt-1 text-sm font-medium leading-snug text-orange-700">{role}</p>
      {member.bio && <p className="mt-3 text-sm leading-relaxed text-gray-600">{tx(member.bio)}</p>}
    </li>
  );
}

function RoundButton({ label, onClick, icon, pressed }: { label: string; onClick: () => void; icon: 'prev' | 'next' | 'play' | 'pause'; pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-900 shadow-card ring-1 ring-black/10 transition-colors hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 motion-reduce:transition-none"
    >
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon === 'prev' && <path d="m12 5-5 5 5 5" />}
        {icon === 'next' && <path d="m8 5 5 5-5 5" />}
        {icon === 'pause' && <path d="M7.5 5.5v9M12.5 5.5v9" />}
        {icon === 'play' && <path d="M7 5.5v9l7.5-4.5z" fill="currentColor" />}
      </svg>
    </button>
  );
}
