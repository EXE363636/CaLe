// Feature: checkpoint-readiness-phase-1, Task 5.8 — IndustryFocus.
//
// Static block listing the six focus industries (R11.1). Each industry
// now has an emoji icon for visual richness. Reuses the `Card` primitive.

import { Card } from '@/components/ui';
import { t } from '@/i18n/vi';
import { INDUSTRY_FOCUS, type IndustryFocusItem } from './roleContentData';

const EMPTY_FALLBACK = 'Nội dung đang được cập nhật.';

// Map industry keys to emojis for visual richness
const INDUSTRY_EMOJIS: Record<string, string> = {
  'landing.industry.fnb': '🍜',
  'landing.industry.cafe': '☕',
  'landing.industry.events': '🎪',
  'landing.industry.weddings': '💍',
  'landing.industry.retail': '🛍️',
  'landing.industry.logistics': '📦',
};

// Map industry keys to gradient classes
const INDUSTRY_GRADIENTS: Record<string, string> = {
  'landing.industry.fnb': 'from-orange-400 to-red-500',
  'landing.industry.cafe': 'from-amber-400 to-orange-500',
  'landing.industry.events': 'from-purple-400 to-pink-500',
  'landing.industry.weddings': 'from-pink-400 to-rose-500',
  'landing.industry.retail': 'from-blue-400 to-indigo-500',
  'landing.industry.logistics': 'from-teal-400 to-emerald-500',
};

export function IndustryFocus({
  industries = INDUSTRY_FOCUS,
}: {
  industries?: IndustryFocusItem[];
}) {
  const items = industries.filter((i) => i.nameKey.trim().length > 0);

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto min-w-0 max-w-5xl">
        <div className="mb-10 text-center">
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--brand)' }}
          >
            {t('landing.industry.eyebrow')}
          </span>
          <h2
            className="mt-2 text-2xl font-bold sm:text-3xl"
            style={{ color: 'var(--foreground)' }}
          >
            {t('landing.industry.title')}
          </h2>
          <p
            className="mx-auto mt-2 max-w-xl text-sm"
            style={{ color: 'var(--muted)' }}
          >
            {t('landing.industry.lead')}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>{EMPTY_FALLBACK}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {items.map((item) => {
              const label = t(item.nameKey);
              const emoji = INDUSTRY_EMOJIS[item.nameKey] ?? '🏢';
              const gradient = INDUSTRY_GRADIENTS[item.nameKey] ?? 'from-orange-400 to-orange-600';
              return (
                <Card
                  key={item.nameKey}
                  tone="default"
                  className="card-lift min-w-0 cursor-default text-center transition-all duration-200"
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(8px)',
                    borderColor: 'rgba(249, 115, 22, 0.10)',
                  } as React.CSSProperties}
                >
                  <div className="flex flex-col items-center gap-2.5">
                    {/* Gradient icon circle */}
                    <span
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-xl shadow-md`}
                      style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}
                      aria-hidden="true"
                    >
                      {emoji}
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {label || EMPTY_FALLBACK}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
