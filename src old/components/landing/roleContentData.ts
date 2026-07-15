// Feature: checkpoint-readiness-phase-1, Task 5.5 — pure content model for
// the landing role separation (R1/R2/R11).
//
// `contentForRole(role)` is a PURE function: no React hooks, no browser
// storage, no store dependency, no network. It returns only the i18n KEYS
// for the requested role's view (benefits + 3 steps + CTA), or the neutral
// chooser content when `role` is null. Components resolve the keys with
// `t()` and render. Keeping this pure makes the disjointness + CTA rules
// (Property 2) trivially testable.
//
// Disjointness (R1.8): the worker view contains ONLY worker keys, the
// employer view ONLY employer keys. CTA routes reuse EXISTING routes only
// (Task 5 decision): worker → /shifts, employer → /register?role=employer.
// The survey CTA (/khao-sat) is intentionally NOT used here (Task 8).
//
// NOTE: filename is `roleContentData.ts` (not `roleContent.ts`) to avoid a
// case-only collision with the `RoleContent.tsx` component on
// case-insensitive (Windows/macOS) filesystems.

import type { SelectedRole } from '@/stores/roleSelectionStore';

export interface RoleStep {
  /** i18n key for the step title. */
  titleKey: string;
  /** i18n key for the step description. */
  descKey: string;
}

export interface RoleCta {
  /** i18n key for the CTA label. */
  labelKey: string;
  /** Existing route the CTA links to. */
  href: string;
}

export interface RoleView {
  role: SelectedRole;
  eyebrowKey: string;
  titleKey: string;
  leadKey: string;
  /** i18n keys for the role's benefit bullets. */
  benefitKeys: string[];
  /** Exactly three flow steps (R2.1/R2.2). */
  steps: [RoleStep, RoleStep, RoleStep];
  cta: RoleCta;
}

export interface RoleOption {
  role: SelectedRole;
  labelKey: string;
}

export interface NeutralContent {
  role: null;
  titleKey: string;
  introKey: string;
  switchHintKey: string;
  /** The two role choices offered in the neutral state (R1.1). */
  options: [RoleOption, RoleOption];
}

const WORKER_VIEW: RoleView = {
  role: 'worker',
  eyebrowKey: 'landing.role.worker.eyebrow',
  titleKey: 'landing.role.worker.title',
  leadKey: 'landing.role.worker.lead',
  benefitKeys: [
    'landing.role.worker.benefit1',
    'landing.role.worker.benefit2',
    'landing.role.worker.benefit3',
  ],
  steps: [
    { titleKey: 'landing.role.worker.step1.title', descKey: 'landing.role.worker.step1.desc' },
    { titleKey: 'landing.role.worker.step2.title', descKey: 'landing.role.worker.step2.desc' },
    { titleKey: 'landing.role.worker.step3.title', descKey: 'landing.role.worker.step3.desc' },
  ],
  cta: { labelKey: 'landing.role.worker.cta', href: '/shifts' },
};

const EMPLOYER_VIEW: RoleView = {
  role: 'employer',
  eyebrowKey: 'landing.role.employer.eyebrow',
  titleKey: 'landing.role.employer.title',
  leadKey: 'landing.role.employer.lead',
  benefitKeys: [
    'landing.role.employer.benefit1',
    'landing.role.employer.benefit2',
    'landing.role.employer.benefit3',
  ],
  steps: [
    { titleKey: 'landing.role.employer.step1.title', descKey: 'landing.role.employer.step1.desc' },
    { titleKey: 'landing.role.employer.step2.title', descKey: 'landing.role.employer.step2.desc' },
    { titleKey: 'landing.role.employer.step3.title', descKey: 'landing.role.employer.step3.desc' },
  ],
  cta: { labelKey: 'landing.role.employer.cta', href: '/register?role=employer' },
};

const NEUTRAL_CONTENT: NeutralContent = {
  role: null,
  titleKey: 'landing.roleSwitcher.title',
  introKey: 'landing.roleSwitcher.intro',
  switchHintKey: 'landing.roleSwitcher.switchHint',
  options: [
    { role: 'worker', labelKey: 'landing.roleSwitcher.worker' },
    { role: 'employer', labelKey: 'landing.roleSwitcher.employer' },
  ],
};

/**
 * Returns the content for the selected role, or the neutral chooser
 * content when `role` is null. Pure — the same input always yields the
 * same (frozen-shape) output, and the worker / employer views never share
 * keys (Property 2 / R1.8).
 */
export function contentForRole(role: SelectedRole | null): RoleView | NeutralContent {
  if (role === 'worker') return WORKER_VIEW;
  if (role === 'employer') return EMPLOYER_VIEW;
  return NEUTRAL_CONTENT;
}

/** Type guard distinguishing a resolved role view from the neutral state. */
export function isRoleView(
  content: RoleView | NeutralContent,
): content is RoleView {
  return content.role !== null;
}

// ---------------------------------------------------------------------------
// Industry focus (R11) — six focus industries, presented as deliberate
// focus (not "all industries"). Data only; rendering arrives in Step D.
// ---------------------------------------------------------------------------

export interface IndustryFocusItem {
  /** i18n key for the industry name. */
  nameKey: string;
}

export const INDUSTRY_FOCUS: IndustryFocusItem[] = [
  { nameKey: 'landing.industry.fnb' },
  { nameKey: 'landing.industry.cafe' },
  { nameKey: 'landing.industry.events' },
  { nameKey: 'landing.industry.weddings' },
  { nameKey: 'landing.industry.retail' },
  { nameKey: 'landing.industry.logistics' },
];
