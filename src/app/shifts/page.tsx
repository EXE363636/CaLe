'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore } from '@/stores/userStore';
import { ShiftCard } from '@/components/shift/ShiftCard';
import { ShiftFilters } from '@/components/shift/ShiftFilters';
import { ShiftSearchBar } from '@/components/shift/ShiftSearchBar';
import { EmptyState } from '@/components/ui';
import { useLifecycleSync } from '@/lib/useLifecycleSync';
import { t } from '@/i18n/vi';
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

  const [criteria, setCriteria] = useState<FilterCriteria>({});
  const [searchText, setSearchText] = useState('');

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
    // Actionable invariant: only Published + Deposited + future + positions available
    return shifts.filter((s) => {
      if (s.status !== 'Published') return false;
      if (s.escrowStatus !== 'Deposited') return false;
      if (s.positionsFilled >= s.positionsTotal) return false;
      const startMs = new Date(`${s.date}T${s.startTime}:00`).getTime();
      if (startMs < Date.now()) return false;
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
  }, [shifts, criteria, searchText]);

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
              onClick={() => router.push(`/shifts/${shift.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
