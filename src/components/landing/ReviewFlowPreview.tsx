'use client';

/**
 * Trang vai trò — "sau ca": đánh giá hai chiều + điểm uy tín / kỹ năng trong MỘT thẻ
 * 4 bước (03/10; thay hai thẻ rời `ReviewPreview` + `ReputationPreview` bị lệch nhau):
 *
 *   1. Quán chấm người lao động — tô 5 sao, gõ nhận xét, "Gửi" → "✓ Đã gửi".
 *   2. Người lao động chấm quán — tô 4 sao, chọn 2 thẻ nhanh, gõ nhận xét, gửi.
 *   3. Điểm sao hiện ra — thẻ ứng viên (★ 4,8 · 13 đánh giá, tăng 1) + nhận xét về quán
 *      trên trang chi tiết ca.
 *   4. Uy tín & kỹ năng — điểm 85 → 90 (+5 hoàn thành ca), kỹ năng Phục vụ lên cấp 3
 *      (+17 XP ca 5 sao). Bản thật CHƯA có phần này → chip "Sắp có" + câu "minh hoạ
 *      theo bản demo" (chủ dự án chọn 03/10).
 *
 * Đánh giá hai chiều có ở cả demo lẫn bản thật (0024: sao 1–5, nhận xét, thẻ nhanh
 * phía người lao động; trong 14 ngày; gửi rồi không sửa). Nhãn y hệt `RatingForm` /
 * `EmployerFeedbackForm`. Số uy tín / XP theo luật của app (`domain/reputation`,
 * `skillProgression`). Tự chạy MỘT lần khi cuộn tới; xong thì bấm từng bước. Các bước
 * chỉ vẽ bước đang xem → khung co theo bước.
 */

import { useMemo, useRef, useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { skillProgress, xpForCompletion } from '@/domain/skillProgression';
import { getShiftStatusBadge } from '@/domain/shiftLifecycleState';
import { useLocale, useT, useTx } from '@/i18n/LocaleProvider';

import { PreviewSteps } from './PreviewSteps';
import { Stage, StageStack } from './previewParts';
import type { ScriptItem } from './typingScript';
import { useTypingScript } from './useTypingScript';

const TAGS = ['PaidOnTime', 'GoodEnvironment', 'ClearCommunication', 'AccurateDescription'] as const;
const PICKED = ['PaidOnTime', 'ClearCommunication'];
const WORKER = 'Minh Anh';
const STARS_E = 5;
const STARS_W = 4;
const RATING_BEFORE = { avg: 4.8, count: 12 };
const SCORE_BEFORE = 85;
const COMPLETED_DELTA = 5;
const SERVE_XP_BEFORE = 108;
const BAR_XP = 30;

const stars = (prefix: string, n: number): ScriptItem[] =>
  Array.from({ length: n }, (_, k) => ({ kind: 'mark' as const, mark: `${prefix}${k + 1}`, ms: 170 }));

export function ReviewFlowPreview({ audience }: { audience: 'worker' | 'employer' }) {
  const t = useT();
  const tx = useTx();
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const live = isSupabaseEnv();
  const [view, setView] = useState<number | null>(null);
  const eText = tx('Đến sớm, làm nhanh, khách khen.');
  const wText = tx('Quán chỉ việc rõ ràng, trả đúng giờ.');
  const script = useMemo<ScriptItem[]>(
    () => [
      { kind: 'mark', mark: 'start', ms: 400 },
      ...stars('e', STARS_E),
      { kind: 'type', field: 'e', text: eText },
      { kind: 'mark', mark: 'eSent', ms: 900 },
      { kind: 'mark', mark: 'w', ms: 300 },
      ...stars('w', STARS_W),
      { kind: 'mark', mark: 'tag1', ms: 300 },
      { kind: 'mark', mark: 'tag2', ms: 300 },
      { kind: 'type', field: 'w', text: wText },
      { kind: 'mark', mark: 'wSent', ms: 900 },
      { kind: 'mark', mark: 'shown', ms: 700 },
      { kind: 'mark', mark: 'shown2', ms: 1600 },
      { kind: 'mark', mark: 'rep', ms: 500 },
      { kind: 'mark', mark: 'event', ms: 800 },
      { kind: 'mark', mark: 'score', ms: 900 },
      { kind: 'mark', mark: 'xp', ms: 900 },
      { kind: 'mark', mark: 'level', ms: 400 },
    ],
    [eText, wText],
  );
  const { state, finished, reduced, replay, stop } = useTypingScript(ref, script);
  const has = (m: string) => finished || state.marks.includes(m);
  const auto = state.marks.includes('rep') ? 3 : state.marks.includes('shown') ? 2 : state.marks.includes('w') ? 1 : 0;
  const stage = finished && view !== null ? view : auto;
  const go = (i: number) => {
    if (!finished) stop();
    setView(i);
  };
  const again = () => {
    setView(null);
    replay();
  };

  // Số sao mỗi bên tô (quán 5, người làm 4); khi chạy xong `has` luôn đúng nên phải chặn trần.
  const STARS = { e: STARS_E, w: STARS_W } as const;
  const count = (prefix: keyof typeof STARS) => [1, 2, 3, 4, 5].filter((k) => k <= STARS[prefix] && has(`${prefix}${k}`)).length;
  const num = (n: number, digits = 1) => n.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const after = { avg: (RATING_BEFORE.avg * RATING_BEFORE.count + 5) / (RATING_BEFORE.count + 1), count: RATING_BEFORE.count + 1 };
  const rating = has('shown') ? after : RATING_BEFORE;
  const gain = xpForCompletion(5, false);
  const serve = skillProgress(has('xp') ? SERVE_XP_BEFORE + gain : SERVE_XP_BEFORE);
  const bar = skillProgress(BAR_XP);
  const score = has('score') ? SCORE_BEFORE + COMPLETED_DELTA : SCORE_BEFORE;
  const done = getShiftStatusBadge('Completed');

  return (
    <figure className="min-w-0">
      <div ref={ref} className="rounded-3xl bg-white p-5 text-left shadow-modal ring-1 ring-black/5 sm:p-6">
        <PreviewSteps
          label={tx('Các bước sau một ca')}
          labels={[tx('Quán chấm'), tx('Người làm chấm'), tx('Sao hiện ra'), tx('Uy tín, kỹ năng')]}
          current={stage}
          onSelect={finished ? go : undefined}
        />
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900">{tx('Phục vụ quán cà phê')}</p>
            <p className="text-sm text-gray-600 tabular-nums">{tx('Thứ 7 · {time}').replace('{time}', '07:00–11:00')}</p>
          </div>
          <Badge tone={done.tone}>{t(done.labelKey)}</Badge>
        </div>

        <div className="mt-4">
         <StageStack>
          {/* 1. Quán chấm người lao động */}
          <Stage on={stage === 0}>
            <Panel
              title={tx('Quán chấm {name}').replace('{name}', WORKER)}
              starsLabel={t('form.rating')}
              stars={count('e')}
              commentLabel={t('form.feedback')}
              comment={finished ? eText : (state.values.e ?? '')}
              typing={!finished && state.active === 'e'}
              sent={has('eSent')}
              submit={t('btn.submit')}
              sentLabel={tx('Đã gửi')}
            />
          </Stage>

          {/* 2. Người lao động chấm quán */}
          <Stage on={stage === 1}>
            <Panel
              title={tx('{name} chấm quán').replace('{name}', WORKER)}
              starsLabel={t('form.rating')}
              stars={count('w')}
              commentLabel={t('employerFeedback.commentLabel')}
              comment={finished ? wText : (state.values.w ?? '')}
              typing={!finished && state.active === 'w'}
              sent={has('wSent')}
              submit={t('btn.submit')}
              sentLabel={tx('Đã gửi')}
            >
              <p className="mt-3 text-xs font-medium text-gray-700">{t('employerFeedback.tagsLabel')}</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {TAGS.map((tag) => {
                  const on = (tag === PICKED[0] && has('tag1')) || (tag === PICKED[1] && has('tag2'));
                  return (
                    <li
                      key={tag}
                      className={[
                        'rounded-full border px-2.5 py-1 text-xs transition-colors duration-200 motion-reduce:transition-none',
                        on ? 'border-orange-300 bg-orange-100 font-semibold text-orange-900' : 'border-gray-200 text-gray-600',
                      ].join(' ')}
                    >
                      {t(`employerFeedback.tag.${tag}`)}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </Stage>

          {/* 3. Sao hiện ở đâu */}
          <Stage on={stage === 2}>
            <p className="text-xs font-medium text-gray-600">{tx('Nhà tuyển dụng khác thấy trên thẻ ứng viên:')}</p>
            <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-800">MA</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">{WORKER}</span>
                <span key={rating.count} className="motion-fade-up block text-xs text-gray-600 tabular-nums">
                  <span aria-hidden="true" className="text-amber-500">★</span>{' '}
                  {tx('{rating} · {n} đánh giá').replace('{rating}', num(rating.avg)).replace('{n}', String(rating.count))}
                </span>
              </span>
              {has('shown') && <span className="motion-fade-up text-xs font-semibold text-green-700">+1</span>}
            </div>
            <p className={['mt-4 text-xs font-medium text-gray-600', has('shown2') ? 'motion-fade-up' : 'invisible'].join(' ')}>
              {tx('Người tìm ca thấy trên trang chi tiết ca của quán:')}
            </p>
            <div className={['mt-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm', has('shown2') ? 'motion-fade-up' : 'invisible'].join(' ')}>
              <p className="flex items-center gap-1 text-amber-500" aria-hidden="true">
                ★★★★<span className="text-gray-300">★</span>
              </p>
              <p className="mt-1 text-gray-800">“{wText}”</p>
              <p className="mt-1 text-xs text-gray-600">
                {t(`employerFeedback.tag.${PICKED[0]}`)} · {t(`employerFeedback.tag.${PICKED[1]}`)}
              </p>
            </div>
          </Stage>

          {/* 4. Uy tín + kỹ năng (bản thật: "Sắp có") */}
          <Stage on={stage === 3}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-gray-600">{audience === 'worker' ? tx('Hồ sơ của bạn') : tx('Hồ sơ ứng viên')}</p>
              {live && <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-xs font-semibold text-white">{tx('Sắp có')}</span>}
            </div>
            <div className="mt-1.5 rounded-2xl bg-green-50 px-4 py-3 ring-1 ring-green-100">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-gray-700">{tx('Điểm uy tín')}</span>
                <span key={score} className="motion-fade-up text-2xl font-bold text-green-800 tabular-nums">
                  {score}
                  <span className="text-sm font-semibold text-green-700">/100</span>
                </span>
              </div>
              <p className={['mt-1 text-sm font-semibold text-green-800', has('event') ? 'motion-fade-up' : 'invisible'].join(' ')}>
                +{COMPLETED_DELTA} · {tx('Hoàn thành ca Phục vụ quán cà phê')}
              </p>
              <p className="mt-1 text-xs text-gray-600">{tx('Hoàn thành ca +5 · huỷ trong 24 giờ trước ca −10 · vắng mặt không báo −20')}</p>
            </div>
            <ul className="mt-3 flex flex-col gap-3">
              <SkillRow
                name={tx('Phục vụ')}
                level={serve.level}
                fraction={serve.fraction}
                caption={has('xp') ? `+${gain} XP · ${tx('ca 5 sao')}` : `${serve.intoLevel}/${serve.levelSpan} XP`}
                up={has('level') ? tx('Lên cấp!') : ''}
                levelLabel={tx('Cấp {level}')}
              />
              <SkillRow name={tx('Pha chế')} level={bar.level} fraction={bar.fraction} caption={`${bar.intoLevel}/${bar.levelSpan} XP`} up="" levelLabel={tx('Cấp {level}')} />
            </ul>
          </Stage>
         </StageStack>
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-center gap-x-4 text-center text-xs text-gray-600">
        <span>
          {live
            ? tx('Minh hoạ đánh giá sau ca. Phần uy tín, kỹ năng theo bản demo, bản thật chưa tính.')
            : tx('Minh hoạ đánh giá sau ca. Tên, nhận xét và số liệu là ví dụ.')}
        </span>
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

function Panel({
  title,
  starsLabel,
  stars,
  commentLabel,
  comment,
  typing,
  sent,
  submit,
  sentLabel,
  children,
}: {
  title: string;
  starsLabel: string;
  stars: number;
  commentLabel: string;
  comment: string;
  typing: boolean;
  sent: boolean;
  submit: string;
  sentLabel: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-orange-50/50 p-4 ring-1 ring-orange-100">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-3 text-xs font-medium text-gray-700">{starsLabel}</p>
      <p className="mt-0.5 flex gap-1 text-2xl leading-none" aria-label={`${stars}/5`}>
        {[1, 2, 3, 4, 5].map((k) => (
          <span key={k} aria-hidden="true" className={['transition-colors duration-150 motion-reduce:transition-none', k <= stars ? 'text-amber-500' : 'text-gray-300'].join(' ')}>
            ★
          </span>
        ))}
      </p>
      {children}
      <p className="mt-3 text-xs font-medium text-gray-700">{commentLabel}</p>
      <span
        className={[
          'mt-1 flex min-h-[3.5rem] items-start rounded-xl border bg-white px-3 py-2 text-sm leading-snug text-gray-900',
          typing ? 'border-orange-400 ring-2 ring-orange-200' : 'border-gray-300',
        ].join(' ')}
      >
        <span>
          {comment}
          {typing && <span aria-hidden="true" className="type-caret" />}
        </span>
      </span>
      <span
        className={[
          'mt-3 inline-flex h-9 items-center justify-center self-start rounded-lg px-4 text-sm font-semibold transition-colors duration-200 motion-reduce:transition-none',
          sent ? 'bg-green-50 text-green-800 ring-1 ring-green-200' : 'bg-orange-500 text-gray-900',
        ].join(' ')}
      >
        {sent ? `✓ ${sentLabel}` : submit}
      </span>
    </div>
  );
}

function SkillRow({ name, level, fraction, caption, up, levelLabel }: { name: string; level: number; fraction: number; caption: string; up: string; levelLabel: string }) {
  return (
    <li>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-gray-800">{name}</span>
        <span className="flex items-center gap-1.5">
          {up && <span className="motion-fade-up text-xs font-semibold text-green-700">{up}</span>}
          <span key={level} className="motion-fade-up rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
            {levelLabel.replace('{level}', String(level))}
          </span>
        </span>
      </div>
      <span className="mt-1.5 block h-2.5 overflow-hidden rounded-full bg-orange-100">
        <span className="block h-full min-w-[3px] rounded-full bg-orange-500 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${Math.round(fraction * 100)}%` }} />
      </span>
      <span className="mt-1 block text-xs text-gray-500 tabular-nums">{caption}</span>
    </li>
  );
}
