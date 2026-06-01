/**
 * Feature: checkpoint-readiness-phase-1 — Property 7 (Task 4.3).
 *
 * Property 7: Mọi đối tác tiềm năng đều được gắn nhãn định hướng.
 * Validates: Requirements 6.2, 6.3, 6.4.
 *
 * For any list of partners, every `potential` entry MUST receive the
 * directional label key, and every `established` entry MUST NOT.
 *
 * Property tests use `fast-check` with `numRuns: 100` minimum and the
 * tag comment format `// Feature: checkpoint-readiness-phase-1,
 * Property N: <text>` per the design's testing strategy.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  DIRECTIONAL_PARTNER_LABEL_KEY,
  PARTNER_GROUPS,
  labelForPartner,
  type Partner,
} from '@/components/about/partners';
import { vi } from '@/i18n/vi';

const arbStatus = fc.constantFrom<Partner['status']>('potential', 'established');
const arbPartner: fc.Arbitrary<Partner> = fc.record({
  nameKey: fc.string(),
  status: arbStatus,
});

describe('checkpoint-readiness-phase-1 — Property 7: partner directional labelling', () => {
  // Feature: checkpoint-readiness-phase-1, Property 7: potential partners are always labelled directional
  it('labels every potential partner as directional and never an established one', () => {
    fc.assert(
      fc.property(arbPartner, (partner) => {
        const label = labelForPartner(partner);
        if (partner.status === 'potential') {
          expect(label).toBe(DIRECTIONAL_PARTNER_LABEL_KEY);
        } else {
          expect(label).toBeNull();
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: checkpoint-readiness-phase-1, Property 7: applies across an arbitrary list
  it('holds across an arbitrary list of partners', () => {
    fc.assert(
      fc.property(fc.array(arbPartner), (partners) => {
        for (const partner of partners) {
          const label = labelForPartner(partner);
          expect(label).toBe(
            partner.status === 'potential' ? DIRECTIONAL_PARTNER_LABEL_KEY : null,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: checkpoint-readiness-phase-1, Property 7: shipped partner groups are all directional (R6.1/R6.3)
  it('marks all shipped partner groups as directional (none presented as established)', () => {
    expect(PARTNER_GROUPS.length).toBeGreaterThan(0);
    for (const partner of PARTNER_GROUPS) {
      expect(partner.status).toBe('potential');
      expect(labelForPartner(partner)).toBe(DIRECTIONAL_PARTNER_LABEL_KEY);
    }
  });

  // Feature: checkpoint-readiness-phase-1, Property 7: every partner name key + the badge key resolve to real copy
  it('resolves every shipped partner name key and the directional badge key to a defined string', () => {
    expect(vi[DIRECTIONAL_PARTNER_LABEL_KEY]).toBeTypeOf('string');
    for (const partner of PARTNER_GROUPS) {
      expect(vi[partner.nameKey]).toBeTypeOf('string');
      expect(vi[partner.nameKey]!.length).toBeGreaterThan(0);
    }
  });
});
