import Link from 'next/link';
import { Card, Badge, type BadgeTone } from '@/components/ui';
import { ShiftLifecycleBadge } from './ShiftLifecycleBadge';
import { EscrowStatusBadge } from './EscrowStatusBadge';
import { formatVND, formatDateVN, formatRelativeDayVN, formatTimeVN } from '@/lib/format';
import { hoursBetween } from '@/domain/deposit';
import { t } from '@/i18n/vi';
import type { Application, ApplicationStatus, Shift } from '@/types';

/**
 * QA-Stabilization-Automation — tone for the worker's PERSONAL
 * application-status badge. When the current worker has an active
 * application on a listed shift, this badge replaces the public
 * "Đang tuyển" recruiting status as the card's single primary label
 * so the worker is never shown a misleading recruiting status for a
 * shift they already engaged with (Checklist K / old bug class 4).
 */
const applicationToneMap: Record<ApplicationStatus, BadgeTone> = {
  Pending: 'info',
  Approved: 'success',
  // DESIGN.md reserves purple; CheckedIn (worker present/working) maps to
  // the info/blue family, consistent with the worker dashboard.
  CheckedIn: 'info',
  CheckedOut: 'warning',
  Confirmed: 'success',
  Disputed: 'danger',
  Rejected: 'danger',
  Expired: 'neutral',
  CancelledByWorker: 'neutral',
  CancelledByEmployer: 'neutral',
  NoShow: 'danger',
  CancellationRequested: 'warning',
};

interface ShiftCardProps {
  shift: Shift;
  employerName?: string;
  /**
   * Điều hướng tới chi tiết ca. Ưu tiên `href`: cả thẻ thành một liên kết
   * thật (mở tab mới, xem trước URL, trình đọc màn hình đọc là "liên kết").
   * `onClick` giữ cho tương thích ngược.
   */
  href?: string;
  onClick?: () => void;
  showEscrow?: boolean;
  className?: string;
  /**
   * Phase 10C-Stab-1 Batch 3 I — when set, the card renders an
   * already-applied badge in place of the regular apply CTA. The
   * worker shifts listing builds a `Map<shiftId, ApplicationStatus>`
   * keyed off the current user's applications and passes the
   * matching status here.
   */
  workerApplicationStatus?: ApplicationStatus;
  /**
   * CORE-STABILITY-9 Part 5 — optional availability-match label
   * ("Rất phù hợp" / "Phù hợp" / "Cần cân nhắc") shown as a small
   * pill when the listing is sorted by "Phù hợp lịch rảnh". The
   * `fitsAvailability` flag adds a "Khớp lịch rảnh" chip.
   */
  matchLabel?: string;
  fitsAvailability?: boolean;
  /** True if the shift conflicts with a busy block or another job. */
  isConflict?: boolean;
  /**
   * CORE-STABILITY-10 — applications + now for the unified lifecycle
   * badge. When the worker has NOT applied (no `workerApplicationStatus`),
   * the card shows the canonical lifecycle badge computed from these.
   */
  applications?: Application[];
  nowIso?: string;
}

function LocationIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 text-gray-400 shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.218-4.402 3.218-7.327a7.5 7.5 0 10-15 0c0 2.925 1.274 5.248 3.218 7.327a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.144.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 text-gray-400 shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      // Phase 9Y-Fix-4 — defensive against extension-injected
      // attributes (Dark Reader, Grammarly) on heavily-reused inline
      // SVGs. ShiftCard renders one CalendarIcon per shift row, so
      // suppressing here avoids fan-out warnings on long lists.
      suppressHydrationWarning
    >
      <path
        fillRule="evenodd"
        d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 text-gray-400 shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ShiftCard({
  shift,
  employerName,
  href,
  onClick,
  showEscrow = false,
  className = '',
  workerApplicationStatus,
  matchLabel,
  fitsAvailability = false,
  isConflict = false,
  applications = [],
  nowIso,
}: ShiftCardProps) {
  // "Rõ tiền": tổng tiền công cả ca (lương/giờ × số giờ) là con số chính;
  // hoursBetween trả 0 với ca qua đêm / giờ sai → khi đó chỉ hiện lương/giờ.
  const hours = hoursBetween(shift.startTime, shift.endTime);
  const perShift = hours > 0 ? Math.round(shift.hourlyWage * hours) : null;
  const hoursLabel = t('shiftCard.hours').replace(
    '{n}',
    new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(hours),
  );
  const slotsLeft = Math.max(0, shift.positionsTotal - shift.positionsFilled);
  const legacyButton = !href && !!onClick;

  const card = (
    <Card
      clickable={!!onClick || !!href}
      onClick={legacyButton ? onClick : undefined}
      // Legacy onClick path: keyboard-operable div. Prefer `href`.
      role={legacyButton ? 'button' : undefined}
      tabIndex={legacyButton ? 0 : undefined}
      aria-label={
        legacyButton
          ? `${shift.title} — ${formatVND(shift.hourlyWage)}${t('common.perHour')}, ${formatDateVN(shift.date)}`
          : undefined
      }
      onKeyDown={
        legacyButton && onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={[
        'flex h-full flex-col',
        legacyButton
          ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Row 1: title + employer (trust signal right under the title) +
          the single primary status badge (personal application status if
          the worker applied, otherwise the canonical lifecycle badge). */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words font-semibold leading-snug text-gray-900">{shift.title}</h3>
          {employerName && (
            <p className="mt-0.5 truncate text-sm text-gray-600">{employerName}</p>
          )}
        </div>
        <div className="shrink-0">
          {workerApplicationStatus ? (
            <Badge tone={applicationToneMap[workerApplicationStatus]}>
              {t(`apply.applied.${workerApplicationStatus}`)}
            </Badge>
          ) : (
            <ShiftLifecycleBadge
              shift={shift}
              applications={applications}
              nowIso={nowIso}
            />
          )}
        </div>
      </div>

      {/* Availability-match pills — only in the "Phù hợp lịch rảnh" sort. */}
      {(matchLabel || isConflict || fitsAvailability) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* Hidden when the worker already holds this shift: the matcher
              excludes approved shifts, which "conflict" with themselves. */}
          {isConflict && !['Approved', 'CheckedIn', 'CheckedOut'].includes(workerApplicationStatus || '') && (
            <Badge tone="danger">{t('shiftCard.conflict')}</Badge>
          )}
          {!isConflict && matchLabel && (
            <Badge tone={matchLabel === t('availability.match.veryGood') ? 'success' : matchLabel === t('availability.match.good') ? 'info' : 'warning'}>
              {matchLabel}
            </Badge>
          )}
          {!isConflict && fitsAvailability && (
            <Badge tone="success">{t('availability.fitsAvailability')}</Badge>
          )}
        </div>
      )}

      {/* Money — the decision number. Total for the whole shift leads;
          the hourly rate × hours sits under it for verification. */}
      <div className="mt-3">
        {perShift !== null ? (
          <>
            <p className="tabular-nums">
              <span className="text-lg font-bold text-gray-900">{formatVND(perShift)}</span>{' '}
              <span className="text-sm text-gray-600">{t('shiftCard.perShift')}</span>
            </p>
            <p className="text-sm tabular-nums text-gray-600">
              {formatVND(shift.hourlyWage)}
              {t('common.perHour')} · {hoursLabel}
            </p>
          </>
        ) : (
          <p className="text-lg font-bold tabular-nums text-gray-900">
            {formatVND(shift.hourlyWage)}
            <span className="text-sm font-normal text-gray-600">{t('common.perHour')}</span>
          </p>
        )}
      </div>

      {/* When + where. Relative day ("Hôm nay", "Ngày mai", "T6, 26/09")
          so a worker on a phone doesn't have to decode full dates. */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <CalendarIcon />
          <span className="font-medium text-gray-900">{formatRelativeDayVN(shift.date)}</span>
        </span>
        <span className="flex items-center gap-1 tabular-nums">
          <ClockIcon />
          {formatTimeVN(shift.startTime)}–{formatTimeVN(shift.endTime)}
        </span>
        <span className="flex min-w-0 items-center gap-1">
          <LocationIcon />
          <span className="break-words">{shift.location}</span>
        </span>
      </div>
      {/* Full shifts are filtered out at listing level; this is the count. */}
      <p className="mt-1 text-sm tabular-nums text-gray-600">
        {t('shiftCard.slotsLeft')
          .replace('{left}', String(slotsLeft))
          .replace('{total}', String(shift.positionsTotal))}
      </p>

      {showEscrow && (
        <div className="mt-2">
          <EscrowStatusBadge status={shift.escrowStatus} />
        </div>
      )}

      {/* Visual cue only (the whole card is the link/button) — plain text,
          not a button-shaped box that invites a second, dead click. */}
      <p className="mt-auto flex justify-end pt-3 text-sm font-medium text-orange-700">
        {workerApplicationStatus ? t('btn.viewApplication') : t('btn.viewDetail')}
        <span aria-hidden="true">&nbsp;→</span>
      </p>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
      >
        {card}
      </Link>
    );
  }
  return card;
}
