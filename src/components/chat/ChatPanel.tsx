'use client';

/**
 * Khung chat của MỘT đơn ứng tuyển (0035) — dùng trong `/shifts/[id]` (người lao
 * động, nằm ngay trong trang) và `/employer/shifts/[id]` (nhà tuyển dụng, trong
 * hộp thoại). Không có route riêng.
 *
 *   - Mở: tải tin mới nhất, đánh dấu đã đọc, nghe tin mới (Realtime ở
 *     production). Đóng (unmount): ngừng nghe.
 *   - Nội dung tin hiển thị là CHỮ THUẦN (không HTML, không tự gắn link).
 *   - Ô nhập: Enter gửi, Shift+Enter xuống dòng (bỏ qua khi đang gõ bộ gõ tiếng
 *     Việt — `isComposing`); đếm ký tự; cảnh báo (không chặn) khi tin có dấu
 *     hiệu giao dịch ngoài CaLẻ.
 *   - Chỉ đọc: không có ô nhập, nói rõ lý do.
 *   - Báo cáo tin của người kia: biểu mẫu ngắn ngay trong khung (không lồng
 *     hộp thoại trong hộp thoại ở trang nhà tuyển dụng).
 */

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { CHAT_MAX_LENGTH, detectOffPlatformHint } from '@/domain/chat';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { toastFromStoreError } from '@/lib/errorMap';
import { formatNotificationTime } from '@/lib/notificationTime';
import { showError, showSuccess } from '@/lib/toast';
import { CHAT_REPORT_REASON_MAX, isReportedByMe, useChatStore } from '@/stores/chatStore';
import type { ChatMessage } from '@/types';

const EMPTY: ChatMessage[] = [];

export interface ChatPanelProps {
  applicationId: string;
  /** Người đang xem (đăng nhập). */
  userId: string;
  viewerRole: 'worker' | 'employer';
  access: 'open' | 'readonly';
  /** Tên người kia (nhãn người gửi). */
  otherName?: string;
  /** Đưa con trỏ vào ô nhập khi mở. */
  autoFocus?: boolean;
}

export function ChatPanel({
  applicationId,
  userId,
  viewerRole,
  access,
  otherName,
  autoFocus = false,
}: ChatPanelProps) {
  const t = useT();
  const locale = useLocale();
  const baseId = useId();
  const textareaId = `${baseId}-composer`;
  const hintId = `${baseId}-hint`;
  const counterId = `${baseId}-counter`;
  const warnId = `${baseId}-warn`;

  const messages = useChatStore((s) => s.messagesByApplication[applicationId] ?? EMPTY);
  const loading = useChatStore((s) => s.loadingByApplication[applicationId] ?? false);
  const hasMore = useChatStore((s) => s.hasMoreByApplication[applicationId] ?? false);
  const loadError = useChatStore((s) => s.errorByApplication[applicationId] ?? null);
  const openThread = useChatStore((s) => s.openThread);
  const closeThread = useChatStore((s) => s.closeThread);
  const loadOlder = useChatStore((s) => s.loadOlder);
  const send = useChatStore((s) => s.send);
  const report = useChatStore((s) => s.report);

  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reportRef = useRef<HTMLTextAreaElement>(null);
  const lastIdRef = useRef<string | null>(null);
  /** Người dùng đang ở (gần) cuối danh sách — cập nhật khi cuộn. */
  const atBottomRef = useRef(true);
  /** Tin mới của người kia tới khi đang đọc tin cũ → hiện nút "Tin nhắn mới". */
  const [newBelow, setNewBelow] = useState(false);

  // Mở cuộc trò chuyện khi gắn; ngừng nghe tin mới khi gỡ / đổi đơn.
  useEffect(() => {
    let alive = true;
    void openThread(applicationId, userId).then((res) => {
      if (!alive) return;
      setOpened(true);
      if (!res.ok) showError(toastFromStoreError(res.error));
    });
    return () => {
      alive = false;
      closeThread(applicationId);
    };
  }, [applicationId, userId, openThread, closeThread]);

  useEffect(() => {
    if (autoFocus && access === 'open') textareaRef.current?.focus();
  }, [autoFocus, access]);

  // Có tin MỚI ở cuối (như Messenger): lần đầu mở, tin của chính mình, hoặc đang ở
  // cuối danh sách → cuộn xuống cuối. Đang kéo lên đọc tin cũ mà người kia nhắn tới →
  // KHÔNG giật xuống, hiện nút "Tin nhắn mới". Nạp tin cũ (thêm ở đầu) thì giữ nguyên.
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    const last = lastMsg?.id ?? null;
    const prev = lastIdRef.current;
    lastIdRef.current = last;
    const el = listRef.current;
    if (!last || !el || last === prev) return;
    const first = prev === null;
    if (first || lastMsg.senderId === userId || atBottomRef.current) {
      scrollToBottom(!first);
      return;
    }
    setNewBelow(true);
    // Chỉ chạy khi danh sách tin đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  function scrollToBottom(smooth: boolean) {
    const el = listRef.current;
    if (!el) return;
    const reduce =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (smooth && !reduce && typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    else el.scrollTop = el.scrollHeight;
    atBottomRef.current = true;
    setNewBelow(false);
  }

  function handleListScroll() {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    atBottomRef.current = atBottom;
    if (atBottom && newBelow) setNewBelow(false);
  }

  useEffect(() => {
    if (reportTarget) reportRef.current?.focus();
  }, [reportTarget]);

  const trimmedLength = draft.trim().length;
  const overLimit = trimmedLength > CHAT_MAX_LENGTH;
  const showWarning = access === 'open' && detectOffPlatformHint(draft);
  const nowIso = new Date().toISOString();

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    if (sending || access !== 'open') return;
    if (trimmedLength === 0 || overLimit) {
      showError(toastFromStoreError(overLimit ? 'CHAT_TOO_LONG' : 'CHAT_EMPTY'));
      return;
    }
    setSending(true);
    const res = await send(applicationId, userId, draft);
    setSending(false);
    if (!res.ok) {
      showError(toastFromStoreError(res.error));
      return;
    }
    setDraft('');
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    void handleSend();
  }

  async function handleReport(e: FormEvent) {
    e.preventDefault();
    if (!reportTarget || reporting) return;
    setReporting(true);
    const res = await report(applicationId, reportTarget.id, userId, reportReason);
    setReporting(false);
    if (!res.ok) {
      showError(toastFromStoreError(res.error));
      return;
    }
    showSuccess(t('chat.report.success'));
    setReportTarget(null);
    setReportReason('');
  }

  const senderLabel = (m: ChatMessage) =>
    m.senderId === userId
      ? t('chat.sender.me')
      : otherName || t(viewerRole === 'worker' ? 'chat.sender.employer' : 'chat.sender.worker');

  const intro = t(viewerRole === 'worker' ? 'chat.worker.intro' : 'chat.employer.intro');
  const emptyText =
    access === 'readonly'
      ? t('chat.empty.readonly')
      : t(viewerRole === 'worker' ? 'chat.empty.worker' : 'chat.empty.employer');

  return (
    <div className="flex flex-col gap-3" data-testid="chat-panel">
      <p className="text-sm text-gray-600">{intro}</p>
      {!isSupabaseEnv() && <p className="text-xs text-gray-500">{t('chat.demoNote')}</p>}

      <div className="relative">
      <div
        ref={listRef}
        onScroll={handleListScroll}
        role="log"
        aria-live="polite"
        aria-label={t('chat.list.label')}
        aria-busy={loading || !opened}
        tabIndex={0}
        className="max-h-[60vh] min-h-[8rem] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:max-h-96"
      >
        {hasMore && (
          <div className="mb-2 flex justify-center">
            <Button
              type="button"
              size="md"
              variant="ghost"
              loading={loading}
              onClick={async () => {
                const res = await loadOlder(applicationId);
                if (!res.ok) showError(toastFromStoreError(res.error));
              }}
            >
              {t('chat.loadOlder')}
            </Button>
          </div>
        )}

        {messages.length === 0 ? (
          <p role="status" className="px-2 py-6 text-center text-sm text-gray-500">
            {!opened || loading ? t('chat.loading') : loadError ? t('chat.error.loadFailed') : emptyText}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => {
              const mine = m.senderId === userId;
              const time = formatNotificationTime(m.createdAt, nowIso, locale);
              const reportedByMe = isReportedByMe(m, userId);
              return (
                <li key={m.id} className={['flex flex-col', mine ? 'items-end' : 'items-start'].join(' ')}>
                  <div
                    className={[
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                      mine
                        ? 'rounded-br-md bg-orange-100 text-gray-900'
                        : 'rounded-bl-md border border-gray-200 bg-white text-gray-900',
                    ].join(' ')}
                  >
                    <span className="sr-only">{senderLabel(m)}: </span>
                    {/* Chữ thuần — React tự thoát ký tự; không HTML, không gắn link. */}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 px-1 text-xs text-gray-500">
                    <span aria-hidden="true">{senderLabel(m)}</span>
                    <time dateTime={m.createdAt} className="tabular-nums">
                      {time}
                    </time>
                    {reportedByMe && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
                        {t('chat.reported')}
                      </span>
                    )}
                    {!mine && !reportedByMe && (
                      <button
                        type="button"
                        onClick={() => {
                          setReportTarget(m);
                          setReportReason('');
                        }}
                        aria-label={t('chat.report.aria').replace('{time}', time)}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-2 text-xs font-medium text-gray-600 underline-offset-2 hover:text-red-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                      >
                        {t('chat.report')}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {newBelow && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-3 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-1.5 rounded-full bg-orange-500 px-4 text-sm font-semibold text-gray-900 shadow-modal hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
        >
          {t('chat.newBelow')}
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 4v12m0 0-5-5m5 5 5-5" />
          </svg>
        </button>
      )}
      </div>

      {reportTarget && (
        <form
          onSubmit={handleReport}
          aria-labelledby={`${baseId}-report-title`}
          className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3"
        >
          <h3 id={`${baseId}-report-title`} className="text-sm font-semibold text-gray-900">
            {t('chat.report.title')}
          </h3>
          <blockquote className="line-clamp-3 whitespace-pre-wrap break-words border-l-2 border-gray-300 pl-2 text-sm text-gray-700">
            {reportTarget.body}
          </blockquote>
          <p className="text-xs text-gray-600">{t('chat.report.intro')}</p>
          <label htmlFor={`${baseId}-report-reason`} className="text-sm font-medium text-gray-700">
            {t('chat.report.reasonLabel')}
          </label>
          <textarea
            ref={reportRef}
            id={`${baseId}-report-reason`}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            maxLength={CHAT_REPORT_REASON_MAX}
            rows={2}
            required
            placeholder={t('chat.report.reasonPlaceholder')}
            className="min-h-[44px] w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setReportTarget(null)}>
              {t('btn.cancel')}
            </Button>
            <Button type="submit" variant="danger" loading={reporting} disabled={reportReason.trim() === ''}>
              {t('chat.report.submit')}
            </Button>
          </div>
        </form>
      )}

      {access === 'readonly' ? (
        <div role="status" className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <p className="font-medium text-gray-900">{t('chat.readonly')}</p>
          <p className="mt-1 text-gray-600">{t('chat.readonly.why')}</p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="flex flex-col gap-2">
          <label htmlFor={textareaId} className="text-sm font-medium text-gray-700">
            {t('chat.composer.label')}
          </label>
          <textarea
            ref={textareaRef}
            id={textareaId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={t('chat.composer.placeholder')}
            aria-describedby={[hintId, counterId, showWarning ? warnId : ''].filter(Boolean).join(' ')}
            aria-invalid={overLimit}
            className={[
              'min-h-[44px] w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
              overLimit ? 'border-red-400' : 'border-gray-300',
            ].join(' ')}
          />
          {showWarning && (
            <p
              id={warnId}
              role="note"
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              {t('chat.offPlatform')}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col text-xs">
              <span id={hintId} className="text-gray-500">
                {t('chat.composer.hint')}
              </span>
              <span id={counterId} className={overLimit ? 'font-medium text-red-700' : 'text-gray-500'}>
                {t('chat.composer.counter')
                  .replace('{count}', String(trimmedLength))
                  .replace('{max}', String(CHAT_MAX_LENGTH))}
                {overLimit && ` · ${t('chat.composer.overLimit').replace('{max}', String(CHAT_MAX_LENGTH))}`}
              </span>
            </div>
            <Button type="submit" variant="primary" loading={sending} disabled={trimmedLength === 0 || overLimit}>
              {t('chat.send')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
