'use client';

/**
 * `/for-workers` — "Tiền về tay bạn khi nào?" (03/10): năm chặng của tiền công một
 * ca, từ lúc nhà tuyển dụng giữ tiền tới lúc bạn rút về ngân hàng. Lần đầu cuộn tới
 * chạy MỘT lần: đường nối tô dần, chấm tiền chạy dọc đường, chặng tới nơi sáng lên
 * kèm nhãn (cùng CSS `flow-*` với sơ đồ dòng tiền trang chủ). Xong có "Xem lại".
 * Điện thoại: dọc; máy tính: ngang. Giảm chuyển động → hiện sẵn trạng thái cuối.
 *
 * Ví dụ cố định: ca 4 giờ × 45.000 đ = 180.000 đ (cùng ví dụ của trang). Câu về
 * tự chốt sau 24 giờ và rút tiền chỉ ở production (bản demo: mô phỏng, chưa rút).
 */

import { useMemo, useRef } from 'react';

import { isSupabaseEnv } from '@/data/supabaseClient';
import { serverWageTotal } from '@/domain/deposit';
import { useTx } from '@/i18n/LocaleProvider';
import { formatVND } from '@/lib/format';

import type { ScriptItem } from './typingScript';
import { useTypingScript } from './useTypingScript';

const WAGE = 45_000;
const HOURS = 4;
const STEP_MS = 1100;

export function PayoutTimeline() {
  const tx = useTx();
  const ref = useRef<HTMLElement>(null);
  const live = isSupabaseEnv();
  const total = serverWageTotal(WAGE, HOURS, 1);
  // Kịch bản chỉ có mốc: mốc thứ n = chặng n sáng lên.
  const script = useMemo<ScriptItem[]>(
    () => [
      { kind: 'mark', mark: '0', ms: 250 },
      ...[1, 2, 3, 4, 5].map((n) => ({ kind: 'mark' as const, mark: String(n), ms: n === 5 ? 400 : STEP_MS })),
    ],
    [],
  );
  const { state, finished, reduced, replay } = useTypingScript(ref, script, 0.45);
  const step = state.marks.length - 1;

  const stops = [
    { label: tx('Nhà tuyển dụng giữ tiền'), sub: tx('Trước khi ca hiện ra cho bạn'), chip: formatVND(total), tone: 'text-gray-900' },
    { label: tx('Bạn làm ca'), sub: tx('Check-in khi đến, check-out khi xong'), chip: tx('{n} giờ').replace('{n}', String(HOURS)), tone: 'text-blue-800' },
    {
      label: tx('Xác nhận hoàn thành'),
      sub: live ? tx('Nhà tuyển dụng bấm, hoặc tự chốt sau 24 giờ') : tx('Nhà tuyển dụng bấm xác nhận'),
      chip: '✓',
      tone: 'text-green-800',
    },
    { label: tx('Vào ví CaLẻ của bạn'), sub: tx('Nhận đủ, không mất phí'), chip: `+${formatVND(total)}`, tone: 'text-green-800' },
    live
      ? { label: tx('Rút về ngân hàng'), sub: tx('Khi bạn cần, không mất phí rút'), chip: '→', tone: 'text-orange-800' }
      : { label: tx('Rút về ngân hàng'), sub: tx('Bản demo chưa rút được tiền thật'), chip: tx('Chưa có'), tone: 'text-gray-600' },
  ];

  return (
    <figure ref={ref} className="money-flow mt-10">
      <ol className="flex flex-col lg:flex-row lg:items-stretch">
        {stops.map((s, i) => {
          const lit = step >= i + 1;
          return (
            <li key={s.label} className="flex flex-col lg:min-w-0 lg:flex-1 lg:flex-row">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={[
                    'flow-link relative ml-[30px] h-6 w-[3px] shrink-0 rounded-full lg:ml-0 lg:h-[3px] lg:w-6 lg:self-center',
                    lit ? 'is-on' : '',
                  ].join(' ')}
                >
                  <span className="flow-fill block h-full w-full rounded-full" />
                  <span className="flow-dot" />
                </span>
              )}
              <div
                className={[
                  'flow-node flex flex-1 items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 lg:flex-col lg:items-start',
                  lit ? 'is-lit ring-orange-300' : 'ring-black/5',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums transition-colors delay-300 duration-500 motion-reduce:transition-none',
                    lit ? 'bg-brand text-gray-900' : 'bg-gray-900 text-white',
                  ].join(' ')}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug text-gray-900">{s.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-gray-600">{s.sub}</span>
                </span>
                <span
                  aria-hidden={!lit}
                  className={[
                    'shrink-0 text-base font-bold tabular-nums transition-opacity delay-300 duration-500 motion-reduce:transition-none',
                    s.tone,
                    lit ? 'opacity-100' : 'opacity-0',
                  ].join(' ')}
                >
                  {s.chip}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <figcaption className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
        <span>{live ? tx('Ví dụ: ca 4 giờ × 45.000 đ.') : tx('Ví dụ: ca 4 giờ × 45.000 đ (mô phỏng).')}</span>
        <button
          type="button"
          onClick={replay}
          disabled={reduced || !finished}
          aria-hidden={reduced || !finished}
          tabIndex={reduced || !finished ? -1 : undefined}
          className={[
            'inline-flex min-h-[44px] items-center gap-1 font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
            reduced || !finished ? 'invisible' : '',
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
