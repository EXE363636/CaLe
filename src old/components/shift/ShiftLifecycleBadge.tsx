'use client';

/**
 * CORE-STABILITY-10 — the ONE lifecycle badge used on every surface.
 *
 * Computes the canonical lifecycle state via `getShiftLifecycleState`
 * and renders it with the canonical label + tone from
 * `getShiftStatusBadge`. Because every page renders this same component
 * with the same `(shift, applications, nowIso)`, the same shift always
 * shows the same label AND the same colour — worker dashboard, worker
 * detail, worker job list, employer dashboard, employer detail,
 * employer calendar, public list, notification deeplink, admin.
 *
 * This replaces both the raw `ShiftStatusBadge(shift.status)` (which
 * lagged the clock and used purple for InProgress) and the ad-hoc
 * `ShiftPhaseChip` (which used different labels + green).
 */

import { Badge } from '@/components/ui';
import { t } from '@/i18n/vi';
import {
  getShiftLifecycleState,
  getShiftStatusBadge,
} from '@/domain/shiftLifecycleState';
import type { Application, Shift } from '@/types';

interface ShiftLifecycleBadgeProps {
  shift: Shift;
  /**
   * The application list. Pass the full list (the helper filters by
   * `shiftId`), or just this shift's applications. Defaults to empty —
   * the time-based transitions don't need applications, only the
   * post-end "did anyone work?" distinction does.
   */
  applications?: Application[];
  /**
   * ISO "now". Defaults to the current wall clock. Tests / time-travel
   * harnesses pass an explicit value so the badge is deterministic.
   */
  nowIso?: string;
  className?: string;
}

export function ShiftLifecycleBadge({
  shift,
  applications = [],
  nowIso,
  className,
}: ShiftLifecycleBadgeProps) {
  const now = nowIso ?? new Date().toISOString();
  const state = getShiftLifecycleState(shift, applications, now);
  const info = getShiftStatusBadge(state);
  return (
    <Badge tone={info.tone} className={className}>
      {t(info.labelKey)}
    </Badge>
  );
}
