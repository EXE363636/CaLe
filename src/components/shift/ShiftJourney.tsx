'use client';

/**
 * ShiftJourney — thanh bước vòng đời của một ca: Đã đăng → Đã duyệt → Đang
 * diễn ra → Chờ xác nhận → Hoàn thành. Dữ liệu từ `shiftJourney()` (domain),
 * vốn suy ra từ `getShiftLifecycleState` — cùng nguồn với `ShiftLifecycleBadge`,
 * nên thanh bước và badge không bao giờ nói hai điều khác nhau.
 *
 * Trạng thái không chỉ dựa vào màu: mỗi bước có nhãn chữ, bước hiện tại có
 * `aria-current="step"` + chữ đậm, bước dừng (huỷ / hết hạn / tranh chấp) thay
 * nhãn bằng lý do dừng.
 *
 * `tone="ink"` dùng trên khối nền mực (thẻ "ca kế tiếp").
 */

import type { ShiftLifecycleState } from '@/domain/shiftLifecycleState';
import { shiftJourney, type JourneyStepKey, type JourneyStepStatus } from '@/domain/shiftJourney';
import { useT, useTx } from '@/i18n/LocaleProvider';

export interface ShiftJourneyProps {
  state: ShiftLifecycleState;
  /** Đã có người được duyệt (worker: đơn của mình; employer: ít nhất một đơn). */
  approved: boolean;
  tone?: 'light' | 'ink';
  className?: string;
}

const STEP_LABEL: Record<JourneyStepKey, { tx?: string; key?: string }> = {
  posted: { tx: 'Đã đăng' },
  approved: { tx: 'Đã duyệt' },
  inProgress: { key: 'shift.lifecycle.InProgress' },
  awaitingConfirm: { key: 'shift.lifecycle.AwaitingEmployerConfirmation' },
  completed: { key: 'shift.lifecycle.Completed' },
};

const SR_STATUS: Record<JourneyStepStatus, string> = {
  done: 'đã xong',
  current: 'đang ở bước này',
  todo: 'chưa tới',
  halted: 'ca dừng ở đây',
};

export function ShiftJourney({ state, approved, tone = 'light', className = '' }: ShiftJourneyProps) {
  const t = useT();
  const tx = useTx();
  const journey = shiftJourney(state, { approved });
  const ink = tone === 'ink';
  const haltTone = journey.halted === 'Expired' ? 'neutral' : 'danger';

  const label = (k: JourneyStepKey) => {
    const l = STEP_LABEL[k];
    return l.key ? t(l.key) : tx(l.tx!);
  };

  return (
    <ol
      aria-label={tx('Tiến trình ca')}
      className={['grid grid-cols-5', className].join(' ')}
    >
      {journey.steps.map((step, i) => {
        const last = i === journey.steps.length - 1;
        const nextDone = !last && journey.steps[i + 1].status !== 'todo';
        const reached = step.status !== 'todo';
        const text =
          step.status === 'halted' && journey.halted
            ? t(`shift.lifecycle.${journey.halted}`)
            : label(step.key);

        const node =
          step.status === 'done'
            ? ink
              ? 'bg-orange-400 text-gray-900'
              : 'bg-gray-900 text-white'
            : step.status === 'current'
              ? 'bg-orange-500 text-gray-900 ring-4 ' + (ink ? 'ring-orange-400/30' : 'ring-orange-200')
              : step.status === 'halted'
                ? haltTone === 'danger'
                  ? 'bg-red-600 text-white ring-4 ' + (ink ? 'ring-red-400/30' : 'ring-red-100')
                  : 'bg-gray-500 text-white ring-4 ' + (ink ? 'ring-white/15' : 'ring-gray-200')
                : ink
                  ? 'bg-transparent ring-1 ring-inset ring-white/30'
                  : 'bg-white ring-1 ring-inset ring-gray-300';

        const textClass =
          step.status === 'current' || step.status === 'halted'
            ? ink
              ? 'font-semibold text-white'
              : 'font-semibold text-gray-900'
            : reached
              ? ink
                ? 'text-gray-300'
                : 'text-gray-700'
              : ink
                ? 'text-gray-400'
                : 'text-gray-500';

        return (
          <li
            key={step.key}
            aria-current={step.status === 'current' ? 'step' : undefined}
            className="relative flex flex-col items-center gap-2 text-center"
          >
            {!last && (
              <span
                aria-hidden="true"
                className={[
                  'absolute left-1/2 top-[11px] h-0.5 w-full transition-colors duration-500 motion-reduce:transition-none',
                  nextDone
                    ? ink
                      ? 'bg-orange-400'
                      : 'bg-gray-900'
                    : ink
                      ? 'bg-white/20'
                      : 'bg-gray-200',
                ].join(' ')}
              />
            )}
            <span
              aria-hidden="true"
              className={[
                'relative z-10 flex h-6 w-6 items-center justify-center rounded-full transition-[background-color,box-shadow,color] duration-500 motion-reduce:transition-none',
                node,
              ].join(' ')}
            >
              {step.status === 'done' && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 10.5 3.2 3L15 6.5" />
                </svg>
              )}
              {step.status === 'current' && <span className="h-2 w-2 rounded-full bg-gray-900" />}
              {step.status === 'halted' && (
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round">
                  <path d="M6 6l8 8M14 6l-8 8" />
                </svg>
              )}
            </span>
            <span className={['px-0.5 text-xs leading-snug', textClass].join(' ')}>
              {text}
              <span className="sr-only"> ({tx(SR_STATUS[step.status])})</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
