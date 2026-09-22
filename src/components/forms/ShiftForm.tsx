'use client';

import { useEffect, useState } from 'react';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { Input, Select, Textarea, Button, DateFieldVN, TimeFieldVN, HelpPopover } from '@/components/ui';
import { t } from '@/i18n/vi';
import { formatVND } from '@/lib/format';
import {
  formatNumberVNInput,
  numberToVietnameseCurrency,
  parseVNNumberInput,
} from '@/lib/numberVN';
import { hoursBetween, calculateDeposit, platformFee } from '@/domain/deposit';
import {
  EVIDENCE_REQUIREMENT_VALUES,
  suggestedEvidenceForJobType,
} from '@/domain/evidence';
import { jobCategoryRiskLevel } from '@/domain/skillScore';
import {
  isBelowRecommendedMinimum,
  recommendedHourlyMinimum,
} from '@/domain/wage';
import { isRequired } from '@/lib/validate';
import { sanitizePhoneInput, isValidVNPhone } from '@/lib/validate';
import { validateShiftFutureTiming } from '@/domain/shiftScheduling';
import type { EvidenceRequirement } from '@/types';

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
  /** Phase 10A-Fix-3 — workplace imagery + on-site contact metadata. */
  workplaceImageLabel: string;
  workplaceNotes: string;
  onSiteContactName: string;
  onSiteContactPhone: string;
  requiresVerifiedDocumentOnArrival: boolean;
  /**
   * Phase 10C — post-shift evidence requirement chosen by the
   * employer. Always one of the five `EvidenceRequirement` literals;
   * pre-seeded from `suggestedEvidenceForJobType(jobType)` on first
   * paint and re-seeded whenever the employer changes the job
   * category and hasn't manually overridden the picker yet.
   */
  evidenceRequirement: EvidenceRequirement;

  /**
   * Phase 10C-Stab-1 Batch 2 — when `jobType === 'Khác'`, the
   * employer must supply a free-text custom name (Bug 3.4). Empty
   * for any other job type. The store `create` action persists this
   * onto `Shift.customJobTypeName`.
   */
  customJobTypeName: string;

  /**
   * Phase 10C-Stab-1 Batch 2 — set to `true` once the employer has
   * acknowledged the "below recommended minimum" warning. Required
   * to submit when `hourlyWage < recommendedHourlyMinimum(jobType)`.
   */
  wageBelowMinAcknowledged: boolean;
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
  /**
   * Phase 10A-Fix-3: when `true`, the workplace-image-label field is
   * required at submit time. The new-shift page sets this based on
   * the employer's resolved type (always required for Individual /
   * AgencyEvent; required for HouseholdBusiness / Company unless they
   * have an approved profile-side workplace photo).
   */
  workplaceImageRequired?: boolean;
  /**
   * Phase 10A-Fix-3: live snapshot callback. Fires after every field
   * change so the parent can drive a side-by-side readiness checklist.
   * Optional — when omitted the form behaves identically to before.
   */
  onValuesChange?: (values: ShiftFormValues) => void;
  /**
   * CORE-STABILITY-8 Part 1: when provided, render a secondary "Lưu
   * nháp" button that saves the CURRENT form values as a draft WITHOUT
   * running publish validation (a draft may be incomplete). The parent
   * persists the snapshot to `shiftDraftStore`.
   */
  onSaveDraft?: (values: ShiftFormValues) => void;
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
  workplaceImageLabel: '',
  workplaceNotes: '',
  onSiteContactName: '',
  onSiteContactPhone: '',
  requiresVerifiedDocumentOnArrival: false,
  // Phase 10C — seeded from `suggestedEvidenceForJobType('')` which
  // returns the safe default `'RequiredHandoverChecklist'`. The
  // picker re-seeds itself the first time the employer chooses a
  // job category (see the `set('jobType', ...)` branch below).
  evidenceRequirement: suggestedEvidenceForJobType(''),
  customJobTypeName: '',
  wageBelowMinAcknowledged: false,
};

/**
 * Phase 10C — minimum evidence level allowed for high-risk jobs. The
 * picker disables anything below this rank for `'High'` risk job
 * categories; the validator also rejects an out-of-band submit.
 */
const HIGH_RISK_MIN_RANK = 3; // 'RequiredHandoverChecklist' (and above)

const EVIDENCE_RANK: Record<EvidenceRequirement, number> = {
  None: 0,
  ChecklistOnly: 1,
  OptionalPhoto: 2,
  RequiredHandoverChecklist: 3,
  RequiredPhoto: 4,
};

type FormErrors = Partial<Record<keyof ShiftFormValues, string>>;

/**
 * UI-REFRESH Batch 3 — multi-section card wrapper for the create-shift
 * form. Pure presentational: groups related fields under a heading on a
 * `shadow-card` surface so the long form reads as distinct steps
 * (Thông tin ca làm / Mô tả và yêu cầu / …) instead of one flat list.
 * No field, label, id, or validation behaviour changes.
 */
function FormSection({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        'rounded-2xl border border-gray-200 bg-white p-4 shadow-card sm:p-5',
        className,
      ].join(' ')}
    >
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </section>
  );
}

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
  workplaceImageRequired = false,
  onValuesChange,
  onSaveDraft,
}: ShiftFormProps) {
  // Item 5 — production (supabase): chưa có upload ảnh thật → ẩn trường ảnh
  // địa điểm giả và không bắt buộc nó.
  const supabase = isSupabaseEnv();
  const effectiveImageRequired = workplaceImageRequired && !supabase;
  const [values, setValues] = useState<ShiftFormValues>(() => {
    const seeded = { ...DEFAULT_VALUES, ...initialValues };
    // Phase 10C — when the form opens with a `jobType` already in
    // place (the new-shift page doesn't pass one today, but edit
    // flows might in the future), pre-seed `evidenceRequirement`
    // from the suggestion so the picker reflects the same default
    // the chip points to.
    if (seeded.jobType && !initialValues?.evidenceRequirement) {
      seeded.evidenceRequirement = suggestedEvidenceForJobType(
        seeded.jobType,
      );
    }
    return seeded;
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Phase 10C — has the employer overridden the suggested evidence
  // requirement? When `false`, changing `jobType` re-seeds the picker
  // to the new suggestion. Once the employer manually picks an option
  // we stop re-seeding so their choice survives subsequent jobType
  // edits.
  const [evidenceTouched, setEvidenceTouched] = useState<boolean>(
    Boolean(initialValues?.evidenceRequirement),
  );

  // Phase 6: keep `positionsTotal` editable as a string so the user can
  // briefly clear the field while typing without it snapping back to 0.
  // The committed numeric value lives in `values.positionsTotal`; the
  // input shows `positionsText`.
  const [positionsText, setPositionsText] = useState<string>(
    String(initialValues?.positionsTotal ?? DEFAULT_VALUES.positionsTotal),
  );

  // Live deposit calculation. Tiền công gốc + 10% phí dịch vụ (supabase khớp
  // server; local/demo không cộng phí). Hiển thị số dư cần đảm bảo THẬT để
  // employer biết cần bao nhiêu số dư ví.
  const liveDepositBase = calculateDeposit(
    values.hourlyWage,
    hoursBetween(values.startTime, values.endTime),
    values.positionsTotal,
  );
  const liveDepositFee = isSupabaseEnv() ? platformFee(liveDepositBase) : 0;
  const liveDeposit = liveDepositBase + liveDepositFee;

  function set<K extends keyof ShiftFormValues>(key: K, value: ShiftFormValues[K]) {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Phase 10C — when the employer changes the job category and
      // hasn't manually picked an evidence option yet, re-seed the
      // picker to the new suggestion so the chip and the selected
      // radio stay in sync. If the new risk level is `High` and the
      // current value falls below the high-risk minimum, we lift the
      // selection to the suggestion regardless of the touched flag —
      // the picker UI also disables sub-min options so this branch
      // mirrors what a user could click anyway.
      if (key === 'jobType') {
        const newJobType = value as string;
        const suggestion = suggestedEvidenceForJobType(newJobType);
        const risk = jobCategoryRiskLevel(newJobType);
        const currentRank = EVIDENCE_RANK[next.evidenceRequirement];
        if (!evidenceTouched) {
          next.evidenceRequirement = suggestion;
        } else if (
          risk === 'High' &&
          currentRank < HIGH_RISK_MIN_RANK
        ) {
          next.evidenceRequirement = suggestion;
        }
      }
      // Phase 10A-Fix-3 — fire the live snapshot for the parent's
      // readiness checklist. We use a microtask so the callback sees
      // the post-update state without triggering React's "setState in
      // render" warning.
      if (onValuesChange) {
        queueMicrotask(() => onValuesChange(next));
      }
      return next;
    });
    // Track whether the employer has manually chosen an evidence
    // option so jobType changes don't keep overriding their pick.
    if (key === 'evidenceRequirement') {
      setEvidenceTouched(true);
    }
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

    // QA-Fix-2 Phase 1 — block past / inconsistent shift timing in
    // the UI (the store re-validates as defence in depth). Only run
    // when the three date/time fields are present so we don't stack a
    // confusing "past" error on top of the "required" errors above.
    if (values.date && values.startTime && values.endTime) {
      const timing = validateShiftFutureTiming(
        values.date,
        values.startTime,
        values.endTime,
        new Date().toISOString(),
      );
      if (!timing.ok) {
        if (timing.error === 'START_NOT_BEFORE_END') {
          errs.endTime = t('error.time.endBeforeStart');
        } else {
          errs.date = t('error.shift.pastDateTime');
        }
      }
    }

    // Phase 10C-Stab-1 Batch 2 — wage warning + acknowledgement
    // gate. If the wage is below the recommended minimum for the
    // job type, require the employer to tick the "I understand"
    // checkbox before submitting. Soft warning, not a hard block.
    if (
      values.hourlyWage > 0 &&
      values.jobType &&
      isBelowRecommendedMinimum(values.jobType, values.hourlyWage) &&
      !values.wageBelowMinAcknowledged
    ) {
      errs.hourlyWage = t('shiftForm.wage.recommendedMin.warning');
    }

    // Phase 10C-Stab-1 Batch 2 — custom job type name required when
    // the picker is set to "Khác".
    if (values.jobType === 'Khác' && !isRequired(values.customJobTypeName).ok) {
      errs.customJobTypeName = t('shiftForm.customJobType.required');
    }

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

    // Phase 10A-Fix-3: workplace image label required for the relevant
    // employer types. The new-shift page passes
    // `workplaceImageRequired={true}` when the employer's resolved type
    // is Individual / AgencyEvent (always) or HouseholdBusiness /
    // Company without an approved profile workplace photo.
    if (effectiveImageRequired && !isRequired(values.workplaceImageLabel).ok) {
      errs.workplaceImageLabel = t('error.workplaceImage.required');
    }

    // CORE-STABILITY-8 Part 2 — on-site contact person + phone are
    // REQUIRED to publish (the "Đăng ca" submit). Drafts bypass this
    // (the "Lưu nháp" button calls onSaveDraft directly, not submit).
    if (!isRequired(values.onSiteContactName).ok) {
      errs.onSiteContactName = t('error.contactPerson.required');
    }
    if (values.onSiteContactPhone.trim() === '') {
      errs.onSiteContactPhone = t('error.contactPhone.required');
    } else if (!isValidVNPhone(values.onSiteContactPhone).ok) {
      errs.onSiteContactPhone = t('error.phone.invalid');
    }

    // Phase 10C — high-risk gating. When the chosen job category
    // resolves to `'High'` risk, the evidence picker must be at
    // `'RequiredHandoverChecklist'` or above. The picker UI already
    // disables sub-min options; this validator is the belt-and-braces
    // check so a stale form state can't bypass the rule.
    if (values.jobType) {
      const risk = jobCategoryRiskLevel(values.jobType);
      const rank = EVIDENCE_RANK[values.evidenceRequirement];
      if (risk === 'High' && rank < HIGH_RISK_MIN_RANK) {
        errs.evidenceRequirement = t('error.evidence.tooLowForHighRisk');
      }
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
    <form onSubmit={handleSubmit} className={['flex flex-col gap-5', className].join(' ')}>
      <FormSection title={t('shiftForm.section.basics')}>
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

        {/* Phase 10C-Stab-1 Batch 2 — custom job type name. Required
            when the picker is set to "Khác" so the listing UI doesn't
            render a generic "Khác" label. */}
        {values.jobType === 'Khác' && (
          <Input
            label={t('shiftForm.customJobType.label')}
            value={values.customJobTypeName}
            onChange={(e) => set('customJobTypeName', e.target.value)}
            placeholder={t('shiftForm.customJobType.placeholder')}
            hint={t('shiftForm.customJobType.hint')}
            error={errors.customJobTypeName}
            required
          />
        )}

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
              // Phase 10C-Stab-1 Batch 2 — wage input must accept
              // numbers only. Strip every non-digit before parsing
              // so pasted text containing letters / symbols is
              // dropped silently.
              const numericOnly = e.target.value.replace(/[^\d]/g, '');
              const parsed = parseVNNumberInput(numericOnly);
              set('hourlyWage', Number.isFinite(parsed) ? parsed : 0);
              // Reset the wage-below-min ack when the wage changes
              // so the warning re-arms on every adjustment.
              if (values.wageBelowMinAcknowledged) {
                set('wageBelowMinAcknowledged', false);
              }
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
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
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
          {/* Phase 10C-Stab-1 Batch 2 — recommended-minimum warning.
              Soft warning + acknowledgement checkbox. The disclaimer
              line explicitly says this is NOT a legal compliance
              floor. */}
          {values.hourlyWage > 0 &&
            values.jobType &&
            isBelowRecommendedMinimum(values.jobType, values.hourlyWage) && (
              <div
                role="note"
                className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              >
                <p className="font-semibold">
                  {t('shiftForm.wage.recommendedMin.title')}:{' '}
                  {recommendedHourlyMinimum(values.jobType).toLocaleString('vi-VN')}đ/giờ
                </p>
                <p className="mt-1 leading-relaxed">
                  {t('shiftForm.wage.recommendedMin.warning')}
                </p>
                <p className="mt-1 italic leading-relaxed text-amber-800">
                  {t('shiftForm.wage.recommendedMin.disclaimer')}
                </p>
                <label className="mt-2 flex items-start gap-2 leading-relaxed">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-orange-500"
                    checked={values.wageBelowMinAcknowledged}
                    onChange={(e) =>
                      set('wageBelowMinAcknowledged', e.target.checked)
                    }
                  />
                  <span>{t('shiftForm.wage.recommendedMin.acknowledge')}</span>
                </label>
              </div>
            )}
        </div>

        {/* Positions total — Phase 6 fix: keep as a controlled string so
            the field can be temporarily empty while editing. */}
        <Input
          label={t('form.positionsTotal')}
          type="text"
          inputMode="numeric"
          value={positionsText}
          onChange={(e) => {
            // CORE-STABILITY-7 Part 4 — headcount is digits-only; strip
            // any letter/symbol on keystroke so the field can never hold
            // text. Empty input commits NaN so the submit-time validator
            // catches it; otherwise parse normally.
            const raw = e.target.value.replace(/\D/g, '');
            setPositionsText(raw);
            const parsed = raw === '' ? Number.NaN : Number(raw);
            set('positionsTotal', parsed);
          }}
          error={errors.positionsTotal}
          required
        />
      </div>
      </FormSection>

      <FormSection title={t('shiftForm.section.details')}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        {/* Phase 10A-Fix-3 — workplace image + on-site contact info.
            Helps workers judge whether the job/location looks real
            before they apply. Mock filename only — no real upload. */}
        {/* P3 card-in-card: flush soft surface — dropped the inner
            `border-orange-100` so this callout reads as a grouped soft
            tint inside the white FormSection card, not a competing box.
            Heading + fields grouping unchanged. */}
        <div className="md:col-span-2 rounded-xl bg-orange-50/40 p-4">
          <p className="mb-1 text-sm font-semibold text-orange-900">
            {t(supabase ? 'form.workplaceSection.title.supabase' : 'form.workplaceSection.title')}
          </p>
          <p className="mb-3 text-xs text-orange-800/80">
            {t(supabase ? 'form.workplaceSection.intro.supabase' : 'form.workplaceSection.intro')}
          </p>

          {/* Ảnh địa điểm là tên-tệp giả (chưa có upload thật) → ẩn ở supabase. */}
          {!supabase && (
            <Input
              label={t('form.workplaceImageLabel')}
              value={values.workplaceImageLabel}
              onChange={(e) => set('workplaceImageLabel', e.target.value)}
              placeholder={t('form.workplaceImageLabel.placeholder')}
              hint={t('form.workplaceImageLabel.hint')}
              error={errors.workplaceImageLabel}
              required={workplaceImageRequired}
            />
          )}

          <div className="mt-3">
            <Textarea
              label={t('form.workplaceNotes')}
              value={values.workplaceNotes}
              onChange={(e) => set('workplaceNotes', e.target.value)}
              rows={2}
              placeholder={t('form.workplaceNotes.placeholder')}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label={t('form.onSiteContactName')}
              value={values.onSiteContactName}
              onChange={(e) => set('onSiteContactName', e.target.value)}
              error={errors.onSiteContactName}
              placeholder="Anh Liêm — quản lý"
              required
            />
            <Input
              label={t('form.onSiteContactPhone')}
              type="tel"
              inputMode="numeric"
              value={values.onSiteContactPhone}
              onChange={(e) =>
                set('onSiteContactPhone', sanitizePhoneInput(e.target.value))
              }
              error={errors.onSiteContactPhone}
              placeholder="0901234567"
              required
            />
          </div>

          <label className="mt-3 flex items-start gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-orange-500"
              checked={values.requiresVerifiedDocumentOnArrival}
              onChange={(e) =>
                set('requiresVerifiedDocumentOnArrival', e.target.checked)
              }
            />
            <span className="leading-relaxed">
              {t('form.requiresVerifiedDocumentOnArrival')}
            </span>
          </label>
        </div>

        {/* Phase 10C — post-shift evidence requirement picker. Five
            radio rows; the picker disables the three lower options for
            high-risk job categories so the rank can never drop below
            'RequiredHandoverChecklist'. The "Hệ thống đề xuất" chip
            sits next to the option returned by
            `suggestedEvidenceForJobType(jobType)`. */}
        <EvidenceFieldset
          jobType={values.jobType}
          value={values.evidenceRequirement}
          error={errors.evidenceRequirement}
          onChange={(next) => set('evidenceRequirement', next)}
        />
      </div>
      </FormSection>

      {/* Live deposit total. Khi có phí (supabase) → hiển thị breakdown +
          note để employer hiểu số dư cần đảm bảo đã gồm 10% phí dịch vụ. */}
      {liveDeposit > 0 && (
        <div className="rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <div>
            <span className="font-medium">{t('shifts.deposit.amount')}:</span>{' '}
            <span className="font-semibold">{formatVND(liveDeposit)}</span>
          </div>
          {liveDepositFee > 0 && (
            <p className="mt-1 text-xs text-orange-700">
              Gồm {formatVND(liveDepositBase)} tiền công + {formatVND(liveDepositFee)} phí
              dịch vụ 10% (mô phỏng). Đây là số dư ví sẽ bị giữ khi đăng ca.
            </p>
          )}
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

      {/* CORE-STABILITY-8 Part 1 — "Lưu nháp" saves the current form
          values as a draft without publish validation. */}
      {onSaveDraft && mode === 'create' && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSaveDraft(values)}
        >
          {t('shiftForm.saveDraft')}
        </Button>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Phase 10C — Evidence requirement fieldset
// ---------------------------------------------------------------------------

interface EvidenceFieldsetProps {
  jobType: string;
  value: EvidenceRequirement;
  error?: string;
  onChange: (next: EvidenceRequirement) => void;
}

/**
 * Five-radio picker for `evidenceRequirement`. Renders one row per
 * `EVIDENCE_REQUIREMENT_VALUES` entry with its Vietnamese label and a
 * one-line helper. The "Hệ thống đề xuất" chip sits next to the
 * option returned by `suggestedEvidenceForJobType(jobType)` whenever
 * `jobType` is non-empty; high-risk job categories disable any option
 * below `'RequiredHandoverChecklist'` so the rank can never drop
 * below the gate. Includes a privacy warning beginning with "Không
 * yêu cầu chụp khách hàng …" and a `<HelpPopover>` explaining how to
 * choose between levels.
 */
function EvidenceFieldset({
  jobType,
  value,
  error,
  onChange,
}: EvidenceFieldsetProps) {
  const suggestion = jobType
    ? suggestedEvidenceForJobType(jobType)
    : undefined;
  const isHighRisk = jobType
    ? jobCategoryRiskLevel(jobType) === 'High'
    : false;

  // Item 5 — production (supabase) chỉ cho các mức evidence LƯU ĐƯỢC bằng DB
  // hiện tại: None, ChecklistOnly, RequiredHandoverChecklist (bằng checklist/note).
  // Ẩn OptionalPhoto/RequiredPhoto (ảnh giả, chưa có Supabase Storage thật).
  const supabase = isSupabaseEnv();
  const options: EvidenceRequirement[] = supabase
    ? EVIDENCE_REQUIREMENT_VALUES.filter(
        (o) => o === 'None' || o === 'ChecklistOnly' || o === 'RequiredHandoverChecklist',
      )
    : [...EVIDENCE_REQUIREMENT_VALUES];

  // Nếu giá trị hiện tại là mức ảnh (đề xuất theo rủi ro hoặc dữ liệu cũ) mà
  // production không cho → tự chuyển sang mức lưu được gần nhất, không âm thầm
  // giữ lựa chọn ảnh giả.
  useEffect(() => {
    if (!supabase) return;
    if (!options.includes(value)) {
      onChange(value === 'RequiredPhoto' ? 'RequiredHandoverChecklist' : 'ChecklistOnly');
    }
  }, [supabase, value, options, onChange]);

  function isOptionDisabled(option: EvidenceRequirement): boolean {
    if (!isHighRisk) return false;
    return EVIDENCE_RANK[option] < HIGH_RISK_MIN_RANK;
  }

  // P3 card-in-card: flush soft surface — dropped the inner
  // `border-orange-100` so this evidence fieldset reads as a grouped soft
  // tint inside the white FormSection card. Legend + radio-row grouping
  // unchanged.
  return (
    <fieldset className="md:col-span-2 rounded-xl bg-orange-50/40 p-4" aria-label={t('shiftForm.evidence.section.title')}>
      <div className="mb-1 flex items-center gap-2 px-1 text-sm font-semibold text-orange-900">
        <span>{t('shiftForm.evidence.section.title')}</span>
        <HelpPopover
          title={t('help.evidence.title')}
          description={t('help.evidence.description')}
          learnMoreHref="/handbook/muc-bang-chung-thanh-toan"
        />
      </div>
      <p className="mb-3 text-xs text-orange-800/80">
        {t('shiftForm.evidence.section.intro')}
      </p>

      <ul className="flex flex-col gap-2">
        {options.map((option) => {
          const disabled = isOptionDisabled(option);
          const isSuggested = suggestion === option;
          const isSelected = value === option;
          return (
            <li key={option}>
              <label
                className={[
                  'flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                  disabled
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                    : isSelected
                    ? 'cursor-pointer border-orange-400 bg-white text-gray-900 shadow-sm'
                    : 'cursor-pointer border-gray-200 bg-white text-gray-800 hover:border-orange-300',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="shiftForm-evidenceRequirement"
                  value={option}
                  className="mt-1 h-4 w-4 accent-orange-500 disabled:cursor-not-allowed"
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => {
                    if (!disabled) onChange(option);
                  }}
                  aria-describedby={
                    error && isSelected
                      ? 'shiftForm-evidence-error'
                      : undefined
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {t(`evidence.requirement.${option}`)}
                    </span>
                    {isSuggested && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        {t('evidence.suggestedChip')}
                      </span>
                    )}
                  </div>
                  <p
                    className={[
                      'mt-0.5 text-xs leading-relaxed',
                      disabled ? 'text-gray-400' : 'text-gray-500',
                    ].join(' ')}
                  >
                    {t(`evidence.helper.${option}`)}
                  </p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      {/* Privacy warning — Vietnamese reminder so employers don't ask
          for photos of customers, ID documents, sensitive invoices, or
          confidential goods. */}
      <p
        className="mt-3 rounded-md bg-white px-3 py-2 text-xs leading-relaxed text-orange-900 ring-1 ring-orange-200"
        role="note"
      >
        {t('evidence.privacy.warning')}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-orange-800/80">
        {t('evidence.privacy.warning.detailed')}
      </p>

      {/* Phase 10C-Stab-1 Batch 2 — concrete examples for the
          chosen requirement so employers and workers see the same
          guidance from both sides. */}
      {(value === 'ChecklistOnly' ||
        value === 'RequiredHandoverChecklist') && (
        <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs text-orange-900 ring-1 ring-orange-100">
          <p className="font-semibold">{t('evidence.examples.checklist.title')}</p>
          <ul className="mt-1 list-disc pl-5">
            <li>{t('evidence.examples.checklist.item1')}</li>
            <li>{t('evidence.examples.checklist.item2')}</li>
            <li>{t('evidence.examples.checklist.item3')}</li>
          </ul>
        </div>
      )}
      {(value === 'OptionalPhoto' ||
        value === 'RequiredPhoto' ||
        value === 'RequiredHandoverChecklist') && (
        <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs text-orange-900 ring-1 ring-orange-100">
          <p className="font-semibold">{t('evidence.examples.photo.title')}</p>
          <ul className="mt-1 list-disc pl-5">
            <li>{t('evidence.examples.photo.item1')}</li>
            <li>{t('evidence.examples.photo.item2')}</li>
            <li>{t('evidence.examples.photo.item3')}</li>
            <li>{t('evidence.examples.photo.item4')}</li>
          </ul>
        </div>
      )}

      {/* High-risk note + validator error. */}
      {isHighRisk && (
        <p className="mt-2 text-xs text-amber-800">
          {t('shiftForm.evidence.highRiskNote')}
        </p>
      )}
      {error && (
        <p
          id="shiftForm-evidence-error"
          role="alert"
          className="mt-2 text-xs text-red-600"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
