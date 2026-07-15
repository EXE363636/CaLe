// Feature: checkpoint-readiness-phase-1, Task 4.4 / 4.1 — Partners
// section for the About page. Renders the potential / directional
// partner groups, each item independently so a missing/blank entry
// never collapses the whole section (R6, partial-render philosophy
// R5.5).
//
// Reuses the existing `InfoSection` primitive (R12.9 — no UI redesign).
// All display copy comes from `src/i18n/vi.ts` via `t()` (Task 4.1);
// every potential group is badged as directional via the pure
// `labelForPartner` helper.

import { InfoSection } from '@/components/layout/InfoPage';
import { t } from '@/i18n/vi';
import { PARTNER_GROUPS, labelForPartner, type Partner } from './partners';

export function PartnersSection({
  partners = PARTNER_GROUPS,
}: {
  partners?: Partner[];
}) {
  const items = partners.filter((p) => p.nameKey.trim().length > 0);
  const emphasis = t('about.partners.disclaimerEmphasis');
  const intro = t('about.partners.intro');
  // Split the intro around the emphasised clause so we can <strong> it
  // without hardcoding sentence fragments in the component.
  const [introBefore, introAfter] = intro.includes(emphasis)
    ? (intro.split(emphasis) as [string, string])
    : [intro, ''];

  return (
    <InfoSection title={t('about.partners.title')}>
      <p className="mb-3">
        {introBefore}
        {introAfter ? <strong>{emphasis}</strong> : null}
        {introAfter}
      </p>

      {items.length === 0 ? (
        <p className="text-gray-500">{t('about.partners.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((partner) => {
            const labelKey = labelForPartner(partner);
            return (
              <li
                key={partner.nameKey}
                className="flex flex-wrap items-center gap-2"
              >
                <span>{t(partner.nameKey)}</span>
                {labelKey && (
                  <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                    {t(labelKey)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </InfoSection>
  );
}
