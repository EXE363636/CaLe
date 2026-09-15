/**
 * Phase 10A-Fix-3 — posting-readiness tests.
 *
 * Pins down per-employer-type posting rules:
 *   - Individual:        type + RepresentativeId + per-shift workplace image
 *   - HouseholdBusiness: type + RepresentativeId + (workplace proof OR per-shift image)
 *   - Company:           type + RepresentativeId + business license/tax + workplace cover
 *   - AgencyEvent:       type + RepresentativeId + event proof + per-shift image
 *
 * Plus the registration auth-store gate: employers without
 * `employerType10A` cannot register.
 */

import { describe, it, expect } from 'vitest';

import { computePostingReadiness } from '@/domain/postingReadiness';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import type {
  Employer,
  EmployerType10A,
  EmployerVerificationDocument,
  EmployerVerificationDocumentType,
} from '@/types';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeEmployer(
  id: string,
  type10A: EmployerType10A | undefined,
): Employer {
  return {
    id,
    role: 'employer',
    email: `${id}@example.com`,
    phone: '+84900000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    companyName: `Company ${id}`,
    businessType: 'Test',
    verifiedBusiness: false,
    boostCredits: 0,
    employerType10A: type10A,
  };
}

function approvedDoc(
  employerId: string,
  type10A: EmployerType10A,
  documentType: EmployerVerificationDocumentType,
  idSuffix = '',
): EmployerVerificationDocument {
  return {
    id: `ever-${employerId}-${documentType}${idSuffix}`,
    employerId,
    employerType: type10A,
    documentType,
    status: 'Approved',
    displayLabel: documentType,
    submittedAt: '2026-05-02T00:00:00.000Z',
    reviewedAt: '2026-05-03T00:00:00.000Z',
    reviewedByAdminId: 'admin-001',
  };
}

// ---------------------------------------------------------------------------
// computePostingReadiness — per-type rules
// ---------------------------------------------------------------------------

describe('computePostingReadiness — type missing (Phase 10A-Fix-3)', () => {
  it('returns ready: false with the type-selection blocker for a brand-new employer', () => {
    const employer = makeEmployer('emp-new', undefined);
    const result = computePostingReadiness({
      employer,
      employerDocuments: [],
      hasPostedShifts: false,
      workplaceImageInForm: 'mat-tien.jpg',
    });
    expect(result.ready).toBe(false);
    expect(result.resolvedType).toBeUndefined();
    expect(result.blockers[0]).toMatch(/loại tài khoản/i);
    expect(result.checks.typeSelected).toBe(false);
  });

  it('falls back to HouseholdBusiness for an established account with no type', () => {
    const employer = makeEmployer('emp-legacy', undefined);
    const result = computePostingReadiness({
      employer,
      employerDocuments: [],
      hasPostedShifts: true,
      workplaceImageInForm: '',
    });
    expect(result.resolvedType).toBe('HouseholdBusiness');
  });
});

describe('computePostingReadiness — Individual', () => {
  const employer = makeEmployer('emp-ind', 'Individual');

  it('blocks when CCCD is not approved', () => {
    const result = computePostingReadiness({
      employer,
      employerDocuments: [],
      hasPostedShifts: false,
      workplaceImageInForm: 'mat-tien.jpg',
    });
    expect(result.ready).toBe(false);
    expect(result.checks.representativeIdApproved).toBe(false);
  });

  it('blocks when workplace image for the shift is missing', () => {
    const result = computePostingReadiness({
      employer,
      employerDocuments: [
        approvedDoc(employer.id, 'Individual', 'RepresentativeId'),
      ],
      hasPostedShifts: false,
      workplaceImageInForm: '',
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => /ảnh địa điểm/i.test(b))).toBe(true);
  });

  it('passes when CCCD is approved AND a per-shift workplace image is supplied', () => {
    const result = computePostingReadiness({
      employer,
      employerDocuments: [
        approvedDoc(employer.id, 'Individual', 'RepresentativeId'),
      ],
      hasPostedShifts: false,
      workplaceImageInForm: 'mat-tien-cua-hang.jpg',
    });
    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });
});

describe('computePostingReadiness — HouseholdBusiness', () => {
  const employer = makeEmployer('emp-house', 'HouseholdBusiness');

  it('passes when CCCD + per-shift workplace image are supplied (no profile photo)', () => {
    const result = computePostingReadiness({
      employer,
      employerDocuments: [
        approvedDoc(employer.id, 'HouseholdBusiness', 'RepresentativeId'),
      ],
      hasPostedShifts: false,
      workplaceImageInForm: 'mat-tien.jpg',
    });
    expect(result.ready).toBe(true);
  });

  it('passes when CCCD + approved profile workplace photo are present even without per-shift image', () => {
    const result = computePostingReadiness({
      employer,
      employerDocuments: [
        approvedDoc(employer.id, 'HouseholdBusiness', 'RepresentativeId'),
        approvedDoc(employer.id, 'HouseholdBusiness', 'StorefrontPhoto'),
      ],
      hasPostedShifts: false,
      workplaceImageInForm: '',
    });
    expect(result.ready).toBe(true);
  });

  it('blocks when neither per-shift image nor profile workplace photo is approved', () => {
    const result = computePostingReadiness({
      employer,
      employerDocuments: [
        approvedDoc(employer.id, 'HouseholdBusiness', 'RepresentativeId'),
      ],
      hasPostedShifts: false,
      workplaceImageInForm: '',
    });
    expect(result.ready).toBe(false);
  });
});

describe('computePostingReadiness — Company', () => {
  const employer = makeEmployer('emp-co', 'Company');

  it('blocks when business license / tax code is not approved', () => {
    const result = computePostingReadiness({
      employer,
      employerDocuments: [
        approvedDoc(employer.id, 'Company', 'RepresentativeId'),
        approvedDoc(employer.id, 'Company', 'WorkplacePhoto'),
      ],
      hasPostedShifts: false,
      workplaceImageInForm: '',
    });
    expect(result.ready).toBe(false);
    expect(
      result.blockers.some((b) => /giấy phép kinh doanh|mã số thuế/i.test(b)),
    ).toBe(true);
  });

  it('passes when CCCD + business license + workplace photo are approved', () => {
    const result = computePostingReadiness({
      employer,
      employerDocuments: [
        approvedDoc(employer.id, 'Company', 'RepresentativeId'),
        approvedDoc(employer.id, 'Company', 'BusinessLicense'),
        approvedDoc(employer.id, 'Company', 'StorefrontPhoto'),
      ],
      hasPostedShifts: false,
      workplaceImageInForm: '',
    });
    expect(result.ready).toBe(true);
  });
});

describe('computePostingReadiness — AgencyEvent', () => {
  const employer = makeEmployer('emp-ag', 'AgencyEvent');

  it('always requires a per-shift workplace/event image', () => {
    const result = computePostingReadiness({
      employer,
      employerDocuments: [
        approvedDoc(employer.id, 'AgencyEvent', 'RepresentativeId'),
        approvedDoc(employer.id, 'AgencyEvent', 'EventProof'),
      ],
      hasPostedShifts: false,
      workplaceImageInForm: '',
    });
    expect(result.ready).toBe(false);
    expect(
      result.blockers.some((b) => /khu vực sự kiện|ảnh địa điểm/i.test(b)),
    ).toBe(true);
  });

  it('passes when CCCD + EventProof + per-shift image are present', () => {
    const result = computePostingReadiness({
      employer,
      employerDocuments: [
        approvedDoc(employer.id, 'AgencyEvent', 'RepresentativeId'),
        approvedDoc(employer.id, 'AgencyEvent', 'EventProof'),
      ],
      hasPostedShifts: false,
      workplaceImageInForm: 'san-khau.jpg',
    });
    expect(result.ready).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Registration gate
// ---------------------------------------------------------------------------

function resetStores() {
  useAuthStore.setState({ currentUserId: null, lastActivityAt: null });
  useUserStore.setState({ users: [] });
}

describe('authStore.register — Phase 10A-Fix-3 employer type gate', () => {
  it('rejects employer registrations missing employerType10A as INVALID_INPUT', async () => {
    resetStores();
    const r = await useAuthStore.getState().register({
      role: 'employer',
      email: 'no-type@example.com',
      phone: '0901234567',
      password: 'demo-password',
      companyName: 'Test Co',
      businessType: 'Test',
      // employerType10A intentionally omitted
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('INVALID_INPUT');
    }
  });

  it('accepts employer registrations with a canonical 4-shape type', async () => {
    resetStores();
    const r = await useAuthStore.getState().register({
      role: 'employer',
      email: 'with-type@example.com',
      phone: '0901234567',
      password: 'demo-password',
      companyName: 'Test Co',
      businessType: 'Test',
      employerType10A: 'Company',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Slice 2: register value là RegisterSuccess { user, needsConfirmation }.
      const created = r.value.user;
      expect(created?.role).toBe('employer');
      if (created && created.role === 'employer') {
        expect(created.employerType10A).toBe('Company');
      }
    }
  });

  it('rejects employer registrations with a stray non-canonical employerType10A string', async () => {
    resetStores();
    const r = await useAuthStore.getState().register({
      role: 'employer',
      email: 'bad-type@example.com',
      phone: '0901234567',
      password: 'demo-password',
      companyName: 'Test Co',
      businessType: 'Test',
      // Cast through unknown to simulate a hand-crafted bad payload —
      // the runtime guard inside `isEmployerInput` rejects it.
      employerType10A: 'Garbage' as unknown as EmployerType10A,
    });
    expect(r.ok).toBe(false);
  });
});
