'use client';

import { useId, useState } from 'react';
import { Select, Input, Button, DateFieldVN } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import type { FilterCriteria } from '@/domain/filter';
import { t } from '@/i18n/vi';

interface ShiftFiltersProps {
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  jobTypeOptions?: SelectOption[];
  locationOptions?: SelectOption[];
  className?: string;
}

/**
 * Bộ lọc phụ của trang tìm ca. Ô tìm kiếm chữ do `ShiftSearchBar` đảm nhận
 * (không lặp lại ở đây). Trên điện thoại các ô lọc gập sau nút "Bộ lọc" để
 * danh sách ca — việc chính của người lao động — không bị đẩy khỏi màn hình
 * đầu; từ `md` trở lên luôn mở. Mỗi ô có nhãn hiển thị (không chỉ placeholder).
 */
export function ShiftFilters({
  criteria,
  onChange,
  jobTypeOptions,
  locationOptions,
  className = '',
}: ShiftFiltersProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  function update(patch: Partial<FilterCriteria>) {
    onChange({ ...criteria, ...patch });
  }

  function clearAll() {
    onChange({ ...(criteria.text ? { text: criteria.text } : {}) });
  }

  const activeCount = (
    ['location', 'dateFrom', 'dateTo', 'wageMin', 'wageMax', 'jobType'] as const
  ).filter((k) => criteria[k] != null && criteria[k] !== '').length;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg px-1 text-sm font-semibold text-gray-800 transition hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 md:hidden"
      >
        <span className="inline-flex items-center gap-2">
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M6 12h12M10 19h4" />
          </svg>
          {t('shifts.filters.toggle')}
          {activeCount > 0 && (
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-orange-100 px-1.5 text-xs font-semibold text-orange-800 tabular-nums">
              <span className="sr-only">{t('shifts.filters.activePrefix')} </span>
              {activeCount}
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        id={panelId}
        className={`${open ? 'grid' : 'hidden'} mt-3 grid-cols-2 gap-3 md:mt-0 md:grid md:grid-cols-2 lg:grid-cols-4`}
      >
        {/* Location: select if options provided, otherwise free-text */}
        <div className="col-span-2 md:col-span-1">
          {locationOptions && locationOptions.length > 0 ? (
            <Select
              label={t('form.filterLocation')}
              options={[{ value: '', label: t('shifts.filters.any') }, ...locationOptions]}
              value={criteria.location ?? ''}
              onChange={(e) => update({ location: e.target.value || undefined })}
            />
          ) : (
            <Input
              label={t('form.filterLocation')}
              type="text"
              value={criteria.location ?? ''}
              onChange={(e) => update({ location: e.target.value || undefined })}
              placeholder={t('shifts.filters.locationPlaceholder')}
            />
          )}
        </div>

        {/* Job type */}
        <div className="col-span-2 md:col-span-1">
          {jobTypeOptions && jobTypeOptions.length > 0 ? (
            <Select
              label={t('form.filterJobType')}
              options={[{ value: '', label: t('shifts.filters.any') }, ...jobTypeOptions]}
              value={criteria.jobType ?? ''}
              onChange={(e) => update({ jobType: e.target.value || undefined })}
            />
          ) : (
            <Input
              label={t('form.filterJobType')}
              type="text"
              value={criteria.jobType ?? ''}
              onChange={(e) => update({ jobType: e.target.value || undefined })}
            />
          )}
        </div>

        <DateFieldVN
          label={t('form.filterDateFrom')}
          value={criteria.dateFrom ?? ''}
          onChange={(v) => update({ dateFrom: v || undefined })}
        />

        <DateFieldVN
          label={t('form.filterDateTo')}
          value={criteria.dateTo ?? ''}
          onChange={(v) => update({ dateTo: v || undefined })}
        />

        <Input
          label={t('form.filterWageMin')}
          type="number"
          inputMode="numeric"
          value={criteria.wageMin ?? ''}
          onChange={(e) =>
            update({ wageMin: e.target.value ? Number(e.target.value) : undefined })
          }
          placeholder={t('shifts.filters.wagePlaceholder')}
          min={0}
        />

        <Input
          label={t('form.filterWageMax')}
          type="number"
          inputMode="numeric"
          value={criteria.wageMax ?? ''}
          onChange={(e) =>
            update({ wageMax: e.target.value ? Number(e.target.value) : undefined })
          }
          placeholder={t('shifts.filters.wagePlaceholder')}
          min={0}
        />

        {activeCount > 0 && (
          <div className="col-span-2 flex items-end md:col-span-2 lg:col-span-2">
            <Button variant="ghost" size="sm" type="button" onClick={clearAll}>
              {t('btn.clearFilter')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
