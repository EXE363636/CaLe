/**
 * Nút VI / EN — đợt 1 (trang công khai). Bảo đảm:
 *  - mọi khoá `t('...')` và câu `tx('...')` trên các màn đợt 1 đều có bản tiếng Anh;
 *  - `en.ts` không có khoá lạ (gõ nhầm → không bao giờ được dùng);
 *  - bản tiếng Anh không dùng `VNĐ` / `₫`;
 *  - `translate` / `translateText` rơi về tiếng Việt khi thiếu bản dịch.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { en, enPublic, enPublicText, enText } from '@/i18n/en';
import { enApp, enAppText } from '@/i18n/en-app';
import { enDashboard, enDashboardText } from '@/i18n/en-dashboard';
import { enAdmin, enAdminText } from '@/i18n/en-admin';
import { DEFAULT_SKILL_CATEGORIES } from '@/domain/skillProgression';
import { SKILL_BADGE_LABEL } from '@/domain/skillScore';
import { enPages, enPagesText } from '@/i18n/en-pages';
import { enRoles, enRolesText } from '@/i18n/en-roles';
import { enUiText } from '@/i18n/en-ui';
import { enLandingText } from '@/i18n/en-landing';
import { LANDING_SAMPLE_TEXTS } from '@/components/landing/landingSamples';
import { translate, translateText, unknownEnglishKeys } from '@/i18n/locale';
import { CHECKOUT_CHECKLIST_ITEMS_VI, vi } from '@/i18n/vi';
import {
  employerDocLabel,
  employerTypeLabel,
  verificationStatusLabel,
  workerDocLabel,
} from '@/stores/verificationStore';

const ROOT = join(__dirname, '..', '..');

/** Màn đã chuyển sang useT / getT / useTx / getTx (đợt 1). */
const PHASE1_FILES = [
  'src/app/page.tsx',
  'src/app/for-workers/page.tsx',
  'src/app/for-employers/page.tsx',
  'src/components/landing/EmployerPricingSection.tsx',
  'src/components/landing/HomeAbout.tsx',
  'src/components/about/TeamCarousel.tsx',
  'src/app/login/page.tsx',
  'src/app/register/page.tsx',
  'src/app/forgot-password/page.tsx',
  'src/components/landing/RoleSwitch.tsx',
  'src/components/landing/UrgentShifts.tsx',
  'src/components/layout/NavBar.tsx',
  'src/components/layout/MobileNav.tsx',
  'src/components/layout/Footer.tsx',
  'src/components/layout/AuthSidePanel.tsx',
  'src/components/auth/GoogleSignInButton.tsx',
  // Đợt 2a (01/10): lỗi, danh sách ca, thẻ ca, nhãn trạng thái, chuông.
  'src/lib/errorMap.ts',
  'src/app/shifts/page.tsx',
  'src/components/shift/ShiftCard.tsx',
  'src/components/shift/ShiftLifecycleBadge.tsx',
  'src/components/shift/ShiftFilters.tsx',
  'src/components/shift/ShiftSearchBar.tsx',
  'src/components/shift/ShiftReviewStatus.tsx',
  'src/components/layout/NotificationBell.tsx',
  'src/components/wallet/WalletPanel.tsx',
  'src/components/wallet/PaymentReviewNotice.tsx',
  'src/components/wallet/PayoutHealthBanner.tsx',
  'src/components/wallet/NoPaymentNotice.tsx',
  'src/app/shifts/[id]/page.tsx',
  // Đợt 2b (01/10): dashboard người lao động / nhà tuyển dụng.
  'src/app/worker/dashboard/page.tsx',
  'src/app/employer/dashboard/page.tsx',
  'src/components/forms/CancelApplicationDialog.tsx',
  'src/components/forms/CheckoutDialog.tsx',
  'src/components/forms/EmployerFeedbackForm.tsx',
  'src/components/workerDeposit/WorkerNoShowDepositAlert.tsx',
  'src/components/ui/DateFieldVN.tsx',
  'src/components/ui/TimeFieldVN.tsx',
  'src/components/ui/HelpPopover.tsx',
  'src/components/ui/PageHelpButton.tsx',
  // Đợt 2b: trang quản trị (trừ VerificationsPanel — chỉ chế độ demo).
  'src/app/admin/dashboard/page.tsx',
  'src/app/admin/dashboard/FeeCampaignCard.tsx',
  'src/app/admin/dashboard/IdentityReviewPanel.tsx',
  'src/app/admin/dashboard/PaymentReviewList.tsx',
  'src/app/admin/dashboard/TopUpBonusCard.tsx',
  'src/app/admin/dashboard/WorkerDepositCard.tsx',
  'src/app/admin/dashboard/WorkerHoldContestList.tsx',
  // Cẩm nang (01/10) — nội dung bài dịch ở handbookArticlesEn.ts (handbookByRole.test.ts).
  'src/app/handbook/page.tsx',
  'src/app/handbook/[slug]/page.tsx',
  // Đợt 2c: trang thông tin.
  'src/app/disputes/page.tsx',
  'src/app/faq/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/support/page.tsx',
  'src/app/terms/page.tsx',
  'src/components/legal/legalChrome.tsx',
  'src/app/user-guide/page.tsx',
  'src/components/landing/GuideHero.tsx',
  // Đợt 2d (02/10): màn nhà tuyển dụng / người lao động — bản dịch ở en-roles.ts.
  'src/app/employer/profile/page.tsx',
  'src/app/employer/schedule/page.tsx',
  'src/app/employer/shifts/[id]/page.tsx',
  'src/app/employer/shifts/new/page.tsx',
  'src/app/worker/profile/page.tsx',
  'src/app/worker/schedule/page.tsx',
  'src/components/calendar/AgendaView.tsx',
  'src/components/calendar/CalendarLegend.tsx',
  'src/components/calendar/CalendarToolbar.tsx',
  'src/components/calendar/DayView.tsx',
  'src/components/calendar/MiniMonthCalendar.tsx',
  'src/components/calendar/WeekView.tsx',
  'src/components/forms/ApplicationActions.tsx',
  'src/components/forms/DisputeDialog.tsx',
  'src/components/forms/DisputeResponseDialog.tsx',
  'src/components/forms/RatingForm.tsx',
  'src/components/forms/RejectApplicationDialog.tsx',
  'src/components/forms/ShiftForm.tsx',
  'src/components/landing/FeaturedJobMockup.tsx',
  'src/components/layout/UserMenu.tsx',
  'src/components/payment/DepositWalletConfirm.tsx',
  'src/components/payment/PayosTopUpQr.tsx',
  'src/components/shift/EmployerConfirmationPanel.tsx',
  'src/components/shift/EscrowStatusBadge.tsx',
  'src/components/shift/PaymentEvidenceCard.tsx',
  'src/components/shift/ShiftStatusBadge.tsx',
  'src/components/user/AdminUserProfileModal.tsx',
  'src/components/user/EmployerFeedbackList.tsx',
  'src/components/user/EmployerProfileModal.tsx',
  'src/components/user/EmployerTrustPanel.tsx',
  'src/components/user/ReputationBadge.tsx',
  'src/components/user/ReviewList.tsx',
  'src/components/user/SkillProgressBar.tsx',
  'src/components/user/VerificationBadge.tsx',
  'src/components/user/WorkerProfileCard.tsx',
  'src/components/user/WorkerProfileModal.tsx',
  'src/components/user/WorkerSummaryRow.tsx',
  'src/components/verification/AccountVerificationCard.tsx',
  'src/components/verification/VerificationGateNotice.tsx',
  'src/components/workerDeposit/WorkerDepositApplyNotice.tsx',
  'src/components/workerDeposit/WorkerDepositConfirmModal.tsx',
  'src/components/workerDeposit/WorkerDepositContestPanel.tsx',
  'src/components/workerDeposit/WorkerDepositStatusCard.tsx',
  'src/lib/reviewSync.ts',
  // Đợt UI (02/10): thanh bước vòng đời, ca kế tiếp, chợ ca trống — bản dịch ở en-ui.ts.
  'src/components/shift/ShiftJourney.tsx',
  'src/components/shift/OpenShiftsEmpty.tsx',
  'src/components/landing/RoleHomeCta.tsx',
  'src/components/landing/LandingPreview.tsx',
  'src/components/landing/HomeReceipt.tsx',
  'src/components/landing/homeJobs.ts',
  'src/components/landing/proofData.ts',
  'src/components/landing/whyData.ts',
  'src/components/landing/featureData.ts',
  'src/components/landing/OpenShiftCount.tsx',
  'src/components/landing/MoneyFlowDiagram.tsx',
  'src/components/landing/JobRing.tsx',
  'src/components/landing/ShiftPostPlayground.tsx',
  'src/components/landing/GuidePreviews.tsx',
  'src/components/landing/OpenShiftsSection.tsx',
  'src/components/landing/EmployerPaymentsSection.tsx',
  'src/components/landing/VerifyPreview.tsx',
  'src/components/landing/PayoutTimeline.tsx',
  'src/components/landing/FeeCampaignNote.tsx',
  'src/components/landing/ApplyPreview.tsx',
  'src/components/landing/JobWageHint.tsx',
  'src/components/landing/ReviewFlowPreview.tsx',
  'src/components/landing/RoleBand.tsx',
];

/** Hằng tiếng Việt được hiển thị qua `tx(...)` (nhãn menu / footer). */
const CONSTANT_TEXT_FILES = [
  'src/components/layout/NavBar.tsx',
  'src/components/layout/MobileNav.tsx',
  'src/components/layout/Footer.tsx',
];

const QUOTED = String.raw`'((?:[^'\\]|\\.)*)'`;

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function matches(source: string, pattern: string): string[] {
  return [...source.matchAll(new RegExp(pattern, 'g'))].map((m) => m[1]);
}

describe('i18n English — đợt 1', () => {
  it('mọi khoá dùng trên màn đợt 1 đều có bản tiếng Anh', () => {
    const missing = new Set<string>();
    for (const file of PHASE1_FILES) {
      const src = read(file);
      const keys = [
        ...matches(src, String.raw`\bt\(\s*` + QUOTED),
        // khoá đứng riêng trong biểu thức (vd t(supabase ? 'a.b' : 'a.c'))
        ...matches(src, String.raw`'([a-zA-Z]+\.[a-zA-Z0-9_.]+)'`),
      ].filter((k) => k in vi);
      for (const k of keys) if (!(k in en)) missing.add(`${file}: ${k}`);
    }
    expect([...missing]).toEqual([]);
  });

  it('mọi câu tx(...) và nhãn menu/footer đều có trong enText', () => {
    const missing = new Set<string>();
    for (const file of PHASE1_FILES) {
      for (const text of matches(read(file), String.raw`\btx\(\s*` + QUOTED)) {
        if (!(text in enText)) missing.add(`${file}: ${text}`);
      }
    }
    for (const file of CONSTANT_TEXT_FILES) {
      const src = read(file);
      for (const text of matches(src, String.raw`\b(?:label|description|heading):\s*\n?\s*` + QUOTED)) {
        if (!(text in enText)) missing.add(`${file}: ${text}`);
      }
      for (const key of matches(src, String.raw`label:\s*t(?:Vi)?\('([^']+)'\)`)) {
        const text = vi[key];
        if (text !== undefined && !(text in enText)) missing.add(`${file}: ${key} → ${text}`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it('en.ts không có khoá lạ', () => {
    expect(unknownEnglishKeys()).toEqual([]);
  });

  it('bản tiếng Anh không dùng VNĐ / ₫', () => {
    const all = [...Object.values(en), ...Object.values(enText)].join('\n');
    expect(all).not.toMatch(/VNĐ|₫/);
  });

  it('thiếu bản dịch thì rơi về tiếng Việt', () => {
    expect(translate('en', 'nav.home')).toBe('Home');
    expect(translate('vi', 'nav.home')).toBe(vi['nav.home']);
    const untranslated = Object.keys(vi).find((k) => !(k in en))!;
    expect(translate('en', untranslated)).toBe(vi[untranslated]);
    expect(translateText('en', 'Bảng giá')).toBe('Pricing');
    expect(translateText('en', 'Câu chưa dịch')).toBe('Câu chưa dịch');
    expect(translateText('vi', 'Bảng giá')).toBe('Bảng giá');
  });
});

describe('i18n English — đợt 2a', () => {
  it('đợt 2a không ghi đè câu của đợt 1 (vd. nhãn menu "Người lao động" → "Workers")', () => {
    const clash = (later: Record<string, string>, earlier: Record<string, string>) =>
      Object.keys(later).filter((k) => k in earlier && earlier[k] !== later[k]);
    expect([
      ...clash(enAppText, enPublicText),
      ...clash(enApp, enPublic),
      // Đợt 2b không ghi đè đợt 1 / 2a.
      ...clash(enDashboardText, { ...enPublicText, ...enAppText }),
      ...clash(enDashboard, { ...enPublic, ...enApp }),
      ...clash(enAdminText, { ...enPublicText, ...enAppText, ...enDashboardText }),
      ...clash(enAdmin, { ...enPublic, ...enApp, ...enDashboard }),
      ...clash(enPagesText, { ...enPublicText, ...enAppText, ...enDashboardText, ...enAdminText }),
    ]).toEqual([]);
  });

  it('khoá ghép động có đủ bản tiếng Anh (nhãn trạng thái ca, trạng thái đơn, thông báo server)', () => {
    const prefixes = [
      'shift.lifecycle.',
      'apply.applied.',
      'notification.paymentReview.',
      'wallet.kind.',
      'wallet.withdraw.real.status.',
      'wallet.review.status.',
      'dispute.category.',
      'application.status.',
      'employerFeedback.tag.',
      'dispute.status.',
      'admin.paymentReview.',
      'admin.accounts.error.',
      'admin.identity.filter.',
    ];
    const missing = Object.keys(vi).filter(
      (k) => prefixes.some((p) => k.startsWith(p)) && !(k in en),
    );
    expect(missing).toEqual([]);
  });

  it('loại công việc và nhãn mức phù hợp (chữ tiếng Việt tính sẵn) có trong enText', () => {
    for (const text of ['Phục vụ', 'Pha chế', 'Kho vận', 'Hỗ trợ sự kiện', 'Phát tờ rơi', 'Bảo vệ', 'Thu ngân', 'Khác']) {
      expect(enText[text], text).toBeTruthy();
    }
    for (const key of ['availability.match.veryGood', 'availability.match.good', 'availability.match.consider']) {
      expect(enText[vi[key]], key).toBe(en[key]);
    }
  });
});

describe('i18n English — đợt 2d', () => {
  it('đợt 2d không ghi đè câu của các đợt trước', () => {
    const clash = (later: Record<string, string>, earlier: Record<string, string>) =>
      Object.keys(later).filter((k) => k in earlier && earlier[k] !== later[k]);
    expect([
      ...clash(enRoles, { ...enPublic, ...enApp, ...enDashboard, ...enAdmin, ...enPages }),
      ...clash(enRolesText, { ...enPublicText, ...enAppText, ...enDashboardText, ...enAdminText, ...enPagesText }),
      // Đợt UI + landing (02/10) không ghi đè các đợt trước.
      ...clash(enUiText, { ...enPublicText, ...enAppText, ...enDashboardText, ...enAdminText, ...enPagesText, ...enRolesText }),
      ...clash(enLandingText, {
        ...enPublicText,
        ...enAppText,
        ...enDashboardText,
        ...enAdminText,
        ...enPagesText,
        ...enRolesText,
        ...enUiText,
      }),
    ]).toEqual([]);
  });

  it('khoá ghép động của màn nhà tuyển dụng / người lao động có đủ bản tiếng Anh', () => {
    const prefixes = [
      'applicantBucket.',
      'deposit.trust.',
      'employer.repost.banner.title.',
      'employerType.',
      'escrow.',
      'evidence.helper.',
      'evidence.requirement.',
      'review.error.',
      'schedule.slotCfg.error.',
      'shift.status.',
      'shift.timeline.kind.',
      'shifts.detail.paymentEvidence.prepare.',
      'verify.card.intro.',
      'worker.profile.prompt.',
      'admin.profile.verify.id',
    ];
    const missing = Object.keys(vi).filter(
      (k) => prefixes.some((p) => k.startsWith(p)) && !(k in en),
    );
    expect(missing).toEqual([]);
  });

  it('câu thời hạn trả công (tSettlement) có bản tiếng Anh cho cả demo lẫn production (.real)', () => {
    const keys = [
      'applicantBucket.AwaitingConfirmation.hint',
      'feedback.checkOut.success.desc',
      'checkout.dialog.intro',
      'help.checkout.description',
      'help.paymentEvidence.description',
      'shifts.detail.paymentEvidence.confirmRule',
      'shifts.detail.paymentEvidence.autoReleaseRule',
    ];
    const missing = keys.flatMap((k) => [k, `${k}.real`]).filter((k) => !(k in en));
    expect(missing).toEqual([]);
    // Câu production không được ghi "mô phỏng" (tiền thật qua PayOS).
    expect(keys.map((k) => en[`${k}.real`]).filter((v) => /simulat/i.test(v))).toEqual([]);
  });

  it('nhãn lấy từ store / hằng số (checklist, thứ trong tuần, xác minh) có trong enText', () => {
    const labels = [
      ...Object.values(CHECKOUT_CHECKLIST_ITEMS_VI).flat(),
      ...DEFAULT_SKILL_CATEGORIES,
      ...Object.values(SKILL_BADGE_LABEL),
      ...(['Individual', 'HouseholdBusiness', 'Company', 'AgencyEvent'] as const).map(employerTypeLabel),
      ...(['NationalId', 'StudentCard', 'DriverLicense'] as const).map(workerDocLabel),
      ...(
        [
          'RepresentativeId',
          'BusinessLicense',
          'TaxCode',
          'StorefrontPhoto',
          'WorkplacePhoto',
          'EventProof',
          'AddressProof',
          'GoogleMapsOrFanpage',
        ] as const
      ).map(employerDocLabel),
      ...(['NotSubmitted', 'Pending', 'Approved', 'NeedsMoreInfo', 'Rejected'] as const).map(
        verificationStatusLabel,
      ),
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
      'Chủ Nhật',
      'T2',
      'T3',
      'T4',
      'T5',
      'T6',
      'T7',
      'CN',
    ];
    expect(labels.filter((s) => !(s in enText))).toEqual([]);
  });
});

describe('minh hoạ landing — ca mẫu', () => {
  it('mọi tên ca / thứ trong ca mẫu đều có bản tiếng Anh', () => {
    const missing = LANDING_SAMPLE_TEXTS.filter((s) => !enText[s]);
    expect(missing).toEqual([]);
  });
});
