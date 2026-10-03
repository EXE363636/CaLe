'use client';

/**
 * Ảnh minh hoạ giao diện ở hero trang vai trò — dựng bằng chính component của
 * app (Badge, ShiftJourney) để khách thấy sản phẩm trông ra sao. Ghi rõ
 * "Minh hoạ giao diện"; tên và số liệu là ví dụ, không phải ca / người thật.
 * Phần giả lập không tương tác (aria-hidden), chỉ đọc chú thích.
 *
 * Chuyển động (điểm nhấn của trang): minh hoạ tự diễn một vòng đời ca —
 * duyệt TỪNG người → đang diễn ra → chờ xác nhận → hoàn thành / tiền về ví (nhà
 * tuyển dụng: ví trừ dần khi giữ tiền); mỗi vòng đổi sang một ca mẫu khác
 * (`landingSamples.ts`, 8 ca + 8 tài khoản mẫu). Không phải vòng nào cũng suôn sẻ
 * (03/10): ca bị huỷ (hoàn đủ), ca có người vắng (nhà tuyển dụng: đánh dấu vắng mặt,
 * hoàn phần đó về ví), người lao động không được chọn hoặc ca bị huỷ. Chỉ
 * chạy khi khối nằm trong khung nhìn và tab đang hiện; `prefers-reduced-motion`
 * → đứng yên ở bước đầu. Đây là hiệu ứng trình bày, không phải đồng bộ
 * lifecycle của app (CLAUDE.md §5.6).
 */

import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui';
import { ShiftJourney } from '@/components/shift/ShiftJourney';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { serverWageTotal } from '@/domain/deposit';
import { getShiftStatusBadge, type ShiftLifecycleState } from '@/domain/shiftLifecycleState';
import { useLocale, useT, useTx } from '@/i18n/LocaleProvider';
import { formatVND } from '@/lib/format';

import { sampleApplicants, sampleLedger, sampleShift } from './landingSamples';
import { usePlayback } from './usePlayback';

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
    // 04/10: chỉ setState khi số (đã làm tròn) đổi — không render lại mỗi khung hình.
    let last = Number.NaN;
    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (to - from) * eased);
      if (next !== last) {
        last = next;
        setValue(next);
      }
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [from, to, run, ms]);
  return run ? value : from;
}

/** Thẻ minh hoạ đứng riêng (hero trang vai trò) / nằm trong `PhoneFrame` (`bare`). */
const CARD = 'rounded-3xl bg-white p-5 text-left shadow-modal ring-1 ring-black/5 sm:p-6';
const CARD_BARE = 'rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-black/5';

function Caption({ text }: { text: string }) {
  return <p className="mt-3 text-center text-xs text-gray-600">{text}</p>;
}

// ---------------------------------------------------------------------------
// Nhà tuyển dụng — duyệt người → ca chạy → hoàn thành, tiền đã trả
// ---------------------------------------------------------------------------

type EmployerPhase = 'posted' | 'approve' | 'inProgress' | 'awaiting' | 'completed' | 'cancelled';

/** Các bước của một vòng: đăng ca → duyệt TỪNG người → ca chạy → chờ xác nhận →
 *  hoàn thành; ca mẫu có `cancelReason` thì đăng ca → bị huỷ (trước khi duyệt ai). */
function employerTimeline(round: number): Array<{ phase: EmployerPhase; ms: number; approved: number }> {
  const shift = sampleShift(1, round);
  if (shift.cancelReason) {
    return [
      { phase: 'posted', ms: 1900, approved: 0 },
      { phase: 'cancelled', ms: 3200, approved: 0 },
    ];
  }
  const n = Math.min(3, shift.people);
  return [
    { phase: 'posted', ms: 1900, approved: 0 },
    ...Array.from({ length: n }, (_, k) => ({ phase: 'approve' as const, ms: 1100, approved: k + 1 })),
    // Cùng nhịp với minh hoạ người lao động (1,9 / 1,7 / 1,7 / 3,2 giây); riêng bước
    // duyệt ngắn hơn vì lặp theo số người.
    { phase: 'inProgress', ms: 1700, approved: n },
    { phase: 'awaiting', ms: 1700, approved: n },
    { phase: 'completed', ms: 3200, approved: n },
  ];
}

const PHASE_STATE: Record<EmployerPhase, ShiftLifecycleState> = {
  posted: 'Published',
  approve: 'Published',
  inProgress: 'InProgress',
  awaiting: 'AwaitingEmployerConfirmation',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function EmployerPreview({ bare = false }: { bare?: boolean } = {}) {
  const t = useT();
  const tx = useTx();
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const { step, round } = usePlayback(ref, (r) => employerTimeline(r).map((s) => s.ms));
  const timeline = employerTimeline(round);
  const { phase, approved } = timeline[Math.min(step, timeline.length - 1)];
  const state = PHASE_STATE[phase];
  const badge = getShiftStatusBadge(state);
  const done = phase === 'completed';
  const cancelled = phase === 'cancelled';

  // Ca mẫu đổi mỗi vòng (vòng đầu: phục vụ tiệc cưới, 3 người × 5 giờ × 80.000 đ).
  // Production cộng phí 10% như server; demo chưa thu phí.
  const shift = sampleShift(1, round);
  const ledger = sampleLedger(shift, isSupabaseEnv());
  const held = ledger.held;
  const people = shift.people === 1 ? tx('1 người') : tx('{n} người').replace('{n}', String(shift.people));
  const list = sampleApplicants(round, shift.people);
  // Ca có người vắng: người cuối danh sách được duyệt nhưng không đến — đánh dấu từ
  // bước "chờ xác nhận" (sau giờ làm), khi xong ca phần của người đó hoàn về ví.
  const absentIndex = shift.noShow ? list.length - 1 : -1;
  const marked = phase === 'awaiting' || done;
  const noShowRefund = done && ledger.outcome === 'noShow' ? ledger.refund : 0;

  // Ví nhà tuyển dụng: đăng ca → trừ dần số tiền giữ; ca huỷ → hoàn đủ, cộng dần lại;
  // ca có người vắng → khi xong ca, phần của người vắng cộng dần về.
  const before = shift.employerWallet;
  const afterHold = before - held;
  const holding = useCountUp(before, afterHold, phase === 'posted');
  const refunding = useCountUp(afterHold, before, cancelled);
  const partial = useCountUp(afterHold, afterHold + noShowRefund, noShowRefund > 0);
  const balance = phase === 'posted' ? holding : cancelled ? refunding : noShowRefund > 0 ? partial : afterHold;

  return (
    <figure>
      <div
        ref={ref}
        aria-hidden="true"
        className={bare ? CARD_BARE : CARD}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p key={shift.title} className="motion-fade-up text-lg font-semibold text-gray-900">{tx(shift.title)}</p>
            <p className="mt-0.5 text-sm text-gray-600 tabular-nums">
              {tx(shift.day)} · {shift.start}–{shift.end} · {people}
            </p>
          </div>
          <Badge key={state} tone={badge.tone}>
            <span className="motion-fade-up inline-block">{t(badge.labelKey)}</span>
          </Badge>
        </div>
        <div
          className={[
            'mt-4 rounded-2xl px-4 py-3 transition-colors duration-500 motion-reduce:transition-none',
            cancelled ? 'bg-red-50' : done ? 'bg-green-50' : 'bg-orange-50',
          ].join(' ')}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span key={phase === 'completed' ? 'paid' : cancelled ? 'refund' : 'held'} className="motion-fade-up text-sm text-gray-700">
              {done
                ? ledger.worked === 1
                  ? tx('Đã trả cho 1 người')
                  : tx('Đã trả cho {n} người').replace('{n}', String(ledger.worked))
                : cancelled
                  ? tx('Đã hoàn về ví')
                  : tx('Đã giữ từ ví')}
            </span>
            <span key={done ? 'w' : 'h'} className="motion-fade-up text-2xl font-bold text-gray-900 tabular-nums">
              {formatVND(done ? ledger.paid : held)}
            </span>
          </div>
          {noShowRefund > 0 && (
            <p className="motion-fade-up mt-1 text-sm text-gray-700">
              {tx('Hoàn {amount} về ví · {n} người vắng mặt')
                .replace('{amount}', formatVND(noShowRefund))
                .replace('{n}', String(shift.noShow ?? 0))}
            </p>
          )}
          {cancelled && shift.cancelReason && (
            <p className="motion-fade-up mt-1 text-sm text-red-800">
              {tx('Lý do huỷ: {reason}').replace('{reason}', tx(shift.cancelReason))}
            </p>
          )}
        </div>
        <ShiftJourney state={state} approved={approved > 0} className="mt-5" />
        {/* Giữ chỗ cho 3 dòng: ca 1–2 người không làm khối co lại giữa các vòng. */}
        <ul className="mt-5 flex min-h-[12rem] flex-col gap-2">
          {list.map((a, k) => {
            const isApproved = k < approved;
            const justApproved = phase === 'approve' && k === approved - 1;
            const absent = k === absentIndex && marked;
            return (
              <li
                key={`${round}-${a.name}`}
                className={[
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-500 motion-reduce:transition-none',
                  justApproved ? 'border-green-300 bg-green-50' : absent ? 'border-red-200 bg-red-50' : 'border-gray-200',
                  cancelled ? 'opacity-60' : '',
                ].join(' ')}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-800">
                  {a.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                  {/* Sao + số đánh giá: bản thật thẻ ứng viên không có nhãn xác thực. */}
                  <p className="text-xs text-gray-600 tabular-nums">
                    <span aria-hidden="true" className="text-amber-500">★</span>{' '}
                    {tx('{rating} · {n} đánh giá')
                      .replace('{rating}', a.rating.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', { minimumFractionDigits: 1 }))
                      .replace('{n}', String(a.reviews))}
                  </p>
                </div>
                {cancelled ? (
                  <Badge tone="neutral">
                    <span className="motion-fade-up inline-block">{tx('Đã báo huỷ')}</span>
                  </Badge>
                ) : absent ? (
                  <Badge tone="danger">
                    <span className="motion-fade-up inline-block">{t('application.status.NoShow')}</span>
                  </Badge>
                ) : isApproved ? (
                  <Badge tone="success">
                    <span className="motion-fade-up inline-block">{t('application.status.Approved')}</span>
                  </Badge>
                ) : (
                  <span className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-gray-900">
                    {t('btn.approve')}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <div
          className={[
            'mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-500 motion-reduce:transition-none',
            // Trừ tiền giữ → cả khung đỏ; hoàn về → cả khung xanh (giống ví người lao động khi nhận tiền).
            phase === 'posted' ? 'border-red-300 bg-red-50' : cancelled || noShowRefund > 0 ? 'border-green-300 bg-green-50' : 'border-gray-200',
          ].join(' ')}
        >
          <span className="text-sm text-gray-700">{tx('Ví của bạn')}</span>
          <span className="flex items-center gap-2">
            {phase === 'posted' && (
              <span className="motion-fade-up rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-red-800 tabular-nums">
                −{formatVND(held)}
              </span>
            )}
            {(cancelled || noShowRefund > 0) && (
              <span className="motion-fade-up rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-green-800 tabular-nums">
                +{formatVND(cancelled ? held : noShowRefund)}
              </span>
            )}
            <span className="text-base font-bold text-gray-900 tabular-nums">{formatVND(balance)}</span>
          </span>
        </div>
      </div>
      {bare ? (
        <figcaption className="sr-only">{tx('Minh hoạ giao diện quản lý ca. Tên và số liệu là ví dụ.')}</figcaption>
      ) : (
        <figcaption>
          <Caption text={tx('Minh hoạ giao diện quản lý ca. Tên và số liệu là ví dụ.')} />
        </figcaption>
      )}
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Người lao động — check-in → đang làm → check-out → tiền về ví
// ---------------------------------------------------------------------------

type WorkerStep = {
  /** Trạng thái đơn của người lao động mẫu ở bước này. */
  app: 'Pending' | 'Rejected' | 'Approved' | 'CancelledByEmployer' | 'CheckedIn' | 'CheckedOut' | 'Confirmed';
  state: ShiftLifecycleState;
  tone: 'success' | 'info' | 'warning' | 'neutral' | 'danger';
  ms: number;
};

const WORKER_STEPS: WorkerStep[] = [
  { app: 'Approved', state: 'StartingSoon', tone: 'success', ms: 1900 },
  { app: 'CheckedIn', state: 'InProgress', tone: 'info', ms: 1700 },
  { app: 'CheckedOut', state: 'AwaitingEmployerConfirmation', tone: 'warning', ms: 1700 },
  { app: 'Confirmed', state: 'Completed', tone: 'success', ms: 3200 },
];
/** Ca mẫu bị huỷ: đã được duyệt → nhà tuyển dụng huỷ trước giờ làm. */
const WORKER_CANCELLED: WorkerStep[] = [
  { app: 'Approved', state: 'StartingSoon', tone: 'success', ms: 1900 },
  { app: 'CancelledByEmployer', state: 'Cancelled', tone: 'danger', ms: 3200 },
];
/** Không được chọn: ứng tuyển → nhà tuyển dụng đã chọn đủ người. */
const WORKER_NOT_SELECTED: WorkerStep[] = [
  { app: 'Pending', state: 'Published', tone: 'warning', ms: 1900 },
  { app: 'Rejected', state: 'Published', tone: 'neutral', ms: 3200 },
];
function workerSteps(round: number): WorkerStep[] {
  const shift = sampleShift(2, round);
  if (shift.cancelReason) return WORKER_CANCELLED;
  if (shift.workerNotSelected) return WORKER_NOT_SELECTED;
  return WORKER_STEPS;
}

export function WorkerPreview({ bare = false }: { bare?: boolean } = {}) {
  const t = useT();
  const tx = useTx();
  const ref = useRef<HTMLDivElement>(null);
  const { step, round } = usePlayback(ref, (r) => workerSteps(r).map((x) => x.ms));
  const steps = workerSteps(round);
  const s = steps[Math.min(step, steps.length - 1)];
  const paid = s.app === 'Confirmed';
  // Ca mẫu đổi mỗi vòng (vòng đầu: pha chế — khác ca "phụ bếp" ở biên nhận trang chủ).
  const shift = sampleShift(2, round);
  const total = serverWageTotal(shift.wage, shift.hours, 1);
  // Mỗi vòng là một người lao động mẫu khác: ví bắt đầu từ số dư riêng của người đó
  // và chỉ cộng tiền công của đúng ca này (không cộng dồn qua các vòng).
  const balance = useCountUp(shift.walletBefore, shift.walletBefore + total, paid);

  return (
    <figure>
      {/* Một khối giống minh hoạ nhà tuyển dụng: đầu thẻ → dải tiền → thanh bước →
          hành động theo bước → ví. */}
      <div ref={ref} aria-hidden="true" className={bare ? CARD_BARE : CARD}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p key={shift.title} className="motion-fade-up text-lg font-semibold text-gray-900">{tx(shift.title)}</p>
            <p className="mt-0.5 text-sm text-gray-600 tabular-nums">
              {tx('Hôm nay · {time}').replace('{time}', `${shift.start}–${shift.end}`)}
            </p>
          </div>
          <Badge key={s.app} tone={s.tone}>
            <span className="motion-fade-up inline-block">{t(`application.status.${s.app}`)}</span>
          </Badge>
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-3 rounded-2xl bg-orange-50 px-4 py-3">
          <span className="min-w-0">
            <span className="block text-sm text-gray-700">{tx('Tiền công cả ca')}</span>
            <span className="block text-xs text-gray-600 tabular-nums">
              {tx('{wage}/giờ · {hours} giờ')
                .replace('{wage}', formatVND(shift.wage))
                .replace('{hours}', String(shift.hours))}
            </span>
          </span>
          <span key={shift.title} className="motion-fade-up text-2xl font-bold text-gray-900 tabular-nums">
            {formatVND(total)}
          </span>
        </div>
        <ShiftJourney state={s.state} approved={s.app !== 'Pending' && s.app !== 'Rejected'} className="mt-5" />
        <div key={s.app} className="motion-fade-up mt-5">
          {s.app === 'Pending' && (
            <span className="flex min-h-[44px] items-center justify-center rounded-xl bg-amber-50 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">
              {tx('Đã ứng tuyển · chờ nhà tuyển dụng duyệt')}
            </span>
          )}
          {s.app === 'Rejected' && (
            <span className="flex min-h-[44px] items-center justify-center rounded-xl bg-gray-100 px-3 text-center text-sm font-semibold text-gray-700">
              {tx('Nhà tuyển dụng đã chọn đủ người · xem ca khác')}
            </span>
          )}
          {s.app === 'CancelledByEmployer' && shift.cancelReason && (
            <span className="flex min-h-[44px] items-center justify-center rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-800 ring-1 ring-red-100">
              {tx('Lý do huỷ: {reason}').replace('{reason}', tx(shift.cancelReason))}
            </span>
          )}
          {s.app === 'Approved' && (
            <span className="flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-gray-900">
              {t('btn.checkIn')}
            </span>
          )}
          {s.app === 'CheckedIn' && (
            <span className="flex min-h-[44px] items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-800 ring-1 ring-blue-100">
              {tx('Đang làm · kết thúc lúc {end}').replace('{end}', shift.end)}
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
        <div
          className={[
            'mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-500 motion-reduce:transition-none',
            paid ? 'border-green-300 bg-green-50' : 'border-gray-200',
          ].join(' ')}
        >
          <span className="text-sm text-gray-700">{tx('Ví của bạn')}</span>
          <span className="flex items-center gap-2">
            {paid && (
              <span className="motion-fade-up rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-green-800 tabular-nums">
                +{formatVND(total)}
              </span>
            )}
            <span className="text-base font-bold text-gray-900 tabular-nums">{formatVND(balance)}</span>
          </span>
        </div>
      </div>
      {bare ? (
        <figcaption className="sr-only">{tx('Minh hoạ giao diện người lao động. Số liệu là ví dụ.')}</figcaption>
      ) : (
        <figcaption>
          <Caption text={tx('Minh hoạ giao diện người lao động. Số liệu là ví dụ.')} />
        </figcaption>
      )}
    </figure>
  );
}
