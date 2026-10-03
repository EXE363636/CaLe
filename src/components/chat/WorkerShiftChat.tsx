'use client';

/**
 * Mục "Nhắn với nhà tuyển dụng" trên `/shifts/[id]` (0035) — chỉ hiện khi người
 * lao động đang xem có đơn ở ca này mà `chatAccess !== 'none'` (đã được duyệt;
 * đóng thành chỉ đọc theo luật trong `domain/chat.ts`). Khung chat nằm ngay
 * trong trang, mở bằng nút hoặc deeplink `?chat=1` (thông báo tin nhắn).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ChatButton } from '@/components/chat/ChatButton';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { chatAccess } from '@/domain/chat';
import { useT } from '@/i18n/LocaleProvider';
import { useApplicationStore } from '@/stores/applicationStore';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { asEmployer, useUserStore } from '@/stores/userStore';
import type { Shift } from '@/types';

export function WorkerShiftChat({ shift }: { shift: Shift }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chatParam = searchParams.get('chat');

  const currentUserId = useAuthStore((s) => s.currentUserId);
  const currentUser = useUserStore((s) => (currentUserId ? s.findById(currentUserId) : undefined));
  const employer = useUserStore((s) => asEmployer(s.findById(shift.employerId)));
  const applications = useApplicationStore((s) => s.applications);
  const threads = useChatStore((s) => s.threads);
  const loadThreads = useChatStore((s) => s.loadThreads);

  const [open, setOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const isWorker = currentUser?.role === 'worker';

  // Đơn của chính người xem ở ca này có cuộc trò chuyện (ưu tiên đang mở).
  const chat = useMemo(() => {
    if (!isWorker || !currentUserId) return null;
    const now = new Date().toISOString();
    const candidates = applications
      .filter((a) => a.shiftId === shift.id && a.workerId === currentUserId)
      .map((app) => ({ app, access: chatAccess(app, shift, now) }))
      .filter((c) => c.access !== 'none');
    return candidates.find((c) => c.access === 'open') ?? candidates[0] ?? null;
  }, [applications, shift, currentUserId, isWorker]);

  const applicationId = chat?.app.id;

  useEffect(() => {
    if (applicationId && currentUserId) void loadThreads(currentUserId).catch(() => undefined);
  }, [applicationId, currentUserId, loadThreads]);

  // Deeplink `?chat=1` → mở khung chat, cuộn tới, rồi bỏ tham số khỏi URL.
  useEffect(() => {
    if (!chatParam || !applicationId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mở khung chat theo deeplink thông báo (URL là nguồn sự kiện)
    setOpen(true);
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() =>
      sectionRef.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }),
    );
    router.replace(pathname, { scroll: false });
  }, [chatParam, applicationId, router, pathname]);

  if (!chat || !currentUserId) return null;

  const unread = threads.find((th) => th.applicationId === chat.app.id)?.unread ?? 0;
  const panelId = `shift-chat-panel-${chat.app.id}`;
  const access = chat.access === 'open' ? 'open' : 'readonly';

  return (
    <section
      ref={sectionRef}
      id="shift-chat"
      aria-labelledby="shift-chat-title"
      className="mt-6 scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-4 shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="shift-chat-title" className="text-base font-semibold text-gray-900">
          {t('chat.worker.title')}
        </h2>
        <ChatButton
          label={open ? t('btn.close') : t(access === 'open' ? 'chat.worker.open' : 'chat.worker.view')}
          unread={open ? 0 : unread}
          expanded={open}
          controls={panelId}
          variant={open ? 'ghost' : 'secondary'}
          onClick={() => setOpen((v) => !v)}
        />
      </div>
      {open && (
        <div id={panelId} className="mt-4">
          <ChatPanel
            applicationId={chat.app.id}
            userId={currentUserId}
            viewerRole="worker"
            access={access}
            otherName={employer?.companyName}
            autoFocus
          />
        </div>
      )}
    </section>
  );
}
