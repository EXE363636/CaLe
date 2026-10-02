'use client';

/**
 * Ảnh minh hoạ giao diện ở hero trang vai trò — dựng bằng chính component của
 * app (Badge, ShiftJourney) để khách thấy sản phẩm trông ra sao. Ghi rõ
 * "Minh hoạ giao diện"; tên và số liệu là ví dụ, không phải ca / người thật.
 * Phần giả lập không tương tác (aria-hidden), chỉ đọc chú thích.
 *
 * Chuyển động (điểm nhấn của trang): minh hoạ tự diễn một vòng đời ca —
 * duyệt người → đang diễn ra → chờ xác nhận → hoàn thành / tiền về ví. Chỉ
 * chạy khi khối nằm trong khung nhìn và tab đang hiện; `prefers-reduced-motion`
 * → đứng yên ở bước đầu. Đây là hiệu ứng trình bày, không phải đồng bộ
 * lifecycle của app (CLAUDE.md §5.6).
 */

import { useEffect, useRef, useState, type RefObject } from 'react';

import { Badge } from '@/components/ui';
import { ShiftJourney } from '@/components/shift/ShiftJourney';
import { isSupabaseEnv } from '@/data/supabaseClient';
import type { ShiftLifecycleState } from '@/domain/shiftLifecycleState';
import { useT, useTx } from '@/i18n/LocaleProvider';
import { formatVND } from '@/lib/format';

/**
 * Chạy lần lượt các bước (`durations[i]` = thời gian dừng ở bước i), lặp lại,
 * chỉ khi `ref` đang trong khung nhìn và tab hiện. Trả về chỉ số bước.
 */
function usePlayback(ref: RefObject<HTMLElement | null>, durations: number[]): number {
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let visible = false;
    let timer: number | undefined;
    const run = () => {
      window.clearTimeout(timer);
      if (!visible || document.hidden) return;
      timer = window.setTimeout(() => {
        stepRef.current = (stepRef.current + 1) % durations.length;
        setStep(stepRef.current);
        run();
      }, durations[stepRef.current]);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
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
    };
    // durations là hằng số của từng minh hoạ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return step;
}

/** Đếm số từ `from` lên `to` trong `ms` khi `run` bật (requestAnimationFrame). */
function useCountUp(from: number, to: number, run: boolean, ms = 900): number {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (!run) {
      // Đặt lại cho lần chạy sau (trong khung hình, không đồng bộ trong effect).
      const r = requestAnimationFrame(() => setValue(from));
      return () => cancelAnimationFrame(r);
    }
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [from, to, run, ms]);
  return run ? value : from;
}

function Caption({ text }: { text: string }) {
  return <p className="mt-3 text-center text-xs text-gray-600">{text}</p>;
}

// ---------------------------------------------------------------------------
// Nhà tuyển dụng — duyệt người → ca chạy → hoàn thành, tiền đã trả
// ---------------------------------------------------------------------------

const EMPLOYER_STATES: ShiftLifecycleState[] = [
  'Published',
  'Published',
  'InProgress',
  'AwaitingEmployerConfirmation',
  'Completed',
];

export function EmployerPreview() {
  const t = useT();
  const tx = useTx();
  const ref = useRef<HTMLDivElement>(null);
  const step = usePlayback(ref, [1800, 1500, 1500, 1500, 3000]);
  const state = EMPLOYER_STATES[step];
  const done = state === 'Completed';

  // 3 người × 5 giờ × 80.000 đ; production cộng phí 10%, demo chưa thu phí.
  const wages = 3 * 5 * 80_000;
  const held = isSupabaseEnv() ? Math.round(wages * 1.1) : wages;
  const applicants = [
    { initials: 'MA', name: 'Minh Anh', approved: true },
    { initials: 'QB', name: 'Quốc Bảo', approved: true },
    { initials: 'TH', name: 'Thu Hà', approved: step >= 1 },
  ];

  return (
    <figure>
      <div
        ref={ref}
        aria-hidden="true"
        className="rounded-3xl bg-white p-5 text-left shadow-modal ring-1 ring-black/5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-900">{tx('Phục vụ tiệc cưới')}</p>
            <p className="mt-0.5 text-sm text-gray-600 tabular-nums">{tx('Thứ 7 · 17:00–22:00 · 3 người')}</p>
          </div>
          <Badge key={state} tone={done ? 'success' : state === 'InProgress' ? 'info' : state === 'Published' ? 'info' : 'warning'}>
            <span className="motion-fade-up inline-block">{t(`shift.lifecycle.${state}`)}</span>
          </Badge>
        </div>
        <div
          className={[
            'mt-4 flex items-baseline justify-between gap-3 rounded-2xl px-4 py-3 transition-colors duration-500 motion-reduce:transition-none',
            done ? 'bg-green-50' : 'bg-orange-50',
          ].join(' ')}
        >
          <span key={done ? 'paid' : 'held'} className="motion-fade-up text-sm text-gray-700">
            {done ? tx('Đã trả cho 3 người') : tx('Đã giữ từ ví')}
          </span>
          <span key={done ? 'w' : 'h'} className="motion-fade-up text-2xl font-bold text-gray-900 tabular-nums">
            {formatVND(done ? wages : held)}
          </span>
        </div>
        <ShiftJourney state={state} approved className="mt-5" />
        <ul className="mt-5 flex flex-col gap-2">
          {applicants.map((a) => (
            <li
              key={a.name}
              className={[
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-500 motion-reduce:transition-none',
                a.name === 'Thu Hà' && step === 1 ? 'border-green-300 bg-green-50' : 'border-gray-200',
              ].join(' ')}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-800">
                {a.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                <p className="text-xs text-green-700">{tx('Đã xác minh SĐT')}</p>
              </div>
              {a.approved ? (
                <Badge tone="success">
                  <span className="motion-fade-up inline-block">{t('application.status.Approved')}</span>
                </Badge>
              ) : (
                <span className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-gray-900">
                  {t('btn.approve')}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <figcaption>
        <Caption text={tx('Minh hoạ giao diện quản lý ca — tên và số liệu là ví dụ.')} />
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Người lao động — check-in → đang làm → check-out → tiền về ví
// ---------------------------------------------------------------------------

const WORKER_STEPS: Array<{
  state: ShiftLifecycleState;
  app: 'Approved' | 'CheckedIn' | 'CheckedOut' | 'Confirmed';
  tone: 'success' | 'info' | 'warning';
}> = [
  { state: 'StartingSoon', app: 'Approved', tone: 'success' },
  { state: 'InProgress', app: 'CheckedIn', tone: 'info' },
  { state: 'AwaitingEmployerConfirmation', app: 'CheckedOut', tone: 'warning' },
  { state: 'Completed', app: 'Confirmed', tone: 'success' },
];

export function WorkerPreview() {
  const t = useT();
  const tx = useTx();
  const ref = useRef<HTMLDivElement>(null);
  const step = usePlayback(ref, [1900, 1700, 1700, 3200]);
  const s = WORKER_STEPS[step];
  const paid = s.app === 'Confirmed';
  const balance = useCountUp(1_280_000, 1_460_000, paid);

  return (
    <figure>
      <div ref={ref} aria-hidden="true" className="mx-auto max-w-sm rounded-[2rem] bg-gray-900 p-2.5 shadow-modal">
        <div className="rounded-[1.6rem] bg-orange-50 p-4 text-left">
          <div className="rounded-2xl bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-semibold text-gray-900">{tx('Phụ bếp quán lẩu')}</p>
              <Badge key={s.app} tone={s.tone}>
                <span className="motion-fade-up inline-block">{t(`application.status.${s.app}`)}</span>
              </Badge>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900 tabular-nums">
              {formatVND(180_000)} <span className="text-sm font-medium text-gray-600">{tx('cả ca')}</span>
            </p>
            <p className="text-sm text-gray-600 tabular-nums">{tx('45.000 đ/giờ · 4 giờ')}</p>
            <p className="mt-2 text-sm text-gray-700 tabular-nums">{tx('Hôm nay · 17:00–21:00')}</p>
            <ShiftJourney state={s.state} approved className="mt-4" />
            <div key={s.app} className="motion-fade-up mt-4">
              {s.app === 'Approved' && (
                <span className="flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-gray-900">
                  {t('btn.checkIn')}
                </span>
              )}
              {s.app === 'CheckedIn' && (
                <span className="flex min-h-[44px] items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-800 ring-1 ring-blue-100">
                  {tx('Đang làm · kết thúc lúc 21:00')}
                </span>
              )}
              {s.app === 'CheckedOut' && (
                <span className="flex min-h-[44px] items-center justify-center rounded-xl bg-amber-50 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">
                  {tx('Đã check-out · chờ xác nhận')}
                </span>
              )}
              {s.app === 'Confirmed' && (
                <span className="flex min-h-[44px] items-center justify-center rounded-xl bg-green-50 text-sm font-semibold text-green-800 ring-1 ring-green-100">
                  {tx('Hoàn thành · tiền đã về ví')}
                </span>
              )}
            </div>
          </div>
          <div
            className={[
              'mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-card ring-1 transition-[box-shadow] duration-500 motion-reduce:transition-none',
              paid ? 'ring-green-300' : 'ring-transparent',
            ].join(' ')}
          >
            <span className="text-sm text-gray-700">{tx('Ví của bạn')}</span>
            <span className="flex items-center gap-2">
              {paid && (
                <span className="motion-fade-up rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800 tabular-nums">
                  +{formatVND(180_000)}
                </span>
              )}
              <span className="text-base font-bold text-gray-900 tabular-nums">{formatVND(balance)}</span>
            </span>
          </div>
        </div>
      </div>
      <figcaption>
        <Caption text={tx('Minh hoạ giao diện người lao động — số liệu là ví dụ.')} />
      </figcaption>
    </figure>
  );
}
