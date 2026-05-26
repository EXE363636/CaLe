'use client';

/**
 * Phase 10C — Employer confirmation panel.
 *
 * Read-only summary of a worker's check-out evidence + the
 * `<AutoReleaseCountdown/>` + a Confirm trigger that reuses the
 * existing `<RatingForm>` flow + a "Khiếu nại" trigger that opens
 * the new `<DisputeDialog/>`.
 *
 * The panel is mounted on `/employer/shifts/[id]` once per
 * checked-out application. It never mutates state directly — every
 * action is a callback wired by the parent so the page can keep
 * the toast / loading orchestration in one place.
 *
 * Privacy: filenames are rendered as plain non-interactive text. No
 * file content is fetched, no PII is exposed, no
 * `WorkerVerificationDocument` field is read.
 */

import {
  AutoReleaseCountdown,
  type AutoReleaseCountdownProps,
} from './AutoReleaseCountdown';
import { Button, HelpPopover } from '@/components/ui';
import { CHECKOUT_CHECKLIST_ITEMS_VI, t } from '@/i18n/vi';
import type { Application, Shift } from '@/types';

export interface EmployerConfirmationPanelProps {
  application: Application;
  shift: Shift;
  /** Opens the existing `<RatingForm>` for the given application id. */
  onConfirm: () => void;
  /** Opens the `<DisputeDialog/>` for the given application id. */
  onDispute: () => void;
  /** Optional override for the wall clock — wired by tests. */
  nowSource?: AutoReleaseCountdownProps['nowSource'];
  loading?: boolean;
}

/** vi-VN locale formatter — matches the design's display contract. */
const VN_DATETIME = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function EmployerConfirmationPanel({
  application,
  shift,
  onConfirm,
  onDispute,
  nowSource,
  loading = false,
}: EmployerConfirmationPanelProps) {
  const checkOutAt = application.checkOutAt;
  const checkOutAtLabel = checkOutAt
    ? VN_DATETIME.format(new Date(checkOutAt))
    : '—';

  const requirement = shift.evidenceRequirement ?? 'None';
  const checklistTemplate = CHECKOUT_CHECKLIST_ITEMS_VI[requirement] ?? [];
  const checklistState = application.checkoutChecklist ?? [];
  // Compare against the template length so a partial / over-length
  // payload still surfaces a sane "X / Y" indicator.
  const totalRows = Math.max(checklistTemplate.length, checklistState.length);
  const tickedCount = checklistState.filter(Boolean).length;
  const allTicked = totalRows > 0 && tickedCount >= totalRows;

  const note = application.workerCheckoutNote?.trim() ?? '';
  const fileName = application.workerEvidenceFileName?.trim() ?? '';
  const autoReleaseAt = application.autoReleaseAt;

  return (
    <section
      aria-labelledby={`employer-confirm-${application.id}`}
      className="ml-2 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 shadow-sm"
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3
            id={`employer-confirm-${application.id}`}
            className="text-sm font-semibold text-orange-900"
          >
            {t('employer.confirm.panel.title')}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-orange-900/80">
            {t('employer.confirm.panel.intro')}
          </p>
        </div>
      </header>

      {/* Read-only evidence summary. */}
      <dl className="grid grid-cols-1 gap-3 rounded-xl bg-white/80 p-3 ring-1 ring-orange-100 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
            {t('employer.confirm.checkOutAt')}
          </dt>
          <dd className="mt-1 text-sm text-gray-900">{checkOutAtLabel}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
            {t('employer.confirm.checklist.title')}
          </dt>
          <dd className="mt-1 text-sm text-gray-900">
            {totalRows === 0
              ? t('employer.confirm.checklist.empty')
              : allTicked
                ? t('employer.confirm.checklist.complete').replace(
                    '{n}',
                    String(totalRows),
                  )
                : t('employer.confirm.checklist.incomplete')
                    .replace('{n}', String(totalRows - tickedCount))
                    .replace('{total}', String(totalRows))}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
            {t('employer.confirm.note.title')}
          </dt>
          <dd
            className={[
              'mt-1 whitespace-pre-line text-sm',
              note.length > 0 ? 'text-gray-900' : 'italic text-gray-500',
            ].join(' ')}
          >
            {note.length > 0 ? note : t('employer.confirm.note.empty')}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
            {t('employer.confirm.evidenceFile.title')}
          </dt>
          <dd
            className={[
              'mt-1 break-all text-sm',
              fileName.length > 0
                ? 'font-mono text-gray-900'
                : 'italic text-gray-500',
            ].join(' ')}
          >
            {fileName.length > 0 ? fileName : t('employer.confirm.evidenceFile.empty')}
          </dd>
        </div>
      </dl>

      {/* Auto-release countdown + 12-hour warning copy + HelpPopover.
          The countdown timer is presentational only — auto-release
          itself is wired in Wave 7. */}
      {autoReleaseAt && (
        <div className="mt-4 rounded-xl bg-white/80 p-3 ring-1 ring-orange-100">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
              {t('employer.confirm.countdown.label')}
            </p>
            <AutoReleaseCountdown
              autoReleaseAt={autoReleaseAt}
              nowSource={nowSource}
            />
            <HelpPopover
              title={t('help.autoRelease.title')}
              description={t('help.autoRelease.description')}
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-orange-900/90">
            {t('employer.confirm.countdown.warning')}
          </p>
        </div>
      )}

      {/* Action row. */}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button
          size="sm"
          variant="ghost"
          onClick={onDispute}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {t('employer.confirm.btn.dispute')}
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={onConfirm}
          loading={loading}
          className="w-full sm:w-auto"
        >
          {t('employer.confirm.btn.confirm')}
        </Button>
      </div>
    </section>
  );
}
