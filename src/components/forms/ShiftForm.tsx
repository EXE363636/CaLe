'use client';

import { useState } from 'react';
import { Input, Select, Textarea, Button, DateFieldVN, TimeFieldVN } from '@/components/ui';
import { t } from '@/i18n/vi';
import { formatVND } from '@/lib/format';
import {
  formatNumberVNInput,
  numberToVietnameseCurrency,
  parseVNNumberInput,
} from '@/lib/numberVN';
import { hoursBetween, calculateDeposit } from '@/domain/deposit';
import { isRequired } from '@/lib/validate';

export interface ShiftFormValues {
  title: string;
  description: string;
  requirements: string;
  jobType: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  hourlyWage: number;
  positionsTotal: number;
}

interface ShiftFormProps {
  initialValues?: Partial<ShiftFormValues>;
  onSubmit: (values: ShiftFormValues) => void;
  onDeposit?: () => void;
  showDepositButton?: boolean;
  depositAmount?: number;
  loading?: boolean;
  mode?: 'create' | 'edit';
  className?: string;
  /**
   * Phase 6: minimum value for `positionsTotal` enforced on submit. In
   * create mode this is always 1; in edit mode the caller supplies the
   * already-approved count so the worker can't shrink the slot below
   * confirmed assignments.
   */
  minPositions?: number;
}

const JOB_TYPE_OPTIONS = [
  'Phục vụ',
  'Pha chế',
  'Kho vận',
  'Hỗ trợ sự kiện',
  'Phát tờ rơi',
  'Bảo vệ',
  'Thu ngân',
  'Khác',
].map((v) => ({ value: v, label: v }));

const DEFAULT_VALUES: ShiftFormValues = {
  title: '',
  description: '',
  requirements: '',
  jobType: '',
  location: '',
  date: '',
  startTime: '',
  endTime: '',
  hourlyWage: 0,
  positionsTotal: 1,
};

type FormErrors = Partial<Record<keyof ShiftFormValues, string>>;

export function ShiftForm({
  initialValues,
  onSubmit,
  onDeposit,
  showDepositButton = false,
  depositAmount,
  loading = false,
  mode = 'create',
  className = '',
  minPositions = 1,
}: ShiftFormProps) {
  const [values, setValues] = useState<ShiftFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Phase 6: keep `positionsTotal` editable as a string so the user can
  // briefly clear the field while typing without it snapping back to 0.
  // The committed numeric value lives in `values.positionsTotal`; the
  // input shows `positionsText`.
  const [positionsText, setPositionsText] = useState<string>(
    String(initialValues?.positionsTotal ?? DEFAULT_VALUES.positionsTotal),
  );

  // Live deposit calculation
  const liveDeposit = calculateDeposit(
    values.hourlyWage,
    hoursBetween(values.startTime, values.endTime),
    values.positionsTotal,
  );

  function set<K extends keyof ShiftFormValues>(key: K, value: ShiftFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear error on change
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};

    if (!isRequired(values.title).ok) errs.title = t('error.required');
    if (!isRequired(values.location).ok) errs.location = t('error.required');
    if (!isRequired(values.date).ok) errs.date = t('error.required');
    if (!isRequired(values.startTime).ok) errs.startTime = t('error.required');
    if (!isRequired(values.endTime).ok) errs.endTime = t('error.required');
    if (!values.hourlyWage || values.hourlyWage <= 0) errs.hourlyWage = t('error.wage.invalid');

    // Phase 6: positionsTotal validation — accepts any positive integer
    // ≥ `minPositions` (1 in create mode; the already-approved count in
    // edit mode). Empty / non-positive / non-integer / below-min input
    // all surface a clear Vietnamese error.
    if (positionsText.trim() === '') {
      errs.positionsTotal = t('error.positions.required');
    } else if (
      !Number.isFinite(values.positionsTotal) ||
      !Number.isInteger(values.positionsTotal) ||
      values.positionsTotal < 1
    ) {
      errs.positionsTotal = t('error.positions.invalid');
    } else if (values.positionsTotal < minPositions) {
      errs.positionsTotal = t('error.positions.belowFilled')
        .replace('{min}', String(minPositions));
    }

    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit(values);
  }

  const submitLabel = mode === 'edit' ? t('btn.save') : t('btn.postShift');

  return (
    <form onSubmit={handleSubmit} className={['flex flex-col gap-4', className].join(' ')}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Title */}
        <Input
          label={t('form.title')}
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
          required
        />

        {/* Job type */}
        <Select
          label={t('form.jobType')}
          value={values.jobType}
          onChange={(e) => set('jobType', e.target.value)}
          options={JOB_TYPE_OPTIONS}
          placeholder="Chọn loại công việc"
          error={errors.jobType}
        />

        {/* Location */}
        <Input
          label={t('form.location')}
          value={values.location}
          onChange={(e) => set('location', e.target.value)}
          error={errors.location}
          required
        />

        {/* Date */}
        <DateFieldVN
          label={t('form.date')}
          value={values.date}
          onChange={(v) => set('date', v)}
          error={errors.date}
          required
        />

        {/* Start time */}
        <TimeFieldVN
          label={t('form.startTime')}
          value={values.startTime}
          onChange={(v) => set('startTime', v)}
          error={errors.startTime}
          required
        />

        {/* End time */}
        <TimeFieldVN
          label={t('form.endTime')}
          value={values.endTime}
          onChange={(v) => set('endTime', v)}
          error={errors.endTime}
          required
        />

        {/* Hourly wage — Phase 9F formatted input + Vietnamese words helper */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="shift-hourly-wage"
            className="text-sm font-medium text-gray-700"
          >
            {t('form.hourlyWage')}
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            id="shift-hourly-wage"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={formatNumberVNInput(values.hourlyWage)}
            onChange={(e) => {
              const parsed = parseVNNumberInput(e.target.value);
              set('hourlyWage', Number.isFinite(parsed) ? parsed : 0);
            }}
            aria-invalid={!!errors.hourlyWage}
            aria-describedby={
              errors.hourlyWage
                ? 'shift-hourly-wage-error'
                : 'shift-hourly-wage-hint'
            }
            className={[
              'w-full rounded-lg border px-3 py-2 text-sm font-mono text-gray-900',
              'min-h-[44px] transition-colors duration-150',
              'placeholder:font-sans placeholder:text-gray-400',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1',
              errors.hourlyWage
                ? 'border-red-400 bg-red-50 focus-visible:ring-red-400'
                : 'border-gray-300 bg-white hover:border-gray-400',
            ].join(' ')}
          />
          {errors.hourlyWage ? (
            <p
              id="shift-hourly-wage-error"
              role="alert"
              className="text-xs text-red-600"
            >
              {errors.hourlyWage}
            </p>
          ) : (
            <p
              id="shift-hourly-wage-hint"
              className="text-xs text-gray-500"
            >
              {values.hourlyWage > 0
                ? `(${numberToVietnameseCurrency(values.hourlyWage)})`
                : t('form.hourlyWage.hint')}
            </p>
          )}
        </div>

        {/* Positions total — Phase 6 fix: keep as a controlled string so
            the field can be temporarily empty while editing. */}
        <Input
          label={t('form.positionsTotal')}
          type="number"
          min={minPositions}
          step={1}
          value={positionsText}
          onChange={(e) => {
            const raw = e.target.value;
            setPositionsText(raw);
            // Mirror to numeric state. Empty input commits NaN so the
            // submit-time validator catches it; otherwise parse normally.
            const parsed = raw === '' ? Number.NaN : Number(raw);
            set('positionsTotal', parsed);
          }}
          error={errors.positionsTotal}
          required
        />

        {/* Description — full width */}
        <div className="md:col-span-2">
          <Textarea
            label={t('form.description')}
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
          />
        </div>

        {/* Requirements — full width */}
        <div className="md:col-span-2">
          <Textarea
            label={t('form.requirements')}
            value={values.requirements}
            onChange={(e) => set('requirements', e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* Live deposit total */}
      {liveDeposit > 0 && (
        <div className="rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <span className="font-medium">{t('shifts.deposit.amount')}:</span>{' '}
          {formatVND(liveDeposit)}
        </div>
      )}

      {/* Deposit button */}
      {showDepositButton && depositAmount != null && depositAmount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <span className="flex-1 text-sm text-orange-800">
            <span className="font-medium">{t('shifts.deposit.amount')}:</span>{' '}
            {formatVND(depositAmount)}
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={onDeposit}>
            {t('btn.deposit')}
          </Button>
        </div>
      )}

      <Button type="submit" variant="primary" loading={loading}>
        {submitLabel}
      </Button>
    </form>
  );
}
