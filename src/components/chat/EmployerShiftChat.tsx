'use client';

/**
 * Chat phía nhà tuyển dụng trên `/employer/shifts/[id]` (0035):
 *   - `EmployerChatAction`: nút "Nhắn tin" (+ số chưa đọc) trên dòng của từng
 *     người lao động có `chatAccess !== 'none'`;
 *   - `EmployerChatDialog`: hộp thoại chứa `ChatPanel` của đơn đang chọn, nạp
 *     danh sách cuộc trò chuyện khi vào trang và mở theo deeplink
 *     `?chat=<applicationId>` (thông báo tin nhắn).
 */

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ChatButton } from '@/components/chat/ChatButton';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { Modal } from '@/components/ui';
import { chatAccess } from '@/domain/chat';
import { useT } from '@/i18n/LocaleProvider';
import { useApplicationStore } from '@/stores/applicationStore';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { asWorker, useUserStore } from '@/stores/userStore';
import type { Application, Shift } from '@/types';

export function EmployerChatAction({
  app,
  shift,
  workerName,
  nowIso,
  onOpen,
}: {
  app: Application;
  shift: Shift;
  workerName: string;
  nowIso: string;
  onOpen: () => void;
}) {
  const t = useT();
  const unread = useChatStore((s) => s.threads.find((th) => th.applicationId === app.id)?.unread ?? 0);
  if (chatAccess(app, shift, nowIso) === 'none') return null;
  return (
    <ChatButton
      label={t('chat.employer.open')}
      ariaLabel={t('chat.employer.openWith').replace('{name}', () => workerName)}
      unread={unread}
      onClick={onOpen}
    />
  );
}

export function EmployerChatDialog({
  shift,
  applicationId,
  onOpen,
  onClose,
}: {
  shift: Shift;
  /** Đơn đang mở chat, null = đóng. */
  applicationId: string | null;
  onOpen: (applicationId: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chatParam = searchParams.get('chat');

  const currentUserId = useAuthStore((s) => s.currentUserId);
  const loadThreads = useChatStore((s) => s.loadThreads);
  const applications = useApplicationStore((s) => s.applications);
  const app = applicationId ? applications.find((a) => a.id === applicationId) : undefined;
  const worker = useUserStore((s) => (app ? asWorker(s.findById(app.workerId)) : undefined));

  const isOwner = !!currentUserId && currentUserId === shift.employerId;

  useEffect(() => {
    if (isOwner && currentUserId) void loadThreads(currentUserId).catch(() => undefined);
  }, [isOwner, currentUserId, loadThreads, shift.id]);

  // Deeplink `?chat=<applicationId>` → mở đúng cuộc trò chuyện (chỉ đơn của ca này).
  const linkedApp = chatParam
    ? applications.find((a) => a.id === chatParam && a.shiftId === shift.id)
    : undefined;
  useEffect(() => {
    if (!chatParam) return;
    if (linkedApp) onOpen(linkedApp.id);
    else if (applications.length === 0) return; // chưa nạp xong đơn — đợi
    router.replace(pathname, { scroll: false });
  }, [chatParam, linkedApp, applications.length, onOpen, router, pathname]);

  if (!isOwner || !currentUserId || !app || app.shiftId !== shift.id) return null;
  const access = chatAccess(app, shift, new Date().toISOString());
  if (access === 'none') return null;
  const name = worker?.fullName ?? t('chat.sender.worker');

  return (
    <Modal
      open
      onClose={onClose}
      title={t('chat.employer.title').replace('{name}', () => name)}
      className="sm:max-w-2xl"
    >
      <ChatPanel
        applicationId={app.id}
        userId={currentUserId}
        viewerRole="employer"
        access={access}
        otherName={worker?.fullName}
        autoFocus
      />
    </Modal>
  );
}
