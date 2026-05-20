'use client';

import { Select, Input, Button } from '@/components/ui';
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

export function ShiftFilters({
  criteria,
  onChange,
  jobTypeOptions,
  locationOptions,
  className = '',
}: ShiftFiltersProps) {
  function update(patch: Partial<FilterCriteria>) {
    onChange({ ...criteria, ...patch });
  }

  function clearAll() {
    onChange({});
  }

  return (
    <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {/* Text search */}
      <Input
        type="search"
        value={criteria.text ?? ''}
        onChange={(e) => update({ text: e.target.value || undefined })}
        placeholder={t('form.searchPlaceholder')}
        aria-label={t('form.searchPlaceholder')}
      />

      {/* Location: select if options provided, otherwise free-text */}
      {locationOptions && locationOptions.length > 0 ? (
        <Select
          options={[{ value: '', label: t('form.filterLocation') }, ...locationOptions]}
          value={criteria.location ?? ''}
          onChange={(e) => update({ location: e.target.value || undefined })}
          aria-label={t('form.filterLocation')}
        />
      ) : (
        <Input
          type="text"
          value={criteria.location ?? ''}
          onChange={(e) => update({ location: e.target.value || undefined })}
          placeholder={t('form.filterLocation')}
          aria-label={t('form.filterLocation')}
        />
      )}

      {/* Date from */}
      <Input
        type="date"
        value={criteria.dateFrom ?? ''}
        onChange={(e) => update({ dateFrom: e.target.value || undefined })}
        aria-label={t('form.filterDateFrom')}
        placeholder={t('form.filterDateFrom')}
      />

      {/* Date to */}
      <Input
        type="date"
        value={criteria.dateTo ?? ''}
        onChange={(e) => update({ dateTo: e.target.value || undefined })}
        aria-label={t('form.filterDateTo')}
        placeholder={t('form.filterDateTo')}
      />

      {/* Wage min */}
      <Input
        type="number"
        value={criteria.wageMin ?? ''}
        onChange={(e) =>
          update({ wageMin: e.target.value ? Number(e.target.value) : undefined })
        }
        placeholder={t('form.filterWageMin')}
        aria-label={t('form.filterWageMin')}
        min={0}
      />

      {/* Wage max */}
      <Input
        type="number"
        value={criteria.wageMax ?? ''}
        onChange={(e) =>
          update({ wageMax: e.target.value ? Number(e.target.value) : undefined })
        }
        placeholder={t('form.filterWageMax')}
        aria-label={t('form.filterWageMax')}
        min={0}
      />

      {/* Job type */}
      {jobTypeOptions && jobTypeOptions.length > 0 ? (
        <Select
          options={[{ value: '', label: t('form.filterJobType') }, ...jobTypeOptions]}
          value={criteria.jobType ?? ''}
          onChange={(e) => update({ jobType: e.target.value || undefined })}
          aria-label={t('form.filterJobType')}
        />
      ) : (
        <Input
          type="text"
          value={criteria.jobType ?? ''}
          onChange={(e) => update({ jobType: e.target.value || undefined })}
          placeholder={t('form.filterJobType')}
          aria-label={t('form.filterJobType')}
        />
      )}

      {/* Clear filters */}
      <div className="flex items-end">
        <Button variant="ghost" size="sm" type="button" onClick={clearAll}>
          {t('btn.clearFilter')}
        </Button>
      </div>
    </div>
  );
}
