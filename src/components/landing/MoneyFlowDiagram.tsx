'use client';

/**
 * Trang chủ — sơ đồ dòng tiền ở khối "Tiền của một ca đi về đâu?" (02/10):
 *
 *   Ví nhà tuyển dụng → ① CaLẻ giữ tiền ─┬→ ② Người lao động
 *                                         ├→ ③ Phí CaLẻ
 *                                         └→ ④ Hoàn về ví nhà tuyển dụng
 *
 * Lần đầu cuộn tới, chạy MỘT lần theo từng bước (~1,3 giây / bước): đường nối được
 * tô dần, một chấm tiền chạy dọc đường, ô đích sáng lên kèm số tiền; thẻ giải thích
 * cùng số bên dưới sáng theo (đặt `data-flow-step` lên khối cha, CSS tô thẻ). Chạy
 * xong dừng ở trạng thái đủ, có nút "Xem lại". Máy tính: ngang; điện thoại: dọc.
 * Giảm chuyển động → hiện sẵn trạng thái cuối, không có nút "Xem lại".
 *
 * Ví dụ cố định: ca 2 người × 4 giờ × 45.000 đ, một người vắng mặt — để cả ba nhánh
 * đều có tiền. Số tính bằng hàm của server (`serverWageTotal`, `platformFee`):
 * production giữ tiền công + 10% phí, phí chỉ tính phần có người làm; demo chưa thu
 * phí và ghi "(mô phỏng)".
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { isSupabaseEnv } from '@/data/supabaseClient';
import { platformFee, serverWageTotal } from '@/domain/deposit';
import { useTx } from '@/i18n/LocaleProvider';
import { formatVND } from '@/lib/format';

const WAGE = 45_000;
const HOURS = 4;
const PEOPLE = 2;
const WORKED = 1;
const STEP_MS = 1300;
/** 0 = chưa chạy; 1–4 = đang tới đích ①–④; 5 = xong. */
const LAST_STEP = 5;

/** Số tiền của ví dụ trên sơ đồ (export để test). */
export function flowAmounts(live: boolean) {
  const wages = serverWageTotal(WAGE, HOURS, PEOPLE);
  const held = live ? wages + platformFee(wages) : wages;
  const paid = serverWageTotal(WAGE, HOURS, WORKED);
  const fee = live ? platformFee(paid) : 0;
  return { held, paid, fee, refund: held - paid - fee };
}

export function MoneyFlowDiagram() {
  const tx = useTx();
  const ref = useRef<HTMLElement>(null);
  const live = isSupabaseEnv();
  const a = flowAmounts(live);
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);
  const timers = useRef<number[]>([]);

  const play = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.length = 0;
    setStep(0);
    for (let s = 1; s <= LAST_STEP; s += 1) {
      timers.current.push(window.setTimeout(() => setStep(s), 250 + (s - 1) * STEP_MS));
    }
  }, []);

  // Chạy khi lần đầu thấy sơ đồ; giảm chuyển động → trạng thái cuối ngay.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          setReduced(true);
          setStep(LAST_STEP);
        } else {
          play();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    const pending = timers.current;
    return () => {
      io.disconnect();
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, [play]);

  // Thẻ giải thích cùng số sáng theo bước đang chạy (CSS: [data-flow-step] #home-…).
  useEffect(() => {
    const section = ref.current?.closest('section');
    if (!section) return;
    if (step >= 1 && step <= 4) section.setAttribute('data-flow-step', String(step));
    else section.removeAttribute('data-flow-step');
  }, [step]);

  const on = (from: number) => step >= from;
  const dests = [
    { n: 2, label: tx('Người lao động'), sub: tx('Người đã làm và được xác nhận'), amount: `+${formatVND(a.paid)}`, tone: 'text-green-700' },
    {
      n: 3,
      label: tx('Phí CaLẻ'),
      sub: live ? tx('10% phần ca có người làm') : tx('Bản demo chưa thu phí'),
      amount: `+${formatVND(a.fee)}`,
      tone: 'text-orange-700',
    },
    { n: 4, label: tx('Hoàn về ví nhà tuyển dụng'), sub: tx('Phần của người vắng mặt'), amount: `+${formatVND(a.refund)}`, tone: 'text-green-700' },
  ];

  return (
    <figure ref={ref} data-step={step} className="money-flow mt-10">
      <div className="flex flex-col lg:flex-row lg:items-start">
        <div className="lg:min-w-0 lg:flex-1">
          <FlowNode lit={on(1)} label={tx('Ví nhà tuyển dụng')} sub={tx('Đăng ca')} amount={`−${formatVND(a.held)}`} tone="text-red-700" />
        </div>
        <FlowLink on={on(1)} />
        <div className="lg:min-w-0 lg:flex-1">
          <FlowNode
            n={1}
            lit={on(1)}
            label={tx('CaLẻ giữ tiền')}
            sub={live ? tx('Tiền công + 10% phí') : tx('Tiền công (mô phỏng)')}
            amount={formatVND(a.held)}
            tone="text-gray-900"
          />
        </div>
        <FlowLink on={on(2)} />
        {/* Ba nhánh: thanh dọc (bus) + nhánh ngắn tới từng ô; mọi ô cao 72px để
            tính được tâm (36 / 120 / 204px). */}
        <div className="relative pl-12 lg:min-w-0 lg:flex-[1.25] lg:pl-8">
          <span aria-hidden="true" className="flow-bus absolute left-[30px] top-0 h-[204px] w-[3px] rounded-full lg:left-0 lg:top-[36px] lg:h-[168px]">
            <span className="flow-bus-fill block w-full rounded-full" />
          </span>
          <ul className="flex flex-col gap-3">
            {dests.map((d, i) => (
              <li key={d.n} className="relative">
                <span
                  aria-hidden="true"
                  className={['flow-stub absolute top-[34.5px] h-[3px] w-[18px] -left-[18px] lg:-left-8 lg:w-8', on(i + 2) ? 'is-on' : ''].join(' ')}
                >
                  <span className="flow-fill block h-full w-full rounded-full" />
                  <span className="flow-dot" />
                </span>
                <FlowNode n={d.n} lit={on(d.n)} label={d.label} sub={d.sub} amount={d.amount} tone={d.tone} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <figcaption className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
        <span>
          {live
            ? tx('Ví dụ: ca 2 người × 4 giờ × 45.000 đ, một người vắng mặt.')
            : tx('Ví dụ: ca 2 người × 4 giờ × 45.000 đ, một người vắng mặt (mô phỏng).')}
        </span>
        {/* Nút luôn giữ chỗ (chỉ ẩn bằng `invisible`): hiện / ẩn thật sẽ đổi chiều cao
            khối và trình duyệt tự cuộn bù (scroll anchoring) làm trang giật. */}
        <button
          type="button"
          onClick={play}
          disabled={reduced || step !== LAST_STEP}
          aria-hidden={reduced || step !== LAST_STEP}
          tabIndex={reduced || step !== LAST_STEP ? -1 : undefined}
          className={[
            'inline-flex min-h-[44px] items-center gap-1 font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
            reduced || step !== LAST_STEP ? 'invisible' : '',
          ].join(' ')}
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 10a6 6 0 1 0 2-4.5M4 4v3.5h3.5" />
          </svg>
          {tx('Xem lại')}
        </button>
      </figcaption>
    </figure>
  );
}

function FlowNode({
  n,
  lit,
  label,
  sub,
  amount,
  tone,
}: {
  n?: number;
  lit: boolean;
  label: string;
  sub: string;
  amount: string;
  tone: string;
}) {
  return (
    <div
      className={[
        'flow-node flex h-[72px] items-center gap-3 rounded-2xl bg-white px-4 shadow-card ring-1',
        lit ? 'is-lit ring-orange-300' : 'ring-black/5',
      ].join(' ')}
    >
      {n !== undefined && (
        <span
          className={[
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums transition-colors delay-300 duration-500 motion-reduce:transition-none',
            lit ? 'bg-brand text-gray-900' : 'bg-gray-900 text-white',
          ].join(' ')}
        >
          {n}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-gray-900">{label}</span>
        <span className="block truncate text-xs text-gray-600">{sub}</span>
      </span>
      <span
        aria-hidden={!lit}
        className={['shrink-0 text-base font-bold tabular-nums transition-opacity delay-300 duration-500 motion-reduce:transition-none', tone, lit ? 'opacity-100' : 'opacity-0'].join(' ')}
      >
        {amount}
      </span>
    </div>
  );
}

/** Đường nối giữa hai ô: dọc trên điện thoại, ngang từ lg. */
function FlowLink({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'flow-link relative ml-[30px] h-7 w-[3px] shrink-0 rounded-full lg:ml-0 lg:mt-[34.5px] lg:h-[3px] lg:w-12',
        on ? 'is-on' : '',
      ].join(' ')}
    >
      <span className="flow-fill block h-full w-full rounded-full" />
      <span className="flow-dot" />
    </span>
  );
}
