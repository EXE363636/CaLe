'use client';

/**
 * Tab "Hỏi CaLẻ" của bong bóng hỗ trợ — trợ lý hỏi đáp TỰ ĐỘNG, chạy hoàn toàn ở
 * trình duyệt (không mạng, không AI bên ngoài): `answerSupportQuestion` chọn mục
 * khớp nhất trong kho `SUPPORT_KB`.
 *
 * Người dùng không rành công nghệ → giao diện đơn giản, chữ to (15px), nút rõ:
 *   - Mở đầu: lời chào theo tên / buổi (`supportWelcome`) + tối đa 4 câu gợi ý.
 *   - Mỗi câu trả lời: chữ → tối đa 2 nút "mở trang" → câu hỏi liên quan → (nếu cần)
 *     kênh liên hệ → "Đúng ý" / "Chưa đúng".
 *   - Hỏi lại khi câu mơ hồ ("Bạn muốn hỏi điều nào?" + nút chọn); trả lời 2–3 câu
 *     trong một tin; câu nối tiếp ("bao lâu?") nhờ `previous`; dữ liệu của chính
 *     người hỏi (`getPersonal`, đọc store lúc hỏi — xem `personalSnapshot.ts`).
 *   - "Đang trả lời…" (ba chấm) 500–900ms trước câu trả lời; `prefers-reduced-motion`
 *     → trả lời ngay, không chấm. Gửi tiếp khi đang chờ → hiện ngay câu đang chờ.
 *   - Cuộc trò chuyện giữ trong sessionStorage (≤ 50 tin, theo tài khoản, bản v2;
 *     bản cũ bị bỏ qua); mọi lần đọc / ghi bọc try/catch.
 */

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';

import { SUPPORT_KB, SUPPORT_SUGGESTIONS } from '@/data/supportKb';
import {
  answerSupportQuestion,
  entryTitle,
  supportWelcome,
  type PersonalSnapshot,
  type SupportEntry,
  type SupportExtraAnswer,
  type SupportLink,
  type SupportLocale,
  type SupportReply,
  type SupportRole,
} from '@/domain/supportBot';
import { useT } from '@/i18n/LocaleProvider';

import { SupportContacts } from './SupportContacts';
import { SupportAvatar } from './SupportGlyph';
import { SUPPORT_QUESTION_MAX_LENGTH } from './supportBubbleEvents';

export { SUPPORT_QUESTION_MAX_LENGTH };

export const SUPPORT_CHAT_STORAGE_KEY = 'cale.supportChat';
export const SUPPORT_CHAT_MAX_MESSAGES = 50;
/** Câu gợi ý tối đa ở lời chào. */
const MAX_SUGGESTIONS = 4;
/** Nút "mở trang" tối đa mỗi câu trả lời (một hàng). */
const MAX_LINKS = 2;

/** Thời gian hiện "Đang trả lời…": theo độ dài câu trả lời (số ký tự), 500–900ms. */
export function typingDelayMs(chars: number): number {
  return Math.min(900, 500 + Math.round(Math.max(0, chars) * 1.5));
}

interface BotMeta {
  kind: SupportReply['kind'];
  /** Mục đã trả lời (kind 'answer'). */
  entryId?: string;
  related: string[];
  /** kind 'clarify': các mục để chọn. */
  options?: string[];
  /** kind 'personal': liên kết trong app. */
  links?: SupportLink[];
  /** Câu trả lời thêm khi một tin có nhiều câu hỏi. */
  also?: SupportExtraAnswer[];
  showContacts: boolean;
  /** Câu người dùng đã hỏi cho lượt này (ngữ cảnh hỏi nối tiếp + "Chưa đúng"). */
  question?: string;
  feedback?: 'up' | 'down';
}

export interface SupportChatMessage {
  id: string;
  from: 'user' | 'bot';
  text: string;
  bot?: BotMeta;
}

interface StoredChat {
  v: 2;
  /** Tài khoản lúc lưu ('' = khách) — đổi tài khoản thì bỏ cuộc cũ. */
  owner: string;
  messages: SupportChatMessage[];
}

const KINDS = new Set<SupportReply['kind']>(['answer', 'smalltalk', 'clarify', 'personal', 'fallback']);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Liên kết đọc lại từ sessionStorage: chỉ đường dẫn trong app. */
function safeLinks(v: unknown): SupportLink[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((l): l is SupportLink => {
    if (!l || typeof l !== 'object') return false;
    const x = l as Record<string, unknown>;
    const label = x.label as Record<string, unknown> | undefined;
    return (
      typeof x.href === 'string' &&
      /^\/(?!\/)/.test(x.href) &&
      !!label &&
      typeof label.vi === 'string' &&
      typeof label.en === 'string'
    );
  });
  return out.length > 0 ? out : undefined;
}

function readMessage(m: unknown): SupportChatMessage | null {
  if (!m || typeof m !== 'object') return null;
  const x = m as Record<string, unknown>;
  if (typeof x.id !== 'string' || typeof x.text !== 'string') return null;
  if (x.from === 'user') return { id: x.id, from: 'user', text: x.text };
  if (x.from !== 'bot' || !x.bot || typeof x.bot !== 'object') return null;
  const b = x.bot as Record<string, unknown>;
  if (!KINDS.has(b.kind as SupportReply['kind'])) return null;
  const also = Array.isArray(b.also)
    ? b.also.filter(
        (a): a is SupportExtraAnswer =>
          !!a && typeof a === 'object' && typeof (a as SupportExtraAnswer).entryId === 'string' && typeof (a as SupportExtraAnswer).text === 'string',
      )
    : undefined;
  return {
    id: x.id,
    from: 'bot',
    text: x.text,
    bot: {
      kind: b.kind as SupportReply['kind'],
      entryId: typeof b.entryId === 'string' ? b.entryId : undefined,
      related: strings(b.related),
      options: b.options === undefined ? undefined : strings(b.options),
      links: safeLinks(b.links),
      also: also && also.length > 0 ? also : undefined,
      showContacts: b.showContacts === true,
      question: typeof b.question === 'string' ? b.question : undefined,
      feedback: b.feedback === 'up' || b.feedback === 'down' ? b.feedback : undefined,
    },
  };
}

function loadChat(owner: string): SupportChatMessage[] {
  try {
    const raw = window.sessionStorage.getItem(SUPPORT_CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<StoredChat>;
    // Bản v1 (trước 04/10) không có ngữ cảnh / phản hồi → bỏ, bắt đầu lại.
    if (!parsed || parsed.v !== 2 || parsed.owner !== owner || !Array.isArray(parsed.messages)) return [];
    return parsed.messages
      .map(readMessage)
      .filter((m): m is SupportChatMessage => !!m)
      .slice(-SUPPORT_CHAT_MAX_MESSAGES);
  } catch {
    return [];
  }
}

function saveChat(owner: string, messages: SupportChatMessage[]): void {
  try {
    if (messages.length === 0) {
      window.sessionStorage.removeItem(SUPPORT_CHAT_STORAGE_KEY);
      return;
    }
    const data: StoredChat = { v: 2, owner, messages };
    window.sessionStorage.setItem(SUPPORT_CHAT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* sessionStorage bị chặn / đầy: chỉ mất lịch sử khi tải lại trang */
  }
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Lượt hỏi gần nhất (câu hỏi + mục đã trả lời) — cho câu nối tiếp. */
function lastTurn(messages: readonly SupportChatMessage[]): { question: string; entryId?: string } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const b = messages[i].bot;
    if (b?.question) return { question: b.question, entryId: b.entryId };
  }
  return null;
}

/** Số câu trả lời "không hiểu" liền nhau ở cuối cuộc trò chuyện. */
function recentFallbacks(messages: readonly SupportChatMessage[]): number {
  let n = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const b = messages[i].bot;
    if (!b) continue;
    if (b.kind !== 'fallback') break;
    n += 1;
  }
  return n;
}

let seq = 0;
const newId = (): string => `sc${Date.now().toString(36)}${(seq++).toString(36)}`;

export interface SupportAssistantProps {
  role: SupportRole;
  locale: SupportLocale;
  /** Production (tiền thật) → dùng bản trả lời `live`. */
  live: boolean;
  /** Mã tài khoản đang đăng nhập ('' = khách) — tách lịch sử theo tài khoản. */
  owner: string;
  /** Tên để chào (bỏ trống = chào chung). */
  name?: string | null;
  /** Dữ liệu của người hỏi, đọc lúc hỏi (`null` = khách; bỏ trống = tắt). */
  getPersonal?: () => PersonalSnapshot | null | undefined;
  /** Gọi khi người dùng chọn một liên kết (đóng khung hỗ trợ). */
  onNavigate: () => void;
  /** Câu hỏi gửi từ ngoài (`openSupportBubble({ ask })`); `id` mới → hỏi một lần. */
  externalAsk?: { id: number; text: string } | null;
  /** Báo câu hỏi gần nhất của người dùng (tab Liên hệ điền sẵn vào phiếu hỗ trợ). */
  onLastQuestion?: (question: string | null) => void;
  /** Kho hỏi đáp (mặc định `SUPPORT_KB`; test truyền kho nhỏ). */
  kb?: readonly SupportEntry[];
  suggestions?: Record<'worker' | 'employer' | 'guest', string[]>;
  /**
   * Khách đang xem trang theo vai trò (/for-workers, /for-employers): câu gợi ý theo
   * đúng đối tượng đó thay cho bộ gợi ý chung của khách.
   */
  guestAudience?: 'worker' | 'employer' | null;
}

const BUBBLE_TEXT = 'text-[15px] leading-relaxed text-gray-900 whitespace-pre-line [overflow-wrap:anywhere]';
const BOT_BUBBLE = `rounded-2xl rounded-tl-sm bg-gray-100 px-3.5 py-2.5 ${BUBBLE_TEXT}`;
const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1';
const CHIP = [
  'motion-lift motion-press flex min-h-11 w-full items-center justify-between gap-2 rounded-full border border-orange-300 bg-white px-4 py-2',
  'text-left text-[15px] font-medium text-gray-900 shadow-sm hover:border-orange-500 hover:bg-orange-50 hover:shadow-md',
  FOCUS,
].join(' ');
const ACTION_LINK = [
  'motion-lift motion-press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-orange-500 bg-white px-4',
  'text-[15px] font-semibold text-orange-700 hover:bg-orange-50 hover:shadow-md',
  FOCUS,
].join(' ');
const FEEDBACK_BTN = [
  'motion-press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-800',
  'hover:border-orange-400 hover:bg-orange-50 disabled:cursor-default disabled:hover:border-gray-300 disabled:hover:bg-white',
  FOCUS,
].join(' ');

function ThumbIcon({ down = false }: { down?: boolean }) {
  return (
    <svg
      className={`h-4 w-4 ${down ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3z" />
      <path d="M7 10l4-7a2 2 0 0 1 3 1.7V9h5a2 2 0 0 1 2 2.3l-1.2 8A2 2 0 0 1 17.8 21H7" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

export function SupportAssistant({
  role,
  locale,
  live,
  owner,
  name,
  getPersonal,
  onNavigate,
  externalAsk,
  onLastQuestion,
  kb = SUPPORT_KB,
  suggestions = SUPPORT_SUGGESTIONS,
  guestAudience = null,
}: SupportAssistantProps) {
  const t = useT();
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const noteId = `${baseId}-note`;

  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [hour] = useState(() => new Date().getHours());
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Bản mới nhất của `messages` (đọc trong xử lý sự kiện / dọn dẹp). */
  const messagesRef = useRef<SupportChatMessage[]>([]);
  /** Câu trả lời đang chờ hiện (sau "Đang trả lời…"). */
  const pendingRef = useRef<{ msg: SupportChatMessage; timer: ReturnType<typeof setTimeout> } | null>(null);

  function commit(next: SupportChatMessage[]) {
    const capped = next.slice(-SUPPORT_CHAT_MAX_MESSAGES);
    messagesRef.current = capped;
    setMessages(capped);
  }

  // Nạp lịch sử của tài khoản hiện tại (sau khi gắn — sessionStorage chỉ có ở trình duyệt).
  useEffect(() => {
    const loaded = loadChat(owner);
    messagesRef.current = loaded;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc sessionStorage một lần cho mỗi tài khoản
    setMessages(loaded);
    setLoadedFor(owner);
  }, [owner]);

  useEffect(() => {
    if (loadedFor === owner) saveChat(owner, messages);
  }, [messages, owner, loadedFor]);

  // Gỡ khung khi đang chờ: huỷ hẹn giờ, vẫn lưu câu trả lời đang chờ.
  useEffect(
    () => () => {
      const pending = pendingRef.current;
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingRef.current = null;
      saveChat(owner, [...messagesRef.current, pending.msg].slice(-SUPPORT_CHAT_MAX_MESSAGES));
    },
    [owner],
  );

  // Câu hỏi gần nhất → tab Liên hệ (phiếu hỗ trợ có sẵn ngữ cảnh).
  useEffect(() => {
    if (!onLastQuestion) return;
    const last = [...messages].reverse().find((m) => m.from === 'user');
    onLastQuestion(last ? last.text : null);
  }, [messages, onLastQuestion]);

  /**
   * Tin làm mốc cuộn: câu người dùng vừa gửi, hoặc câu trả lời mới khi bấm "Chưa đúng".
   * Như Messenger: câu hỏi nằm ở đầu khung, câu trả lời đọc từ trên xuống — không nhảy
   * thẳng xuống đáy (câu trả lời dài + nút gợi ý sẽ đẩy mất câu hỏi khỏi màn hình).
   */
  const anchorRef = useRef<string | null>(null);
  /** Số tin + trạng thái "đang trả lời" lần cuộn trước: chỉ cuộn khi có tin MỚI (bấm
   *  "Đúng ý" chỉ đổi tin cũ → giữ nguyên chỗ người dùng đang đọc). */
  const scrolledFor = useRef<{ count: number; typing: boolean } | null>(null);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const prev = scrolledFor.current;
    scrolledFor.current = { count: messages.length, typing };
    if (prev && prev.count === messages.length && prev.typing === typing) return;
    const anchorId = anchorRef.current;
    const target = anchorId
      ? Array.from(el.querySelectorAll<HTMLElement>('[data-msg-id]')).find((n) => n.dataset.msgId === anchorId)
      : undefined;
    if (!target) {
      // Mở lại khung (lịch sử cũ): hiện phần mới nhất.
      el.scrollTop = el.scrollHeight;
      return;
    }
    // Đưa mốc lên đầu khung (chừa 12px); nội dung sau mốc ngắn thì trình duyệt tự dừng ở đáy.
    const offset = target.getBoundingClientRect().top - el.getBoundingClientRect().top - 12;
    if (Math.abs(offset) < 2) return;
    const top = Math.max(0, el.scrollTop + offset);
    if (typeof el.scrollTo === 'function' && !prefersReducedMotion()) el.scrollTo({ top, behavior: 'smooth' });
    else el.scrollTop = top;
  }, [messages, typing]);

  const byId = useMemo(() => new Map(kb.map((e) => [e.id, e])), [kb]);
  const suggestionRole = role === 'worker' || role === 'employer' ? role : (guestAudience ?? 'guest');
  const suggestionEntries = (suggestions[suggestionRole] ?? [])
    .map((id) => byId.get(id))
    .filter((e): e is SupportEntry => !!e)
    .slice(0, MAX_SUGGESTIONS);

  /** Hiện ngay câu trả lời đang chờ (nếu có). */
  function flush() {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingRef.current = null;
    setTyping(false);
    commit([...messagesRef.current, pending.msg]);
  }

  /** Thêm câu trả lời của trợ lý: sau "Đang trả lời…", hoặc ngay nếu giảm chuyển động. */
  function deliver(msg: SupportChatMessage) {
    if (prefersReducedMotion()) {
      commit([...messagesRef.current, msg]);
      return;
    }
    const total = msg.text.length + (msg.bot?.also ?? []).reduce((n, a) => n + a.text.length, 0);
    const timer = setTimeout(() => {
      pendingRef.current = null;
      setTyping(false);
      commit([...messagesRef.current, msg]);
    }, typingDelayMs(total));
    pendingRef.current = { msg, timer };
    setTyping(true);
  }

  function botMessage(reply: SupportReply, question?: string): SupportChatMessage {
    return {
      id: newId(),
      from: 'bot',
      text: reply.text,
      bot: {
        kind: reply.kind,
        entryId: reply.kind === 'answer' ? reply.entryId : undefined,
        related: reply.related,
        options: reply.kind === 'clarify' ? reply.options : undefined,
        links: reply.kind === 'personal' ? reply.links : undefined,
        also: reply.kind === 'answer' && reply.also && reply.also.length > 0 ? reply.also : undefined,
        showContacts: !!reply.showContacts,
        question,
      },
    };
  }

  function options(previous: { question: string; entryId?: string } | null) {
    return {
      kb,
      locale,
      live,
      role,
      previous,
      personal: getPersonal ? getPersonal() : undefined,
      hour: new Date().getHours(),
      seed: messagesRef.current.length,
      // Số lần liền nhau trợ lý không hiểu (cho domain khuyên gặp người thật sớm hơn;
      // trường bị bỏ qua nếu domain chưa dùng).
      recentFallbacks: recentFallbacks(messagesRef.current),
    };
  }

  function ask(raw: string) {
    const question = raw.trim().slice(0, SUPPORT_QUESTION_MAX_LENGTH);
    if (!question) return;
    flush();
    const reply = answerSupportQuestion(question, options(lastTurn(messagesRef.current)));
    const userMsg: SupportChatMessage = { id: newId(), from: 'user', text: question };
    anchorRef.current = userMsg.id;
    commit([...messagesRef.current, userMsg]);
    deliver(botMessage(reply, question));
  }

  function giveFeedback(messageId: string, value: 'up' | 'down') {
    flush();
    const target = messagesRef.current.find((m) => m.id === messageId);
    if (!target?.bot || target.bot.feedback) return;
    const marked = messagesRef.current.map((m) =>
      m.id === messageId && m.bot ? { ...m, bot: { ...m.bot, feedback: value } } : m,
    );
    commit(marked);
    if (value === 'down') {
      const previous = target.bot.question ? { question: target.bot.question, entryId: target.bot.entryId } : null;
      const retry = botMessage(answerSupportQuestion('sai rồi', options(previous)));
      anchorRef.current = retry.id;
      deliver(retry);
    }
  }

  // Câu hỏi gửi từ ngoài: chạy SAU effect nạp lịch sử (khai báo sau) và chỉ khi đã nạp xong.
  const handledAskRef = useRef<number | null>(null);
  useEffect(() => {
    if (!externalAsk || loadedFor !== owner || handledAskRef.current === externalAsk.id) return;
    handledAskRef.current = externalAsk.id;
    ask(externalAsk.text);
    // `ask` đọc ref, không phụ thuộc giá trị render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalAsk, loadedFor, owner]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    ask(draft);
    setDraft('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Đang gõ bộ gõ (IME): Enter để chốt chữ, không gửi.
    if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault();
  }

  function clear() {
    const pending = pendingRef.current;
    if (pending) clearTimeout(pending.timer);
    pendingRef.current = null;
    setTyping(false);
    anchorRef.current = null;
    commit([]);
    inputRef.current?.focus();
  }

  function chips(ids: readonly string[], label: string) {
    const entries = ids.map((id) => byId.get(id)).filter((x): x is SupportEntry => !!x);
    if (entries.length === 0) return null;
    return (
      <div className="mt-3">
        <p className="mb-1.5 text-sm font-semibold text-gray-700">{label}</p>
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button type="button" className={CHIP} onClick={() => ask(entryTitle(entry, locale))}>
                <span className="min-w-0">{entryTitle(entry, locale)}</span>
                <span aria-hidden="true" className="shrink-0 text-lg leading-none text-orange-700">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function linkRow(links: readonly SupportLink[]) {
    const shown = links.slice(0, MAX_LINKS);
    if (shown.length === 0) return null;
    return (
      <ul className="mt-2 flex flex-wrap gap-2">
        {shown.map((link) => (
          <li key={link.href}>
            {/^https?:\/\//.test(link.href) ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" className={ACTION_LINK}>
                {link.label[locale] || link.label.vi}
                <span className="sr-only"> {t('supportBubble.contact.newTab')}</span>
              </a>
            ) : (
              <Link href={link.href} onClick={onNavigate} className={ACTION_LINK}>
                {link.label[locale] || link.label.vi}
              </Link>
            )}
          </li>
        ))}
      </ul>
    );
  }

  function feedbackRow(m: SupportChatMessage, meta: BotMeta) {
    const done = !!meta.feedback;
    return (
      <div className="mt-3">
        {meta.feedback === 'up' ? (
          <p className="text-sm font-medium text-gray-700" role="status">
            {t('supportBubble.feedback.thanks')}
          </p>
        ) : (
          <div role="group" aria-label={t('supportBubble.feedback.label')} className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={FEEDBACK_BTN}
              disabled={done}
              onClick={() => giveFeedback(m.id, 'up')}
            >
              <ThumbIcon />
              {t('supportBubble.feedback.up')}
            </button>
            <button
              type="button"
              className={FEEDBACK_BTN}
              disabled={done}
              onClick={() => giveFeedback(m.id, 'down')}
            >
              <ThumbIcon down />
              {t('supportBubble.feedback.down')}
            </button>
          </div>
        )}
      </div>
    );
  }

  /** `askedBy`: câu người dùng dẫn tới câu trả lời này (điền vào phiếu hỗ trợ). */
  function botBody(m: SupportChatMessage, meta: BotMeta, askedBy: string | null) {
    const entry = meta.entryId ? byId.get(meta.entryId) : undefined;
    const links = meta.kind === 'answer' ? (entry?.links ?? []) : meta.kind === 'personal' ? (meta.links ?? []) : [];
    const relatedLabel =
      meta.kind === 'answer' || meta.kind === 'personal'
        ? t('supportBubble.assistant.related')
        : t('supportBubble.assistant.didYouMean');
    return (
      <>
        <div className={BOT_BUBBLE}>{m.text}</div>
        {linkRow(links)}
        {(meta.also ?? []).map((extra) => (
          <div key={extra.entryId} className="mt-3" data-also-entry={extra.entryId}>
            <div className={BOT_BUBBLE}>{extra.text}</div>
            {linkRow(byId.get(extra.entryId)?.links ?? [])}
          </div>
        ))}
        {meta.kind === 'clarify' && meta.options && meta.options.length > 0
          ? chips(meta.options, t('supportBubble.assistant.clarify'))
          : meta.related.length > 0 && chips(meta.related, relatedLabel)}
        {meta.showContacts && (
          <div className="mt-3">
            <p className="mb-1.5 text-sm font-semibold text-gray-700">{t('supportBubble.assistant.contactsLabel')}</p>
            <SupportContacts compact question={askedBy} />
          </div>
        )}
        {(meta.kind === 'answer' || meta.kind === 'personal') && feedbackRow(m, meta)}
      </>
    );
  }

  const botLabel = t('supportBubble.assistant.botName');
  const youLabel = t('supportBubble.assistant.you');
  // Câu người dùng gần nhất trước mỗi câu trả lời ("Chưa đúng" → câu hỏi gốc).
  const askedBy = new Map<string, string>();
  let lastUser: string | null = null;
  for (const m of messages) {
    if (m.from === 'user') lastUser = m.text;
    else if (lastUser) askedBy.set(m.id, lastUser);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {messages.length > 0 && (
        // Nút phụ, nhỏ, ở đầu cuộc trò chuyện (không chen giữa ô nhập).
        <div className="flex justify-end border-b border-gray-100 px-2">
          <button
            type="button"
            onClick={clear}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
            {t('supportBubble.assistant.clear')}
          </button>
        </div>
      )}
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t('supportBubble.assistant.logLabel')}
        tabIndex={0}
        className="support-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400"
      >
        <ol className="flex flex-col gap-4">
          <li className="flex w-full gap-2 self-start">
            <SupportAvatar />
            <div className="min-w-0 flex-1">
              <p className="sr-only">{botLabel}:</p>
              <div className={BOT_BUBBLE}>{supportWelcome(locale, name, hour)}</div>
              {suggestionEntries.length > 0 &&
                chips(
                  suggestionEntries.map((e) => e.id),
                  t('supportBubble.assistant.suggestions'),
                )}
            </div>
          </li>
          {messages.map((m) =>
            m.from === 'user' ? (
              <li key={m.id} data-msg-id={m.id} className="support-msg-in max-w-[85%] self-end">
                <p className="sr-only">{youLabel}:</p>
                <div className={`rounded-2xl rounded-tr-sm bg-orange-100 px-3.5 py-2.5 ${BUBBLE_TEXT}`}>{m.text}</div>
              </li>
            ) : (
              <li
                key={m.id}
                data-msg-id={m.id}
                className="support-msg-in flex w-full gap-2 self-start"
                data-bot-kind={m.bot?.kind}
              >
                <SupportAvatar />
                <div className="min-w-0 flex-1">
                  <p className="sr-only">{botLabel}:</p>
                  {m.bot ? botBody(m, m.bot, askedBy.get(m.id) ?? null) : <div className={BOT_BUBBLE}>{m.text}</div>}
                </div>
              </li>
            ),
          )}
          {typing && (
            <li className="support-msg-in flex gap-2 self-start" aria-hidden="true" data-typing="true">
              <SupportAvatar />
              <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-sm bg-gray-100 px-3.5 py-3">
                <span className="flex items-center gap-1">
                  <span className="support-typing-dot h-2 w-2 rounded-full bg-gray-500" />
                  <span className="support-typing-dot h-2 w-2 rounded-full bg-gray-500" />
                  <span className="support-typing-dot h-2 w-2 rounded-full bg-gray-500" />
                </span>
                <span className="text-sm text-gray-700">{t('supportBubble.assistant.typing')}</span>
              </div>
            </li>
          )}
        </ol>
      </div>

      <div className="border-t border-gray-200 px-4 pb-3 pt-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <label htmlFor={inputId} className="sr-only">
            {t('supportBubble.assistant.inputLabel')}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={draft}
            maxLength={SUPPORT_QUESTION_MAX_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('supportBubble.assistant.placeholder')}
            aria-describedby={noteId}
            autoComplete="off"
            enterKeyHint="send"
            className="min-h-12 min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-4 text-base text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            type="submit"
            disabled={draft.trim() === ''}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-full bg-orange-500 px-4 text-[15px] font-semibold text-gray-900 hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2 disabled:bg-orange-200 disabled:text-gray-500"
          >
            <SendIcon />
            {t('supportBubble.assistant.send')}
          </button>
        </form>
        <p id={noteId} className="mt-2 text-sm text-gray-600">
          {t('supportBubble.assistant.note')}
        </p>
      </div>
    </div>
  );
}
