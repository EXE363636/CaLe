// Feature: checkpoint-readiness-phase-1, Task 5.7 — RoleContent.
//
// Presentational component for the landing role view. Given a `role`
// ('worker' | 'employer' | null) it renders EXACTLY ONE of:
//   - the neutral chooser intro (role === null), or
//   - the worker view, or
//   - the employer view
// It never renders both role views at once (R1.8). All copy comes from
// `contentForRole` keys resolved with `t()`. No store access here — the
// role is a prop, so this component is trivially testable and reusable;
// the store wiring lives in the parent island (Task 5.9).
//
// Reuses the `Card` primitive + the existing numbered-step visual idiom
// (R2.7 / R12.9 — no UI redesign).

import Link from 'next/link';
import { Card } from '@/components/ui';
import { t } from '@/i18n/vi';
import {
  contentForRole,
  isRoleView,
  type RoleView,
} from './roleContentData';
import type { SelectedRole } from '@/stores/roleSelectionStore';

function CheckMark() {
  return (
    <svg
      className="mt-0.5 h-5 w-5 shrink-0 text-orange-500"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white shadow-md ring-4 ring-orange-50">
      {n}
    </span>
  );
}

function RoleViewBlock({ view }: { view: RoleView }) {
  return (
    <div className="mx-auto min-w-0 max-w-3xl">
      <div className="text-center">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
          {t(view.eyebrowKey)}
        </span>
        <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
          {t(view.titleKey)}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
          {t(view.leadKey)}
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Benefits */}
        <Card tone="warm" className="min-w-0">
          <h3 className="mb-4 font-semibold text-orange-700">
            {t('landing.benefits.heading')}
          </h3>
          <ul className="flex flex-col gap-3">
            {view.benefitKeys.map((key) => (
              <li key={key} className="flex gap-2.5">
                <CheckMark />
                <span className="min-w-0 text-sm text-gray-700">{t(key)}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Steps */}
        <Card tone="warm" className="min-w-0">
          <h3 className="mb-4 font-semibold text-orange-700">
            {t('landing.steps.heading')}
          </h3>
          <ol className="flex flex-col gap-4">
            {view.steps.map((step, i) => (
              <li key={step.titleKey} className="flex items-start gap-3">
                <StepNumber n={i + 1} />
                <div className="min-w-0 pt-0.5">
                  <p className="font-semibold text-gray-900">{t(step.titleKey)}</p>
                  <p className="text-sm text-gray-500">{t(step.descKey)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href={view.cta.href}
          className="motion-press inline-flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-7 text-base font-semibold text-white shadow-md transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
        >
          {t(view.cta.labelKey)}
        </Link>
      </div>
    </div>
  );
}

export function RoleContent({ role }: { role: SelectedRole | null }) {
  const content = contentForRole(role);

  if (!isRoleView(content)) {
    // Neutral state — a short intro only; the actual chooser buttons are
    // rendered by <RoleSwitcher/>. Never shows either role's full content
    // (R1.6).
    return (
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {t(content.titleKey)}
        </h2>
        <p className="mt-2 text-sm text-gray-500">{t(content.introKey)}</p>
      </div>
    );
  }

  return <RoleViewBlock view={content} />;
}
