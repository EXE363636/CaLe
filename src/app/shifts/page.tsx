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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('shifts.listing.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {filtered.length} ca làm phù hợp
        </p>
      </div>

      {/* Search bar */}
      <ShiftSearchBar
        value={searchText}
        onSearch={setSearchText}
        className="mb-4"
      />

      {/* Filters */}
      <ShiftFilters
        criteria={criteria}
        onChange={setCriteria}
        jobTypeOptions={JOB_TYPE_OPTIONS}
        className="mb-6"
      />

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
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
