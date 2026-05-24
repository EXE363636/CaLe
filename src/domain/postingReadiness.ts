/**
 * Phase 10A-Fix-3 — pure helper that decides whether an employer has
 * the verification + workplace prerequisites required to publish a
 * shift, broken down by the 4-shape `EmployerType10A` model.
 *
 * Mock-only: the helper only inspects in-memory verification documents
 * and a few employer-record flags. There is no real eKYC, no real
 * upload, no backend. The output is consumed by `/employer/shifts/new`
 * to render a checklist + block both the create-shift submit and the
 * deposit-confirm CTA when the employer doesn't satisfy the rules.
 *
 * The helper takes the in-form workplace-image filename as an input
 * because for AgencyEvent and Individual we accept the shift-specific
 * image even when the employer has no approved storefront/workplace
 * photo on the profile yet. For HouseholdBusiness / Company, an
 * approved profile-side workplace doc satisfies the requirement.
 *
 * Returned `blockers` are end-user Vietnamese strings ready to render
 * as bullet items. `ready: true` means every prerequisite is met.
 */

import type {
  Employer,
  EmployerType10A,
  EmployerVerificationDocument,
  EmployerVerificationDocumentType,
} from '@/types';

import { resolveEmployerType } from '@/stores/verificationStore';

export interface PostingReadinessInput {
  employer: Employer;
  /** Full employer-verification document slice (we filter by id ourselves). */
  employerDocuments: EmployerVerificationDocument[];
  /** True when the employer already has at least one shift on record. */
  hasPostedShifts: boolean;
  /**
   * Workplace image filename / caption captured by the new-shift form.
   * Used for the per-shift workplace-photo requirement (AgencyEvent +
   * Individual must always supply this for the shift; for the other
   * two shapes the profile-side approved photo is accepted as well).
   */
  workplaceImageInForm?: string;
}

export interface PostingReadinessResult {
  /** True when no blockers remain. */
  ready: boolean;
  /** Resolved employer type, or undefined if the employer hasn't picked yet. */
  resolvedType?: EmployerType10A;
  /** End-user-facing Vietnamese reasons the employer cannot post yet. */
  blockers: string[];
  /**
   * Per-rule status — useful for rendering the checklist with green /
   * red icons next to each item rather than just the blocker list.
   */
  checks: {
    typeSelected: boolean;
    representativeIdApproved: boolean;
    businessLicenseOrTaxApproved: boolean;
    workplaceProofApproved: boolean;
    workplaceImageProvided: boolean;
    eventProofApproved: boolean;
  };
}

const APPROVED = 'Approved' as const;

function approvedDocs(
  documents: EmployerVerificationDocument[],
  employerId: string,
): EmployerVerificationDocument[] {
  return documents.filter(
    (d) => d.employerId === employerId && d.status === APPROVED,
  );
}

function hasApprovedType(
  documents: EmployerVerificationDocument[],
  type: EmployerVerificationDocumentType,
): boolean {
  return documents.some((d) => d.documentType === type);
}

/**
 * Compute posting readiness for an employer.
 *
 * The rules mirror the spec verbatim:
 *
 *   - Individual:        type + representativeId + per-shift workplace image
 *   - HouseholdBusiness: type + representativeId + (storefront|workplace|address proof) +
 *                        (per-shift image OR an approved profile photo)
 *   - Company:           type + representativeId + (businessLicense|taxCode) +
 *                        (storefront|workplace|address proof) +
 *                        (per-shift image OR an approved profile photo)
 *   - AgencyEvent:       type + representativeId + (eventProof|workplace|googleMaps) +
 *                        per-shift workplace/event image (always required)
 *
 * Phone verification is intentionally not enforced here — the seed
 * accounts don't all carry it and the worker-side rule already
 * gates phone-only behavior. We can tighten this in a follow-up.
 */
export function computePostingReadiness(
  input: PostingReadinessInput,
): PostingReadinessResult {
  const { employer, employerDocuments, hasPostedShifts, workplaceImageInForm } =
    input;

  const resolvedType = resolveEmployerType(employer, { hasPostedShifts });
  const own = approvedDocs(employerDocuments, employer.id);

  const checks = {
    typeSelected: !!resolvedType,
    representativeIdApproved: hasApprovedType(own, 'RepresentativeId'),
    businessLicenseOrTaxApproved:
      hasApprovedType(own, 'BusinessLicense') || hasApprovedType(own, 'TaxCode'),
    workplaceProofApproved:
      hasApprovedType(own, 'StorefrontPhoto') ||
      hasApprovedType(own, 'WorkplacePhoto') ||
      hasApprovedType(own, 'AddressProof') ||
      hasApprovedType(own, 'GoogleMapsOrFanpage'),
    workplaceImageProvided:
      typeof workplaceImageInForm === 'string' &&
      workplaceImageInForm.trim().length > 0,
    eventProofApproved:
      hasApprovedType(own, 'EventProof') ||
      hasApprovedType(own, 'WorkplacePhoto') ||
      hasApprovedType(own, 'GoogleMapsOrFanpage'),
  };

  const blockers: string[] = [];

  if (!resolvedType) {
    blockers.push(
      'Cần chọn loại tài khoản nhà tuyển dụng trước khi đăng ca.',
    );
    return { ready: false, resolvedType: undefined, blockers, checks };
  }

  if (!checks.representativeIdApproved) {
    blockers.push(
      'Cần xác minh CCCD đại diện đã được duyệt trước khi đăng ca.',
    );
  }

  switch (resolvedType) {
    case 'Individual': {
      if (!checks.workplaceImageProvided) {
        blockers.push(
          'Cần thêm ảnh địa điểm / khu vực làm việc cho ca này.',
        );
      }
      break;
    }
    case 'HouseholdBusiness': {
      const workplaceCovered =
        checks.workplaceProofApproved || checks.workplaceImageProvided;
      if (!workplaceCovered) {
        blockers.push(
          'Cần ảnh địa điểm cho ca này hoặc ảnh mặt tiền/nơi làm việc đã được duyệt trên hồ sơ.',
        );
      }
      break;
    }
    case 'Company': {
      if (!checks.businessLicenseOrTaxApproved) {
        blockers.push(
          'Cần giấy phép kinh doanh hoặc mã số thuế đã được duyệt.',
        );
      }
      const workplaceCovered =
        checks.workplaceProofApproved || checks.workplaceImageProvided;
      if (!workplaceCovered) {
        blockers.push(
          'Cần ảnh địa điểm cho ca này hoặc ảnh mặt tiền/nơi làm việc đã được duyệt trên hồ sơ.',
        );
      }
      break;
    }
    case 'AgencyEvent': {
      if (!checks.eventProofApproved) {
        blockers.push(
          'Cần hợp đồng / xác nhận sự kiện hoặc ảnh địa điểm sự kiện đã được duyệt.',
        );
      }
      if (!checks.workplaceImageProvided) {
        blockers.push(
          'Cần ảnh địa điểm / khu vực sự kiện cho ca này.',
        );
      }
      break;
    }
  }

  return {
    ready: blockers.length === 0,
    resolvedType,
    blockers,
    checks,
  };
}

/**
 * Subset selector — public-safe approved workplace/storefront photos
 * an employer can show on their public profile. Returns just the
 * display-label + submitted-at pairs so the caller never has to touch
 * raw `mockImageUrl` / `mockFileName` fields directly.
 */
export function getPublicEmployerWorkplacePhotos(
  employerId: string,
  documents: EmployerVerificationDocument[],
): Array<{ id: string; label: string; submittedAt: string }> {
  return documents
    .filter(
      (d) =>
        d.employerId === employerId &&
        d.status === APPROVED &&
        (d.documentType === 'StorefrontPhoto' ||
          d.documentType === 'WorkplacePhoto' ||
          d.documentType === 'EventProof' ||
          d.documentType === 'AddressProof' ||
          d.documentType === 'GoogleMapsOrFanpage'),
    )
    .map((d) => ({
      id: d.id,
      label: d.mockFileName ?? d.displayLabel,
      submittedAt: d.submittedAt,
    }))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
