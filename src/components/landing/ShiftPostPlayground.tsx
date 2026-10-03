'use client';

/**
 * `/for-employers` — "Thử đăng một ca" (03/10), 3 bước như ngoài đời:
 *
 *   1. Điền ca — form thu nhỏ TỰ GÕ thông tin ví dụ (nhãn y hệt `ShiftForm`): tên,
 *      loại việc, ngày, địa điểm, giờ, lương, số người, mô tả, yêu cầu, người phụ
 *      trách tại chỗ. Bảng tiền (`shiftCostBreakdown`) + dòng số dư ví: đủ → đăng
 *      được; thiếu → "ca được lưu nháp, nạp thêm rồi đăng" (đúng luồng thật).
 *   2. Tuyển người — bấm "Giữ tiền và đăng ca": nút biến mất, ví trừ số tiền giữ, ca
 *      "Đang tuyển"; xem trước thẻ ca như người lao động thấy (tiền mỗi người); người
 *      ứng tuyển hiện dần kèm sao đánh giá, được duyệt từng người. Mốc sửa / huỷ ca.
 *   3. Ngày làm & sau ca — dòng thời gian theo GIỜ CỦA CHÍNH CA (`shiftMilestones`):
 *      mở check-in, ca diễn ra, xác nhận hoàn thành / tự chốt, đánh giá 14 ngày; bảng
 *      trả / phí / hoàn, bật "Giả sử 1 người không đến".
 *
 * Tự chạy MỘT lần khi cuộn tới (`useTypingScript`), xong thì người xem bấm từng bước,
 * sửa giờ / lương / số người (chạm vào ô là dừng kịch bản). Bản server / giảm chuyển
 * động: trạng thái cuối. Phí: `useFeeRate` (demo 0 + "mô phỏng"; production 10% hoặc
 * 0 trong đợt miễn phí). Không gửi gì đi đâu: đây không phải form thật.
 */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui';
import { serverWageTotal } from '@/domain/deposit';
import { getShiftStatusBadge } from '@/domain/shiftLifecycleState';
import { useLocale, useT, useTx } from '@/i18n/LocaleProvider';
import { formatDateVN, formatVND } from '@/lib/format';
import { formatNumberVNInput } from '@/lib/numberVN';

import { LANDING_SAMPLE_WORKERS } from './landingSamples';
import { PreviewSteps } from './PreviewSteps';
import { Row, Stage, StageNav, StageStack, StepButton, THIN_SCROLL, TimelineItem } from './previewParts';
import { parseMoneyInput, shiftCostBreakdown } from './shiftCost';
import { shiftMilestones, type ClockMark } from './shiftMilestones';
import type { ScriptItem } from './typingScript';
import { useFeeRate } from './useFeeRate';
import { useTypingScript } from './useTypingScript';

type CostField = 'start' | 'end' | 'wage' | 'people';
const EXAMPLE: Record<CostField, string> = { start: '17:00', end: '22:00', wage: '45.000', people: '3' };
const MAX_PEOPLE = 50;
/** Số dư ví ví dụ của nhà tuyển dụng (đủ cho ca mẫu, không đủ khi tăng nhiều người). */
const WALLET = 2_000_000;

/** "1730" → "17:30" khi gõ tay; chỉ giữ chữ số. */
function normalizeTime(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}
function parsePeople(raw: string): number {
  return Math.min(Number(raw.replace(/\D/g, '').slice(0, 3)), MAX_PEOPLE);
}

export function ShiftPostPlayground() {
  const t = useT();
  const tx = useTx();
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const { live, rate, feeFreeUntil } = useFeeRate();

  const sample = useMemo(
    () => ({
      title: tx('Phục vụ tiệc cưới'),
      jobType: tx('Phục vụ'),
      location: tx('Nhà hàng tiệc cưới, Quận 3, TP.HCM'),
      date: tx('Thứ 7 tuần này'),
      desc: tx('Bưng món, dọn bàn cho tiệc 40 bàn; làm theo hướng dẫn của quản lý sảnh.'),
      req: tx('Áo sơ mi trắng, quần đen, giày kín mũi. Không cần kinh nghiệm.'),
      contact: tx('Chị Hạnh, quản lý sảnh'),
    }),
    [tx],
  );
  const script = useMemo<ScriptItem[]>(
    () => [
      { kind: 'type', field: 'title', text: sample.title },
      { kind: 'type', field: 'jobType', text: sample.jobType },
      { kind: 'type', field: 'date', text: sample.date, charMs: 35 },
      { kind: 'type', field: 'location', text: sample.location, charMs: 25 },
      { kind: 'type', field: 'start', text: EXAMPLE.start },
      { kind: 'type', field: 'end', text: EXAMPLE.end },
      { kind: 'type', field: 'wage', text: EXAMPLE.wage },
      { kind: 'type', field: 'people', text: EXAMPLE.people },
      { kind: 'type', field: 'desc', text: sample.desc, charMs: 16 },
      { kind: 'type', field: 'req', text: sample.req, charMs: 16 },
      { kind: 'type', field: 'contact', text: sample.contact, charMs: 25 },
      { kind: 'mark', mark: 'press', ms: 700 },
      { kind: 'mark', mark: 'posted', ms: 900 },
      { kind: 'mark', mark: 'a1', ms: 550 },
      { kind: 'mark', mark: 'a2', ms: 550 },
      { kind: 'mark', mark: 'a3', ms: 600 },
      { kind: 'mark', mark: 'ap1', ms: 450 },
      { kind: 'mark', mark: 'ap2', ms: 450 },
      { kind: 'mark', mark: 'ap3', ms: 1100 },
      { kind: 'mark', mark: 'day', ms: 400 },
      { kind: 'mark', mark: 'd1', ms: 500 },
      { kind: 'mark', mark: 'd2', ms: 500 },
      { kind: 'mark', mark: 'd3', ms: 500 },
      { kind: 'mark', mark: 'd4', ms: 400 },
    ],
    [sample],
  );
  const { state, finished, reduced, replay, stop } = useTypingScript(ref, script);
  const [form, setForm] = useState(EXAMPLE);
  const [view, setView] = useState<number | null>(null);
  const [absent, setAbsent] = useState(false);

  // Đang tự chạy: bước theo mốc của kịch bản; xong / người xem bấm: bước người xem chọn.
  const has = (m: string) => finished || state.marks.includes(m);
  const autoStage = state.marks.includes('day') ? 2 : state.marks.includes('posted') ? 1 : 0;
  const stage = finished && view !== null ? view : autoStage;
  const go = (i: number) => {
    if (!finished) stop();
    setView(i);
  };

  // Bước 1 cuộn bên trong khung (03/10): đang tự gõ thì vùng ô điền cuộn theo ô đang gõ
  // (chỉ cuộn vùng đó, không cuộn trang); giảm chuyển động → nhảy thẳng, không trượt.
  const fieldsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = fieldsRef.current;
    const key = finished ? null : state.active;
    if (!box || !key) return;
    const el = box.querySelector<HTMLElement>(`[data-field="${key}"]`);
    if (!el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top >= box.scrollTop && bottom <= box.scrollTop + box.clientHeight - 24) return;
    box.scrollTo({ top: Math.max(0, top - 12), behavior: reduced ? 'auto' : 'smooth' });
  }, [state.active, finished, reduced]);

  const value = (f: CostField | keyof typeof sample) =>
    !finished ? (state.values[f] ?? '') : f in form ? form[f as CostField] : sample[f as keyof typeof sample];
  const active = finished ? null : state.active;

  const people = parsePeople(value('people'));
  const wage = parseMoneyInput(value('wage'));
  const start = value('start');
  const end = value('end');
  const cost = shiftCostBreakdown({ wage, start, end, people, absent: absent ? 1 : 0, rate });
  const enough = cost ? cost.held <= WALLET : false;
  const perPerson = cost ? serverWageTotal(wage, cost.hours, 1) : null;
  const ms = shiftMilestones(start, end);
  const shown = Math.min(3, people);
  const approved = [1, 2, 3].filter((k) => k <= shown && has(`ap${k}`)).length;
  const published = getShiftStatusBadge('Published');
  const num = (n: number, digits = 0) => n.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', { minimumFractionDigits: digits });
  const when = (m: ClockMark) =>
    m.dayOffset < 0 ? tx('{time} hôm trước').replace('{time}', m.time) : m.dayOffset > 0 ? tx('{time} hôm sau').replace('{time}', m.time) : m.time;
  const title = value('title') || sample.title;

  const edit = (f: CostField, raw: string) => {
    const next =
      f === 'wage'
        ? parseMoneyInput(raw)
          ? formatNumberVNInput(parseMoneyInput(raw))
          : ''
        : f === 'people'
          ? raw.replace(/\D/g, '').slice(0, 2)
          : normalizeTime(raw);
    setForm((prev) => ({ ...prev, [f]: next }));
  };
  const focusField = () => {
    if (!finished) {
      stop();
      setView(0);
    }
  };
  const again = () => {
    setForm(EXAMPLE);
    setAbsent(false);
    setView(null);
    replay();
  };

  const feeLabel = !live ? tx('Phí dịch vụ') : feeFreeUntil ? t('shiftForm.depositSummary.feeFree') : t('shiftForm.depositSummary.fee');
  const feeValue = !live
    ? tx('Bản demo chưa thu phí')
    : feeFreeUntil
      ? t('shiftForm.depositSummary.feeFreeValue').replace('{date}', formatDateVN(feeFreeUntil))
      : cost
        ? formatVND(cost.fee)
        : tx('Chưa tính');
  const sim = live ? '' : ` ${tx('(mô phỏng)')}`;

  return (
    <figure className="min-w-0">
      <div ref={ref} className="rounded-3xl bg-white p-5 text-left shadow-modal ring-1 ring-black/5 sm:p-6">
        <PreviewSteps
          label={tx('Các bước đăng một ca')}
          labels={[tx('Điền ca'), tx('Tuyển người'), tx('Ngày làm & sau ca')]}
          current={stage}
          onSelect={finished ? go : undefined}
        />

        {/* Ba bước chồng trong một ô: khung luôn cao bằng bước dài nhất (03/10). */}
        {/* Khung cao cố định bằng bước 2/3 (03/10, chủ dự án): bước 1 cuộn ô điền bên trong,
            bảng tiền + nút đăng ghim ở đáy. */}
        <div className="mt-4">
         <StageStack className="h-[43rem] sm:h-[37rem]">
          {/* ---------- 1. Điền ca ---------- */}
          <Stage on={stage === 0}>
            <p className="shrink-0 text-lg font-semibold text-gray-900">{tx('Đăng ca mới')}</p>
            <div
              ref={fieldsRef}
              className={['relative mt-3 min-h-0 flex-1 overflow-y-auto overscroll-auto pr-1', THIN_SCROLL].join(' ')}
            >
            <div className="grid grid-cols-2 gap-3 pb-2">
              <ShowField className="col-span-2" label={t('form.title')} value={value('title')} active={active === 'title'} field="title" />
              <ShowField label={t('form.jobType')} value={value('jobType')} active={active === 'jobType'} field="jobType" />
              <ShowField label={t('form.date')} value={value('date')} active={active === 'date'} field="date" />
              <ShowField className="col-span-2" label={t('form.location')} value={value('location')} active={active === 'location'} field="location" />
              <EditField id="try-start" field="start" label={t('form.startTime')} value={value('start')} active={active === 'start'} placeholder="08:00" onFocus={focusField} onChange={(v) => edit('start', v)} />
              <EditField id="try-end" field="end" label={t('form.endTime')} value={value('end')} active={active === 'end'} placeholder="12:00" onFocus={focusField} onChange={(v) => edit('end', v)} />
              <EditField id="try-wage" field="wage" label={t('form.hourlyWage')} value={value('wage')} active={active === 'wage'} placeholder="35.000" onFocus={focusField} onChange={(v) => edit('wage', v)} />
              <EditField id="try-people" field="people" label={t('form.positionsTotal')} value={value('people')} active={active === 'people'} placeholder="1" onFocus={focusField} onChange={(v) => edit('people', v)} />
              <ShowField className="col-span-2" multiline full={sample.desc} label={t('form.description')} value={value('desc')} active={active === 'desc'} field="desc" />
              <ShowField className="col-span-2" multiline full={sample.req} label={t('form.requirements')} value={value('req')} active={active === 'req'} field="req" />
              <ShowField className="col-span-2" label={t('form.onSiteContactName')} value={value('contact')} active={active === 'contact'} field="contact" />
            </div>
              {/* Mép mờ ở đáy: báo còn ô bên dưới. */}
              <div aria-hidden="true" className="pointer-events-none sticky bottom-0 -mt-6 h-6 bg-gradient-to-t from-white to-transparent" />
            </div>

            <dl className="mt-3 shrink-0 rounded-2xl bg-orange-50 px-4 py-3 text-sm ring-1 ring-orange-100" aria-live="polite">
              <Row
                label={t('shiftForm.depositSummary.wage')}
                // Dòng phụ luôn có (khoảng trắng khi chưa tính) để bảng tiền không cao thêm lúc gõ xong.
                sub={cost ? `${people} × ${num(cost.hours)} ${tx('giờ')} × ${formatVND(wage)}` : '\u00a0'}
                value={cost ? formatVND(cost.wages) : tx('Chưa tính')}
              />
              <Row label={feeLabel} value={feeValue} />
              <Row strong label={`${t('shiftForm.depositSummary.total')}${sim}`} value={cost ? formatVND(cost.held) : tx('Chưa tính')} />
            </dl>
            {/* Số dư ví: đủ → đăng; thiếu → ca được lưu nháp, nạp thêm rồi đăng (luồng thật). */}
            {/* Dòng số dư luôn giữ chỗ (03/10): trước khi gõ xong là ô ẩn cùng cỡ, khung không nhảy. */}
            {!cost && (
              <p
                aria-hidden={!finished}
                className={['mt-2 min-h-[3.5rem] shrink-0 rounded-xl px-3 py-2 text-sm text-gray-600', finished ? '' : 'invisible'].join(' ')}
              >
                {tx('Nhập giờ kết thúc sau giờ bắt đầu, lương và số người để tính.')}
              </p>
            )}
            {cost && (
              <p
                className={[
                  'mt-2 flex min-h-[3.5rem] shrink-0 flex-wrap content-center items-baseline justify-between gap-x-3 rounded-xl px-3 py-2 text-sm',
                  enough ? 'bg-green-50 text-green-900' : 'bg-amber-50 text-amber-900',
                ].join(' ')}
              >
                <span>
                  {t('wallet.balance.label')}: <span className="font-semibold tabular-nums">{formatVND(WALLET)}</span>
                </span>
                <span className="font-semibold">
                  {enough
                    ? tx('Đủ để giữ')
                    : tx('Thiếu {amount}: ca được lưu nháp, nạp thêm rồi đăng').replace('{amount}', formatVND(cost.held - WALLET))}
                </span>
              </p>
            )}
            <div className="mt-3 flex shrink-0 flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => go(1)}
                disabled={!cost || !enough}
                className={[
                  'inline-flex min-h-[44px] items-center rounded-xl bg-orange-500 px-5 text-sm font-semibold text-gray-900 transition-transform duration-150 hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
                  state.marks.includes('press') && !finished ? 'scale-95 bg-orange-400' : '',
                ].join(' ')}
              >
                {tx('Giữ tiền và đăng ca')}
              </button>
              <span className="text-xs text-gray-600">{tx('Ca hiện cho người lao động khi đã giữ đủ tiền.')}</span>
            </div>
          </Stage>

          {/* ---------- 2. Tuyển người ---------- */}
          <Stage on={stage === 1} scroll>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold text-gray-900">{title}</p>
                <p className="text-sm text-gray-600 tabular-nums">
                  {sample.date} · {start}–{end}
                </p>
              </div>
              <Badge tone={published.tone}>{t(published.labelKey)}</Badge>
            </div>

            {/* Ví sau khi giữ tiền: đỏ lúc vừa trừ. */}
            <div
              className={[
                'mt-4 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors duration-500 motion-reduce:transition-none',
                state.marks.includes('posted') && !state.marks.includes('a1') && !finished ? 'border-red-300 bg-red-50' : 'border-gray-200',
              ].join(' ')}
            >
              <span className="text-gray-700">
                {tx('Ví của bạn')}
                {sim}
              </span>
              <span className="flex items-center gap-2 tabular-nums">
                {cost && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-red-800 ring-1 ring-red-100">−{formatVND(cost.held)}</span>}
                <span className="font-bold text-gray-900">{formatVND(cost ? WALLET - cost.held : WALLET)}</span>
              </span>
            </div>

            {/* Thẻ ca như người lao động thấy */}
            <p className="mt-4 text-xs font-medium text-gray-600">{tx('Người lao động thấy ca của bạn như sau:')}</p>
            <div className="mt-1.5 rounded-2xl border border-gray-200 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-600 tabular-nums">
                    {sample.date} · {start}–{end} · {tx('Quận 3')}
                  </p>
                </div>
                <p className="shrink-0 text-right tabular-nums">
                  <span className="block text-base font-bold text-gray-900">{perPerson ? formatVND(perPerson) : tx('Chưa tính')}</span>
                  <span className="block text-xs text-gray-600">{tx('mỗi người')}</span>
                </p>
              </div>
              <p className="mt-1.5 truncate text-xs text-gray-600">{sample.req}</p>
            </div>

            {/* Người ứng tuyển */}
            <div className="mt-4 flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900">{tx('Người ứng tuyển')}</p>
              <p className="text-xs text-gray-600 tabular-nums">
                {tx('{a}/{n} người đã duyệt').replace('{a}', String(approved)).replace('{n}', String(people))}
              </p>
            </div>
            <ul className="mt-2 flex min-h-[10.5rem] flex-col gap-2">
              {LANDING_SAMPLE_WORKERS.slice(0, shown).map((w, i) => {
                const k = i + 1;
                if (!has(`a${k}`)) return null;
                const ok = has(`ap${k}`);
                return (
                  <li
                    key={w.name}
                    className={[
                      'motion-fade-up flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors duration-300 motion-reduce:transition-none',
                      ok ? 'border-green-200 bg-green-50/60' : 'border-gray-200',
                    ].join(' ')}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-800">{w.initials}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900">{w.name}</span>
                      <span className="block text-xs text-gray-600 tabular-nums">
                        <span aria-hidden="true" className="text-amber-500">★</span>{' '}
                        {tx('{rating} · {n} đánh giá').replace('{rating}', num(w.rating, 1)).replace('{n}', String(w.reviews))}
                      </span>
                    </span>
                    {ok ? (
                      <Badge tone="success">{t('application.status.Approved')}</Badge>
                    ) : (
                      <span className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-gray-900">{t('btn.approve')}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {ms && (
              <p className="mt-3 text-xs leading-relaxed text-gray-600">
                {tx('Sửa ca được tới {edit}. Huỷ được tới {cancel} (6 giờ trước ca); sau đó, nếu đã có người ứng tuyển thì không huỷ được.')
                  .replace('{edit}', when(ms.editBy))
                  .replace('{cancel}', when(ms.employerCancelBy))}
              </p>
            )}
            <StageNav show={finished}>
              <StepButton onClick={() => go(0)}>← {tx('Sửa lại')}</StepButton>
              <StepButton primary onClick={() => go(2)}>
                {tx('Tiếp: ngày làm')} →
              </StepButton>
            </StageNav>
          </Stage>

          {/* ---------- 3. Ngày làm & sau ca ---------- */}
          <Stage on={stage === 2} scroll>
            <p className="text-lg font-semibold text-gray-900">{tx('Ngày làm & sau ca')}</p>
            <p className="text-sm text-gray-600 tabular-nums">
              {title} · {sample.date}
            </p>
            {ms && (
              <ol className="mt-4 flex flex-col">
                <TimelineItem on={has('d1')} time={`${ms.checkInOpen.time}–${ms.checkInClose.time}`} title={tx('Check-in')}>
                  {tx('Người lao động bấm check-in khi tới; bạn xác nhận có mặt từng người. Ai không đến, bạn đánh dấu vắng mặt.')}
                </TimelineItem>
                <TimelineItem on={has('d2')} time={`${start}–${end}`} title={tx('Ca diễn ra')}>
                  {tx('Trang quản lý ca cho thấy ai đang làm.')}
                </TimelineItem>
                <TimelineItem on={has('d3')} time={end} title={tx('Xác nhận hoàn thành')}>
                  {live
                    ? tx('Bạn bấm xác nhận là tiền công vào ví người làm. Không bấm thì hệ thống tự chốt lúc {time}.').replace('{time}', when(ms.autoSettle))
                    : tx('Bạn bấm xác nhận là tiền công được ghi vào ví người làm (mô phỏng).')}
                </TimelineItem>
                <TimelineItem on={has('d4')} time={tx('14 ngày')} title={tx('Đánh giá')} last>
                  {tx('Chấm sao và nhận xét cho từng người; họ cũng chấm quán của bạn.')}
                </TimelineItem>
              </ol>
            )}

            <div className="mt-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3 font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={absent}
                  onChange={(e) => {
                    go(2);
                    setAbsent(e.target.checked);
                  }}
                  className="h-5 w-5 rounded border-gray-300 accent-orange-600"
                />
                {tx('Giả sử 1 người không đến')}
              </label>
              {cost && (
                <dl>
                  <Row label={tx('Trả người đã làm')} value={formatVND(cost.paid)} />
                  {live && <Row label={tx('Phí trên phần có người làm')} value={formatVND(cost.paidFee)} />}
                  {/* Dòng hoàn luôn giữ chỗ: bật / tắt "1 người không đến" không làm khung nhảy. */}
                  <Row strong reserve={cost.refund <= 0} label={tx('Hoàn về ví của bạn')} value={`+${formatVND(cost.refund)}`} tone="text-green-800" />
                </dl>
              )}
            </div>
            <StageNav show={finished}>
              <StepButton onClick={() => go(1)}>← {tx('Tuyển người')}</StepButton>
            </StageNav>
          </Stage>
         </StageStack>
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-600">
        <span>{tx('Minh hoạ đăng ca. Sửa giờ, lương, số người để tính thử; không gửi đi đâu.')}</span>
        <span className="flex items-center gap-4">
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
          <Link href="/for-employers#employer-pricing" className="inline-flex min-h-[44px] items-center font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
            {tx('Bảng phí')} →
          </Link>
        </span>
      </figcaption>
    </figure>
  );
}

const FIELD_BOX = 'flex w-full rounded-xl border bg-white px-3 text-sm text-gray-900 transition-shadow motion-reduce:transition-none';

function ShowField({
  label,
  value,
  active,
  className,
  multiline,
  full,
  field,
}: {
  field?: string;
  label: string;
  value: string;
  active: boolean;
  className?: string;
  multiline?: boolean;
  /** Ô nhiều dòng: chữ đầy đủ, giữ chỗ ẩn để ô không cao dần khi đang gõ (03/10). */
  full?: string;
}) {
  return (
    <div data-field={field} className={['min-w-0', className ?? ''].join(' ')}>
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <span
        className={[
          FIELD_BOX,
          'mt-1',
          multiline ? 'min-h-[3.75rem] items-start py-2 leading-snug' : 'h-11 items-center',
          active ? 'border-orange-400 ring-2 ring-orange-200' : 'border-gray-200',
        ].join(' ')}
      >
        {multiline && full ? (
          <span className="grid w-full">
            <span aria-hidden="true" className="invisible [grid-area:1/1]">
              {full}
            </span>
            <span className="[grid-area:1/1]">
              {value}
              {active && <span aria-hidden="true" className="type-caret" />}
            </span>
          </span>
        ) : (
          <span className={multiline ? '' : 'truncate'}>
            {value}
            {active && <span aria-hidden="true" className="type-caret" />}
          </span>
        )}
      </span>
    </div>
  );
}

function EditField({
  id,
  field,
  label,
  value,
  active,
  placeholder,
  onFocus,
  onChange,
}: {
  id: string;
  field?: string;
  label: string;
  value: string;
  active: boolean;
  placeholder: string;
  onFocus: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div data-field={field} className="min-w-0">
      <label htmlFor={id} className="text-xs font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        className={[
          FIELD_BOX,
          'mt-1 h-11 items-center tabular-nums placeholder:text-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200',
          active ? 'border-orange-400 ring-2 ring-orange-200' : 'border-gray-300',
        ].join(' ')}
      />
    </div>
  );
}
