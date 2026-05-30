'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useAuthStore } from '@/stores/authStore';
import { isShiftAvailableForRecruiting } from '@/domain/shiftAvailability';
import { compareShiftsForWorker } from '@/domain/shiftSorting';
import { suggestShiftsForWorker, type ShiftMatch } from '@/domain/availabilityMatch';
import { ShiftCard } from '@/components/shift/ShiftCard';
import { ShiftFilters } from '@/components/shift/ShiftFilters';
import { ShiftSearchBar } from '@/components/shift/ShiftSearchBar';
import { EmptyState, PageShell } from '@/components/ui';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { t } from '@/i18n/vi';
import type { ApplicationStatus, Shift, Worker } from '@/types';
import type { FilterCriteria } from '@/domain/filter';

const JOB_TYPE_OPTIONS = [
  'Phục vụ', 'Pha chế', 'Kho vận', 'Hỗ trợ sự kiện',
  'Phát tờ rơi', 'Bảo vệ', 'Thu ngân', 'Khác',
].map((v) => ({ value: v, label: v }));

export default function ShiftsPage() {
  useLifecycleSync();
  const router = useRouter();
  const shifts = useShiftStore((s) => s.shifts);
  const users = useUserStore((s) => s.users);
  const applications = useApplicationStore((s) => s.applications);
  const scheduleBlocks = useScheduleStore((s) => s.blocks);
  const currentUserId = useAuthStore((s) => s.currentUserId);

  const [criteria, setCriteria] = useState<FilterCriteria>({});
  const [searchText, setSearchText] = useState('');
  // CORE-STABILITY-9 Part 5 — sort mode. 'default' keeps the existing
  // preferred-location-then-soonest sort; 'availability' ranks by the
  // worker's free-schedule + skill fit via `suggestShiftsForWorker`.
  const [sortMode, setSortMode] = useState<'default' | 'availability'>(
    'default',
  );

  // Phase 10C-Stab-1 Batch 3 I — index the current worker's
  // applications by shiftId so the card can show an already-applied
  // chip instead of the standard apply CTA. Returns an empty map
  // when no user is signed in.
  const myAppByShift = useMemo(() => {
    const map = new Map<string, ApplicationStatus>();
    if (!currentUserId) return map;
    // Pick the most recent application per shift (sort desc by
    // appliedAt, write last-wins).
    const sorted = [...applications]
      .filter((a) => a.workerId === currentUserId)
      .sort((a, b) => a.appliedAt.localeCompare(b.appliedAt));
    for (const a of sorted) {
      map.set(a.shiftId, a.status);
    }
    return map;
  }, [applications, currentUserId]);

  // Employer name lookup
  const employerMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of users) {
      if (u.role === 'employer') map[u.id] = u.companyName;
    }
    return map;
  }, [users]);

  // Apply filters + search + publication invariant
  const filtered = useMemo(() => {
    const merged: FilterCriteria = { ...criteria, text: searchText || criteria.text };
    const nowMs = Date.now();
    // Phase 10A-Fix-5: canonical recruiting predicate. Reconciles
    // `positionsFilled` against the live application store so a
    // stale field can't let a 3/3 shift leak through.
    const matched = shifts.filter((s) => {
      if (!isShiftAvailableForRecruiting(s, applications, nowMs)) return false;
      if (merged.text) {
        const q = merged.text.toLowerCase();
        if (
          !s.title.toLowerCase().includes(q) &&
          !s.location.toLowerCase().includes(q) &&
          !s.description.toLowerCase().includes(q)
        ) return false;
      }
      if (merged.location && !s.location.toLowerCase().includes(merged.location.toLowerCase())) return false;
      if (merged.dateFrom && s.date < merged.dateFrom) return false;
      if (merged.dateTo && s.date > merged.dateTo) return false;
      if (merged.wageMin != null && s.hourlyWage < merged.wageMin) return false;
      if (merged.wageMax != null && s.hourlyWage > merged.wageMax) return false;
      if (merged.jobType && s.jobType !== merged.jobType) return false;
      return true;
    });
    // Phase 10C-Stab-1 Batch 4 G — sort by preferred-location match
    // first, then soonest start. Sort runs over the already-filtered
    // result so the existing publication / criteria gates run first.
    const currentWorker = currentUserId
      ? users.find(
          (u) => u.id === currentUserId && u.role === 'worker',
        ) ?? null
      : null;
    const workerForSort = currentWorker
      ? {
          preferredLocations:
            currentWorker.role === 'worker'
              ? currentWorker.preferredLocations
              : [],
        }
      : null;
    return [...matched].sort((a, b) =>
      compareShiftsForWorker(a, b, workerForSort),
    );
  }, [shifts, applications, criteria, searchText, currentUserId, users]);

  // CORE-STABILITY-9 Part 5 — availability match map keyed by shift id.
  // Computed only for the signed-in worker; drives the optional
  // "Phù hợp lịch rảnh" sort and the per-card match pills.
  const matchByShift = useMemo(() => {
    const map = new Map<string, ShiftMatch>();
    const worker =
      currentUserId &&
      (users.find(
        (u) => u.id === currentUserId && u.role === 'worker',
      ) as Worker | undefined);
    if (!worker) return map;
    const myBlocks = scheduleBlocks.filter((b) => b.userId === worker.id);
    const approvedApps = applications.filter(
      (a) =>
        a.workerId === worker.id &&
        (a.status === 'Approved' ||
          a.status === 'CheckedIn' ||
          a.status === 'CheckedOut'),
    );
    const shiftIndex = new Map<string, Shift>(shifts.map((s) => [s.id, s]));
    const ranked = suggestShiftsForWorker(
      filtered,
      worker,
      myBlocks,
      approvedApps,
      shiftIndex,
    );
    for (const m of ranked) map.set(m.shift.id, m);
    return map;
  }, [filtered, currentUserId, users, scheduleBlocks, applications, shifts]);

  // Final ordered list. In availability mode we surface matched shifts
  // (those not excluded by a busy/approved conflict) ranked by score;
  // excluded shifts fall to the bottom in their default order so the
  // worker can still browse everything.
  const displayShifts = useMemo(() => {
    if (sortMode !== 'availability' || matchByShift.size === 0) {
      return filtered;
    }
    const ranked = [...matchByShift.values()].map((m) => m.shift);
    const rankedIds = new Set(ranked.map((s) => s.id));
    const rest = filtered.filter((s) => !rankedIds.has(s.id));
    return [...ranked, ...rest];
  }, [sortMode, matchByShift, filtered]);

  return (
    <PageShell width="7xl">
      {/* Phase 9C: gradient hero header so the listing page reads as a
          designed surface, not a bare title above filters.
          UI-REFRESH Batch 2 — layered `shadow-card` for design-system
          consistency with the worker dashboard/profile headers. */}
      <header className="mb-6 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
              {t('shifts.listing.eyebrow')}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('shifts.listing.title')}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              {t('shifts.listing.subtitle')}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            {displayShifts.length} {t('shifts.listing.matchSuffix')}
          </span>
        </div>
      </header>

      {/* Search + filters wrapped in a single card so they read as a
          unified control surface. */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-card backdrop-blur-sm">
        <ShiftSearchBar
          value={searchText}
          onSearch={setSearchText}
          className="mb-3"
        />
        <ShiftFilters
          criteria={criteria}
          onChange={setCriteria}
          jobTypeOptions={JOB_TYPE_OPTIONS}
        />
        {/* CORE-STABILITY-9 Part 5 — availability sort toggle. Only
            useful for a signed-in worker, so hidden otherwise. */}
        {currentUserId && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            <span className="text-xs font-medium text-gray-500">
              {t('availability.filter.label')}:
            </span>
            <button
              type="button"
              onClick={() => setSortMode('default')}
              aria-pressed={sortMode === 'default'}
              className={[
                'rounded-full px-3 py-1 text-xs font-semibold transition',
                sortMode === 'default'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {t('availability.filter.default')}
            </button>
            <button
              type="button"
              onClick={() => setSortMode('availability')}
              aria-pressed={sortMode === 'availability'}
              className={[
                'rounded-full px-3 py-1 text-xs font-semibold transition',
                sortMode === 'availability'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {t('availability.filter.byAvailability')}
            </button>
            {sortMode === 'availability' && (
              <span className="text-xs text-emerald-700">
                {t('availability.suggest.subtitle')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {displayShifts.length === 0 ? (
        <EmptyState
          tone="warm"
          title={t('shifts.listing.empty')}
          description={t('shifts.listing.emptyHint')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayShifts.map((shift) => {
            const match =
              sortMode === 'availability'
                ? matchByShift.get(shift.id)
                : undefined;
            return (
              <ShiftCard
                key={shift.id}
                shift={shift}
                employerName={employerMap[shift.employerId]}
                workerApplicationStatus={myAppByShift.get(shift.id)}
                applications={applications}
                matchLabel={match?.label}
                fitsAvailability={match?.fitsAvailability ?? false}
                onClick={() => router.push(`/shifts/${shift.id}`)}
              />
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
