import { Card, Badge, type BadgeTone } from '@/components/ui';
import { ShiftLifecycleBadge } from './ShiftLifecycleBadge';
import { EscrowStatusBadge } from './EscrowStatusBadge';
import { formatVND, formatDateVN, formatTimeVN } from '@/lib/format';
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
  return (
    <Card
      clickable={!!onClick}
      onClick={onClick}
      // A11y — a clickable card must be keyboard-operable. Card renders a
      // plain <div>, so when it acts as a navigation target we give it a
      // button role, make it focusable, add Enter/Space activation, and a
      // visible focus ring. Only applied when an onClick is provided.
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={
        onClick
          ? `${shift.title} — ${formatVND(shift.hourlyWage)}${t('common.perHour')}, ${formatDateVN(shift.date)}`
          : undefined
      }
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={[
        'flex flex-col h-full',
        onClick
          ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Row 1: title + status.
          When the current worker has an active application on this
          shift, show their PERSONAL application status as the single
          primary badge (not the public "Đang tuyển" recruiting
          status) — Checklist K / old bug class 4. */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 leading-snug">{shift.title}</h3>
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

      {/* CORE-STABILITY-9 Part 5 — availability-match pills. Only
          rendered when the listing is sorted by "Phù hợp lịch rảnh". */}
      {(matchLabel || isConflict || fitsAvailability) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* Conflict Badge: only shown in availability sort when excluded.
              We hide it if the worker already has this shift approved/active,
              because the algorithm excludes approved shifts (they conflict with themselves). */}
          {isConflict && !['Approved', 'CheckedIn', 'CheckedOut'].includes(workerApplicationStatus || '') && (
            <Badge tone="danger">Trùng lịch bận</Badge>
          )}

          {/* Availability Match Pill */}
          {!isConflict && matchLabel && (
            <Badge tone={matchLabel === t('availability.match.veryGood') ? 'success' : matchLabel === t('availability.match.good') ? 'info' : 'warning'}>
              {matchLabel}
            </Badge>
          )}
          {!isConflict && fitsAvailability && (
            <Badge tone="success">
              {t('availability.fitsAvailability')}
            </Badge>
          )}
        </div>
      )}

      {/* Row 2: location, date, time */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <LocationIcon />
          {shift.location}
        </span>
        <span className="flex items-center gap-1">
          <CalendarIcon />
          {formatDateVN(shift.date)}
        </span>
        <span className="flex items-center gap-1">
          <ClockIcon />
          {formatTimeVN(shift.startTime)}–{formatTimeVN(shift.endTime)}
        </span>
      </div>

      {/* Row 3: wage + positions
          Phase 10A-Fix-6 — slot label reads "Còn X/Y vị trí" so users
          don't confuse "{filled}/{total} người" with "the job is full".
          Full shifts are filtered out at the listing level
          (`isShiftAvailableForRecruiting` from
          `@/domain/shiftAvailability`); the card itself just renders
          the available count derived from the shift's own
          `positionsFilled` + `positionsTotal`. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-medium text-orange-700">
          {formatVND(shift.hourlyWage)}{t('common.perHour')}
        </span>
        <span className="text-gray-500">
          Còn {Math.max(0, shift.positionsTotal - shift.positionsFilled)}/
          {shift.positionsTotal} vị trí
        </span>
      </div>

      {/* Optional: employer name */}
      {employerName && (
        <p className="mt-1.5 text-xs text-gray-500">{employerName}</p>
      )}

      {/* Optional: escrow badge */}
      {showEscrow && (
        <div className="mt-2">
          <EscrowStatusBadge status={shift.escrowStatus} />
        </div>
      )}

      {/* Phase 10C-Stab-1 Batch 3 I — already-applied affordance.
          Replaces the standard apply CTA with a localized status
          chip + a "Xem chi tiết" affordance. The card itself remains
          clickable to /shifts/{id}; this just gives the worker an
          at-a-glance status pin. */}
      {workerApplicationStatus ? (
        // The status is already the single primary badge in row 1, so this
        // footer is just a "view your application" affordance and no longer
        // repeats the status text.
        <div className="mt-auto pt-3 flex items-center justify-end">
          <div className="flex items-center gap-1 rounded-lg border border-orange-100 bg-orange-50/60 px-3 py-2 text-xs font-medium text-orange-700 w-full sm:w-auto justify-center transition-colors hover:bg-orange-100">
            {t('btn.viewApplication')}
          </div>
        </div>
      ) : (
        <div className="mt-auto pt-3 flex items-center justify-end">
          <div className="flex items-center gap-1 rounded-lg border border-orange-100 bg-orange-50/60 px-3 py-2 text-xs font-medium text-orange-700 w-full sm:w-auto justify-center transition-colors hover:bg-orange-100">
            {t('btn.viewDetail')} →
          </div>
        </div>
      )}
    </Card>
  );
}
