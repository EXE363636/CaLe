// Feature: checkpoint-readiness-phase-1, Task 4.2 / 4.1 — partner data +
// the `labelForPartner` pure function backing the About > Partners
// section.
//
// CaLẻ is early-stage and has NO established partnerships yet. Every
// group below is therefore `potential` and MUST be presented as a
// directional / future-looking intent (R6.1/R6.2/R6.4).
//
// Task 4.1: display strings live in `src/i18n/vi.ts`. This module holds
// only i18n KEYS + status, so `labelForPartner` stays a pure function
// decoupled from the actual Vietnamese copy — it returns the badge i18n
// key (resolved with `t()` at the component) or `null`. Covered by
// Property 7.

export type PartnerStatus = 'potential' | 'established';

export interface Partner {
  /** i18n key for the partner group's display name. */
  nameKey: string;
  /**
   * `potential` = a directional / future-looking group (gets the
   * directional badge). `established` = a real, confirmed partnership
   * (must NOT get the directional badge — R6.3).
   */
  status: PartnerStatus;
}

/**
 * i18n key for the badge attached to every potential / directional
 * partner group (R6.2). Resolved to Vietnamese via `t()` at render time.
 */
export const DIRECTIONAL_PARTNER_LABEL_KEY = 'about.partners.badge.directional';

/**
 * Potential partner groups CaLẻ is oriented toward (R6.1). All entries
 * are `potential` — there are no established partnerships yet, so none
 * may be presented as confirmed (R6.3/R6.4). Names reference generic
 * category i18n keys; no real partner brand names or logos are used.
 */
export const PARTNER_GROUPS: Partner[] = [
  { nameKey: 'about.partners.group.universities', status: 'potential' },
  { nameKey: 'about.partners.group.fnb', status: 'potential' },
  { nameKey: 'about.partners.group.events', status: 'potential' },
  { nameKey: 'about.partners.group.weddings', status: 'potential' },
  { nameKey: 'about.partners.group.payments', status: 'potential' },
  { nameKey: 'about.partners.group.seasonal', status: 'potential' },
  { nameKey: 'about.partners.group.verification', status: 'potential' },
];

/**
 * Pure function: returns the directional badge i18n key for a potential
 * partner, or `null` for an established partner (which must NOT carry
 * the directional label — R6.3). No side effects, no I/O, no backend,
 * no dependency on the resolved display string.
 */
export function labelForPartner(partner: Partner): string | null {
  return partner.status === 'potential' ? DIRECTIONAL_PARTNER_LABEL_KEY : null;
}
