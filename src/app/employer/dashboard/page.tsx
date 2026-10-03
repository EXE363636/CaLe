'use client';

import { useMemo, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore, asEmployer, getWorkerReputation } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useWalletStore } from '@/stores/walletStore';
import {
  getWorkerVerificationSummary,
  useVerificationStore,
} from '@/stores';
import { deriveEmployerPaidOut, deriveHeldEscrow } from '@/domain/finance';
import { Badge, Button, EmptyState, HelpPopover, Modal, PageHelpButton, ButtonLink, PageShell } from '@/components/ui';
import { ShiftLifecycleBadge } from '@/components/shift/ShiftLifecycleBadge';
import { isActiveDashboardShift, getShiftLifecycleState } from '@/domain/shiftLifecycleState';
import { startsIn } from '@/domain/shiftJourney';
import { showSuccess } from '@/lib/toast';
import { ShiftCard } from '@/components/shift/ShiftCard';
import { WalletPanel } from '@/components/wallet/WalletPanel';
import { NoPaymentNotice } from '@/components/wallet/NoPaymentNotice';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { hasCapability } from '@/data/capabilities';
import {
  DASH_CARD,
  DashboardEmpty,
  DashboardHeader,
  DashboardNote,
  DashboardSection,
  DashboardTiles,
  DASH_TILE,
} from '@/components/dashboard/DashboardFrame';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';
import { useReviewBackendStore } from '@/lib/reviewSync';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { useModalFromQuery } from '@/lib/useModalFromQuery';
import { useDashboardModalEvents } from '@/lib/notificationAction';
import { formatVND, formatDateVN, formatTimeVN } from '@/lib/format';
import { useT, useTx } from '@/i18n/LocaleProvider';
import { tCurrent } from '@/i18n/locale';
import type { Application, Shift } from '@/types';

export default function EmployerDashboardPage() {
  return (
    <RoleGuard role="employer">
      <EmployerDashboardContent />
    </RoleGuard>
  );
}

function EmployerDashboardContent() {
  const t = useT();
  const tx = useTx();
  useLifecycleSync();
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useUserStore((s) => s.users);
  const shifts = useShiftStore((s) => s.shifts);
  const applications = useApplicationStore((s) => s.applications);
  // Cluster 3 · BUG 5 (Req 2.5): subscribe to the append-only wallet ledger so
  // the employer's paid-out tile stays reactive and is derived from the single
  // money source (see `totalPaidOut` below).
  const ledger = useWalletStore((s) => s.ledger);
  const refundForShiftAsync = useWalletStore((s) => s.refundForShiftAsync);
  // 03/10 — thẻ "Đánh giá về bạn" (đánh giá người lao động gửi sau ca).
  const allFeedback = useEmployerFeedbackStore((s) => s.feedback);
  const reviewBackend = useReviewBackendStore((s) => s.available);
  // Phase 10A-Fix-4 — read the live verification doc slice so the
  // pending-applications detail modal always shows current admin
  // approval state, not a frozen snapshot from when the application
  // was submitted.
  const workerDocuments = useVerificationStore((s) => s.workerDocuments);

  const employer = asEmployer(users.find((u) => u.id === currentUserId));

  // Hoàn cọc cho ca HUỶ / HẾT HẠN KHÔNG CÓ NGƯỜI LÀM. Server tự kiểm
  // điều kiện + idempotent; ref chống gọi lặp cùng một ca trong phiên. Chỉ quét
  // ca của employer đang ở lifecycle Cancelled/Expired (không ai Confirmed).
  const refundedShiftsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!currentUserId) return;
    const nowIso = new Date().toISOString();
    const refundable = shifts.filter(
      (sh) =>
        sh.employerId === currentUserId &&
        !refundedShiftsRef.current.has(sh.id) &&
        (() => {
          const st = getShiftLifecycleState(sh, applications, nowIso);
          return st === 'Cancelled' || st === 'Expired';
        })(),
    );
    if (refundable.length === 0) return;
    void (async () => {
      for (const sh of refundable) {
        refundedShiftsRef.current.add(sh.id);
        const refunded = await refundForShiftAsync(sh.id, currentUserId);
        if (refunded) {
          // Hiệu ứng phụ (hoàn cọc) — dùng tCurrent để đổi ngôn ngữ không chạy lại effect.
          showSuccess(
            tCurrent('employer.dashboard.refund.title'),
            tCurrent('employer.dashboard.refund.desc').replace('{title}', sh.title),
          );
        }
      }
    })();
  }, [shifts, applications, currentUserId, refundForShiftAsync]);

  // Phase 9H — stat-tile detail modals. Replaces the previous
  // `scrollToId(...)` shortcuts with proper modal lists so every tile
  // surfaces useful data even when the relevant section isn't on the
  // dashboard (e.g. completed shifts live on the schedule, not here).
  type StatDetail =
    | 'posted'
    | 'active'
    | 'pending'
    | 'completed'
    | 'payments'
    | 'deposits'
    | null;
  const [statDetail, setStatDetail] = useState<StatDetail>(null);

  // CORE-STABILITY-7 Part 1 — wallet-history deeplink signal (see
  // worker dashboard). Opens the WalletPanel ledger modal on a
  // `?modal=wallet` deeplink or same-route notification event (deposit
  // held, refund, wage release, top-up, withdraw).
  const [walletLedgerSignal, setWalletLedgerSignal] = useState(0);
  const openWalletHistory = useCallback(() => {
    setWalletLedgerSignal((n) => n + 1);
  }, []);

  // Phase 9L — open a stat-detail modal when arriving with a `?modal=...`
  // query param (notification deep links).
  useModalFromQuery(
    ['posted', 'active', 'pending', 'completed', 'payments', 'deposits', 'wallet'] as const,
    (m) => {
      if (m === 'wallet') {
        openWalletHistory();
        return;
      }
      setStatDetail(
        m as 'posted' | 'active' | 'pending' | 'completed' | 'payments' | 'deposits',
      );
    },
  );

  // Phase 9N — same-page modal handoff (see worker dashboard for rationale).
  useDashboardModalEvents('/employer/dashboard', (detail) => {
    const allowed = [
      'posted',
      'active',
      'pending',
      'completed',
      'payments',
      'deposits',
    ] as const;
    if (
      detail.modal &&
      (allowed as readonly string[]).includes(detail.modal)
    ) {
      setStatDetail(detail.modal as (typeof allowed)[number]);
    }
    // CORE-STABILITY-7 Part 1 — same-route wallet-history intent.
    if (detail.modal === 'wallet') {
      openWalletHistory();
    }
  });

  const myShifts = useMemo(
    () =>
      employer
        ? shifts.filter(
            // CORE-STABILITY-8 Part 1 — Draft shifts are not real
            // shifts; exclude them from every employer dashboard
            // list / stat / calendar surface.
            (s) => s.employerId === employer.id && s.status !== 'Draft',
          )
        : [],
    [shifts, employer],
  );

  // Cluster 3 · BUG 5 (Req 2.5): source the employer money tiles from the single
  // derived money module instead of two independent reductions.
  // - "Tổng đã đảm bảo" (totalDeposited) keeps its CUMULATIVE-deposit meaning —
  //   Σ depositAmount over the employer's non-Draft shifts — via `sumDepositBasis`.
  //   That equals the previous `myShifts.reduce(...)` exactly, so the number is
  //   UNCHANGED; only its source is unified.
  // - "Tổng đã chi trả" (totalPaidOut) becomes the wages actually RELEASED from
  //   the wallet ledger for this employer's shifts (`deriveEmployerPaidOut`),
  //   rather than Σ completed `shift.depositAmount`. This legitimately CHANGES
  //   the figure for any completed shift with unfilled positions (or a partial
  //   release): the deposit basis counted positions no wage was released for,
  //   while the released-wage basis reconciles with what workers received.
  const totalDeposited = employer ? deriveHeldEscrow(shifts, employer.id) : 0;
  const completedShifts = myShifts.filter((s) => s.status === 'Completed');
  const totalPaidOut = employer
    ? deriveEmployerPaidOut(ledger, employer.id, { shifts, applications })
    : 0;
  // Group by the SAME clock the badge uses. The stored `status` gates
  // candidacy (never surface Draft / terminal DB states), but in supabase
  // mode there is no lifecycle sync, so a shift can linger at `Published`
  // past its end time. `isActiveDashboardShift` drops such overdue shifts
  // so the "Ca đang hoạt động" group agrees with the `ShiftLifecycleBadge`
  // instead of showing an "Đã hết hạn" card under an active heading.
  const nowIso = new Date().toISOString();
  const activeShifts = myShifts.filter(
    (s) =>
      ['Published', 'FullyBooked', 'InProgress', 'AwaitingConfirmation'].includes(
        s.status,
      ) && isActiveDashboardShift(s, applications, nowIso),
  );

  const pendingApps = useMemo(() => {
    if (!employer) return [];
    const shiftIds = new Set(myShifts.map((s) => s.id));
    return applications.filter((a) => shiftIds.has(a.shiftId) && a.status === 'Pending');
  }, [applications, myShifts, employer]);

  // Hồ sơ chưa tải xong (supabase cold load) → trạng thái đang tải thay vì trang trắng.
  if (!employer) {
    return (
      <div
        className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-gray-500"
        role="status"
        aria-live="polite"
      >
        {t('common.loading')}
      </div>
    );
  }
  // 03/10 — dashboard làm lại cùng khung với dashboard người lao động
  // (components/dashboard/DashboardFrame): đầu trang + dòng trạng thái, thẻ 3 ô số kết quả,
  // cột chính "Ca làm sắp tới" + "Đơn chờ duyệt" (gom theo ca), cột phụ Ví / Thông báo /
  // Đánh giá về bạn. Ô "Ca đang hoạt động" / "Đơn chờ duyệt" cũ thành số đếm ở tiêu đề khối;
  // các hộp chi tiết (?modal=active|pending|deposits…) vẫn mở được từ thông báo / menu.
  // 2 ô tiền chỉ có ở local (ở supabase tiền nằm trong Ví).
  const showMoneyTiles = hasCapability('wallet') && !isSupabaseEnv();
  // Ca chưa tới giờ bắt đầu — cùng cách đọc giờ ca như mọi nơi (`startsIn`, giờ địa phương).
  const nextActive = [...activeShifts]
    .filter((s) => startsIn(s, nowIso) !== null)
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))[0];
  // Đơn chờ duyệt là việc cần làm ngay → ưu tiên hơn giờ ca tiếp theo.
  const statusLine =
    pendingApps.length > 0
      ? tx('{n} đơn đang chờ bạn duyệt.').replace('{n}', String(pendingApps.length))
      : nextActive
        ? tx('Ca tiếp theo bắt đầu {date} lúc {time}.')
            .replace('{date}', formatDateVN(nextActive.date))
            .replace('{time}', formatTimeVN(nextActive.startTime))
        : activeShifts.length > 0
        ? t('employer.dashboard.welcome.active').replace('{count}', String(activeShifts.length))
        : t('employer.dashboard.welcome.idle');
  const stats = [
    {
      key: 'posted',
      label: t('employer.dashboard.stats.postedShifts'),
      value: String(myShifts.length),
      onClick: () => setStatDetail('posted'),
    },
    {
      key: 'completed',
      label: t('employer.dashboard.stats.completedShifts'),
      value: String(completedShifts.length),
      onClick: () => setStatDetail('completed'),
    },
    ...(showMoneyTiles
      ? [
          {
            key: 'paid',
            label: t('employer.dashboard.stats.totalPaidOut'),
            value: formatVND(totalPaidOut),
            onClick: () => setStatDetail('payments'),
          },
        ]
      : []),
  ];
  // Đơn chờ duyệt gom theo ca: mỗi ca một dòng, tên người ứng tuyển + nút duyệt.
  const pendingByShift = (() => {
    const map = new Map<string, Application[]>();
    for (const a of pendingApps) map.set(a.shiftId, [...(map.get(a.shiftId) ?? []), a]);
    return [...map.entries()]
      .map(([shiftId, apps]) => ({ shift: shifts.find((s) => s.id === shiftId), apps }))
      .sort((x, y) => `${x.shift?.date ?? ''}T${x.shift?.startTime ?? ''}`.localeCompare(`${y.shift?.date ?? ''}T${y.shift?.startTime ?? ''}`));
  })();
  const workerName = (id: string) => {
    const w = users.find((u) => u.id === id);
    return w?.role === 'worker' ? w.fullName : t('employer.dashboard.workerFallback');
  };
  // Đánh giá người lao động gửi cho bạn (bản thật: chỉ khi server có bảng đánh giá).
  const receivedFeedback = allFeedback.filter((f) => f.toEmployerId === employer.id);
  const showReviewsCard = hasCapability('reviews') && (!isSupabaseEnv() || reviewBackend === 'yes');
  const latestFeedback = [...receivedFeedback].sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 2);
  const avgStars = receivedFeedback.length
    ? receivedFeedback.reduce((sum, f) => sum + f.stars, 0) / receivedFeedback.length
    : null;

  return (
    <PageShell width="wide" className="flex flex-col">
      <DashboardHeader
        title={employer.companyName}
        status={statusLine}
        actions={
          <>
            <PageHelpButton
              title={t('help.employerDashboard.title')}
              intro={t('help.employerDashboard.intro')}
              sections={[
                {
                  heading: t('help.employerDashboard.section.purpose.heading'),
                  items: [t('help.employerDashboard.section.purpose.item1')],
                },
                {
                  heading: t('help.employerDashboard.section.numbers.heading'),
                  items: [
                    t('help.employerDashboard.section.numbers.item1'),
                    t('help.employerDashboard.section.numbers.item2'),
                    t('help.employerDashboard.section.numbers.item3'),
                    t('help.employerDashboard.section.numbers.item4'),
                  ],
                },
                {
                  heading: t('help.employerDashboard.section.actions.heading'),
                  items: [
                    t('help.employerDashboard.section.actions.item1'),
                    t('help.employerDashboard.section.actions.item2'),
                    t('help.employerDashboard.section.actions.item3'),
                    t('help.employerDashboard.section.actions.item4'),
                  ],
                },
                {
                  heading: t('help.employerDashboard.section.mistakes.heading'),
                  items: [
                    t('help.employerDashboard.section.mistakes.item1'),
                    t('help.employerDashboard.section.mistakes.item2'),
                    t('help.employerDashboard.section.mistakes.item3'),
                  ],
                },
              ]}
              cta={{ label: t('help.viewFullGuide'), href: '/user-guide' }}
            />
            {/* Không lặp nút cam "Đăng ca": thanh điều hướng đã có (một nút cam mỗi màn). */}
            <Link
              href="/employer/schedule"
              className="motion-press inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition-colors hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {t('employerSchedule.page.title')}
            </Link>
          </>
        }
      />

      <DashboardTiles
        label={tx('Tóm tắt của bạn')}
        items={stats}
        viewDetail={t('btn.viewDetail')}
        extra={
          currentUserId && hasCapability('wallet') ? (
            // Ví (server): employer nạp tiền + giữ tiền ca từ số dư.
            <div id="wallet" className="h-full scroll-mt-24">
              <WalletPanel
                variant="tile"
                className={DASH_TILE}
                userId={currentUserId}
                role="employer"
                openLedgerSignal={walletLedgerSignal}
              />
            </div>
          ) : undefined
        }
      />
      {!hasCapability('wallet') && (
        <div className="-mt-6 mb-10">
          <NoPaymentNotice />
        </div>
      )}

      {/* Các khối trải hết bề ngang, một cột — không cột phụ lệch chiều cao. */}
      <div className="flex flex-col gap-10">
            <DashboardSection
              id="employer-active-shifts"
              title={t('employer.dashboard.upcomingShifts')}
              count={activeShifts.length}
              link={activeShifts.length > 0 ? { href: '/employer/schedule', label: t('employer.dashboard.viewSchedule') } : undefined}
            >
              {activeShifts.length === 0 ? (
                <DashboardEmpty
                  title={t(myShifts.length === 0 ? 'employer.dashboard.noShifts' : 'employer.dashboard.noUpcoming')}
                  body={t(
                    myShifts.length === 0
                      ? 'employer.dashboard.empty.upcoming.descriptionRich'
                      : 'employer.dashboard.noUpcoming.description',
                  )}
                  action={{ href: '/employer/shifts/new', label: t('btn.postShift') }}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeShifts.map((shift) => (
                    // No-show được đánh dấu thật ở trang chi tiết ca (employer/shifts/[id]).
                    <Link
                      key={shift.id}
                      href={`/employer/shifts/${shift.id}`}
                      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                    >
                      <ShiftCard shift={shift} applications={applications} showEscrow={showMoneyTiles} />
                    </Link>
                  ))}
                </div>
              )}
            </DashboardSection>

            <DashboardSection id="employer-pending-apps" title={tx('Đơn chờ duyệt')} count={pendingApps.length}>
              {pendingByShift.length === 0 ? (
                <DashboardNote>{tx('Chưa có đơn nào chờ duyệt. Đơn mới sẽ hiện ở đây.')}</DashboardNote>
              ) : (
                <ul className={['divide-y divide-gray-100 overflow-hidden', DASH_CARD].join(' ')}>
                  {pendingByShift.map(({ shift, apps }) => (
                    <li key={apps[0].shiftId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">{shift?.title ?? ''}</p>
                        {shift && (
                          <p className="mt-0.5 text-sm text-gray-500 tabular-nums">
                            {formatDateVN(shift.date)} · {formatTimeVN(shift.startTime)}–{formatTimeVN(shift.endTime)}
                          </p>
                        )}
                        <p className="mt-1 truncate text-sm text-gray-700">
                          <span className="font-semibold tabular-nums">{tx('{n} người:').replace('{n}', String(apps.length))}</span>{' '}
                          {apps.map((a) => workerName(a.workerId)).join(', ')}
                        </p>
                      </div>
                      {/* Hành động thật (đi tới trang duyệt) → nút. */}
                      <ButtonLink href={`/employer/shifts/${apps[0].shiftId}`} size="sm" variant="secondary" className="shrink-0">
                        {t('employer.dashboard.reviewApplicant')}
                      </ButtonLink>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardSection>
            {/* Đánh giá về bạn — từ người lao động sau ca (cùng vị trí với "Kỹ năng & giữ uy tín"
                ở dashboard người lao động). */}
            {showReviewsCard && (
              <DashboardSection
                id="employer-received-reviews"
                title={tx('Đánh giá về bạn')}
                count={receivedFeedback.length}
                link={{ href: '/employer/profile', label: t('btn.viewDetail') }}
              >
                <div className={['grid gap-6 p-5 sm:p-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-center', DASH_CARD].join(' ')}>
                  <div>
                    {avgStars === null ? (
                      <p className="text-sm text-gray-600">
                        {tx('Chưa có đánh giá. Sau mỗi ca, người lao động chấm sao cho bạn trong 14 ngày.')}
                      </p>
                    ) : (
                      <p className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-gray-900 tabular-nums">
                          {avgStars.toLocaleString('vi-VN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
                        </span>
                        <span aria-hidden="true" className="text-xl text-amber-500">★</span>
                        <span className="text-sm text-gray-600">
                          {tx('trung bình từ {n} đánh giá').replace('{n}', String(receivedFeedback.length))}
                        </span>
                      </p>
                    )}
                    <Link
                      href="/for-employers#employer-reviews"
                      className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-orange-700 hover:underline"
                    >
                      {tx('Cách đánh giá sau ca')} →
                    </Link>
                  </div>
                  {latestFeedback.length > 0 && (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {latestFeedback.map((f) => (
                        <li key={f.id} className="rounded-2xl bg-orange-50 px-4 py-3">
                          <p role="img" className="text-sm font-semibold text-amber-600" aria-label={tx('{n} sao').replace('{n}', String(f.stars))}>
                            {'★'.repeat(f.stars)}
                            <span className="text-gray-300">{'★'.repeat(5 - f.stars)}</span>
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-gray-700">{f.comment || tx('Không có nhận xét.')}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </DashboardSection>
            )}
      </div>

      {/* Phase 9H — payments summary modal. Lists the actual shifts
          contributing to the deposit and payout totals so employers
          aren't staring at two opaque sums. */}
      <Modal
        open={(statDetail === 'payments' || statDetail === 'deposits') && hasCapability('wallet') && !isSupabaseEnv()}
        onClose={() => setStatDetail(null)}
        title={t('employer.payments.title')}
        titleAccessory={
          <HelpPopover
            title={t('employer.payments.title')}
            description={t('hint.employer.totalDeposited')}
            learnMoreHref="/user-guide#employer-total-deposit"
          />
        }
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <p>{t('employer.payments.intro')}</p>
          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-orange-50 p-4 text-xs">
            <div>
              <dt className="inline-flex items-center gap-1 text-orange-700">
                <span>{t('employer.dashboard.stats.totalDeposited')}</span>
                {/* Phase 9Z-Fix-5: per-amount popover so the user can
                    deep-link to the specific guide section for the
                    deposit half of this shared modal. */}
                <HelpPopover
                  title={t('employer.dashboard.stats.totalDeposited')}
                  description={t('hint.employer.totalDeposited')}
                  learnMoreHref="/user-guide#employer-total-deposit"
                />
              </dt>
              <dd className="mt-1 text-base font-bold text-gray-900">
                {formatVND(totalDeposited)}
              </dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1 text-orange-700">
                <span>{t('employer.dashboard.stats.totalPaidOut')}</span>
                {/* Phase 9Z-Fix-5: paid-out half — separate deep link. */}
                <HelpPopover
                  title={t('employer.dashboard.stats.totalPaidOut')}
                  description={t('hint.employer.totalPaidOut')}
                  learnMoreHref="/user-guide#employer-total-paid"
                />
              </dt>
              <dd className="mt-1 text-base font-bold text-orange-700">
                {formatVND(totalPaidOut)}
              </dd>
            </div>
            <div>
              <dt className="text-orange-700">
                {t('employer.dashboard.stats.activeShifts')}
              </dt>
              <dd className="mt-1 text-base font-bold text-gray-900">
                {activeShifts.length}
              </dd>
            </div>
            <div>
              <dt className="text-orange-700">
                {t('employer.dashboard.stats.completedShifts')}
              </dt>
              <dd className="mt-1 text-base font-bold text-green-600">
                {completedShifts.length}
              </dd>
            </div>
          </dl>

          {statDetail === 'deposits' ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-600">
                {tx('CA ĐANG CHỜ THANH TOÁN')}
              </p>
              {activeShifts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-center text-xs text-gray-500">
                  {tx('Không có ca nào đang giữ tiền chờ thanh toán.')}
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {[...activeShifts]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 10)
                    .map((shift) => (
                      <li
                        key={shift.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {shift.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {formatDateVN(shift.date)} •{' '}
                            {formatTimeVN(shift.startTime)}–
                            {formatTimeVN(shift.endTime)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-orange-700">
                          {formatVND(shift.depositAmount)}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-600">
                {t('employer.payments.recentTitle')}
              </p>
              {completedShifts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-center text-xs text-gray-500">
                  {t('employer.payments.empty')}
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {[...completedShifts]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 10)
                    .map((shift) => {
                      // Calculate actual payout for the shift from confirmed applications
                      const payout = applications
                        .filter((a) => a.shiftId === shift.id && a.status === 'Confirmed')
                        .reduce((sum, a) => sum + (a.payoutAmount ?? 0), 0);
                      
                      return (
                        <li
                          key={shift.id}
                          className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {shift.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {formatDateVN(shift.date)} •{' '}
                              {formatTimeVN(shift.startTime)}–
                              {formatTimeVN(shift.endTime)}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-orange-700">
                            {formatVND(payout)}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          )}

          {/* Phase 10A-Fix-8: employer cancellation penalty ledger.
              When the employer has cancelled a shift after at least
              one worker was approved, the deposit penalty (5/10/15%)
              is stored on the shift record. We list them here so the
              employer has a permanent ledger surface, not just a
              one-time toast. */}
          <EmployerPenaltyLedger employerShifts={myShifts} />

          <p className="text-xs text-gray-500">
            {t('employer.payments.disclaimer')}
          </p>
          <div className="mt-1 flex justify-end">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setStatDetail(null)}
            >
              {t('help.btn.close')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Phase 9H — posted-shifts modal */}
      <ShiftListModal
        open={statDetail === 'posted'}
        onClose={() => setStatDetail(null)}
        title={t('employer.detail.posted.title')}
        titleAccessory={
          <HelpPopover
            title={t('employer.detail.posted.title')}
            description={t('hint.employer.postedShifts')}
            learnMoreHref="/user-guide#employer-posted-shifts"
          />
        }
        intro={t('employer.detail.posted.intro')}
        emptyText={t('employer.detail.posted.empty')}
        shifts={[...myShifts].sort((a, b) =>
          `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`),
        )}
        applications={applications}
      />

      {/* Phase 9H — active-shifts modal */}
      <ShiftListModal
        open={statDetail === 'active'}
        onClose={() => setStatDetail(null)}
        title={t('employer.detail.active.title')}
        titleAccessory={
          <HelpPopover
            title={t('employer.detail.active.title')}
            description={t('hint.employer.activeShifts')}
            learnMoreHref="/user-guide#employer-active-shifts"
          />
        }
        intro={t('employer.detail.active.intro')}
        emptyText={t('employer.detail.active.empty')}
        shifts={[...activeShifts].sort((a, b) =>
          `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
        )}
        applications={applications}
      />

      {/* Phase 9H — completed-shifts modal */}
      <ShiftListModal
        open={statDetail === 'completed'}
        onClose={() => setStatDetail(null)}
        title={t('employer.detail.completed.title')}
        titleAccessory={
          <HelpPopover
            title={t('employer.detail.completed.title')}
            description={t('hint.employer.completedShifts')}
            learnMoreHref="/user-guide#employer-completed-shifts"
          />
        }
        intro={t('employer.detail.completed.intro')}
        emptyText={t('employer.detail.completed.empty')}
        shifts={[...completedShifts].sort((a, b) =>
          `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`),
        )}
        applications={applications}
      />

      {/* Phase 9H — pending-applicants modal */}
      <Modal
        open={statDetail === 'pending'}
        onClose={() => setStatDetail(null)}
        title={t('employer.detail.pending.title')}
        titleAccessory={
          <HelpPopover
            title={t('employer.detail.pending.title')}
            description={t('hint.employer.pendingApps')}
            learnMoreHref="/user-guide#employer-pending-applications"
          />
        }
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <p>{t('employer.detail.pending.intro')}</p>
          {pendingApps.length === 0 ? (
            <EmptyState
              tone="warm"
              title={t('employer.dashboard.empty.pending.title')}
              description={t('employer.dashboard.empty.pending.description')}
              action={
                <Link
                  href="/employer/shifts/new"
                  onClick={() => setStatDetail(null)}
                >
                  <Button size="sm" variant="primary">
                    {t('employer.dashboard.empty.pending.cta')}
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {pendingApps.map((a) => {
                const shift = shifts.find((s) => s.id === a.shiftId);
                const w = users.find((u) => u.id === a.workerId);
                const worker = w?.role === 'worker' ? w : null;
                const wName = worker?.fullName ?? t('employer.dashboard.workerFallback');
                // Cluster 2 · BUG 3 (Req 2.3): read the applicant's reputation
                // through the single shared source so this badge matches the
                // worker's own dashboard / trust chip. Same clamped value.
                const repScore = worker ? getWorkerReputation(worker.id) : 0;
                return (
                  <li
                    key={a.id}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {wName}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {shift?.title ?? ''}
                          {shift && (
                            <>
                              {' • '}
                              {formatDateVN(shift.date)}
                            </>
                          )}
                        </p>
                        {worker && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className={[
                                'rounded-full px-2 py-0.5 text-xs font-semibold',
                                repScore >= 80
                                  ? 'bg-green-50 text-green-700'
                                  : repScore >= 50
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-red-50 text-red-700',
                              ].join(' ')}
                            >
                              {t('employer.detail.pending.repBadge').replace(
                                '{score}',
                                String(repScore),
                              )}
                            </span>
                            {/* Phase 10A-Fix-4 — verification chips
                                derive from the LIVE verification store
                                so admin-side approvals reflect on the
                                next render. The legacy
                                `worker.verifications` array is no
                                longer the source of truth here. */}
                            <LiveVerificationChips
                              worker={worker}
                              workerDocuments={workerDocuments}
                            />
                            <span className="text-xs text-gray-500">
                              {t('employer.detail.pending.completedShifts').replace(
                                '{count}',
                                String(worker.completedShiftCount),
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/employer/shifts/${a.shiftId}`}
                        onClick={() => setStatDetail(null)}
                      >
                        <Badge tone="warning">{t('btn.viewDetail')}</Badge>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-1 flex justify-end">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setStatDetail(null)}
            >
              {t('help.btn.close')}
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Phase 9H — shared shift-list modal used by posted / active / completed
// employer stat tiles. Each row links to the manage page so the employer
// can take action without losing the dashboard context.
// ---------------------------------------------------------------------------

function ShiftListModal({
  open,
  onClose,
  title,
  titleAccessory,
  intro,
  emptyText,
  shifts,
  applications = [],
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleAccessory?: ReactNode;
  intro: string;
  emptyText: string;
  shifts: Shift[];
  applications?: Application[];
}) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={title} titleAccessory={titleAccessory}>
      <div className="flex flex-col gap-3 text-sm text-gray-700">
        <p>{intro}</p>
        {shifts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-xs text-gray-500">
            {emptyText}
          </div>
        ) : (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {shifts.slice(0, 12).map((shift) => (
              <li
                key={shift.id}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {shift.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {formatDateVN(shift.date)} •{' '}
                      {formatTimeVN(shift.startTime)}–
                      {formatTimeVN(shift.endTime)}
                    </p>
                    {shift.location && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {shift.location}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <ShiftLifecycleBadge shift={shift} applications={applications} />
                    <span className="text-xs font-semibold text-orange-700">
                      {['Expired', 'Cancelled'].includes(shift.status)
                        ? '0 đ'
                        : shift.status === 'Completed'
                          ? formatVND(
                              applications
                                .filter((a) => a.shiftId === shift.id && a.status === 'Confirmed')
                                .reduce((sum, a) => sum + (a.payoutAmount ?? 0), 0)
                            )
                          : formatVND(shift.depositAmount)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">
                    {shift.positionsFilled}/{shift.positionsTotal}{' '}
                    {t('employer.detail.positionsLabel')}
                  </span>
                  <Link
                    href={`/employer/shifts/${shift.id}`}
                    onClick={onClose}
                    className="text-xs font-medium text-orange-700 hover:underline"
                  >
                    {t('btn.viewDetail')} →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        {shifts.length > 12 && (
          <p className="text-xs text-gray-500">
            {t('employer.detail.truncated').replace(
              '{count}',
              String(shifts.length - 12),
            )}
          </p>
        )}
        <div className="mt-1 flex justify-end">
          <Button size="sm" variant="primary" onClick={onClose}>
            {t('help.btn.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


// ---------------------------------------------------------------------------
// Phase 10A-Fix-4 — live verification chips
// ---------------------------------------------------------------------------

import type { Worker, WorkerVerificationDocument } from '@/types';

function LiveVerificationChips({
  worker,
  workerDocuments,
}: {
  worker: Worker;
  workerDocuments: WorkerVerificationDocument[];
}) {
  const t = useT();
  const tx = useTx();
  const summary = useMemo(
    () => getWorkerVerificationSummary(worker, workerDocuments),
    [worker, workerDocuments],
  );
  return (
    <>
      {worker.verifications.includes('phone') && (
        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
          {t('verification.phone')}
        </span>
      )}
      {/* Phase 10A-Fix-5 — one chip per approved method, not just the
          most-recent primary, so an employer scanning the queue sees
          every identity proof the worker has cleared. */}
      {summary.approvedMethods.map((m) => (
        <span
          key={m.type}
          className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
        >
          {tx('Đã xác minh')} · {m.label}
        </span>
      ))}
      {summary.pendingCount > 0 && (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          {summary.pendingCount} {tx('đang chờ duyệt')}
        </span>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Phase 10A-Fix-8 — employer cancellation penalty ledger
// ---------------------------------------------------------------------------

function EmployerPenaltyLedger({
  employerShifts,
}: {
  employerShifts: Shift[];
}) {
  const tx = useTx();
  const penaltyEntries = useMemo(() => {
    return employerShifts
      .filter(
        (s) =>
          s.cancelledBy === 'employer' &&
          s.employerCancelledAfterApproval === true &&
          (s.employerCancellationPenaltyAmount ?? 0) > 0,
      )
      .sort((a, b) =>
        (b.cancelledAt ?? '').localeCompare(a.cancelledAt ?? ''),
      );
  }, [employerShifts]);

  if (penaltyEntries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-red-700">
        {tx('Phí hủy ca sau khi đã duyệt người')}
      </p>
      <ul className="flex flex-col gap-2">
        {penaltyEntries.slice(0, 5).map((shift) => (
          <li
            key={shift.id}
            className="rounded-lg border border-red-200 bg-red-50/60 px-3 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-red-900">
                  {shift.title}
                </p>
                <p className="mt-0.5 text-xs text-red-800/80">
                  {shift.cancelledAt &&
                    formatDateVN(shift.cancelledAt.slice(0, 10))}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold text-red-700">
                  {Math.round(
                    (shift.employerCancellationPenaltyRate ?? 0) * 100,
                  )}
                  {tx('% tiền cọc')}
                </p>
                <p className="text-sm font-bold text-red-800">
                  -{formatVND(shift.employerCancellationPenaltyAmount ?? 0)}
                </p>
              </div>
            </div>
            {shift.employerCancellationReason && (
              <p className="mt-1.5 text-xs text-red-800/90">
                {tx('Lý do: {reason}').replace('{reason}', shift.employerCancellationReason)}
              </p>
            )}
            <p className="mt-0.5 text-xs italic text-red-700/70">
              {tx('Phí hủy do ca đã có người lao động được duyệt.')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
