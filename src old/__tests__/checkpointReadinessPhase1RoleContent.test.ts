/**
 * Feature: checkpoint-readiness-phase-1 — Property 2 (Task 5.6) +
 * example-based coverage for `contentForRole` (Task 5.5).
 *
 * Property 2: Nội dung hiển thị khớp đúng vai trò đang chọn.
 * Validates: Requirements 1.2, 1.3, 1.6, 1.8.
 *
 * For any selected role, the returned view contains only that role's keys
 * and is disjoint from the other role's keys; `null` yields the neutral
 * chooser (not both roles' full content at once).
 *
 * Property tests use `fast-check` with `numRuns: 100` minimum and the
 * tag comment format `// Feature: checkpoint-readiness-phase-1,
 * Property N: <text>` per the design's testing strategy.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  INDUSTRY_FOCUS,
  contentForRole,
  isRoleView,
  type RoleView,
} from '@/components/landing/roleContentData';
import { vi, t } from '@/i18n/vi';
import type { SelectedRole } from '@/stores/roleSelectionStore';

const arbRole: fc.Arbitrary<SelectedRole> = fc.constantFrom('worker', 'employer');

/** Collect every i18n key referenced by a role view. */
function keysOf(view: RoleView): string[] {
  return [
    view.eyebrowKey,
    view.titleKey,
    view.leadKey,
    ...view.benefitKeys,
    ...view.steps.flatMap((s) => [s.titleKey, s.descKey]),
    view.cta.labelKey,
  ];
}

describe('checkpoint-readiness-phase-1 — contentForRole (Task 5.5)', () => {
  it('returns the neutral chooser for null', () => {
    const content = contentForRole(null);
    expect(content.role).toBeNull();
    expect(isRoleView(content)).toBe(false);
    if (!isRoleView(content)) {
      expect(content.options.map((o) => o.role)).toEqual(['worker', 'employer']);
    }
  });

  it("returns only worker content for 'worker'", () => {
    const content = contentForRole('worker');
    expect(isRoleView(content)).toBe(true);
    if (isRoleView(content)) {
      expect(content.role).toBe('worker');
      expect(keysOf(content).every((k) => k.startsWith('landing.role.worker.'))).toBe(
        true,
      );
    }
  });

  it("returns only employer content for 'employer'", () => {
    const content = contentForRole('employer');
    expect(isRoleView(content)).toBe(true);
    if (isRoleView(content)) {
      expect(content.role).toBe('employer');
      expect(
        keysOf(content).every((k) => k.startsWith('landing.role.employer.')),
      ).toBe(true);
    }
  });

  it('worker CTA targets /shifts; employer CTA targets /register?role=employer', () => {
    const worker = contentForRole('worker') as RoleView;
    const employer = contentForRole('employer') as RoleView;
    expect(worker.cta.href).toBe('/shifts');
    expect(employer.cta.href).toBe('/register?role=employer');
  });

  it('does NOT use /khao-sat in any CTA at this step', () => {
    for (const role of ['worker', 'employer'] as const) {
      const view = contentForRole(role) as RoleView;
      expect(view.cta.href).not.toContain('khao-sat');
    }
  });

  it("employer step 2 resolves to wording 'Đảm bảo thanh toán'", () => {
    const employer = contentForRole('employer') as RoleView;
    expect(t(employer.steps[1].titleKey)).toBe('Đảm bảo thanh toán');
  });

  it('worker copy uses "bạn"; employer copy never addresses the reader as "bạn"', () => {
    const worker = contentForRole('worker') as RoleView;
    const employer = contentForRole('employer') as RoleView;
    const workerText = keysOf(worker).map((k) => t(k)).join(' ');
    const employerText = keysOf(employer).map((k) => t(k)).join(' ');
    expect(workerText).toMatch(/\bbạn\b/i);
    expect(employerText).not.toMatch(/\bbạn\b/i);
  });

  it('every referenced i18n key resolves to a real string', () => {
    const worker = contentForRole('worker') as RoleView;
    const employer = contentForRole('employer') as RoleView;
    for (const key of [...keysOf(worker), ...keysOf(employer)]) {
      expect(vi[key]).toBeTypeOf('string');
      expect(vi[key]!.length).toBeGreaterThan(0);
    }
    for (const item of INDUSTRY_FOCUS) {
      expect(vi[item.nameKey]).toBeTypeOf('string');
    }
  });

  it('lists the six focus industries (R11)', () => {
    expect(INDUSTRY_FOCUS.map((i) => t(i.nameKey))).toEqual([
      'Nhà hàng / F&B',
      'Quán café',
      'Sự kiện',
      'Tiệc cưới',
      'Bán lẻ',
      'Kho vận nhẹ',
    ]);
  });
});

describe('checkpoint-readiness-phase-1 — Property 2: content matches role & disjoint', () => {
  // Feature: checkpoint-readiness-phase-1, Property 2: a role view contains only its own keys
  it('returns content scoped to the selected role only', () => {
    fc.assert(
      fc.property(arbRole, (role) => {
        const content = contentForRole(role);
        expect(isRoleView(content)).toBe(true);
        if (isRoleView(content)) {
          expect(content.role).toBe(role);
          const prefix = `landing.role.${role}.`;
          expect(keysOf(content).every((k) => k.startsWith(prefix))).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: checkpoint-readiness-phase-1, Property 2: worker & employer key sets are disjoint
  it('worker and employer views never share an i18n key', () => {
    const workerKeys = new Set(keysOf(contentForRole('worker') as RoleView));
    const employerKeys = keysOf(contentForRole('employer') as RoleView);
    for (const key of employerKeys) {
      expect(workerKeys.has(key)).toBe(false);
    }
  });

  // Feature: checkpoint-readiness-phase-1, Property 2: null never exposes a full role view
  it('null yields the neutral state, not a role view', () => {
    fc.assert(
      fc.property(fc.constant(null), (role) => {
        const content = contentForRole(role);
        expect(isRoleView(content)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
