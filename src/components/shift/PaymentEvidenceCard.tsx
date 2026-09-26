'use client';

/**
 * Phase 10C — Worker shift detail "Quy trình thanh toán & bằng chứng" card.
 *
 * Mounted on `/shifts/[id]` ABOVE the apply section so a worker sees:
 *
 *   1. The evidence requirement label for THIS shift (so they know
 *      what to prepare before applying).
 *   2. The per-level "what you'll need to do at check-out" copy.
 *   3. The confirmation rule, and
 *   4. The auto-release rule — both via `tSettlement`: local/demo keeps
 *      the simulated 12-hour rule; production states the server rule
 *      (auto-confirm + pay 24 h after the shift END, migration 0019).
 *   5. A `<HelpPopover>` titled "Khi nào cần bằng chứng?" with a
 *      friendly explainer.
 *   6. A privacy warning telling workers what NOT to capture.
 *   7. A red banner highlighting the requirement when the level is
 *      `'RequiredPhoto'` or `'RequiredHandoverChecklist'`.
 *
 * The card is read-only education — Wave 2 explicitly does NOT
 * change check-out validation, escrow flows, dispute UI, auto-release
 * lifecycle, or admin surfaces. It uses only Wave 0 helpers
 * (`evidenceRequirementLabel`, `t(...)`).
 */

import { EVIDENCE_REQUIREMENT_VALUES } from '@/domain/evidence';
import { evidenceRequirementLabel, t } from '@/i18n/vi';
import { HelpPopover } from '@/components/ui';
import { tSettlement } from '@/lib/settlementCopy';
import type { EvidenceRequirement, Shift } from '@/types';

interface PaymentEvidenceCardProps {
  shift: Shift;
}

/** Levels that require the worker to actively bring evidence at check-out. */
const REQUIRED_LEVELS: ReadonlySet<EvidenceRequirement> = new Set([
  'RequiredPhoto',
  'RequiredHandoverChecklist',
]);

export function PaymentEvidenceCard({ shift }: PaymentEvidenceCardProps) {
  const requirement = shift.evidenceRequirement;

  // Defensive — `shiftStore.hydrate` backfills missing values, so this
  // branch only triggers if the shift record itself is malformed.
  if (!requirement || !EVIDENCE_REQUIREMENT_VALUES.includes(requirement)) {
    return (
      <section
        aria-labelledby="payment-evidence-title"
        className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"
      >
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2
            id="payment-evidence-title"
            className="text-base font-semibold text-amber-900"
          >
            {t('shifts.detail.paymentEvidence.title')}
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-amber-900">
          {t('shifts.detail.paymentEvidence.fallback')}
        </p>
      </section>
    );
  }

  const isRequired = REQUIRED_LEVELS.has(requirement);
  const prepareKey = `shifts.detail.paymentEvidence.prepare.${requirement}` as const;

  return (
    <section
      aria-labelledby="payment-evidence-title"
      className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm"
    >
      {/* Heading + HelpPopover. The popover trigger sits inline next
          to the heading so screen readers reach it before the body. */}
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2
          id="payment-evidence-title"
          className="text-base font-semibold text-orange-900"
        >
          {t('shifts.detail.paymentEvidence.title')}
        </h2>
        <HelpPopover
          title={t('help.paymentEvidence.title')}
          description={tSettlement('help.paymentEvidence.description')}
          learnMoreHref="/handbook/muc-bang-chung-thanh-toan"
        />
      </div>

      {/* Plain-language intro: payment is released after the employer
          confirms; evidence is risk-based, not mandatory for every
          job. */}
      <p className="text-sm leading-relaxed text-orange-900/90">
        {t('shifts.detail.paymentEvidence.intro')}
      </p>

      {/* Required-evidence banner. Renders inside the same section so
          a worker scanning the card immediately sees what they must
          prepare. */}
      {isRequired && (
        <div
          role="note"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <p className="font-semibold">
            {t('shifts.detail.paymentEvidence.required.title')}
          </p>
          <p className="mt-1 leading-relaxed">
            {t('shifts.detail.paymentEvidence.required.body')}
          </p>
        </div>
      )}

      {/* Evidence requirement label + per-level "what to prepare"
          line. Reads from the Wave 0 i18n dictionary so the wording
          stays in one place. */}
      <dl className="mt-4 border-t border-orange-200/70 pt-4">
        <dt className="text-sm font-semibold text-orange-900">
          {t('shifts.detail.paymentEvidence.evidenceLabel')}
        </dt>
        <dd className="mt-1 text-sm font-medium text-orange-950">
          {evidenceRequirementLabel(requirement)}
        </dd>
        <dd className="mt-1 text-sm leading-relaxed text-orange-900">
          {t(prepareKey)}
        </dd>
      </dl>

      {/* Payment release rules — wording matches the spec verbatim
          so deep-linked notifications can quote them back. */}
      <ul className="mt-4 flex flex-col gap-2 text-sm leading-relaxed text-orange-900">
        <li className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
          />
          <span>{tSettlement('shifts.detail.paymentEvidence.confirmRule')}</span>
        </li>
        <li className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
          />
          <span>{tSettlement('shifts.detail.paymentEvidence.autoReleaseRule')}</span>
        </li>
      </ul>

      {/* Privacy warning — same Vietnamese text used inside the
          employer ShiftForm so workers and employers see the same
          rules from both sides. */}
      <div role="note" className="mt-4 border-t border-orange-200/70 pt-4">
        <p className="text-sm font-medium leading-relaxed text-orange-950">
          {t('evidence.privacy.warning')}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-orange-900">
          {t('evidence.privacy.warning.detailed')}
        </p>
      </div>

      {/* Phase 10C-Stab-1 Batch 2 — concrete checklist + photo
          examples. Renders only when the requirement actually asks
          for that kind of evidence so workers see only the rows
          relevant to their next check-out. */}
      {(requirement === 'ChecklistOnly' ||
        requirement === 'RequiredHandoverChecklist') && (
        <div className="mt-3 text-sm text-orange-900">
          <p className="font-semibold">{t('evidence.examples.checklist.title')}</p>
          <ul className="mt-1 list-disc pl-5">
            <li>{t('evidence.examples.checklist.item1')}</li>
            <li>{t('evidence.examples.checklist.item2')}</li>
            <li>{t('evidence.examples.checklist.item3')}</li>
          </ul>
        </div>
      )}
      {(requirement === 'OptionalPhoto' ||
        requirement === 'RequiredPhoto' ||
        requirement === 'RequiredHandoverChecklist') && (
        <div className="mt-3 text-sm text-orange-900">
          <p className="font-semibold">{t('evidence.examples.photo.title')}</p>
          <ul className="mt-1 list-disc pl-5">
            <li>{t('evidence.examples.photo.item1')}</li>
            <li>{t('evidence.examples.photo.item2')}</li>
            <li>{t('evidence.examples.photo.item3')}</li>
            <li>{t('evidence.examples.photo.item4')}</li>
          </ul>
        </div>
      )}
    </section>
  );
}
