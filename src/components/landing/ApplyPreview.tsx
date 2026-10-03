'use client';

/**
 * `/for-workers` — "Tìm được ca là ứng tuyển ngay" (03/10), 3 bước như ngoài đời
 * (đối xứng với "Thử đăng một ca" bên nhà tuyển dụng):
 *
 *   1. Tìm ca — gõ ô tìm + khu vực (nhãn y hệt `ShiftSearchBar` / `ShiftFilters`) →
 *      danh sách ca hiện ra → chọn một ca.
 *   2. Xem chi tiết — như trang chi tiết ca: tổng tiền cả ca + đơn giá, giờ, khu vực,
 *      mô tả, yêu cầu, người phụ trách tại chỗ, đánh giá quán kèm một nhận xét, quy
 *      định huỷ theo GIỜ CỦA CA (`shiftMilestones`); bản thật thêm dòng cọc. Nút
 *      "Ứng tuyển".
 *   3. Sau khi ứng tuyển — nút biến mất, thay bằng dòng theo dõi đơn: đã ứng tuyển →
 *      được duyệt → giờ mở check-in → check-out → tiền về ví (+ tự chốt 24 giờ ở bản
 *      thật) → đánh giá 14 ngày.
 *
 * Tự chạy MỘT lần khi cuộn tới (`useTypingScript`), xong thì bấm từng bước hoặc bấm
 * "Ứng tuyển". Bản server / giảm chuyển động: trạng thái cuối. Ca, quán, số tiền là ví
 * dụ (ca đầu cùng ví dụ 4 giờ × 45.000 đ của trang).
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { serverWageTotal } from '@/domain/deposit';
import { useT, useTx } from '@/i18n/LocaleProvider';
import { formatVND } from '@/lib/format';

import { PreviewSteps } from './PreviewSteps';
import { Stage, StageNav, StageStack, StepButton, TimelineItem } from './previewParts';
import { shiftMilestones, type ClockMark } from './shiftMilestones';
import type { ScriptItem } from './typingScript';
import { useTypingScript } from './useTypingScript';

const PICK = { start: '07:00', end: '11:00', wage: 45_000, hours: 4 };

export function ApplyPreview() {
  const t = useT();
  const tx = useTx();
  const ref = useRef<HTMLDivElement>(null);
  const live = isSupabaseEnv();
  const [view, setView] = useState<number | null>(null);

  const results = [
    { title: tx('Phục vụ quán cà phê'), when: tx('Thứ 7 · {time}').replace('{time}', `${PICK.start}–${PICK.end}`), wage: PICK.wage, hours: PICK.hours },
    { title: tx('Phục vụ tiệc cưới'), when: tx('Chủ nhật · {time}').replace('{time}', '17:00–22:00'), wage: 40_000, hours: 5 },
  ];
  const query = tx('phục vụ');
  const area = tx('Quận 3');
  const script = useMemo<ScriptItem[]>(
    () => [
      { kind: 'type', field: 'q', text: query },
      { kind: 'type', field: 'area', text: area },
      { kind: 'mark', mark: 'results', ms: 800 },
      { kind: 'mark', mark: 'pick', ms: 700 },
      { kind: 'mark', mark: 'detail', ms: 2600 },
      { kind: 'mark', mark: 'press', ms: 500 },
      { kind: 'mark', mark: 'applied', ms: 300 },
      { kind: 'mark', mark: 't1', ms: 550 },
      { kind: 'mark', mark: 't2', ms: 550 },
      { kind: 'mark', mark: 't3', ms: 550 },
      { kind: 'mark', mark: 't4', ms: 550 },
      { kind: 'mark', mark: 't5', ms: 550 },
      { kind: 'mark', mark: 't6', ms: 400 },
    ],
    [query, area],
  );
  const { state, finished, reduced, replay, stop } = useTypingScript(ref, script);
  const has = (m: string) => finished || state.marks.includes(m);
  // Khung cao cố định (03/10): dòng thời gian bước 3 cuộn bên trong; đang tự chạy thì cuộn
  // theo mốc mới hiện (chỉ vùng đó, không cuộn trang).
  const timelineRef = useRef<HTMLDivElement>(null);
  // Mốc mới nhất đã sáng (t1…t6); 0 = chưa có mốc nào.
  const newest = ['t1', 't2', 't3', 't4', 't5', 't6'].reduce((n, m, i) => (state.marks.includes(m) ? i + 1 : n), 0);
  useEffect(() => {
    const box = timelineRef.current;
    if (!box || finished || newest === 0) return;
    // Cuộn vừa đủ để mốc mới nhất nằm trọn trong khung (không nhảy xuống đáy ngay khi mở
    // bước 3, mốc đầu không bị cắt).
    const item = box.querySelectorAll<HTMLElement>('ol > li')[newest - 1];
    if (!item) return;
    const b = box.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    let delta = 0;
    if (r.bottom > b.bottom - 8) delta = r.bottom - b.bottom + 8;
    if (r.top - delta < b.top + 8) delta = r.top - b.top - 8;
    if (delta !== 0) box.scrollBy({ top: delta, behavior: reduced ? 'auto' : 'smooth' });
  }, [newest, finished, reduced]);
  const autoStage = state.marks.includes('applied') ? 2 : state.marks.includes('detail') ? 1 : 0;
  const stage = finished && view !== null ? view : autoStage;
  const go = (i: number) => {
    if (!finished) stop();
    setView(i);
  };
  const again = () => {
    setView(null);
    replay();
  };

  const total = serverWageTotal(PICK.wage, PICK.hours, 1);
  const ms = shiftMilestones(PICK.start, PICK.end);
  const when = (m: ClockMark) =>
    m.dayOffset < 0 ? tx('{time} hôm trước').replace('{time}', m.time) : m.dayOffset > 0 ? tx('{time} hôm sau').replace('{time}', m.time) : m.time;

  return (
    <figure className="min-w-0">
      <div ref={ref} className="rounded-3xl bg-white p-5 text-left shadow-modal ring-1 ring-black/5 sm:p-6">
        <PreviewSteps
          label={tx('Các bước nhận một ca')}
          labels={[tx('Tìm ca'), tx('Xem chi tiết'), tx('Sau khi ứng tuyển')]}
          current={stage}
          onSelect={finished ? go : undefined}
        />

        <div className="mt-4">
         <StageStack className="h-[34rem] sm:h-[27rem]">
          {/* ---------- 1. Tìm ca ---------- */}
          <Stage on={stage === 0}>
            <p className="text-lg font-semibold text-gray-900">{tx('Tìm ca làm')}</p>
            <div className="mt-3 grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-2">
              <Box value={finished ? query : (state.values.q ?? '')} placeholder={t('form.searchPlaceholder')} active={!finished && state.active === 'q'} search />
              <Box label={t('form.filterLocation')} value={finished ? area : (state.values.area ?? '')} active={!finished && state.active === 'area'} />
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {results.map((r, i) => {
                const picked = i === 0 && has('pick');
                return (
                  <li
                    key={r.title}
                    className={[
                      'rounded-2xl border px-4 py-3 transition-[opacity,border-color,background-color] duration-300 motion-reduce:transition-none',
                      has('results') ? 'opacity-100' : 'opacity-0',
                      picked ? 'border-orange-300 bg-orange-50/60' : 'border-gray-200',
                      i > 0 && has('pick') ? 'opacity-60' : '',
                    ].join(' ')}
                  >
                    {i === 0 && finished ? (
                      <button type="button" onClick={() => go(1)} className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                        <ResultRow title={r.title} when={r.when} area={area} total={serverWageTotal(r.wage, r.hours, 1)} />
                      </button>
                    ) : (
                      <ResultRow title={r.title} when={r.when} area={area} total={serverWageTotal(r.wage, r.hours, 1)} />
                    )}
                  </li>
                );
              })}
            </ul>
          </Stage>

          {/* ---------- 2. Xem chi tiết ---------- */}
          <Stage on={stage === 1} scroll>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold text-gray-900">{results[0].title}</p>
                <p className="text-sm text-gray-600 tabular-nums">
                  {results[0].when} · {area}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-3 rounded-2xl bg-orange-50 px-4 py-3">
              <span className="min-w-0">
                <span className="block text-sm text-gray-700">{t('shifts.detail.totalPay')}</span>
                <span className="block text-xs text-gray-600 tabular-nums">
                  {t('shifts.detail.totalPayHint').replace('{hourly}', formatVND(PICK.wage)).replace('{hours}', String(PICK.hours))}
                </span>
              </span>
              <span className="text-2xl font-bold text-gray-900 tabular-nums">{formatVND(total)}</span>
            </div>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <Fact label={t('form.description')}>{tx('Pha nước theo công thức của quán, bưng nước, dọn bàn giờ cao điểm sáng.')}</Fact>
              <Fact label={t('shifts.detail.requirements')}>{tx('Không cần kinh nghiệm. Mặc áo quán phát.')}</Fact>
              <Fact label={t('shifts.detail.onSiteContact')}>{tx('Anh Tuấn, quản lý quán')}</Fact>
            </dl>
            {/* Đánh giá quán từ người đã làm ca ở đó (đánh giá hai chiều, 0024). */}
            <div className="mt-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm">
              <p className="flex items-center gap-1.5 font-semibold text-gray-900">
                <span aria-hidden="true" className="text-amber-500">★</span>
                {tx('4,7 · 12 đánh giá về quán')}
              </p>
              <p className="mt-1 text-gray-700">“{tx('Chủ quán dễ chịu, chỉ việc rõ ràng, trả đúng giờ.')}”</p>
            </div>
            {ms && (
              <p className="mt-3 text-xs leading-relaxed text-gray-600">
                {tx('Tự huỷ được tới {time} (3 giờ trước ca); sau đó cần nhà tuyển dụng đồng ý.').replace('{time}', when(ms.workerCancelBy))}
                {live && <> {tx('Nếu CaLẻ yêu cầu cọc, số tiền hiện để bạn đồng ý trước khi gửi.')}</>}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => go(2)}
                className={[
                  'inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-semibold text-gray-900 transition-transform duration-150 hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 motion-reduce:transition-none',
                  state.marks.includes('press') && !finished ? 'scale-95 bg-orange-400' : '',
                ].join(' ')}
              >
                {t('btn.apply')}
              </button>
              <span aria-hidden={!finished} inert={!finished} className={finished ? '' : 'invisible'}>
                <StepButton onClick={() => go(0)}>← {tx('Tìm ca')}</StepButton>
              </span>
            </div>
          </Stage>

          {/* ---------- 3. Sau khi ứng tuyển ---------- */}
          <Stage on={stage === 2} scroll scrollRef={timelineRef}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold text-gray-900">{results[0].title}</p>
                <p className="text-sm text-gray-600 tabular-nums">
                  {results[0].when} · {area}
                </p>
              </div>
              <Badge tone="warning">{t('apply.applied.Pending')}</Badge>
            </div>
            {ms && (
              <ol className="mt-4 flex flex-col">
                <TimelineItem on={has('t1')} time={tx('Bây giờ')} title={t('apply.applied.Pending')}>
                  {tx('Chờ nhà tuyển dụng duyệt; trạng thái đổi ngay trên trang Tổng quan.')}
                </TimelineItem>
                <TimelineItem on={has('t2')} time={tx('Khi được duyệt')} title={t('apply.applied.Approved')}>
                  {tx('Tự huỷ được tới {time}; sau đó cần nhà tuyển dụng đồng ý.').replace('{time}', when(ms.workerCancelBy))}
                </TimelineItem>
                <TimelineItem on={has('t3')} time={`${ms.checkInOpen.time}–${ms.checkInClose.time}`} title={tx('Check-in tại quán')}>
                  {tx('Tới nơi, bấm check-in trên điện thoại. Không đến mà không báo bị tính vắng mặt.')}
                </TimelineItem>
                <TimelineItem on={has('t4')} time={PICK.end} title={tx('Check-out')}>
                  {tx('Xong ca, bấm check-out.')}
                </TimelineItem>
                <TimelineItem
                  on={has('t5')}
                  time={tx('Sau ca')}
                  title={tx('Nhận tiền')}
                  aside={<span className="shrink-0 text-sm font-bold text-green-800 tabular-nums">+{formatVND(total)}</span>}
                >
                  {live
                    ? tx('Nhà tuyển dụng xác nhận là tiền vào ví; không ai bấm thì tự chốt lúc {time}.').replace('{time}', when(ms.autoSettle))
                    : tx('Nhà tuyển dụng xác nhận là tiền được ghi vào ví (mô phỏng).')}
                </TimelineItem>
                <TimelineItem on={has('t6')} time={tx('14 ngày')} title={tx('Đánh giá')} last>
                  {tx('Chấm sao cho quán; quán cũng chấm bạn.')}
                </TimelineItem>
              </ol>
            )}
            <StageNav show={finished}>
              <StepButton onClick={() => go(1)}>← {tx('Xem chi tiết')}</StepButton>
            </StageNav>
          </Stage>
         </StageStack>
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-center gap-x-4 text-xs text-gray-600">
        <span>{tx('Minh hoạ trang tìm ca. Ca, quán và số tiền là ví dụ.')}</span>
        <button
          type="button"
          onClick={again}
          disabled={reduced || !finished}
          aria-hidden={reduced || !finished}
          tabIndex={reduced || !finished ? -1 : undefined}
          className={[
            'inline-flex min-h-[44px] items-center font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
            reduced || !finished ? 'invisible' : '',
          ].join(' ')}
        >
          {tx('Xem lại')}
        </button>
      </figcaption>
    </figure>
  );
}

function ResultRow({ title, when, area, total }: { title: string; when: string; area: string; total: number }) {
  return (
    <span className="flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-600 tabular-nums">
          {when} · {area}
        </span>
      </span>
      <span className="shrink-0 text-base font-bold text-gray-900 tabular-nums">{formatVND(total)}</span>
    </span>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
      <dt className="text-gray-600">{label}</dt>
      <dd className="text-gray-900">{children}</dd>
    </div>
  );
}

function Box({
  label,
  value,
  placeholder,
  active,
  search,
}: {
  label?: string;
  value: string;
  placeholder?: string;
  active: boolean;
  search?: boolean;
}) {
  return (
    <div className="min-w-0">
      {label && <span className="sr-only">{label}</span>}
      <span
        className={[
          'flex h-11 items-center gap-2 rounded-xl border bg-white px-3 text-sm',
          active ? 'border-orange-400 ring-2 ring-orange-200' : 'border-gray-300',
        ].join(' ')}
      >
        {search ? (
          <svg className="h-4 w-4 shrink-0 text-gray-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.5 13.5 3 3" />
          </svg>
        ) : (
          <span className="hidden shrink-0 text-xs text-gray-500 sm:inline">{label}</span>
        )}
        <span className={['truncate', value ? 'text-gray-900' : 'text-gray-400'].join(' ')}>{value || placeholder}</span>
        {active && <span aria-hidden="true" className="type-caret" />}
      </span>
    </div>
  );
}
