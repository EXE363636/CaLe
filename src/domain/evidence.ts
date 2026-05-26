/**
 * Phase 10C — Evidence requirement domain helpers.
 *
 * Pure module: no I/O, no clock reads, no module-level mutable state,
 * never throws. Two successive calls with identical arguments return
 * strictly equal results and leave reachable state byte-identical.
 *
 * Hosts:
 *
 *   - `getSuggestedEvidenceLevel(jobType, riskLevel)` — pure mapping
 *     from a `JobRiskLevel` to a recommended `EvidenceRequirement`
 *     value. Out-of-enum input or missing `jobType` returns the safe
 *     default `'RequiredHandoverChecklist'` rather than throw.
 *
 *   - `suggestedEvidenceForJobType(jobType)` — composition of
 *     `getSuggestedEvidenceLevel(jobType, jobCategoryRiskLevel(jobType))`.
 *
 *   - `validateCheckoutPayload(requirement, payload)` — pure
 *     predicate over a worker's check-out payload. Returns
 *     `{ ok: true }` on success; `{ ok: false, reason }` with a
 *     typed failure code on rejection. The store action
 *     `applicationStore.checkOut(...)` re-runs this check before any
 *     write so the rejection path is the canonical
 *     `'EVIDENCE_REQUIRED'` error contract.
 *
 * The mapping from `riskLevel` to the suggested level is intentionally
 * deterministic per risk level (no `jobType` switching today). The
 * `jobType` argument is preserved so a future refinement can specialise
 * suggestions per category without breaking the call signature.
 */

import { jobCategoryRiskLevel, type JobRiskLevel } from '@/domain/skillScore';
import type { EvidenceRequirement } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stable order for the 5-level picker UI. */
export const EVIDENCE_REQUIREMENT_VALUES: readonly EvidenceRequirement[] = [
  'None',
  'ChecklistOnly',
  'OptionalPhoto',
  'RequiredPhoto',
  'RequiredHandoverChecklist',
] as const;

/** Safe fallback when input is out-of-enum or `jobType` is missing. */
export const DEFAULT_EVIDENCE_REQUIREMENT: EvidenceRequirement =
  'RequiredHandoverChecklist';

/**
 * Number of "visible" checklist rows the dialog renders for each
 * `EvidenceRequirement`. The validator compares the worker's supplied
 * `checklist` array length against this map so a shorter or longer
 * payload always fails `'CHECKLIST_INCOMPLETE'` rather than slipping
 * through with `[true]`.
 *
 * Must stay in sync with `CHECKOUT_CHECKLIST_ITEMS_VI` in
 * `src/i18n/vi.ts`. The Phase 10C test suite pins the two together so
 * a future template edit can't drift.
 */
export const CHECKLIST_ITEM_COUNT: Record<EvidenceRequirement, number> = {
  None: 0,
  ChecklistOnly: 2,
  OptionalPhoto: 2,
  RequiredPhoto: 3,
  RequiredHandoverChecklist: 3,
};

const VALID_RISK_LEVELS: ReadonlySet<JobRiskLevel> = new Set([
  'Low',
  'Medium',
  'High',
]);

const VALID_REQUIREMENTS: ReadonlySet<EvidenceRequirement> = new Set(
  EVIDENCE_REQUIREMENT_VALUES,
);

// ---------------------------------------------------------------------------
// Suggestion helpers
// ---------------------------------------------------------------------------

/**
 * Recommend an `EvidenceRequirement` for a job category.
 *
 * Risk-level mapping (deterministic):
 *
 *   - `'Low'`    → `'ChecklistOnly'`             (Requirement 1.3)
 *   - `'Medium'` → `'OptionalPhoto'`             (Requirement 1.4)
 *   - `'High'`   → `'RequiredHandoverChecklist'` (Requirement 1.5)
 *
 * Anything else (out-of-enum `riskLevel`, missing / empty `jobType`)
 * returns `'RequiredHandoverChecklist'` (safe default,
 * Requirement 1.9).
 *
 * Pure: never throws, never reads the clock or globals.
 */
export function getSuggestedEvidenceLevel(
  jobType: string,
  riskLevel: JobRiskLevel,
): EvidenceRequirement {
  if (typeof jobType !== 'string' || jobType.length === 0) {
    return DEFAULT_EVIDENCE_REQUIREMENT;
  }
  if (!VALID_RISK_LEVELS.has(riskLevel)) {
    return DEFAULT_EVIDENCE_REQUIREMENT;
  }
  switch (riskLevel) {
    case 'Low':
      return 'ChecklistOnly';
    case 'Medium':
      return 'OptionalPhoto';
    case 'High':
      return 'RequiredHandoverChecklist';
    default:
      // Exhaustiveness guard — should be unreachable while
      // `JobRiskLevel` stays a 3-member union.
      return DEFAULT_EVIDENCE_REQUIREMENT;
  }
}

/**
 * Composition: `getSuggestedEvidenceLevel(jobType,
 * jobCategoryRiskLevel(jobType))`. Used by `ShiftForm` to seed the
 * picker on first paint and to drive the "Hệ thống đề xuất" chip.
 */
export function suggestedEvidenceForJobType(
  jobType: string,
): EvidenceRequirement {
  return getSuggestedEvidenceLevel(jobType, jobCategoryRiskLevel(jobType));
}

// ---------------------------------------------------------------------------
// Worker check-out payload validation
// ---------------------------------------------------------------------------

/**
 * Worker-supplied payload at check-out. Every field is optional in the
 * type so partial input flows through the dialog while the worker is
 * still filling it in; per-`EvidenceRequirement` rules below decide
 * when each field is required to enable the submit button.
 */
export interface CheckoutPayload {
  /**
   * Per-row state of the visible checklist. Length is expected to
   * match `CHECKOUT_CHECKLIST_ITEMS_VI[requirement]`. Lengths that
   * disagree fail with `'CHECKLIST_INCOMPLETE'`.
   */
  checklist?: boolean[];
  /** Free-text handover note, ≤1000 characters once trimmed. */
  note?: string;
  /** Mock filename, ≤255 characters; no path separators. */
  evidenceFileName?: string;
}

/**
 * Why `validateCheckoutPayload` rejected. Surfaces in the dialog as a
 * Vietnamese error message and is also used as the `reason` field on
 * the `'EVIDENCE_REQUIRED'` store error.
 */
export type EvidenceValidationFailure =
  | 'CHECKLIST_INCOMPLETE'
  | 'PHOTO_REQUIRED'
  | 'NOTE_REQUIRED'
  | 'FIELD_TOO_LONG';

/** Maximum bounds shared with the store. */
const NOTE_MAX = 1000;
const FILE_NAME_MAX = 255;

const PATH_SEPARATOR_REGEX = /[\\/]/;

/**
 * Validate a worker check-out payload against a shift's
 * `EvidenceRequirement`. Pure: never throws, never mutates input.
 *
 * Per-level rules (Requirements 4.3–4.8 + Phase 10C design):
 *
 *   - `'None'`                      — no checklist required, no
 *                                     photo required, optional note.
 *   - `'ChecklistOnly'`             — every visible checklist item
 *                                     ticked; photo optional; note
 *                                     optional.
 *   - `'OptionalPhoto'`             — checklist optional; photo
 *                                     optional; note optional.
 *   - `'RequiredPhoto'`             — `evidenceFileName` non-empty
 *                                     ≤255 chars; checklist + note
 *                                     optional.
 *   - `'RequiredHandoverChecklist'` — every visible checklist item
 *                                     ticked AND trimmed note
 *                                     non-empty ≤1000 chars; photo
 *                                     optional.
 *
 * Length and shape failures (note > 1000, filename > 255, filename
 * contains a path separator, checklist length mismatches the
 * requirement's template) all fail with `'FIELD_TOO_LONG'` (the field
 * is "out of contract") so callers map to a single localized message
 * keyed off the failure code.
 */
export function validateCheckoutPayload(
  requirement: EvidenceRequirement,
  payload: CheckoutPayload,
): { ok: true } | { ok: false; reason: EvidenceValidationFailure } {
  // Defensive: an unknown `requirement` is treated as the safe
  // default. The store will never call us with an invalid value, but
  // this keeps the function total.
  const effective = VALID_REQUIREMENTS.has(requirement)
    ? requirement
    : DEFAULT_EVIDENCE_REQUIREMENT;

  const note = typeof payload.note === 'string' ? payload.note : '';
  const trimmedNote = note.trim();
  const fileName =
    typeof payload.evidenceFileName === 'string'
      ? payload.evidenceFileName
      : '';
  const trimmedFileName = fileName.trim();
  const checklist = Array.isArray(payload.checklist) ? payload.checklist : [];

  // Length / shape bounds apply uniformly across levels.
  if (note.length > NOTE_MAX) {
    return { ok: false, reason: 'FIELD_TOO_LONG' };
  }
  if (fileName.length > FILE_NAME_MAX) {
    return { ok: false, reason: 'FIELD_TOO_LONG' };
  }
  if (
    trimmedFileName.length > 0 &&
    PATH_SEPARATOR_REGEX.test(trimmedFileName)
  ) {
    return { ok: false, reason: 'FIELD_TOO_LONG' };
  }

  switch (effective) {
    case 'None':
      return { ok: true };

    case 'ChecklistOnly': {
      const expected = CHECKLIST_ITEM_COUNT.ChecklistOnly;
      if (checklist.length !== expected) {
        return { ok: false, reason: 'CHECKLIST_INCOMPLETE' };
      }
      const allTicked = checklist.every((item) => item === true);
      if (!allTicked) {
        return { ok: false, reason: 'CHECKLIST_INCOMPLETE' };
      }
      return { ok: true };
    }

    case 'OptionalPhoto':
      return { ok: true };

    case 'RequiredPhoto': {
      if (trimmedFileName.length === 0) {
        return { ok: false, reason: 'PHOTO_REQUIRED' };
      }
      return { ok: true };
    }

    case 'RequiredHandoverChecklist': {
      const expected = CHECKLIST_ITEM_COUNT.RequiredHandoverChecklist;
      if (checklist.length !== expected) {
        return { ok: false, reason: 'CHECKLIST_INCOMPLETE' };
      }
      const allTicked = checklist.every((item) => item === true);
      if (!allTicked) {
        return { ok: false, reason: 'CHECKLIST_INCOMPLETE' };
      }
      if (trimmedNote.length === 0) {
        return { ok: false, reason: 'NOTE_REQUIRED' };
      }
      return { ok: true };
    }

    default: {
      // Exhaustiveness guard — unreachable while
      // `EvidenceRequirement` stays a 5-member union.
      const _exhaustive: never = effective;
      void _exhaustive;
      return { ok: false, reason: 'FIELD_TOO_LONG' };
    }
  }
}
