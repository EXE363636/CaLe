'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useAuthStore } from '@/stores/authStore';
import { isShiftAvailableForRecruiting } from '@/domain/shiftAvailability';
import { compareShiftsForWorker } from '@/domain/shiftSorting';
import { ShiftCard } from '@/components/shift/ShiftCard';
import { ShiftFilters } from '@/components/shift/ShiftFilters';
import { ShiftSearchBar } from '@/components/shift/ShiftSearchBar';
import { EmptyState } from '@/components/ui';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { t } from '@/i18n/vi';
import type { ApplicationStatus } from '@/types';
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
  const currentUserId = useAuthStore((s) => s.currentUserId);

  const [criteria, setCriteria] = useState<FilterCriteria>({});
  const [searchText, setSearchText] = useState('');

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Phase 9C: gradient hero header so the listing page reads as a
          designed surface, not a bare title above filters. */}
      <header className="mb-6 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-6 shadow-sm">
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
            {filtered.length} {t('shifts.listing.matchSuffix')}
          </span>
        </div>
      </header>

      {/* Search + filters wrapped in a single card so they read as a
          unified control surface. */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
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
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          tone="warm"
          title={t('shifts.listing.empty')}
          description={t('shifts.listing.emptyHint')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              employerName={employerMap[shift.employerId]}
              workerApplicationStatus={myAppByShift.get(shift.id)}
              onClick={() => router.push(`/shifts/${shift.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
