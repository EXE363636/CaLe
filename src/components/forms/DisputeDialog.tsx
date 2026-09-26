'use client';

/**
 * Phase 10C — Employer-side dispute dialog.
 *
 * Captures the structured payload required by the new
 * `applicationStore.reportIssue(...)` action:
 *
 *   - `category` (required, employer-side enum).
 *   - `reason` (required, 1..1000 characters once trimmed).
 *   - `evidenceDescription` (UX-required for the Wave 4 employer
 *     surface, ≤2000 characters; the underlying store action accepts
 *     an empty description per Requirement 7.1, but this dialog
 *     blocks submit on empty input so the human-facing form always
 *     produces a complete record).
 *   - `evidenceFileName` (optional, ≤255 characters, no path
 *     separators — Requirement 7.7 filename hygiene).
 *
 * The dialog only validates shape — it forwards the payload to the
 * parent's `onSubmit`. The store action re-runs the same validation
 * before any state change so a buggy / racing call site cannot
 * bypass the gate.
 *
 * Wave 4 only ships the `'employer'` side. The `'worker'` side flag
 * is exposed through the `side` prop so Wave 5 can reuse the same
 * dialog by passing `side="worker"` and the worker-side category
 * enum, without changing the employer integration.
 */

import { useEffect, useState } from 'react';
import { Button, Modal, Textarea } from '@/components/ui';
import { t } from '@/i18n/vi';
import {
  EMPLOYER_DISPUTE_CATEGORIES,
  WORKER_DISPUTE_CATEGORIES,
  type EmployerDisputeCategory,
  type WorkerDisputeCategory,
} from '@/types';

const REASON_MAX = 1000;
const EVIDENCE_DESCRIPTION_MAX = 2000;
const FILE_NAME_MAX = 255;

export type DisputeSide = 'employer' | 'worker';

export interface DisputePayload {
  category: EmployerDisputeCategory | WorkerDisputeCategory;
  reason: string;
  evidenceDescription?: string;
  evidenceFileName?: string;
}

export interface DisputeDialogProps {
  open: boolean;
  onClose: () => void;
  side: DisputeSide;
  /** Worker-friendly subject text rendered in the intro (e.g. shift title). */
  subjectTitle?: string;
  onSubmit: (payload: DisputePayload) => void;
  loading?: boolean;
  /** Vietnamese error string set by the parent on store rejection. */
  errorMessage?: string | null;
  /**
   * Phase 10C-Stab-1 Batch 4B — when supplied, the dialog opens with
   * this category pre-selected. Used by the worker absent-dispute
   * banner to skip the category step and go straight to reason +
   * evidence input.
   */
  defaultCategory?: EmployerDisputeCategory | WorkerDisputeCategory;
}

export function DisputeDialog({
  open,
  onClose,
  side,
  subjectTitle,
  onSubmit,
  loading = false,
  errorMessage = null,
  defaultCategory,
}: DisputeDialogProps) {
  const categories =
    side === 'employer'
      ? EMPLOYER_DISPUTE_CATEGORIES
      : WORKER_DISPUTE_CATEGORIES;

  const [category, setCategory] = useState<string>('');
  const [reason, setReason] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceFileName, setEvidenceFileName] = useState('');
  const [touched, setTouched] = useState<{
    category?: boolean;
    reason?: boolean;
    evidenceDescription?: boolean;
    evidenceFileName?: boolean;
  }>({});

  // Reset form state on each open so a previous failed submit doesn't
  // leak into a fresh attempt. Re-runs when `side` flips so a future
  // worker-side mount starts blank.
  useEffect(() => {
    if (open) {
      // Phase 10C-Stab-1 Batch 4B — honour the optional
      // `defaultCategory` prop (e.g. preset `'AbsentDispute'` from
      // the worker absent-dispute banner).
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional dispute-form reset/preset on open / side flip; refactor would change dialog behavior
      setCategory(defaultCategory ?? '');
      setReason('');
      setEvidenceDescription('');
      setEvidenceFileName('');
      setTouched({});
    }
  }, [open, side, defaultCategory]);

  // Per-field validity (UX-only — the store re-runs its own checks).
  const reasonTrimmed = reason.trim();
  const evidenceTrimmed = evidenceDescription.trim();
  const fileNameTrimmed = evidenceFileName.trim();
  const fileNameInvalid =
    fileNameTrimmed.length > 0 &&
    (fileNameTrimmed.includes('/') || fileNameTrimmed.includes('\\'));

  const errors = {
    category: category.length === 0 ? t('dispute.dialog.error.categoryRequired') : null,
    reason:
      reasonTrimmed.length === 0
        ? t('dispute.dialog.error.reasonRequired')
        : reasonTrimmed.length > REASON_MAX
          ? t('dispute.dialog.error.fieldTooLong')
          : null,
    evidenceDescription:
      evidenceTrimmed.length === 0
        ? t('dispute.dialog.error.evidenceDescriptionRequired')
        : evidenceTrimmed.length > EVIDENCE_DESCRIPTION_MAX
          ? t('dispute.dialog.error.fieldTooLong')
          : null,
    evidenceFileName: fileNameInvalid
      ? t('dispute.dialog.error.invalidFileName')
      : fileNameTrimmed.length > FILE_NAME_MAX
        ? t('dispute.dialog.error.fieldTooLong')
        : null,
  };
  const formValid =
    !errors.category &&
    !errors.reason &&
    !errors.evidenceDescription &&
    !errors.evidenceFileName;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({
      category: true,
      reason: true,
      evidenceDescription: true,
      evidenceFileName: true,
    });
    if (!formValid || loading) return;
    onSubmit({
      category: category as EmployerDisputeCategory | WorkerDisputeCategory,
      reason: reasonTrimmed,
      evidenceDescription: evidenceTrimmed,
      evidenceFileName:
        fileNameTrimmed.length > 0 ? fileNameTrimmed : undefined,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('dispute.dialog.title')}
      className="max-w-lg"
    >
      <form
        className="flex flex-col gap-4 text-sm text-gray-800"
        onSubmit={handleSubmit}
        noValidate
      >
        <p className="leading-relaxed text-gray-600">
          {subjectTitle ? `${t('dispute.dialog.intro')} (${subjectTitle})` : t('dispute.dialog.intro')}
        </p>

        {/* Category select. */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="dispute-category"
            className="text-sm font-medium text-gray-700"
          >
            {t('dispute.dialog.category.label')}
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <select
            id="dispute-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setTouched((s) => ({ ...s, category: true }));
            }}
            onBlur={() => setTouched((s) => ({ ...s, category: true }))}
            aria-invalid={!!(touched.category && errors.category)}
            aria-describedby={
              touched.category && errors.category
                ? 'dispute-category-error'
                : undefined
            }
            className={[
              'w-full rounded-lg border px-3 py-2 text-sm text-gray-900',
              'min-h-[44px] bg-white transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
              touched.category && errors.category
                ? 'border-red-400'
                : 'border-gray-300 hover:border-gray-400',
            ].join(' ')}
          >
            <option value="" disabled>
              {t('dispute.dialog.category.placeholder')}
            </option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {t(`dispute.category.${c}`)}
              </option>
            ))}
          </select>
          {touched.category && errors.category && (
            <p
              id="dispute-category-error"
              role="alert"
              className="text-xs text-red-600"
            >
              {errors.category}
            </p>
          )}
        </div>

        {/* Reason. */}
        <Textarea
          label={t('dispute.dialog.reason.label')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched((s) => ({ ...s, reason: true }))}
          rows={3}
          maxLength={REASON_MAX}
          placeholder={t('dispute.dialog.reason.placeholder')}
          hint={t('dispute.dialog.reason.hint')}
          required
          error={touched.reason && errors.reason ? errors.reason : undefined}
        />

        {/* Evidence description. */}
        <Textarea
          label={t('dispute.dialog.evidenceDescription.label')}
          value={evidenceDescription}
          onChange={(e) => setEvidenceDescription(e.target.value)}
          onBlur={() => setTouched((s) => ({ ...s, evidenceDescription: true }))}
          rows={3}
          maxLength={EVIDENCE_DESCRIPTION_MAX}
          placeholder={t('dispute.dialog.evidenceDescription.placeholder')}
          hint={t('dispute.dialog.evidenceDescription.hint')}
          required
          error={
            touched.evidenceDescription && errors.evidenceDescription
              ? errors.evidenceDescription
              : undefined
          }
        />

        {/* Evidence filename (optional). */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="dispute-evidence-file"
            className="text-sm font-medium text-gray-700"
          >
            {t('dispute.dialog.evidenceFile.label')}
          </label>
          <input
            id="dispute-evidence-file"
            type="text"
            value={evidenceFileName}
            onChange={(e) => setEvidenceFileName(e.target.value)}
            onBlur={() =>
              setTouched((s) => ({ ...s, evidenceFileName: true }))
            }
            maxLength={FILE_NAME_MAX}
            placeholder={t('dispute.dialog.evidenceFile.placeholder')}
            aria-invalid={!!(touched.evidenceFileName && errors.evidenceFileName)}
            aria-describedby={
              touched.evidenceFileName && errors.evidenceFileName
                ? 'dispute-evidence-file-error'
                : 'dispute-evidence-file-hint'
            }
            className={[
              'w-full rounded-lg border px-3 py-2 text-sm font-mono text-gray-900',
              'min-h-[44px] transition-colors duration-150',
              'placeholder:font-sans placeholder:text-gray-500',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
              touched.evidenceFileName && errors.evidenceFileName
                ? 'border-red-400 bg-red-50'
                : 'border-gray-300 bg-white hover:border-gray-400',
            ].join(' ')}
          />
          <p
            id="dispute-evidence-file-hint"
            className="text-xs text-gray-500"
          >
            {t('dispute.dialog.evidenceFile.hint')}
          </p>
          {touched.evidenceFileName && errors.evidenceFileName && (
            <p
              id="dispute-evidence-file-error"
              role="alert"
              className="text-xs text-red-600"
            >
              {errors.evidenceFileName}
            </p>
          )}
        </div>

        {/* Privacy reminder — same wording as the worker shift detail
            so both sides see consistent rules. */}
        <p
          role="note"
          className="rounded-md bg-orange-50 px-3 py-2 text-xs leading-relaxed text-orange-900 ring-1 ring-orange-200"
        >
          {t('dispute.dialog.privacyWarning')}
        </p>

        {/* Server-side rejection (e.g. WRONG_STATUS race). */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {errorMessage}
          </div>
        )}

        <footer className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {t('dispute.dialog.cancel')}
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="md"
            disabled={!formValid}
            loading={loading}
            className="w-full sm:w-auto"
          >
            {t('dispute.dialog.submit')}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
