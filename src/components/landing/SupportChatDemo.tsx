'use client';

/**
 * Minh hoạ "hỏi trợ lý CaLẻ" tự chạy (04/10) — đặt ở trang chủ và `/support`.
 *
 * Một khung chat diễn một cuộc trò chuyện mẫu: câu hỏi được "gõ" vào ô nhập, gửi đi,
 * trợ lý hiện ba chấm "đang trả lời" rồi trả lời. Kịch bản là các thắc mắc cốt lõi của
 * người xem lần đầu (có mất phí không → lỡ không được trả lương → bao lâu có tiền → đăng
 * ca có tốn phí không → gặp người thật), đồng thời khoe trợ lý hiểu câu nối tiếp và câu
 * gõ không dấu / viết tắt (nhãn "✓ …" cạnh câu trả lời).
 *
 * Câu trả lời KHÔNG viết tay (dựng ở server — `supportDemoScript.ts`): lấy từ chính `answerSupportQuestion` + `SUPPORT_KB` (cùng
 * trợ lý ở bong bóng hỗ trợ, cùng chế độ dữ liệu `isSupabaseEnv()`, lượt sau truyền
 * `previous` như bong bóng) → minh hoạ không bao giờ nói khác trợ lý thật. Câu dài được
 * rút gọn còn 1–2 câu đầu + "…" (`shortReply`).
 *
 * Chạy khi khung đang trong màn hình và tab đang mở; xong một lượt thì nghỉ
 * `DEMO_LOOP_PAUSE_MS` rồi tự diễn lại. Có nút Tạm dừng / Tiếp tục / Xem lại (WCAG 2.2.2);
 * rê chuột vào khung cũng tạm ngừng. Bản server và khi giảm chuyển động
 * (`prefers-reduced-motion`): hiện đủ cuộc trò chuyện, đứng yên. Khi đang chạy, khung
 * chat là `aria-hidden`; trình đọc màn hình đọc bản chép tĩnh (`sr-only`).
 * `data-playback` = static | playing | paused | done (e2e dùng).
 *
 * Đây là hiệu ứng trình bày, không phải đồng bộ lifecycle (CLAUDE.md §5.6).
 */

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';

import { SupportAvatar } from '@/components/support/SupportGlyph';
import { openSupportBubble } from '@/components/support/supportBubbleEvents';
import { useTx } from '@/i18n/LocaleProvider';

import type { SupportDemoData, SupportDemoExchange } from './supportDemoScript';
import { watchReplay } from './viewReplay';

// ---------------------------------------------------------------------------
// Giảm chuyển động: server coi như "có" (bản tĩnh), client đọc media query.
// ---------------------------------------------------------------------------

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeReduced(cb: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener?.('change', cb);
  return () => mq.removeEventListener?.('change', cb);
}
const reducedNow = () => typeof window.matchMedia === 'function' && window.matchMedia(REDUCE_QUERY).matches;
const reducedServer = () => true;

type Phase = 'type' | 'think' | 'reply';
type Mode = 'playing' | 'paused' | 'done';
interface Pos {
  /** Lượt đang diễn. */
  i: number;
  phase: Phase;
  /** Số ký tự câu hỏi đã gõ (pha `type`). */
  chars: number;
}
const START: Pos = { i: 0, phase: 'type', chars: 0 };
/** Diễn xong thì giữ cuộc trò chuyện bấy lâu cho người xem đọc rồi diễn lại (ms). */
const DEMO_LOOP_PAUSE_MS = 6000;

/** Thời gian chờ trước khi sang bước kế (ms). */
function delayFor(pos: Pos, ex: SupportDemoExchange): number {
  if (pos.phase === 'type') {
    if (pos.chars === 0) return pos.i === 0 ? 700 : 500;
    if (pos.chars < ex.question.length) return Math.min(60, 1500 / ex.question.length);
    return 450; // gõ xong, ngừng một nhịp rồi gửi
  }
  if (pos.phase === 'think') return 1300;
  return Math.min(6000, Math.max(2600, 1400 + ex.reply.length * 30)); // thời gian đọc
}

function nextPos(pos: Pos, ex: SupportDemoExchange, total: number): Pos | null {
  if (pos.phase === 'type') {
    return pos.chars < ex.question.length ? { ...pos, chars: pos.chars + 1 } : { ...pos, phase: 'think' };
  }
  if (pos.phase === 'think') return { ...pos, phase: 'reply' };
  return pos.i + 1 < total ? { i: pos.i + 1, phase: 'type', chars: 0 } : null;
}

const BUBBLE_TEXT = 'text-[15px] leading-relaxed text-gray-900 [overflow-wrap:anywhere]';
const CONTACT_PILLS = ['Hotline', 'Zalo', 'Facebook', 'Email'];
/** Tin cũ bị đẩy lên thì mờ dần ở mép trên (mặt nạ, không phải màu → không cần bản tối). */
const FADE_TOP: CSSProperties = {
  maskImage: 'linear-gradient(to bottom, transparent 0, #000 2.5rem)',
  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 2.5rem)',
};

export function SupportChatDemo({ demo, className = '' }: { demo: SupportDemoData; className?: string }) {
  const tx = useTx();
  const { audience, script, welcome, live } = demo;

  const reduced = useSyncExternalStore(subscribeReduced, reducedNow, reducedServer);
  const [mode, setMode] = useState<Mode>('playing');
  const [pos, setPos] = useState<Pos>(START);
  const [onScreen, setOnScreen] = useState(false);
  const [pageShown, setPageShown] = useState(true);
  /** Rê chuột vào khung → tạm ngừng để đọc cho kịp, rê ra chạy tiếp. */
  const [hovered, setHovered] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Chỉ chạy khi khung trong màn hình và tab đang mở.
  useEffect(() => {
    const el = boxRef.current;
    if (reduced || !el) return;
    const onVis = () => setPageShown(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.35 });
      io.observe(el);
    }
    return () => {
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduced]);

  // Một hẹn giờ cho mỗi bước; dừng ngay khi tạm dừng / ra khỏi màn hình.
  useEffect(() => {
    if (reduced || mode !== 'playing' || !onScreen || !pageShown || hovered) return;
    const ex = script[pos.i];
    const timer = window.setTimeout(() => {
      const next = nextPos(pos, ex, script.length);
      if (next) setPos(next);
      else setMode('done');
    }, delayFor(pos, ex));
    return () => window.clearTimeout(timer);
  }, [reduced, mode, onScreen, pageShown, hovered, pos, script]);

  // Diễn xong mà người xem cuộn đi hẳn → lần cuộn tới sau diễn lại từ đầu.
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    const el = boxRef.current;
    if (reduced || !el || typeof IntersectionObserver !== 'function') return;
    return watchReplay(el, {
      onEnter: () => {},
      onLeave: () => {
        if (modeRef.current !== 'done') return;
        setPos(START);
        setMode('playing');
      },
    });
  }, [reduced]);

  // Xong một lượt: nghỉ một nhịp rồi tự diễn lại — chỉ khi khung còn trong màn hình,
  // tab đang mở và không rê chuột (đang đọc).
  useEffect(() => {
    if (reduced || mode !== 'done' || !onScreen || !pageShown || hovered) return;
    const timer = window.setTimeout(() => {
      setPos(START);
      setMode('playing');
    }, DEMO_LOOP_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [reduced, mode, onScreen, pageShown, hovered]);

  const animated = !reduced;
  const playback = animated ? mode : 'static';

  // Tin đang hiện: đủ các lượt trước + lượt hiện tại theo pha.
  type Shown = { key: string; who: 'user' | 'bot'; text: string; contacts?: boolean; tag?: string | null };
  const shown: Shown[] = [];
  script.forEach((ex, i) => {
    const past = !animated || i < pos.i;
    const current = animated && i === pos.i;
    if (past || (current && pos.phase !== 'type')) shown.push({ key: `u${i}`, who: 'user', text: ex.question });
    if (past || (current && pos.phase === 'reply')) shown.push({ key: `b${i}`, who: 'bot', text: ex.reply, contacts: ex.contacts, tag: ex.tag });
  });
  const thinking = animated && pos.phase === 'think';
  const typed = animated && pos.phase === 'type' ? script[pos.i].question.slice(0, pos.chars) : '';

  const control =
    mode === 'playing'
      ? { label: tx('Tạm dừng'), aria: tx('Tạm dừng cuộc trò chuyện mẫu'), icon: 'pause' as const }
      : mode === 'paused'
        ? { label: tx('Tiếp tục'), aria: tx('Tiếp tục cuộc trò chuyện mẫu'), icon: 'play' as const }
        : { label: tx('Xem lại'), aria: tx('Xem lại cuộc trò chuyện mẫu'), icon: 'replay' as const };
  const onControl = () => {
    if (mode === 'playing') setMode('paused');
    else if (mode === 'paused') setMode('playing');
    else {
      setPos(START);
      setMode('playing');
    }
  };
  const openAssistant = () => openSupportBubble({ tab: 'assistant' });

  return (
    <figure
      className={['w-full', className].join(' ')}
      data-support-demo={audience}
      data-playback={playback}
    >
      <div
        ref={boxRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5"
      >
        {/* Đầu khung: trợ lý + nút điều khiển minh hoạ. */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
          <SupportAvatar size="md" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug text-gray-900">{tx('Trợ lý CaLẻ')}</p>
            <p className="flex items-center gap-1.5 text-sm text-gray-600">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-green-600" />
              {tx('Trả lời ngay, 24/7')}
            </p>
          </div>
          {animated && (
            // Nút nhỏ chỉ có biểu tượng (bắt buộc có để dừng nội dung tự chạy — WCAG 2.2.2);
            // chữ chỉ hiện khi đã chạy xong ("Xem lại").
            <button
              type="button"
              onClick={onControl}
              aria-label={control.aria}
              title={control.label}
              data-demo-control={control.icon}
              className={[
                'inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
                mode === 'done' ? 'px-3' : 'w-11',
              ].join(' ')}
            >
              <ControlIcon name={control.icon} />
              {mode === 'done' && control.label}
            </button>
          )}
        </div>

        {/* Khung tin nhắn. Đang chạy: chiều cao cố định, tin mới đẩy tin cũ lên (không cuộn
            trang); giảm chuyển động: hiện hết, cao theo nội dung. */}
        <div
          aria-hidden={animated ? true : undefined}
          className={[
            'flex flex-col px-4 py-4 sm:px-5',
            animated ? 'h-[24rem] justify-end overflow-hidden sm:h-[26rem]' : '',
          ].join(' ')}
          style={animated ? FADE_TOP : undefined}
        >
          <ol className="flex flex-col gap-3" data-demo-transcript="">
            <li className="flex max-w-[92%] items-end gap-2 self-start">
              <SupportAvatar />
              <div className={`rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2.5 ${BUBBLE_TEXT}`}>
                {!animated && <span className="sr-only">{tx('Trợ lý trả lời:')} </span>}
                {welcome}
              </div>
            </li>
            {shown.map((m) =>
              m.who === 'user' ? (
                <li
                  key={m.key}
                  data-demo-msg="user"
                  className={['max-w-[85%] self-end', animated ? 'motion-fade-up' : ''].join(' ')}
                >
                  <div className={`rounded-2xl rounded-br-sm bg-orange-100 px-3.5 py-2.5 ${BUBBLE_TEXT}`}>
                    {!animated && <span className="sr-only">{tx('Bạn hỏi:')} </span>}
                    {m.text}
                  </div>
                </li>
              ) : (
                <li
                  key={m.key}
                  data-demo-msg="bot"
                  className={['max-w-[92%] self-start', animated ? 'motion-fade-up' : ''].join(' ')}
                >
                  <div className="flex items-end gap-2">
                    <SupportAvatar />
                    <div className={`min-w-0 rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2.5 ${BUBBLE_TEXT}`}>
                      {!animated && <span className="sr-only">{tx('Trợ lý trả lời:')} </span>}
                      {m.text}
                    </div>
                  </div>
                  {m.tag && (
                    <p
                      data-demo-tag=""
                      className="ml-10 mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4.5 10.5l3.5 3.5 7.5-8" />
                      </svg>
                      {m.tag}
                    </p>
                  )}
                  {m.contacts && (
                    <ul className="ml-10 mt-2 flex flex-wrap gap-1.5">
                      {CONTACT_PILLS.map((c) => (
                        <li
                          key={c}
                          className="rounded-full bg-white px-3 py-1 text-sm font-medium text-orange-700 ring-1 ring-orange-200"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ),
            )}
            {thinking && (
              <li className="flex items-end gap-2 self-start" data-demo-typing="">
                <SupportAvatar />
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-3">
                  <span className="flex items-center gap-1">
                    <span className="support-typing-dot h-2 w-2 rounded-full bg-gray-500" />
                    <span className="support-typing-dot h-2 w-2 rounded-full bg-gray-500" />
                    <span className="support-typing-dot h-2 w-2 rounded-full bg-gray-500" />
                  </span>
                  <span className="text-sm text-gray-700">{tx('Trợ lý đang trả lời')}</span>
                </div>
              </li>
            )}
          </ol>
        </div>

        {/* Ô nhập giả: câu hỏi được "gõ" ở đây. Bấm (chuột / chạm) thì mở trợ lý thật; người
            dùng bàn phím / trình đọc màn hình dùng nút "Thử hỏi trợ lý ngay" bên dưới. */}
        <div className="border-t border-gray-200 px-4 py-3 sm:px-5">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={openAssistant}
            className="flex min-h-12 w-full cursor-text items-center gap-2 rounded-full border border-gray-300 bg-white py-1.5 pl-4 pr-1.5 text-left"
          >
            <span className={['min-w-0 flex-1 truncate text-base', typed ? 'text-gray-900' : 'text-gray-500'].join(' ')}>
              {typed || tx('Nhập câu hỏi về CaLẻ…')}
              {typed && <span className="type-caret" />}
            </span>
            <span
              className={[
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors motion-reduce:transition-none',
                typed ? 'bg-orange-500 text-gray-900' : 'bg-gray-100 text-gray-500',
              ].join(' ')}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 16V4M5 9l5-5 5 5" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {/* Bản chép tĩnh cho trình đọc màn hình khi khung chat đang chạy (aria-hidden). */}
      {animated && (
        <ol className="sr-only">
          {script.map((ex) => (
            <li key={ex.question}>
              {tx('Bạn hỏi:')} {ex.question} {tx('Trợ lý trả lời:')} {ex.reply}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={openAssistant}
          data-demo-open=""
          className="motion-press inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-orange-500 px-6 text-base font-semibold text-gray-900 shadow-sm transition hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          <ChatIcon />
          {tx('Thử hỏi trợ lý ngay')}
        </button>
        <figcaption className="text-center text-xs text-gray-600">
          {tx('Minh hoạ: câu trả lời lấy từ trợ lý thật của CaLẻ, câu dài được rút gọn.')}
          {!live && ` ${tx('Bản demo: tiền là mô phỏng.')}`}
        </figcaption>
      </div>
    </figure>
  );
}

function ChatIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-3.6L9.5 19.6a.6.6 0 0 1-1-.45V16H7a3 3 0 0 1-3-3z" />
    </svg>
  );
}

function ControlIcon({ name }: { name: 'pause' | 'play' | 'replay' }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === 'pause' && <path d="M7 5v10M13 5v10" />}
      {name === 'play' && <path d="M7 4.5v11l8.5-5.5z" />}
      {name === 'replay' && (
        <>
          <path d="M4 10a6 6 0 1 0 1.8-4.3" />
          <path d="M4 3.5v3.5h3.5" />
        </>
      )}
    </svg>
  );
}
