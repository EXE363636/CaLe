'use client';

/**
 * Bong bóng hỗ trợ (04/10) — nút tròn góc phải dưới MỌI trang (trừ đăng nhập /
 * đăng ký / quên mật khẩu), mở khung hỗ trợ ba tab:
 *   1. "Hỏi CaLẻ"  — trợ lý hỏi đáp tự động, chạy ở trình duyệt (`SupportAssistant`).
 *   2. "Hộp thư"   — CHỈ khi đã đăng nhập: cuộc trò chuyện theo đơn ứng tuyển (0035)
 *                    + thông báo gần nhất (`SupportInbox`). Chuông trên thanh điều
 *                    hướng giữ nguyên.
 *   3. "Liên hệ"   — hotline, phiếu hỗ trợ qua email, Facebook, Zalo (`SupportContacts`).
 * Khách thấy ngay hai tab "Hỏi CaLẻ" và "Liên hệ" (không cần đăng nhập).
 *
 * Số trên nút tròn = tin chat chưa đọc + thông báo chưa đọc, không đếm trùng
 * (`inboxUnreadCount`, `inboxRules.ts`).
 *
 * Khung KHÔNG chặn trang (`aria-modal="false"`): Escape / nút đóng → đóng và trả
 * tiêu điểm về nút tròn; mở → tiêu điểm vào tab đang chọn. Tab theo mẫu WAI-ARIA
 * (mũi tên trái / phải, Home / End).
 *
 * Lớp phủ: nút + khung ở `z-[60]` — trên thanh điều hướng (z-30) và các bảng thả
 * xuống (≤ z-50), DƯỚI ngăn kéo menu điện thoại (z-[70]/[80]), hộp thoại (z-[100])
 * và toast (z-[110]) nên không bao giờ che chúng. App không có thanh điều hướng
 * dưới đáy; `MobileNav` là ngăn kéo phủ toàn màn hình nên không cần nhích nút lên.
 * Hiệu ứng mở: `animate-scale-in` (tắt khi `prefers-reduced-motion`).
 *
 * Nút tròn: một lần mỗi phiên (cờ sessionStorage) vòng sáng lan nhẹ + (máy tính)
 * gợi ý "Cần hỗ trợ? Hỏi ngay" ~4 giây; không có khi giảm chuyển động.
 *
 * Mở từ nơi khác: `openSupportBubble({ tab, ask })` (`supportBubbleEvents.ts`).
 * Dữ liệu cá nhân cho trợ lý: `buildPersonalSnapshot` đọc store LÚC HỎI.
 */

import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { usePathname } from 'next/navigation';

import { isSupabaseEnv } from '@/data/supabaseClient';
import type { SupportEntry, SupportRole } from '@/domain/supportBot';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { useApplicationStore } from '@/stores/applicationStore';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useWalletStore } from '@/stores/walletStore';

import { SupportContacts } from './SupportContacts';
import { SupportAvatar, SupportGlyph } from './SupportGlyph';
import { SupportInbox } from './SupportInbox';
import { inboxUnreadCount } from './inboxRules';
import { buildPersonalSnapshot } from './personalSnapshot';
import { OPEN_SUPPORT_EVENT, SUPPORT_QUESTION_MAX_LENGTH, type OpenSupportDetail } from './supportBubbleEvents';

/**
 * Trợ lý (kho hỏi đáp ~220KB + bộ so khớp) tách thành gói riêng, CHỈ tải khi người dùng
 * định mở khung (rê chuột / chạm / tiêu điểm vào nút tròn, hoặc mở từ nơi khác) — trang
 * nào cũng có nút tròn nên không được bắt mọi trang tải sẵn gói này.
 */
const loadAssistant = () => import('./SupportAssistant');
const SupportAssistant = lazy(() => loadAssistant().then((m) => ({ default: m.SupportAssistant })));
function preloadAssistant() {
  void loadAssistant().catch(() => undefined);
}

/** Cờ "đã nhắc" (vòng sáng + gợi ý) — một lần mỗi phiên. */
export const SUPPORT_HINT_STORAGE_KEY = 'cale.supportHint';
const TIP_MS = 4000;

/** Trang không hiện bong bóng (luồng đăng nhập cần toàn bộ màn hình). */
export const SUPPORT_BUBBLE_HIDDEN_PATHS = ['/login', '/register', '/forgot-password'];

export function isSupportBubbleHidden(pathname: string): boolean {
  return SUPPORT_BUBBLE_HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

type TabKey = 'assistant' | 'inbox' | 'contact';
const GUEST_TABS: TabKey[] = ['assistant', 'contact'];
const USER_TABS: TabKey[] = ['assistant', 'inbox', 'contact'];
const TAB_LABEL: Record<TabKey, string> = {
  assistant: 'supportBubble.tab.assistant',
  inbox: 'supportBubble.tab.inbox',
  contact: 'supportBubble.tab.contact',
};

export interface SupportBubbleProps {
  /** Kho hỏi đáp (mặc định `SUPPORT_KB`; test truyền kho nhỏ). */
  kb?: readonly SupportEntry[];
  suggestions?: Record<'worker' | 'employer' | 'guest', string[]>;
}

function TabIcon({ tab }: { tab: TabKey }) {
  if (tab === 'assistant') return <SupportGlyph className="h-[18px] w-[18px]" />;
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {tab === 'inbox' ? (
        <>
          <path d="M4 13.5 6.2 5.6A2 2 0 0 1 8.1 4h7.8a2 2 0 0 1 1.9 1.6L20 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20" />
        </>
      ) : (
        <path d="M21 16.4v2.8a1.9 1.9 0 0 1-2.1 1.9 18.8 18.8 0 0 1-8.2-2.9 18.5 18.5 0 0 1-5.7-5.7A18.8 18.8 0 0 1 2.1 4.2 1.9 1.9 0 0 1 4 2.1h2.8a1.9 1.9 0 0 1 1.9 1.6c.1.9.4 1.8.7 2.7a1.9 1.9 0 0 1-.4 2L7.8 9.6a15.2 15.2 0 0 0 5.7 5.7l1.2-1.2a1.9 1.9 0 0 1 2-.4c.9.3 1.8.6 2.7.7a1.9 1.9 0 0 1 1.6 1.9z" />
      )}
    </svg>
  );
}

/** Chờ gói trợ lý tải xong (thường rất nhanh — đã tải trước khi rê / chạm nút). */
function AssistantLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-1 items-center justify-center gap-1.5 p-6">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="support-typing-dot h-2 w-2 rounded-full bg-gray-500" />
      <span aria-hidden="true" className="support-typing-dot h-2 w-2 rounded-full bg-gray-500" />
      <span aria-hidden="true" className="support-typing-dot h-2 w-2 rounded-full bg-gray-500" />
    </div>
  );
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function CloseIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function UnreadBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold leading-5 text-white ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function SupportBubble({ kb, suggestions }: SupportBubbleProps = {}) {
  const pathname = usePathname() ?? '';
  const t = useT();
  const locale = useLocale();
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const titleId = `${baseId}-title`;

  const userId = useAuthStore((s) => s.currentUserId);
  const user = useCurrentUser();
  const threads = useChatStore((s) => s.threads);
  const loadThreads = useChatStore((s) => s.loadThreads);
  const notifications = useNotificationStore((s) => s.notifications);
  const unread = useMemo(() => inboxUnreadCount(notifications, userId, threads), [notifications, userId, threads]);

  const [open, setOpen] = useState(false);
  const [tabState, setTab] = useState<TabKey>('assistant');
  const tabs = userId ? USER_TABS : GUEST_TABS;
  // Đăng xuất khi đang ở "Hộp thư" → về "Hỏi CaLẻ".
  const tab: TabKey = tabs.includes(tabState) ? tabState : 'assistant';
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({ assistant: null, inbox: null, contact: null });
  const wasOpen = useRef(false);
  /** Đóng vì người dùng chọn một liên kết → để tiêu điểm cho trang mới, không kéo về nút. */
  const closedByNavigation = useRef(false);

  const live = isSupabaseEnv();
  const role: SupportRole = user?.role ?? 'guest';
  const hidden = isSupportBubbleHidden(pathname);
  /** Câu hỏi gửi từ ngoài (`openSupportBubble({ ask })`). */
  const [externalAsk, setExternalAsk] = useState<{ id: number; text: string } | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [hint, setHint] = useState<{ pulse: boolean; tip: boolean }>({ pulse: false, tip: false });
  // Nhà tuyển dụng chỉ có tên doanh nghiệp → chào chung (xem personalSnapshot.ts).
  const name = user && user.role !== 'employer' ? user.fullName : null;

  // Dữ liệu của chính người hỏi — đọc store lúc hỏi (không đăng ký theo dõi).
  const getPersonal = useCallback(() => {
    const auth = useAuthStore.getState().currentUserId;
    const me = auth ? (useUserStore.getState().findById(auth) ?? null) : null;
    const wallet = useWalletStore.getState();
    return buildPersonalSnapshot({
      user: me,
      live,
      shifts: useShiftStore.getState().shifts,
      applications: useApplicationStore.getState().applications,
      wallets: wallet.wallets,
      ledger: wallet.ledger,
      threads: useChatStore.getState().threads,
      locale,
      now: new Date(),
    });
  }, [live, locale]);

  // Mở từ nơi khác trong app (chân trang, trang hỗ trợ…).
  useEffect(() => {
    let counter = 0;
    function onOpen(e: Event) {
      const detail: OpenSupportDetail = (e as CustomEvent<OpenSupportDetail | null>).detail ?? {};
      const question = typeof detail.ask === 'string' ? detail.ask.trim().slice(0, SUPPORT_QUESTION_MAX_LENGTH) : '';
      const loggedIn = !!useAuthStore.getState().currentUserId;
      let next: TabKey = detail.tab === 'contact' || (detail.tab === 'inbox' && loggedIn) ? detail.tab : 'assistant';
      if (question) {
        next = 'assistant';
        counter += 1;
        setExternalAsk({ id: counter, text: question });
      }
      preloadAssistant();
      setTab(next);
      setOpen(true);
      // Khung đã mở sẵn thì effect mở không chạy lại → tự đưa tiêu điểm vào tab đã chọn.
      requestAnimationFrame(() => tabRefs.current[next]?.focus());
    }
    window.addEventListener(OPEN_SUPPORT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, onOpen);
  }, []);

  // Nhắc một lần mỗi phiên: vòng sáng + gợi ý (máy tính); không có khi giảm chuyển động.
  useEffect(() => {
    if (hidden || prefersReducedMotion()) return;
    try {
      if (window.sessionStorage.getItem(SUPPORT_HINT_STORAGE_KEY)) return;
      window.sessionStorage.setItem(SUPPORT_HINT_STORAGE_KEY, '1');
    } catch {
      return; // không ghi được cờ → không nhắc (tránh nhắc lại mỗi lần tải trang)
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nhắc một lần sau khi gắn (cần sessionStorage)
    setHint({ pulse: true, tip: true });
    const timer = setTimeout(() => setHint((h) => ({ ...h, tip: false })), TIP_MS);
    return () => clearTimeout(timer);
  }, [hidden]);

  // Demo: danh sách cuộc trò chuyện tính tại chỗ (rẻ) → nạp khi đổi tài khoản để có
  // số chưa đọc trên nút. Production: AppHydrator đã nạp lúc khởi động.
  useEffect(() => {
    if (!userId || live) return;
    void loadThreads(userId, () => useAuthStore.getState().currentUserId === userId).catch(() => undefined);
  }, [userId, live, loadThreads]);

  // Mở → tiêu điểm vào tab đang chọn; đóng → trả về nút tròn.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đã mở thì thôi nhắc
      setHint({ pulse: false, tip: false });
      tabRefs.current[tab]?.focus();
    } else if (wasOpen.current && !closedByNavigation.current) {
      buttonRef.current?.focus();
    }
    closedByNavigation.current = false;
    wasOpen.current = open;
    // Chỉ chạy khi mở / đóng — đổi tab tự đặt tiêu điểm trong `selectTab`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Đổi trang (vd. sang /login) khi đang mở → đóng.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đóng khung khi chuyển sang trang ẩn bong bóng
    if (hidden) setOpen(false);
  }, [hidden]);

  const close = useCallback(() => setOpen(false), []);
  const closeForNavigation = useCallback(() => {
    closedByNavigation.current = true;
    setOpen(false);
  }, []);

  function selectTab(next: TabKey, focus = true) {
    setTab(next);
    if (focus) tabRefs.current[next]?.focus();
  }

  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const i = tabs.indexOf(tab);
    let next: TabKey | null = null;
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === 'Home') next = tabs[0];
    else if (e.key === 'End') next = tabs[tabs.length - 1];
    if (!next) return;
    e.preventDefault();
    selectTab(next);
  }

  function onPanelKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  }

  if (hidden) return null;

  const unreadText = unread > 0 ? t('chat.unread').replace('{count}', String(unread)) : '';
  const buttonLabel = [open ? t('supportBubble.close') : t('supportBubble.open'), unreadText].filter(Boolean).join(', ');

  return (
    <>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          onKeyDown={onPanelKeyDown}
          className={[
            'animate-scale-in fixed z-[60] flex flex-col overflow-hidden bg-white text-gray-900 shadow-modal',
            // Điện thoại: tấm gần toàn màn hình, chừa vùng an toàn (tai thỏ / thanh home).
            'inset-x-0 bottom-0 top-[calc(env(safe-area-inset-top)+0.5rem)] rounded-t-2xl border border-black/10',
            'pb-[env(safe-area-inset-bottom)]',
            // Máy tính: khung ~380×560 neo phía trên nút tròn.
            'sm:inset-auto sm:right-4 sm:bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:h-[min(560px,calc(100dvh-7.5rem))] sm:w-[380px] sm:origin-bottom-right sm:rounded-2xl sm:pb-0',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-2 border-b border-orange-100 bg-gradient-to-br from-orange-100 via-orange-50 to-white py-2.5 pl-4 pr-1.5">
            <div className="flex min-w-0 items-center gap-3">
              <SupportAvatar size="md" />
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-bold leading-tight text-gray-900">
                  {t('supportBubble.title')}
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-700">
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-green-500 ring-2 ring-green-100" />
                  {t('supportBubble.subtitle')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={t('supportBubble.close')}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div role="tablist" aria-label={t('supportBubble.tabsLabel')} className="flex border-b border-gray-200 px-2">
            {tabs.map((key) => {
              const selected = key === tab;
              return (
                <button
                  key={key}
                  ref={(el) => {
                    tabRefs.current[key] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${key}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-tabpanel-${key}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(key, false)}
                  onKeyDown={onTabKeyDown}
                  className={[
                    'relative inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 px-2 text-sm font-semibold',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400',
                    selected
                      ? 'text-orange-700 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-orange-500'
                      : 'text-gray-700 hover:text-gray-900',
                  ].join(' ')}
                >
                  <TabIcon tab={key} />
                  <span>{t(TAB_LABEL[key])}</span>
                  {key === 'inbox' && unread > 0 && (
                    <>
                      <UnreadBadge count={unread} />
                      <span className="sr-only">{unreadText}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`${baseId}-tabpanel-assistant`}
            aria-labelledby={`${baseId}-tab-assistant`}
            hidden={tab !== 'assistant'}
            className="flex min-h-0 flex-1 flex-col"
          >
            <Suspense fallback={<AssistantLoading label={t('supportBubble.assistant.botName')} />}>
              <SupportAssistant
                role={role}
                locale={locale}
                live={live}
                owner={userId ?? ''}
                name={name}
                getPersonal={getPersonal}
                externalAsk={externalAsk}
                onLastQuestion={setLastQuestion}
                onNavigate={closeForNavigation}
                kb={kb}
                suggestions={suggestions}
                guestAudience={
                  pathname.startsWith('/for-employers') ? 'employer' : pathname.startsWith('/for-workers') ? 'worker' : null
                }
              />
            </Suspense>
          </div>
          {userId && (
            <div
              role="tabpanel"
              id={`${baseId}-tabpanel-inbox`}
              aria-labelledby={`${baseId}-tab-inbox`}
              hidden={tab !== 'inbox'}
              tabIndex={0}
              className="support-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400"
            >
              <SupportInbox userId={userId} active={tab === 'inbox'} onNavigate={closeForNavigation} />
            </div>
          )}
          <div
            role="tabpanel"
            id={`${baseId}-tabpanel-contact`}
            aria-labelledby={`${baseId}-tab-contact`}
            hidden={tab !== 'contact'}
            tabIndex={0}
            className="support-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400"
          >
            <SupportContacts question={lastQuestion} />
          </div>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onPointerEnter={preloadAssistant}
        onPointerDown={preloadAssistant}
        onFocus={preloadAssistant}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) close();
        }}
        aria-label={buttonLabel}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={[
          'motion-press fixed z-[60] inline-flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-gray-900 shadow-modal',
          'right-[calc(env(safe-area-inset-right)+1rem)] bottom-[calc(env(safe-area-inset-bottom)+1rem)]',
          'hover:bg-orange-400 active:bg-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2',
          // Điện thoại: khung đang mở phủ gần toàn màn hình (đã có nút đóng riêng).
          open ? 'max-sm:hidden' : '',
          hint.pulse && !open ? 'support-pulse' : '',
        ].join(' ')}
      >
        {open ? <CloseIcon /> : <SupportGlyph className="h-7 w-7" />}
        <UnreadBadge count={unread} className="absolute -right-0.5 -top-0.5 ring-2 ring-white" />
      </button>
      {hint.tip && !open && (
        <p
          aria-hidden="true"
          className="support-tip-in pointer-events-none fixed right-[calc(env(safe-area-inset-right)+5.25rem)] bottom-[calc(env(safe-area-inset-bottom)+1.75rem)] z-[60] hidden rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-modal sm:block"
        >
          {t('supportBubble.tip')}
        </p>
      )}
    </>
  );
}
