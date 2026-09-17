'use client';

/**
 * Phase 10C — Worker checkout dialog.
 *
 * Renders a per-`Shift.evidenceRequirement` form for a worker who is
 * `'CheckedIn'` and ready to finish their shift. The dialog handles
 * three optional / required field groups based on the static
 * `CHECKOUT_CHECKLIST_ITEMS_VI` template:
 *
 *   - Checklist (none for `'None'` / `'OptionalPhoto'` —
 *     wait, see CHECKOUT_CHECKLIST_ITEMS_VI: `'OptionalPhoto'` shares
 *     the 2-row template with `'ChecklistOnly'`. Items render and the
 *     submit button stays enabled regardless because validator
 *     accepts the level even with un-ticked rows; we simply
 *     pre-tick all rows by default for the optional path so the
 *     worker doesn't need to think about it).
 *   - Optional / required handover note (`<Textarea maxLength={1000}/>`).
 *   - Optional / required mock evidence filename (text input).
 *
 * Submit gating mirrors `validateCheckoutPayload`:
 *
 *   - `'None'`                      — always enabled.
 *   - `'ChecklistOnly'`             — enabled iff every visible row
 *                                      is ticked.
 *   - `'OptionalPhoto'`             — always enabled (within length
 *                                      bounds).
 *   - `'RequiredPhoto'`             — enabled iff `evidenceFileName`
 *                                      is non-empty (≤255 chars, no
 *                                      path separators).
 *   - `'RequiredHandoverChecklist'` — enabled iff every visible row
 *                                      is ticked AND the trimmed
 *                                      handover note is non-empty.
 *
 * The store's `checkOut(...)` re-runs the same validator before any
 * write, so the rejection path is the canonical
 * `'EVIDENCE_REQUIRED'` error contract — race conditions or buggy
 * callers that skip the gate cannot bypass it.
 *
 * Wave 3 scope only — the dialog NEVER opens / files a dispute,
 * NEVER touches escrow / ledgers, and NEVER triggers auto-release.
 * The 12-hour confirmation window is mentioned only as static copy.
 */

import { useEffect, useMemo, useState } from 'react';
import { Button, HelpPopover, Modal, Textarea } from '@/components/ui';
import {
  validateCheckoutPayload,
  type CheckoutPayload,
} from '@/domain/evidence';
import { CHECKOUT_CHECKLIST_ITEMS_VI, t } from '@/i18n/vi';
import { isSupabaseEnv } from '@/data/supabaseClient';
import type { Application, EvidenceRequirement, Shift } from '@/types';

const FILE_NAME_MAX = 255;

/** Levels for which the validator requires a non-empty checklist. */
const CHECKLIST_REQUIRED: ReadonlySet<EvidenceRequirement> = new Set([
  'ChecklistOnly',
  'RequiredHandoverChecklist',
]);

/** Levels for which the dialog requires a non-empty handover note. */
const NOTE_REQUIRED: ReadonlySet<EvidenceRequirement> = new Set([
  'RequiredHandoverChecklist',
]);

/** Levels for which the dialog requires a mock evidence filename. */
const FILE_REQUIRED: ReadonlySet<EvidenceRequirement> = new Set([
  'RequiredPhoto',
]);

/** Levels where the photo filename input is at all visible. */
const FILE_VISIBLE: ReadonlySet<EvidenceRequirement> = new Set([
  'OptionalPhoto',
  'RequiredPhoto',
  'RequiredHandoverChecklist',
]);

export interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  application: Application;
  shift: Shift;
  /**
   * Called when the worker submits a payload that passes the local
   * gating mirror. Parent forwards this to
   * `applicationStore.checkOut({ applicationId, ...payload })`.
   */
  onSubmit: (payload: CheckoutPayload) => void;
  loading?: boolean;
  /** Vietnamese error string set by the parent on store rejection. */
  errorMessage?: string | null;
}

export function CheckoutDialog({
  open,
  onClose,
  application,
  shift,
  onSubmit,
  loading = false,
  errorMessage = null,
}: CheckoutDialogProps) {
  // The validator and the checklist template both default to the
  // safest interpretation when the requirement is missing — we mirror
  // that in the UI by treating an undefined level as `'None'`.
  const requirement: EvidenceRequirement =
    shift.evidenceRequirement ?? 'None';
  const items = CHECKOUT_CHECKLIST_ITEMS_VI[requirement];

  // Initial checklist state. For optional levels we pre-tick all rows
  // so the worker doesn't need to interact unless they want to. For
  // required levels we leave them un-ticked so the submit button
  // stays disabled until the worker confirms each item.
  const initialChecklist = useMemo<boolean[]>(() => {
    if (CHECKLIST_REQUIRED.has(requirement)) {
      return items.map(() => false);
    }
    return items.map(() => true);
  }, [items, requirement]);

  const [checklist, setChecklist] = useState<boolean[]>(initialChecklist);
  const [note, setNote] = useState('');
  const [fileName, setFileName] = useState('');

  // Reset state on each open so a previous failed submit doesn't
  // leak into a fresh attempt for a different shift / application.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional checkout-form reset on open so a prior failed submit doesn't leak across shifts; refactor would change dialog behavior
      setChecklist(initialChecklist);
      setNote('');
      setFileName('');
    }
  }, [open, application.id, initialChecklist]);

  // Item 5 — production (supabase): upload ảnh thật CHƯA có (chưa có Supabase
  // Storage) → ẩn trường tên-tệp ảnh giả ở mọi mức, kể cả phần ảnh tùy chọn của
  // RequiredHandoverChecklist. RequiredPhoto (dữ liệu cũ) KHÔNG ép ảnh giả.
  const supabase = isSupabaseEnv();
  const showFileField = FILE_VISIBLE.has(requirement) && !supabase;
  const fileRequired = FILE_REQUIRED.has(requirement) && !supabase;
  const noteRequired = NOTE_REQUIRED.has(requirement);
  const checklistRequired = CHECKLIST_REQUIRED.has(requirement);

  const payload: CheckoutPayload = {
    checklist: items.length > 0 ? checklist : undefined,
    note,
    evidenceFileName: showFileField ? fileName : undefined,
  };
  // Ở supabase, RequiredPhoto không còn ép ảnh (server cũng không) → dùng mức
  // không-ép-ảnh cho client mirror để không chặn oan check-out.
  const clientRequirement: EvidenceRequirement =
    supabase && requirement === 'RequiredPhoto' ? 'None' : requirement;
  const validation = validateCheckoutPayload(clientRequirement, payload);
  const submitEnabled = validation.ok && !loading;

  function handleToggle(index: number, value: boolean) {
    setChecklist((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!submitEnabled) return;
    onSubmit(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('checkout.dialog.title')}
      className="max-w-lg"
    >
      <form
        className="flex flex-col gap-4 text-sm text-gray-800"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* Intro + HelpPopover. The popover sits inline next to the
            intro so workers see "Vì sao cần bằng chứng?" without
            leaving the dialog. */}
        <div className="flex items-start gap-2">
          <p className="flex-1 leading-relaxed text-gray-600">
            {t('checkout.dialog.intro')}
          </p>
          <HelpPopover
            title={t('help.checkout.title')}
            description={t('help.checkout.description')}
          />
        </div>

        {/* Checklist — driven by CHECKOUT_CHECKLIST_ITEMS_VI. For
            optional levels rows pre-tick on open so the worker can
            submit without touching them; for required levels rows
            start un-ticked. */}
        {items.length > 0 ? (
          <fieldset className="rounded-xl border border-orange-100 bg-orange-50/40 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
              {t('checkout.dialog.checklist.title')}
            </legend>
            <ul className="mt-1 flex flex-col gap-2">
              {items.map((label, idx) => {
                const id = `checkout-check-${idx}`;
                return (
                  <li key={id}>
                    <label
                      htmlFor={id}
                      className="flex items-start gap-2 text-sm leading-relaxed"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-orange-500"
                        checked={checklist[idx] ?? false}
                        onChange={(e) => handleToggle(idx, e.target.checked)}
                      />
                      <span>{label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : (
          <p className="text-xs italic text-gray-500">
            {t('checkout.dialog.checklist.empty')}
          </p>
        )}

        {/* Handover note. Always rendered; the validator decides
            whether it's required for the current level. */}
        <Textarea
          label={t('checkout.dialog.note.label')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={t('checkout.dialog.note.placeholder')}
          hint={
            noteRequired
              ? t('checkout.dialog.note.hintRequired')
              : t('checkout.dialog.note.hintOptional')
          }
          required={noteRequired}
        />

        {/* Photo filename — visible only for `'OptionalPhoto'`,
            `'RequiredPhoto'`, and `'RequiredHandoverChecklist'`. */}
        {showFileField && (
          <div className="flex flex-col gap-1">
            <label
              htmlFor="checkout-evidence-file"
              className="text-sm font-medium text-gray-700"
            >
              {t('checkout.dialog.evidenceFile.label')}
              {fileRequired && (
                <span className="ml-1 text-red-500" aria-hidden="true">
                  *
                </span>
              )}
            </label>
            <input
              id="checkout-evidence-file"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={t('checkout.dialog.evidenceFile.placeholder')}
              maxLength={FILE_NAME_MAX}
              required={fileRequired}
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm font-mono text-gray-900',
                'min-h-[44px] transition-colors duration-150',
                'placeholder:font-sans placeholder:text-gray-400',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
                'border-gray-300 bg-white hover:border-gray-400',
              ].join(' ')}
            />
            <p className="text-xs text-gray-500">
              {fileRequired
                ? t('checkout.dialog.evidenceFile.hintRequired')
                : t('checkout.dialog.evidenceFile.hintOptional')}
            </p>
          </div>
        )}

        {/* Server-side rejection (e.g. EVIDENCE_REQUIRED race) is
            surfaced as a top-of-dialog alert so screen readers
            receive the message immediately. The dialog stays open. */}
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
            {t('checkout.dialog.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!submitEnabled}
            loading={loading}
            className="w-full sm:w-auto"
          >
            {t('checkout.dialog.submit')}
          </Button>
        </footer>

        {/* Static helper hints for required-vs-optional state, so a
            screen-reader user understands why submit might be
            disabled. */}
        <p className="sr-only">
          {checklistRequired
            ? 'Checklist bắt buộc — tích đầy đủ các mục để bật nút gửi.'
            : ''}
          {noteRequired
            ? ' Ghi chú bàn giao bắt buộc — nhập ít nhất 1 ký tự.'
            : ''}
          {fileRequired
            ? ' Tên tệp ảnh bàn giao bắt buộc — nhập tên tệp.'
            : ''}
        </p>
      </form>
    </Modal>
  );
}
