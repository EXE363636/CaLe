'use client';

/**
 * Phase 10C-Stab-1 Batch 3 E — DisputeResponseDialog
 *
 * Slim companion to `<DisputeDialog/>` for appending a follow-up
 * statement to an existing dispute. Unlike `<DisputeDialog/>`, no
 * category select is rendered — the response inherits the parent
 * dispute's category, so the form only collects:
 *
 *   - `reason` (required, 1..1000 characters once trimmed).
 *   - `evidenceDescription` (optional, ≤ 2000 characters).
 *   - `evidenceFileName` (optional, ≤ 255 characters, no path
 *     separators).
 *
 * Submit forwards the trimmed payload to the parent which dispatches
 * `useApplicationStore.appendDisputeResponse(disputeId, side, payload)`.
 * On store rejection (e.g. dispute already terminal) the parent sets
 * `errorMessage` and the dialog stays open with the offending field
 * highlighted.
 *
 * Close paths inherited from `<Modal/>`: outside-click, Escape, and
 * the close button. Reused by both worker (`/shifts/[id]`) and
 * employer (`/employer/shifts/[id]`) surfaces — the `side` prop only
 * adjusts copy.
 */

import React, { useEffect, useState } from 'react';

import { Button, Modal, Textarea, Input } from '@/components/ui';
import { t } from '@/i18n/vi';

const REASON_MAX = 1000;
const EVIDENCE_DESCRIPTION_MAX = 2000;
const FILE_NAME_MAX = 255;

export type DisputeResponseSide = 'employer' | 'worker';

export interface DisputeResponsePayload {
  reason: string;
  evidenceDescription?: string;
  evidenceFileName?: string;
}

export interface DisputeResponseDialogProps {
  open: boolean;
  onClose: () => void;
  side: DisputeResponseSide;
  /** Subject text rendered in the intro (typically the shift title). */
  subjectTitle?: string;
  onSubmit: (payload: DisputeResponsePayload) => void;
  loading?: boolean;
  /** Vietnamese error string set by the parent on store rejection. */
  errorMessage?: string | null;
}

export function DisputeResponseDialog({
  open,
  onClose,
  side,
  subjectTitle,
  onSubmit,
  loading = false,
  errorMessage = null,
}: DisputeResponseDialogProps) {
  const [reason, setReason] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceFileName, setEvidenceFileName] = useState('');
  const [touched, setTouched] = useState<{
    reason?: boolean;
    evidenceDescription?: boolean;
    evidenceFileName?: boolean;
  }>({});

  // Reset on each open so a previous failed submit doesn't leak in.
  useEffect(() => {
    if (open) {
      setReason('');
      setEvidenceDescription('');
      setEvidenceFileName('');
      setTouched({});
    }
  }, [open, side]);

  const reasonTrimmed = reason.trim();
  const evidenceTrimmed = evidenceDescription.trim();
  const fileNameTrimmed = evidenceFileName.trim();
  const fileNameInvalid =
    fileNameTrimmed.length > 0 &&
    (fileNameTrimmed.includes('/') || fileNameTrimmed.includes('\\'));

  const errors = {
    reason:
      reasonTrimmed.length === 0
        ? t('dispute.dialog.error.reasonRequired')
        : reasonTrimmed.length > REASON_MAX
          ? t('dispute.dialog.error.fieldTooLong')
          : null,
    evidenceDescription:
      evidenceTrimmed.length > EVIDENCE_DESCRIPTION_MAX
        ? t('dispute.dialog.error.fieldTooLong')
        : null,
    evidenceFileName: fileNameInvalid
      ? t('dispute.dialog.error.invalidFileName')
      : fileNameTrimmed.length > FILE_NAME_MAX
        ? t('dispute.dialog.error.fieldTooLong')
        : null,
  };
  const formValid =
    !errors.reason &&
    !errors.evidenceDescription &&
    !errors.evidenceFileName;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({
      reason: true,
      evidenceDescription: true,
      evidenceFileName: true,
    });
    if (!formValid || loading) return;
    onSubmit({
      reason: reasonTrimmed,
      evidenceDescription:
        evidenceTrimmed.length > 0 ? evidenceTrimmed : undefined,
      evidenceFileName:
        fileNameTrimmed.length > 0 ? fileNameTrimmed : undefined,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('dispute.response.dialog.title')}
      className="max-w-lg"
    >
      <form
        className="flex flex-col gap-4 text-sm text-gray-800"
        onSubmit={handleSubmit}
        noValidate
      >
        <p className="leading-relaxed text-gray-600">
          {subjectTitle
            ? `${t('dispute.response.dialog.intro')} (${subjectTitle})`
            : t('dispute.response.dialog.intro')}
        </p>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="dispute-response-reason"
            className="text-sm font-medium text-gray-700"
          >
            {t('dispute.response.dialog.reason.label')}
            <span className="ml-1 text-red-500" aria-hidden="true">*</span>
          </label>
          <Textarea
            id="dispute-response-reason"
            rows={4}
            value={reason}
            placeholder={t('dispute.response.dialog.reason.placeholder')}
            onChange={(e) => {
              setReason(e.target.value);
              setTouched((s) => ({ ...s, reason: true }));
            }}
            onBlur={() => setTouched((s) => ({ ...s, reason: true }))}
            aria-invalid={!!(touched.reason && errors.reason)}
          />
          {touched.reason && errors.reason && (
            <p role="alert" className="text-xs text-red-600">
              {errors.reason}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="dispute-response-evidence"
            className="text-sm font-medium text-gray-700"
          >
            {t('dispute.response.dialog.evidenceDescription.label')}
          </label>
          <Textarea
            id="dispute-response-evidence"
            rows={3}
            value={evidenceDescription}
            placeholder={t('dispute.response.dialog.evidenceDescription.placeholder')}
            onChange={(e) => {
              setEvidenceDescription(e.target.value);
              setTouched((s) => ({ ...s, evidenceDescription: true }));
            }}
            onBlur={() => setTouched((s) => ({ ...s, evidenceDescription: true }))}
            aria-invalid={!!(touched.evidenceDescription && errors.evidenceDescription)}
          />
          {touched.evidenceDescription && errors.evidenceDescription && (
            <p role="alert" className="text-xs text-red-600">
              {errors.evidenceDescription}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="dispute-response-filename"
            className="text-sm font-medium text-gray-700"
          >
            {t('dispute.response.dialog.evidenceFileName.label')}
          </label>
          <Input
            id="dispute-response-filename"
            type="text"
            value={evidenceFileName}
            placeholder={t('dispute.response.dialog.evidenceFileName.placeholder')}
            onChange={(e) => {
              setEvidenceFileName(e.target.value);
              setTouched((s) => ({ ...s, evidenceFileName: true }));
            }}
            onBlur={() => setTouched((s) => ({ ...s, evidenceFileName: true }))}
            aria-invalid={!!(touched.evidenceFileName && errors.evidenceFileName)}
          />
          <p className="text-xs text-gray-500">
            {t('dispute.response.dialog.evidenceFileName.hint')}
          </p>
          {touched.evidenceFileName && errors.evidenceFileName && (
            <p role="alert" className="text-xs text-red-600">
              {errors.evidenceFileName}
            </p>
          )}
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {t('btn.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!formValid}>
            {side === 'worker'
              ? t('worker.dispute.respondButton')
              : t('employer.dispute.respondButton')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
