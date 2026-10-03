// Feature: checkpoint-readiness-phase-1, Task 4.4 / 4.1 — Partners
// section. Renders the potential / directional partner groups, each item
// independently so a missing/blank entry never collapses the whole section
// (R6, partial-render philosophy R5.5).
//
// 03/10 — trang `/about` gộp vào trang chủ (khối "Về CaLẻ"): thẻ riêng, tiêu đề h3; các nhóm
// là chip viền nét đứt + MỘT chú thích chung (nhãn định hướng từng nhóm ở dạng sr-only).
// All display copy comes from `src/i18n/vi.ts` via `t()` (Task 4.1);
// every potential group is badged as directional via the pure
// `labelForPartner` helper.

import { t as tVi } from '@/i18n/vi';
import type { TFunction } from '@/i18n/locale';
import { DIRECTIONAL_PARTNER_LABEL_KEY, PARTNER_GROUPS, labelForPartner, type Partner } from './partners';

export function PartnersSection({
  partners = PARTNER_GROUPS,
  t = tVi,
}: {
  partners?: Partner[];
  /** Theo ngôn ngữ của trang (getT); mặc định tiếng Việt. */
  t?: TFunction;
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
    <section
      aria-labelledby="home-partners"
      className="grid gap-8 rounded-3xl bg-white p-6 shadow-card ring-1 ring-black/5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] lg:gap-12"
    >
      <div>
        <h3 id="home-partners" className="text-lg font-semibold text-gray-900">
          {t('about.partners.title')}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {introBefore}
          {introAfter ? <strong className="font-semibold text-gray-900">{emphasis}</strong> : null}
          {introAfter}
        </p>
        {/* Chú thích chung thay cho nhãn lặp ở từng nhóm: viền nét đứt = định hướng. Mỗi
            nhóm vẫn mang nhãn riêng cho trình đọc màn hình (sr-only), R6.2. */}
        <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-gray-600">
          <span aria-hidden="true" className="h-3.5 w-7 rounded-full border-[1.5px] border-dashed border-orange-400 bg-orange-50" />
          {t(DIRECTIONAL_PARTNER_LABEL_KEY)}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-600">{t('about.partners.empty')}</p>
      ) : (
        <ul className="flex flex-wrap content-start gap-2.5">
          {items.map((partner) => {
            const labelKey = labelForPartner(partner);
            return (
              <li
                key={partner.nameKey}
                className={[
                  'inline-flex min-h-[40px] items-center rounded-full px-4 py-2 text-sm font-medium text-gray-900',
                  labelKey ? 'border-[1.5px] border-dashed border-orange-300 bg-orange-50/60' : 'border border-gray-200 bg-white',
                ].join(' ')}
              >
                {t(partner.nameKey)}
                {labelKey && <span className="sr-only"> ({t(labelKey)})</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
