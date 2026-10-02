'use client';

/**
 * Biên nhận ca ở màn đầu trang chủ — một ca và tiền của nó đi đâu.
 * Dòng 1 là tiền vào (giữ trước); các dòng sau là tiền ra (trả người lao động,
 * phí, hoàn lại); dòng đối soát cuối cho thấy hai bên khớp nhau.
 *
 * Câu chữ do trang (server) dựng bằng `getTx()` rồi truyền vào (test i18n quét các
 * câu dịch ngay trong file trang); câu về tiền đổi theo chế độ ở trang (CLAUDE.md §5).
 * Số tiền tính ở đây từ ca mẫu (`landingSamples.ts`) bằng đúng hàm của server
 * (`serverWageTotal`, `platformFee`); mỗi vòng lặp đổi sang ca mẫu khác. Số liệu là
 * ví dụ, ghi rõ ở chú thích.
 *
 * Chuyển động (cùng kiểu minh hoạ ở `/for-workers`, `/for-employers`): biên nhận tự
 * diễn một vòng đời ca — đăng ca, giữ tiền → duyệt → đang diễn ra → chờ xác nhận →
 * hoàn thành, tiền ra được ghi và dấu ✓ đối soát tự vẽ — rồi lặp lại. Không phải vòng
 * nào cũng suôn sẻ (03/10): ca mẫu bị huỷ thì đăng ca → "Đã huỷ", hoàn đủ; ca có người
 * vắng thì chỉ trả người đã làm, hoàn phần người vắng (`sampleLedger`). Bản server và
 * khi giảm chuyển động đứng yên ở bước "hoàn thành" của vòng đầu (đọc được trọn biên
 * nhận). Chỉ chạy khi đang trong khung nhìn (`usePlayback`); không phải đồng bộ
 * lifecycle (§5.6).
 *
 * Mỗi dòng là liên kết tới mục giải thích cùng số bên dưới: rê / focus một dòng
 * thì mục đó sáng lên (`:has()` trong globals.css), bấm thì cuộn tới (`:target`).
 */

import { useRef } from 'react';

import { Badge } from '@/components/ui';
import { ShiftJourney } from '@/components/shift/ShiftJourney';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getShiftStatusBadge, type ShiftLifecycleState } from '@/domain/shiftLifecycleState';
import { useT, useTx } from '@/i18n/LocaleProvider';
import { formatVND } from '@/lib/format';

import { sampleLedger, sampleShift } from './landingSamples';
import { usePlayback } from './usePlayback';

export interface HomeReceiptLine {
  /** id của mục giải thích (không có `#`). */
  target: string;
  label: string;
  detail: string;
  /** Khoản tiền của dòng: giữ trước (có số từ lúc đăng ca) hay một khoản tiền ra
   *  (trả người lao động / phí / hoàn lại — có số khi ca hoàn thành). */
  kind: 'held' | 'paid' | 'fee' | 'refund';
  /** Kẻ nét đứt phía trên: ngăn tiền vào với các dòng tiền ra. */
  split?: boolean;
  /** Mô tả thay khi ca mẫu bị huỷ / có người vắng (`{n}` = số người vắng). */
  detailCancelled?: string;
  detailNoShow?: string;
}

type Step = { state: ShiftLifecycleState; approved: boolean; ms: number };
const STEPS: Step[] = [
  { state: 'Published', approved: false, ms: 1700 },
  { state: 'Published', approved: true, ms: 1500 },
  { state: 'InProgress', approved: true, ms: 1500 },
  { state: 'AwaitingEmployerConfirmation', approved: true, ms: 1500 },
  { state: 'Completed', approved: true, ms: 3800 },
];
/** Ca bị huỷ trước khi duyệt ai: đăng ca (giữ tiền) → đã huỷ, hoàn đủ. */
const CANCELLED_STEPS: Step[] = [
  { state: 'Published', approved: false, ms: 1700 },
  { state: 'Cancelled', approved: false, ms: 3800 },
];
const stepsFor = (round: number) => (sampleShift(0, round).cancelReason ? CANCELLED_STEPS : STEPS);
/** Bước đứng yên khi giảm chuyển động / bản server: "hoàn thành" của vòng đầu. */
const FINAL = STEPS.length - 1;

export function HomeReceipt({
  heading,
  lines,
  pending,
  balance,
  caption,
}: {
  /** Câu hỏi bảng trả lời ("Tiền của ca này đi đâu?"). */
  heading: string;
  lines: HomeReceiptLine[];
  /** Chữ thay số tiền khi dòng chưa có số (vd "—"). */
  pending: string;
  /** Dòng đối soát (tiền ra cộng lại = tiền giữ trước); `pending` khi ca chưa chốt. */
  balance: { label: string; pending: string };
  caption: string;
}) {
  const t = useT();
  const tx = useTx();
  const ref = useRef<HTMLDivElement>(null);
  const { step, round } = usePlayback(ref, (r) => stepsFor(r).map((s) => s.ms), FINAL);
  const steps = stepsFor(round);
  const { state, approved } = steps[Math.min(step, steps.length - 1)];
  const done = state === 'Completed' || state === 'Cancelled';
  const badge = getShiftStatusBadge(state);

  // Sổ tiền của ca mẫu: giữ trước = trả người lao động + phí + hoàn lại.
  const shift = sampleShift(0, round);
  const amounts = sampleLedger(shift, isSupabaseEnv());
  const num = (n: number) => formatVND(n).replace(/\s*đ$/, '');
  const balanceText = `${num(amounts.paid)} + ${num(amounts.fee)} + ${num(amounts.refund)} = ${formatVND(amounts.held)}`;
  const detailOf = (line: HomeReceiptLine) => {
    if (!done) return line.detail;
    if (amounts.outcome === 'cancelled' && line.detailCancelled) return line.detailCancelled;
    if (amounts.outcome === 'noShow' && line.detailNoShow) return line.detailNoShow.replace('{n}', String(shift.noShow ?? 0));
    return line.detail;
  };
  const people = shift.people === 1 ? tx('1 người') : tx('{n} người').replace('{n}', String(shift.people));

  return (
    <figure className="home-receipt w-full">
      <div ref={ref} className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p key={shift.title} className="motion-fade-up text-lg font-semibold leading-snug text-gray-900">
                {tx(shift.title)}
              </p>
              <p className="mt-0.5 text-sm text-gray-600 tabular-nums">
                {tx(shift.day)} · {shift.start}–{shift.end} · {people}
              </p>
              {state === 'Cancelled' && shift.cancelReason && (
                <p className="motion-fade-up mt-1 text-sm text-red-800">
                  {tx('Lý do huỷ: {reason}').replace('{reason}', tx(shift.cancelReason))}
                </p>
              )}
            </div>
            <span className="shrink-0 whitespace-nowrap">
              <Badge key={state} tone={badge.tone}>
                <span className="motion-fade-up inline-block">{t(badge.labelKey)}</span>
              </Badge>
            </span>
          </div>
          <ShiftJourney state={state} approved={approved} className="mt-5" />
        </div>

        {/* Đường xé của tờ biên nhận: nét đứt + hai khuyết hai bên. */}
        <div aria-hidden="true" className="receipt-tear relative h-6">
          <span className="absolute inset-x-6 top-1/2 border-t-2 border-dashed border-gray-200" />
        </div>

        <p className="px-5 pt-1 text-sm font-semibold text-gray-900 sm:px-6">{heading}</p>
        <ol className="flex flex-col px-2 pt-1 sm:px-3">
          {lines.map((line, i) => {
            const settled = line.kind === 'held' || done;
            return (
              <li key={line.target} className={line.split ? 'relative mt-1 pt-1' : ''}>
                {line.split && (
                  <span aria-hidden="true" className="absolute inset-x-3 top-0 border-t-2 border-dashed border-gray-300" />
                )}
                <a
                  href={`#${line.target}`}
                  data-receipt-line={line.target}
                  className="group grid min-h-[60px] grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.5 rounded-xl px-3 py-3 transition-colors hover:bg-orange-50 focus:outline-none focus-visible:bg-orange-50 focus-visible:ring-2 focus-visible:ring-orange-400 motion-reduce:transition-none sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-x-3"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white tabular-nums transition-colors group-hover:bg-orange-500 group-hover:text-gray-900 group-focus-visible:bg-orange-500 group-focus-visible:text-gray-900 motion-reduce:transition-none">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-gray-900">{line.label}</span>
                    <span key={detailOf(line)} className="motion-fade-up block text-sm leading-snug text-gray-600">
                      {detailOf(line)}
                    </span>
                  </span>
                  <span
                    key={settled ? 'v' : 'p'}
                    className={[
                      // Điện thoại: số xuống dưới chữ (cột 2) để chữ dùng hết bề ngang, không
                      // ngắt 2–3 dòng. Từ sm: cột số bên phải rộng cố định — đổi giữa "—" và
                      // số tiền không làm chữ bên trái xuống dòng.
                      'col-start-2 mt-1 text-lg font-bold tracking-tight tabular-nums sm:col-start-auto sm:mt-0 sm:min-w-[6.5rem] sm:text-right',
                      settled ? 'motion-fade-up text-gray-900' : 'text-gray-500',
                    ].join(' ')}
                  >
                    {settled ? formatVND(amounts[line.kind]) : pending}
                  </span>
                  {/* Gợi ý "dòng này dẫn xuống mục giải thích" — hiện khi rê / focus (ẩn trên màn cảm ứng nhỏ). */}
                  <svg
                    className="hidden h-4 w-4 text-orange-700 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none sm:block"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10 4v12M5 11l5 5 5-5" />
                  </svg>
                </a>
              </li>
            );
          })}
        </ol>
        <div className="mx-5 mb-4 mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t-2 border-gray-900 pt-3 sm:mx-6">
          <span className="text-sm font-semibold text-gray-900">{balance.label}</span>
          {done ? (
            <span key="done" className="motion-fade-up inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 tabular-nums">
              {balanceText}
              <svg className="h-4 w-4 shrink-0 text-green-700" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path className="receipt-check" pathLength={1} d="m5 10.5 3.2 3L15 6.5" />
              </svg>
            </span>
          ) : (
            <span key="pending" className="text-sm text-gray-600">
              {balance.pending}
            </span>
          )}
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-gray-600">{caption}</figcaption>
    </figure>
  );
}
