/**
 * Phase 10C — Pure helper tests (Wave 0).
 *
 * Wave 0 scope: types, constants, and the pure evidence helpers in
 * `src/domain/evidence.ts` plus the Vietnamese label dictionary
 * and the static checkout-checklist template in `src/i18n/vi.ts`.
 *
 * Later waves will append store, UI, and lifecycle tests to this same
 * file (per `tasks.md` group 12). For now we lock down only what the
 * implementation introduced in Wave 0 so a regression here fails the
 * suite immediately.
 *
 * Properties exercised in this file:
 *
 *   - Property 1  — Risk-level evidence mapping (Requirement 1.3,
 *                   1.4, 1.5, 1.9).
 *   - Property 2  — Helper purity and composition equation
 *                   (Requirement 1.6, 1.8).
 *   - Property 3  — Vietnamese label totality (Requirement 1.7).
 *   - Property 6  — Checkout payload validation predicate
 *                   (Requirement 4.3, 4.4, 4.5, 4.6, 4.7, 4.8).
 *
 * Property tests use `fast-check` with `numRuns: 100` minimum and the
 * tag comment format `// Feature: phase-10c-escrow-release,
 * Property N: <text>` per the design's testing strategy.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  CheckoutPayload,
  CHECKLIST_ITEM_COUNT,
  DEFAULT_EVIDENCE_REQUIREMENT,
  EVIDENCE_REQUIREMENT_VALUES,
  getSuggestedEvidenceLevel,
  suggestedEvidenceForJobType,
  validateCheckoutPayload,
} from '@/domain/evidence';
import {
  CHECKOUT_CHECKLIST_ITEMS_VI,
  EVIDENCE_REQUIREMENT_LABELS,
  evidenceRequirementLabel,
  t,
} from '@/i18n/vi';
import {
  EMPLOYER_DISPUTE_CATEGORIES,
  WORKER_DISPUTE_CATEGORIES,
} from '@/types';
import type {
  EvidenceRequirement,
  EmployerDisputeCategory,
  WorkerDisputeCategory,
} from '@/types';
import { jobCategoryRiskLevel, type JobRiskLevel } from '@/domain/skillScore';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const RISK_LEVELS: readonly JobRiskLevel[] = ['Low', 'Medium', 'High'] as const;

const arbRiskLevel = fc.constantFrom<JobRiskLevel>(...RISK_LEVELS);

const arbEvidenceRequirement = fc.constantFrom<EvidenceRequirement>(
  ...EVIDENCE_REQUIREMENT_VALUES,
);

/**
 * Job types we know about (canonical strings used in the seed) plus
 * arbitrary strings so generators exercise the unknown / safe-default
 * branch too.
 */
const KNOWN_JOB_TYPES = [
  'Phát tờ rơi',
  'Hỗ trợ sự kiện',
  'Phục vụ',
  'Pha chế',
  'Kho vận',
  'Thu ngân',
  'Bảo vệ',
  'event-support',
  'sampling',
  'booth-activation',
  'packaging',
  'warehouse-helper',
  'fnb-support',
  'cash-handling',
  'high-value-goods',
  'unsupervised-inventory',
];

const arbKnownJobType = fc.constantFrom(...KNOWN_JOB_TYPES);
const arbAnyJobType = fc.oneof(arbKnownJobType, fc.string({ minLength: 1 }));

// Out-of-enum risk values used to exercise Requirement 1.9.
const arbInvalidRiskLevel = fc.constantFrom<unknown>(
  '',
  'low',
  'HIGH',
  'banana',
  null,
  undefined,
  0,
  42,
  {},
  [],
);

const arbCheckoutPayload: fc.Arbitrary<CheckoutPayload> = fc.record(
  {
    checklist: fc.option(fc.array(fc.boolean(), { maxLength: 8 }), {
      nil: undefined,
    }),
    note: fc.option(fc.string({ maxLength: 60 }), { nil: undefined }),
    evidenceFileName: fc.option(
      fc
        .string({ maxLength: 60 })
        // Drop strings carrying path separators when generating the
        // success-path payload; the rejection path has its own
        // generators below.
        .filter((s) => !s.includes('/') && !s.includes('\\')),
      { nil: undefined },
    ),
  },
  { requiredKeys: [] },
);

// ---------------------------------------------------------------------------
// Property 1 — Risk-level evidence mapping
// ---------------------------------------------------------------------------

describe('getSuggestedEvidenceLevel — Risk_Level mapping is exact', () => {
  // Feature: phase-10c-escrow-release, Property 1: Risk-level evidence mapping
  it('returns a value in the per-risk allowed subset for every valid risk level', () => {
    const allowed: Record<JobRiskLevel, ReadonlySet<EvidenceRequirement>> = {
      Low: new Set(['ChecklistOnly', 'OptionalPhoto']),
      Medium: new Set(['OptionalPhoto', 'RequiredHandoverChecklist']),
      High: new Set(['RequiredHandoverChecklist', 'RequiredPhoto']),
    };

    fc.assert(
      fc.property(arbAnyJobType, arbRiskLevel, (jobType, riskLevel) => {
        const got = getSuggestedEvidenceLevel(jobType, riskLevel);
        expect(allowed[riskLevel].has(got)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: phase-10c-escrow-release, Property 1: Risk-level evidence mapping (safe default branch)
  it('returns the safe default for out-of-enum risk levels', () => {
    fc.assert(
      fc.property(arbAnyJobType, arbInvalidRiskLevel, (jobType, bogus) => {
        const got = getSuggestedEvidenceLevel(
          jobType,
          bogus as JobRiskLevel,
        );
        expect(got).toBe(DEFAULT_EVIDENCE_REQUIREMENT);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: phase-10c-escrow-release, Property 1: Risk-level evidence mapping (empty jobType branch)
  it('returns the safe default for an empty / non-string jobType', () => {
    fc.assert(
      fc.property(arbRiskLevel, (riskLevel) => {
        expect(getSuggestedEvidenceLevel('', riskLevel)).toBe(
          DEFAULT_EVIDENCE_REQUIREMENT,
        );
        // Cast through unknown to exercise the runtime guard without
        // upsetting the type signature.
        expect(
          getSuggestedEvidenceLevel(
            undefined as unknown as string,
            riskLevel,
          ),
        ).toBe(DEFAULT_EVIDENCE_REQUIREMENT);
      }),
      { numRuns: 100 },
    );
  });

  it('uses the documented canonical mapping per risk level', () => {
    expect(getSuggestedEvidenceLevel('Phát tờ rơi', 'Low')).toBe(
      'ChecklistOnly',
    );
    expect(getSuggestedEvidenceLevel('Phục vụ', 'Medium')).toBe(
      'OptionalPhoto',
    );
    expect(getSuggestedEvidenceLevel('Thu ngân', 'High')).toBe(
      'RequiredHandoverChecklist',
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2 — Helper purity and composition equation
// ---------------------------------------------------------------------------

describe('getSuggestedEvidenceLevel — pure (state snapshots match)', () => {
  // Feature: phase-10c-escrow-release, Property 2: Helper purity and composition equation
  it('returns strictly equal results on successive calls and does not mutate input', () => {
    fc.assert(
      fc.property(arbAnyJobType, arbRiskLevel, (jobType, riskLevel) => {
        // Capture before-state snapshots: argument values and the
        // shared module constants.
        const jobTypeBefore = jobType;
        const valuesBefore = [...EVIDENCE_REQUIREMENT_VALUES];

        const a = getSuggestedEvidenceLevel(jobType, riskLevel);
        const b = getSuggestedEvidenceLevel(jobType, riskLevel);

        expect(a).toBe(b);
        // No argument mutation.
        expect(jobType).toBe(jobTypeBefore);
        // No mutation of module-level constants.
        expect([...EVIDENCE_REQUIREMENT_VALUES]).toEqual(valuesBefore);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: phase-10c-escrow-release, Property 2: Helper purity and composition equation (composition)
  it('suggestedEvidenceForJobType equals the explicit composition', () => {
    fc.assert(
      fc.property(arbAnyJobType, (jobType) => {
        expect(suggestedEvidenceForJobType(jobType)).toBe(
          getSuggestedEvidenceLevel(jobType, jobCategoryRiskLevel(jobType)),
        );
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3 — Vietnamese label totality
// ---------------------------------------------------------------------------

describe('Vietnamese label totality across the EvidenceRequirement enum', () => {
  // Feature: phase-10c-escrow-release, Property 3: Vietnamese label totality
  it('every label is 1..80 chars, has a Vietnamese diacritic, and is not the literal English name', () => {
    const diacriticRegex = /[à-ỹÀ-Ỹ]/i;

    fc.assert(
      fc.property(arbEvidenceRequirement, (req) => {
        const fromMap = EVIDENCE_REQUIREMENT_LABELS[req];
        const fromHelper = evidenceRequirementLabel(req);
        const fromT = t(`evidence.requirement.${req}`);

        // All three lookup routes return the same string.
        expect(fromHelper).toBe(fromMap);
        expect(fromT).toBe(fromMap);

        expect(fromMap.length).toBeGreaterThanOrEqual(1);
        expect(fromMap.length).toBeLessThanOrEqual(80);
        expect(diacriticRegex.test(fromMap)).toBe(true);
        // Not the literal English name (e.g. "RequiredPhoto").
        expect(fromMap).not.toBe(req);
      }),
      { numRuns: 100 },
    );
  });

  it('helper copy keys are all present and within bounds', () => {
    for (const req of EVIDENCE_REQUIREMENT_VALUES) {
      const helper = t(`evidence.helper.${req}`);
      expect(helper).not.toBe(`evidence.helper.${req}`); // no fallback
      expect(helper.length).toBeGreaterThanOrEqual(1);
      expect(helper.length).toBeLessThanOrEqual(200);
    }
  });

  it('CHECKOUT_CHECKLIST_ITEMS_VI is total over the enum and uses Vietnamese rows', () => {
    const diacriticRegex = /[à-ỹÀ-Ỹ]/i;
    for (const req of EVIDENCE_REQUIREMENT_VALUES) {
      const items = CHECKOUT_CHECKLIST_ITEMS_VI[req];
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeLessThanOrEqual(50);
      for (const row of items) {
        expect(row.length).toBeGreaterThanOrEqual(1);
        expect(row.length).toBeLessThanOrEqual(200);
        expect(diacriticRegex.test(row)).toBe(true);
      }
    }
    // 'None' must not produce a checklist.
    expect(CHECKOUT_CHECKLIST_ITEMS_VI.None).toEqual([]);
  });

  it('CHECKLIST_ITEM_COUNT stays in sync with CHECKOUT_CHECKLIST_ITEMS_VI', () => {
    for (const req of EVIDENCE_REQUIREMENT_VALUES) {
      expect(CHECKLIST_ITEM_COUNT[req]).toBe(
        CHECKOUT_CHECKLIST_ITEMS_VI[req].length,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Property 6 — Checkout payload validation predicate
// ---------------------------------------------------------------------------

describe('validateCheckoutPayload — per-level predicate', () => {
  // Feature: phase-10c-escrow-release, Property 6: Checkout payload validation predicate
  it("'None' always passes for any payload within length bounds", () => {
    fc.assert(
      fc.property(arbCheckoutPayload, (payload) => {
        const result = validateCheckoutPayload('None', payload);
        // Length-bound failures should still reject; everything else
        // succeeds.
        const noteOk = (payload.note ?? '').length <= 1000;
        const fileOk = (payload.evidenceFileName ?? '').length <= 255;
        if (noteOk && fileOk) {
          expect(result).toEqual({ ok: true });
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: phase-10c-escrow-release, Property 6: Checkout payload validation predicate (ChecklistOnly)
  it("'ChecklistOnly' passes iff every visible row is ticked", () => {
    const expectedLen = CHECKLIST_ITEM_COUNT.ChecklistOnly;
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), {
          minLength: expectedLen,
          maxLength: expectedLen,
        }),
        (checklist) => {
          const result = validateCheckoutPayload('ChecklistOnly', {
            checklist,
          });
          const allTicked = checklist.every((b) => b === true);
          if (allTicked) {
            expect(result).toEqual({ ok: true });
          } else {
            expect(result).toEqual({
              ok: false,
              reason: 'CHECKLIST_INCOMPLETE',
            });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("'ChecklistOnly' rejects mismatched checklist lengths as CHECKLIST_INCOMPLETE", () => {
    const expectedLen = CHECKLIST_ITEM_COUNT.ChecklistOnly;
    // Empty payload.
    expect(validateCheckoutPayload('ChecklistOnly', {})).toEqual({
      ok: false,
      reason: 'CHECKLIST_INCOMPLETE',
    });
    // All-ticked but shorter than the template.
    expect(
      validateCheckoutPayload('ChecklistOnly', {
        checklist: Array(expectedLen - 1).fill(true),
      }),
    ).toEqual({ ok: false, reason: 'CHECKLIST_INCOMPLETE' });
    // All-ticked but longer than the template.
    expect(
      validateCheckoutPayload('ChecklistOnly', {
        checklist: Array(expectedLen + 1).fill(true),
      }),
    ).toEqual({ ok: false, reason: 'CHECKLIST_INCOMPLETE' });
  });

  // Feature: phase-10c-escrow-release, Property 6: Checkout payload validation predicate (RequiredPhoto)
  it("'RequiredPhoto' passes iff evidenceFileName is non-empty and ≤255", () => {
    fc.assert(
      fc.property(
        fc
          .string({ maxLength: 300 })
          .filter((s) => !s.includes('/') && !s.includes('\\')),
        (raw) => {
          const result = validateCheckoutPayload('RequiredPhoto', {
            evidenceFileName: raw,
          });
          if (raw.length > 255) {
            expect(result).toEqual({ ok: false, reason: 'FIELD_TOO_LONG' });
          } else if (raw.trim().length === 0) {
            expect(result).toEqual({ ok: false, reason: 'PHOTO_REQUIRED' });
          } else {
            expect(result).toEqual({ ok: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: phase-10c-escrow-release, Property 6: Checkout payload validation predicate (RequiredHandoverChecklist)
  it("'RequiredHandoverChecklist' passes iff every row ticked AND note non-empty", () => {
    const expectedLen = CHECKLIST_ITEM_COUNT.RequiredHandoverChecklist;
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), {
          minLength: expectedLen,
          maxLength: expectedLen,
        }),
        fc.string({ maxLength: 60 }),
        (checklist, note) => {
          const result = validateCheckoutPayload('RequiredHandoverChecklist', {
            checklist,
            note,
          });
          const allTicked = checklist.every((b) => b === true);
          const noteOk = note.trim().length > 0;
          if (!allTicked) {
            expect(result).toEqual({
              ok: false,
              reason: 'CHECKLIST_INCOMPLETE',
            });
          } else if (!noteOk) {
            expect(result).toEqual({ ok: false, reason: 'NOTE_REQUIRED' });
          } else {
            expect(result).toEqual({ ok: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("'OptionalPhoto' passes for any in-bounds payload", () => {
    expect(validateCheckoutPayload('OptionalPhoto', {})).toEqual({ ok: true });
    expect(
      validateCheckoutPayload('OptionalPhoto', {
        evidenceFileName: 'handover-2025.jpg',
      }),
    ).toEqual({ ok: true });
    expect(
      validateCheckoutPayload('OptionalPhoto', { note: 'Đã bàn giao xong.' }),
    ).toEqual({ ok: true });
  });

  it('rejects path separators in evidenceFileName as FIELD_TOO_LONG', () => {
    expect(
      validateCheckoutPayload('OptionalPhoto', {
        evidenceFileName: '/etc/passwd',
      }),
    ).toEqual({ ok: false, reason: 'FIELD_TOO_LONG' });
    expect(
      validateCheckoutPayload('RequiredPhoto', {
        evidenceFileName: '..\\windows\\system32',
      }),
    ).toEqual({ ok: false, reason: 'FIELD_TOO_LONG' });
  });

  it('rejects an over-length note as FIELD_TOO_LONG regardless of level', () => {
    const longNote = 'a'.repeat(1001);
    for (const req of EVIDENCE_REQUIREMENT_VALUES) {
      const result = validateCheckoutPayload(req, { note: longNote });
      expect(result).toEqual({ ok: false, reason: 'FIELD_TOO_LONG' });
    }
  });
});

// ---------------------------------------------------------------------------
// Constants — Dispute category enums
// ---------------------------------------------------------------------------

describe('Phase 10C dispute category enums', () => {
  it('exposes the documented employer-side categories in stable order', () => {
    expect([...EMPLOYER_DISPUTE_CATEGORIES]).toEqual<EmployerDisputeCategory[]>([
      'NoShow',
      'LeftEarly',
      'ChecklistFailed',
      'MisrepresentedSkills',
      'BehaviorIssue',
      'Damage',
      'Other',
    ]);
  });

  it('exposes the documented worker-side categories in stable order', () => {
    expect([...WORKER_DISPUTE_CATEGORIES]).toEqual<WorkerDisputeCategory[]>([
      'WrongAddress',
      'UnsafeWorksite',
      'EmployerNoShow',
      'ScopeChanged',
      'PaymentDispute',
      'AbsentDispute',
      'Other',
    ]);
  });
});
