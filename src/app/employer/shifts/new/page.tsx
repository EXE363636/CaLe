'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useUserStore, asEmployer } from '@/stores/userStore';
import { useVerificationStore } from '@/stores';
import { ShiftForm, type ShiftFormValues } from '@/components/forms/ShiftForm';
import { Badge, Button, Card, Modal, PageHelpButton } from '@/components/ui';
import {
  DEPOSIT_RATIO,
  trustForEmployer,
} from '@/domain/employerTrust';
import { computePostingReadiness } from '@/domain/postingReadiness';
import {
  sanitizeRepostDescription,
  sanitizeRepostTitle,
} from '@/domain/repostSanitize';
import { useWalletStore } from '@/stores/walletStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useShiftDraftStore } from '@/stores/shiftDraftStore';
import { walletHistoryLink } from '@/lib/notificationTarget';
import { formatNumberVNInput, parseVNNumberInput } from '@/lib/numberVN';
import { isValidVNPhone } from '@/lib/validate';
import { formatVND, formatLogDateTime } from '@/lib/format';
import { showError, showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';
import type { EmployerType10A, ShiftDraft } from '@/types';

export default function NewShiftPage() {
  return (
    <RoleGuard role="employer">
      <NewShiftContent />
    </RoleGuard>
  );
}

function NewShiftContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams?.get('from') ?? null;
  const draftParam = searchParams?.get('draft') ?? null;
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useUserStore((s) => s.users);
  const shifts = useShiftStore((s) => s.shifts);
  const createShift = useShiftStore((s) => s.create);
  const simulateDeposit = useShiftStore((s) => s.simulateDeposit);
  const discardDraftShift = useShiftStore((s) => s.discardDraftShift);
  const topUp = useWalletStore((s) => s.topUp);
  const walletBalance = useWalletStore((s) =>
    currentUserId ? s.getBalance(currentUserId) : 0,
  );
  const pushNotification = useNotificationStore((s) => s.push);
  // CORE-STABILITY-8 Part 1 — draft store (saved form snapshots).
  const saveDraft = useShiftDraftStore((s) => s.save);
  const updateDraft = useShiftDraftStore((s) => s.update);
  const getDraftById = useShiftDraftStore((s) => s.getById);
  const removeDraft = useShiftDraftStore((s) => s.remove);
  const allDrafts = useShiftDraftStore((s) => s.drafts);
  const myDrafts = useMemo(
    () =>
      currentUserId
        ? allDrafts
            .filter((d) => d.employerId === currentUserId)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        : [],
    [allDrafts, currentUserId],
  );

  function handleContinueDraft(draft: ShiftDraft) {
    setActiveDraftId(draft.id);
    setRestoredValues({
      title: draft.title,
      description: draft.description,
      requirements: draft.requirements,
      jobType: draft.jobType,
      customJobTypeName: draft.customJobTypeName,
      location: draft.location,
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      hourlyWage: draft.hourlyWage,
      positionsTotal: draft.positionsTotal,
      evidenceRequirement: draft.evidenceRequirement,
      workplaceImageLabel: draft.workplaceImageLabel,
      workplaceNotes: draft.workplaceNotes,
      onSiteContactName: draft.onSiteContactName,
      onSiteContactPhone: draft.onSiteContactPhone,
      requiresVerifiedDocumentOnArrival: draft.requiresVerifiedDocumentOnArrival,
    });
    setFormKey((k) => k + 1);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDeleteDraft(id: string) {
    removeDraft(id);
    if (activeDraftId === id) {
      setActiveDraftId(null);
      setRestoredValues(undefined);
      setFormKey((k) => k + 1);
    }
    showSuccess(t('shiftForm.draft.deleted'));
  }
  // Phase 10A-Fix-3 — read employer verification documents so we can
  // compute posting readiness against the same data the admin queue
  // sees.
  const employerDocuments = useVerificationStore((s) => s.employerDocuments);

  const [createdShiftId, setCreatedShiftId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [deposited, setDeposited] = useState(false);
  // CORE-STABILITY-8 Part 1 — the draft currently being edited (if the
  // employer arrived via ?draft= or saved one this session). When set,
  // "Lưu nháp" updates it instead of creating a new draft.
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftParam);
  // CORE-STABILITY-8 Part 1 — values to seed the form with when
  // restoring a draft or returning from the insufficient-balance modal.
  // A bump to `formKey` remounts the form so the new seed takes effect.
  const [restoredValues, setRestoredValues] = useState<
    Partial<ShiftFormValues> | undefined
  >(undefined);
  const [formKey, setFormKey] = useState(0);
  // CORE-STABILITY-7 Part 2 — insufficient-balance flow. When the
  // deposit is blocked for lack of funds, we keep the Draft intact and
  // open a modal offering "Nạp tiền ngay / Lưu nháp / Quay lại chỉnh
  // sửa" instead of just a toast.
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpText, setTopUpText] = useState('');
  const [topUpError, setTopUpError] = useState<string | null>(null);
  // Phase 10A-Fix-3 — live snapshot of the workplace-image filename so
  // the readiness checklist updates as the employer types. Mirrored
  // out of `<ShiftForm>` via the `onValuesChange` callback.
  const [workplaceImageDraft, setWorkplaceImageDraft] = useState('');

  // Phase 10C-Stab-1 Batch 3 A — when the employer arrives via
  // `?from={id}` we resolve the source shift and pre-fill the form
  // with everything except date / startTime / endTime (the employer
  // must pick a fresh future date).
  const sourceShift = useMemo(() => {
    if (!fromParam) return null;
    return shifts.find((s) => s.id === fromParam) ?? null;
  }, [shifts, fromParam]);

  // CORE-STABILITY-8 Part 1 — resolve a saved draft when arriving via
  // ?draft={id}. Restores ALL saved fields into the create form.
  const draftRecord = useMemo<ShiftDraft | undefined>(() => {
    if (!draftParam) return undefined;
    return getDraftById(draftParam);
  }, [draftParam, getDraftById]);

  const initialValues = useMemo<Partial<ShiftFormValues> | undefined>(() => {
    // Returning from the insufficient-balance modal / a session restore
    // takes precedence so the employer keeps exactly what they typed.
    if (restoredValues) return restoredValues;
    if (draftRecord) {
      return {
        title: draftRecord.title,
        description: draftRecord.description,
        requirements: draftRecord.requirements,
        jobType: draftRecord.jobType,
        customJobTypeName: draftRecord.customJobTypeName,
        location: draftRecord.location,
        date: draftRecord.date,
        startTime: draftRecord.startTime,
        endTime: draftRecord.endTime,
        hourlyWage: draftRecord.hourlyWage,
        positionsTotal: draftRecord.positionsTotal,
        evidenceRequirement: draftRecord.evidenceRequirement,
        workplaceImageLabel: draftRecord.workplaceImageLabel,
        workplaceNotes: draftRecord.workplaceNotes,
        onSiteContactName: draftRecord.onSiteContactName,
        onSiteContactPhone: draftRecord.onSiteContactPhone,
        requiresVerifiedDocumentOnArrival:
          draftRecord.requiresVerifiedDocumentOnArrival,
      };
    }
    if (!sourceShift) return undefined;
    return {
      title: sanitizeRepostTitle(sourceShift.title),
      description: sanitizeRepostDescription(sourceShift.description),
      requirements: sourceShift.requirements,
      jobType: sourceShift.jobType,
      customJobTypeName: sourceShift.customJobTypeName ?? '',
      location: sourceShift.location,
      hourlyWage: sourceShift.hourlyWage,
      positionsTotal: sourceShift.positionsTotal,
      evidenceRequirement: sourceShift.evidenceRequirement,
      workplaceImageLabel: sourceShift.workplaceImageLabel ?? '',
      workplaceNotes: sourceShift.workplaceNotes ?? '',
      onSiteContactName: sourceShift.onSiteContactName ?? '',
      onSiteContactPhone: sourceShift.onSiteContactPhone ?? '',
      requiresVerifiedDocumentOnArrival:
        sourceShift.requiresVerifiedDocumentOnArrival ?? false,
      // Date / startTime / endTime intentionally omitted — employer
      // must pick a fresh future date.
    };
  }, [restoredValues, draftRecord, sourceShift]);

  // Mirror the source shift's workplace image label into the live
  // draft so the readiness checklist reflects the prefilled value
  // on first render.
  useEffect(() => {
    if (sourceShift?.workplaceImageLabel) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional prefill sync from source shift (repost flow) into local draft; refactor would change first-render readiness display
      setWorkplaceImageDraft(sourceShift.workplaceImageLabel);
    }
  }, [sourceShift]);

  // Phase 6: derive the employer's trust tier so we can show the deposit
  // breakdown live as they fill the form. Both selectors return stable
  // references; the `useMemo` keeps the per-employer count cheap.
  const employer = asEmployer(users.find((u) => u.id === currentUserId));
  const completedCount = useMemo(
    () =>
      currentUserId
        ? shifts.filter(
            (s) => s.employerId === currentUserId && s.status === 'Completed',
          ).length
        : 0,
    [shifts, currentUserId],
  );
  const trust = employer ? trustForEmployer(employer, completedCount) : 'low';
  const ratio = DEPOSIT_RATIO[trust];

  // Phase 10A-Fix-2: posting guard. A truly-new employer (no
  // employerType10A, no legacy employerType, and no shifts yet) must
  // pick an account type before posting. `resolveEmployerType` returns
  // `undefined` only in that exact state — established accounts with
  // posted shifts get an automatic fallback. Phase 10A-Fix-3 — the
  // resolved type is now read off `readiness.resolvedType` instead of
  // a separate variable.
  const hasPostedShifts = useMemo(
    () =>
      employer ? shifts.some((s) => s.employerId === employer.id) : false,
    [shifts, employer],
  );

  // Phase 10A-Fix-3: full posting readiness. Computed at the page
  // level so the same `ready` flag controls (1) the checklist display,
  // (2) the create-shift submit handler, and (3) the deposit-confirm
  // CTA. Recomputes when the employer record, doc list, or in-form
  // workplace-image draft changes.
  const readiness = useMemo(() => {
    if (!employer) return null;
    return computePostingReadiness({
      employer,
      employerDocuments,
      hasPostedShifts,
      workplaceImageInForm: workplaceImageDraft,
    });
  }, [employer, employerDocuments, hasPostedShifts, workplaceImageDraft]);

  // Workplace image is required for the form when readiness rules say
  // so. AgencyEvent + Individual always require it; HouseholdBusiness /
  // Company only require it when no profile-side workplace photo is
  // approved yet.
  const workplaceImageRequired = useMemo<boolean>(() => {
    if (!readiness?.resolvedType) return false;
    const t10 = readiness.resolvedType;
    if (t10 === 'Individual' || t10 === 'AgencyEvent') return true;
    return !readiness.checks.workplaceProofApproved;
  }, [readiness]);

  function handleSubmit(values: ShiftFormValues) {
    if (!currentUserId) return;
    // Phase 10A-Fix-3 — defence in depth. The form already validates
    // the workplace-image label when required; this re-checks the
    // full readiness rule set so a stale form state can't bypass the
    // gate (e.g. employer types in a filename then deletes it before
    // submitting).
    if (!readiness || !readiness.ready) {
      showError(
        t('posting.readiness.intro'),
        readiness?.blockers[0],
      );
      return;
    }
    // CORE-STABILITY-8 Part 2 — required on-site contact for publish.
    // (The store re-validates; this gives an inline message first.)
    if (values.onSiteContactName.trim() === '') {
      showError(t('shift.create.error.CONTACT_PERSON_REQUIRED'));
      return;
    }
    if (
      values.onSiteContactPhone.trim() === '' ||
      !isValidVNPhone(values.onSiteContactPhone).ok
    ) {
      showError(t('shift.create.error.CONTACT_PHONE_REQUIRED'));
      return;
    }
    const shift = createShift({ ...values, employerId: currentUserId });
    setCreatedShiftId(shift.id);
    setDepositAmount(shift.depositAmount);
    showSuccess(
      t('feedback.shift.create.success'),
      t('feedback.shift.create.success.desc'),
    );
  }

  // CORE-STABILITY-8 Part 1 — map form values to a draft snapshot.
  function valuesToDraftInput(values: ShiftFormValues) {
    return {
      employerId: currentUserId as string,
      title: values.title,
      description: values.description,
      requirements: values.requirements,
      jobType: values.jobType,
      customJobTypeName: values.customJobTypeName,
      location: values.location,
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      hourlyWage: values.hourlyWage,
      positionsTotal: values.positionsTotal,
      workplaceImageLabel: values.workplaceImageLabel,
      workplaceNotes: values.workplaceNotes,
      onSiteContactName: values.onSiteContactName,
      onSiteContactPhone: values.onSiteContactPhone,
      requiresVerifiedDocumentOnArrival:
        values.requiresVerifiedDocumentOnArrival,
      evidenceRequirement: values.evidenceRequirement,
    };
  }

  // CORE-STABILITY-8 Part 1 — "Lưu nháp" from the form. Saves the
  // current values as a draft (incomplete allowed), shows a toast, and
  // navigates to the posting page where the draft is listed.
  function handleSaveDraftFromForm(values: ShiftFormValues) {
    if (!currentUserId) return;
    const input = valuesToDraftInput(values);
    if (activeDraftId && getDraftById(activeDraftId)) {
      updateDraft(activeDraftId, input);
    } else {
      const rec = saveDraft(input);
      setActiveDraftId(rec.id);
    }
    showSuccess(t('shiftForm.saveDraft.success'));
    // Reset the form to blank and reveal the saved-drafts section.
    setRestoredValues(undefined);
    setActiveDraftId(null);
    setFormKey((k) => k + 1);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDeposit() {
    if (!createdShiftId) return;
    const result = simulateDeposit(createdShiftId);
    if (!result.ok) {
      // CORE-STABILITY-7 Part 2 — insufficient balance keeps the Draft
      // intact and opens a modal with a top-up path instead of just a
      // toast. The shift was created as a Draft on form submit and is
      // NOT published, so the draft context is fully preserved.
      if (result.error === 'INSUFFICIENT_BALANCE') {
        setInsufficientOpen(true);
        return;
      }
      // Other store-side gate rejections — surface the localized
      // message; do not flip the deposited UI.
      const messageKey = `shift.create.error.${result.error}` as const;
      showError(t(messageKey));
      return;
    }
    setDeposited(true);
    showSuccess(t('feedback.shift.deposit.success'));
    setTimeout(() => router.push(`/employer/shifts/${createdShiftId}`), 1200);
  }

  // CORE-STABILITY-7 Part 2 — "Nạp tiền ngay" from the insufficient-
  // balance modal. Opens the top-up modal while preserving the pending
  // deposit draft (createdShiftId / depositAmount stay set).
  function openTopUpFromInsufficient() {
    setInsufficientOpen(false);
    // Suggest the exact shortfall, rounded up to a tidy amount.
    const shortfall = Math.max(0, depositAmount - walletBalance);
    setTopUpText(shortfall > 0 ? formatNumberVNInput(shortfall) : '');
    setTopUpError(null);
    setTopUpOpen(true);
  }

  // CORE-STABILITY-8 Part 1 — map the transient created Draft shift
  // back to form values (used by "Quay lại chỉnh sửa" and "Lưu nháp"
  // from the insufficient-balance modal).
  function createdShiftToValues(): Partial<ShiftFormValues> | undefined {
    if (!createdShiftId) return undefined;
    const s = shifts.find((x) => x.id === createdShiftId);
    if (!s) return undefined;
    return {
      title: s.title,
      description: s.description,
      requirements: s.requirements,
      jobType: s.jobType,
      customJobTypeName: s.customJobTypeName ?? '',
      location: s.location,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      hourlyWage: s.hourlyWage,
      positionsTotal: s.positionsTotal,
      evidenceRequirement: s.evidenceRequirement,
      workplaceImageLabel: s.workplaceImageLabel ?? '',
      workplaceNotes: s.workplaceNotes ?? '',
      onSiteContactName: s.onSiteContactName ?? '',
      onSiteContactPhone: s.onSiteContactPhone ?? '',
      requiresVerifiedDocumentOnArrival:
        s.requiresVerifiedDocumentOnArrival ?? false,
    };
  }

  // CORE-STABILITY-8 Part 1 — "Quay lại chỉnh sửa" must return to the
  // FILLED form, not a blank page. Restore the created shift's values,
  // discard the transient Draft shift (so no orphan Draft lingers in
  // the shift list), and re-show the form.
  function backToEditFromModal() {
    const values = createdShiftToValues();
    setInsufficientOpen(false);
    if (createdShiftId) discardDraftShift(createdShiftId);
    setCreatedShiftId(null);
    setDeposited(false);
    if (values) {
      setRestoredValues(values);
      setFormKey((k) => k + 1);
    }
  }

  // CORE-STABILITY-8 Part 1 — "Lưu nháp" from the modal: persist the
  // created shift's data as a ShiftDraft, discard the transient Draft
  // shift, and navigate to the posting page where the draft is listed.
  function saveDraftFromModal() {
    const values = createdShiftToValues();
    setInsufficientOpen(false);
    if (values && currentUserId) {
      const input = valuesToDraftInput(values as ShiftFormValues);
      if (activeDraftId && getDraftById(activeDraftId)) {
        updateDraft(activeDraftId, input);
      } else {
        saveDraft(input);
      }
    }
    if (createdShiftId) discardDraftShift(createdShiftId);
    setCreatedShiftId(null);
    showSuccess(t('deposit.insufficient.savedDraft'));
    // Stay on the posting page; reset to a blank form and reveal the
    // saved-drafts section so the employer sees their draft listed.
    setRestoredValues(undefined);
    setActiveDraftId(null);
    setFormKey((k) => k + 1);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function submitTopUp() {
    if (!currentUserId) return;
    const trimmed = topUpText.trim();
    if (trimmed === '') {
      setTopUpError(t('wallet.topUp.error.required'));
      return;
    }
    const amount = parseVNNumberInput(trimmed);
    if (!Number.isFinite(amount) || amount <= 0) {
      setTopUpError(t('wallet.topUp.error.invalid'));
      return;
    }
    const entry = topUp(currentUserId, amount);
    showSuccess(t('wallet.topUp.success'), `+${formatVND(amount)}`);
    pushNotification({
      userId: currentUserId,
      kind: 'UserTopUp',
      title: t('wallet.topUp.success'),
      body: `${t('wallet.kind.UserTopUp')}: +${formatVND(amount)}`,
      link: walletHistoryLink('employer'),
      dedupeKey: `UserTopUp:${entry.id}`,
    });
    setTopUpOpen(false);
    setTopUpText('');
    setTopUpError(null);
    // The deposit-confirm card stays mounted (createdShiftId unchanged)
    // so the employer can click "Xác nhận đã thanh toán" again without
    // re-entering the form.
  }

  // Phase 10A-Fix-3: posting guard now uses the full readiness rule
  // set, not just "is type set?". When the employer is brand-new
  // (no resolved type), we render the type-picker prompt. When the
  // type is set but verification or workplace prerequisites are
  // missing, we render the same page wrapper but show the checklist
  // alongside the form so the employer can still see the deposit
  // explainer + form (the form's submit + the deposit CTA below the
  // form remain blocked until `readiness.ready === true`).
  if (employer && readiness && !readiness.resolvedType) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
            {t('employer.dashboard.title')}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
            {t('btn.postShift')}
          </h1>
        </header>
        <Card>
          <h2 className="mb-2 font-semibold text-gray-900">
            Cần chọn loại tài khoản trước khi đăng ca
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-gray-600">
            Vui lòng chọn loại tài khoản nhà tuyển dụng trước khi đăng ca.
            Loại tài khoản giúp xác định giấy tờ cần xác minh, mức đảm bảo
            thanh toán và quy tắc an toàn cho người lao động.
          </p>
          <Link href="/employer/profile">
            <Button variant="primary" size="md">
              {t('posting.readiness.cta.profile')}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero header — Phase 9 polish */}
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
              {t('employer.dashboard.title')}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
              {t('btn.postShift')}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('shifts.new.subtitle')}
            </p>
          </div>
          <PageHelpButton
            title={t('help.shiftCreate.title')}
            intro={t('help.shiftCreate.intro')}
            items={[
              t('help.shiftCreate.item1'),
              t('help.shiftCreate.item2'),
              t('help.shiftCreate.item3'),
              t('help.shiftCreate.item4'),
            ]}
          />
        </div>
      </header>

      {/* Phase 10C-Stab-1 Batch 3 A — repost-from banner. Visible
          when the employer arrived via /employer/shifts/new?from={id}
          so they understand they're cloning a previous shift and
          must pick a fresh date. */}
      {!createdShiftId && sourceShift && (
        <Card className="mb-4 border-orange-200 bg-orange-50">
          <p className="text-sm text-orange-900">
            <strong>Đang tạo ca mới từ:</strong> {sourceShift.title}. Vui lòng chọn ngày giờ mới trước khi đảm bảo thanh toán.
          </p>
        </Card>
      )}

      {/* Phase 6: trust tier + deposit ratio explainer. Visible from the
          first paint so the employer sees what they'll be charged before
          they finish filling out the form. */}
      {!createdShiftId && (
        <TrustExplainerCard trust={trust} ratio={ratio} />
      )}

      {/* Phase 10A-Fix-3 — verification + workplace readiness checklist.
          Always shown before creation so the employer sees what's
          missing. Hidden after creation since at that point readiness
          was already enforced. */}
      {!createdShiftId && readiness && readiness.resolvedType && (
        <ReadinessChecklist
          resolvedType={readiness.resolvedType}
          ready={readiness.ready}
          checks={readiness.checks}
          blockers={readiness.blockers}
        />
      )}

      {/* Success state */}
      {deposited && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {t('shifts.deposit.success')}
        </div>
      )}

      {/* After creation, before deposit — Phase 6 mock-payment block. */}
      {createdShiftId && !deposited && (
        <DepositConfirmCard
          depositAmount={depositAmount}
          trust={trust}
          ratio={ratio}
          onConfirm={handleDeposit}
        />
      )}

      {/* CORE-STABILITY-8 Part 1 — "Bản nháp đã lưu" section. Drafts
          are saved form snapshots (NOT real shifts): no lifecycle, no
          public visibility, no cancel/refund. */}
      {!createdShiftId && myDrafts.length > 0 && (
        <Card className="mb-5">
          <p className="mb-1 text-sm font-semibold text-gray-900">
            {t('shiftForm.draft.section.title')} ({myDrafts.length})
          </p>
          <p className="mb-3 text-xs text-gray-500">
            {t('shiftForm.draft.section.intro')}
          </p>
          <ul className="flex flex-col gap-2">
            {myDrafts.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {d.title.trim() || t('shiftForm.draft.untitled')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {d.date ? `${d.date}${d.startTime ? ` ${d.startTime}` : ''}` : t('shiftForm.draft.noDate')}
                  </p>
                  <p className="font-mono text-[11px] text-gray-400">
                    {t('shiftForm.draft.savedAt')}: {formatLogDateTime(d.updatedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleContinueDraft(d)}
                  >
                    {t('shiftForm.draft.continue')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteDraft(d.id)}
                  >
                    {t('shiftForm.draft.delete')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Form (hidden after creation). Phase 10A-Fix-3 — workplace
          image required by employer-type readiness rules; the live
          draft drives the readiness recompute via `onValuesChange`. */}
      {!createdShiftId && (
        <ShiftForm
          key={formKey}
          mode="create"
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraftFromForm}
          workplaceImageRequired={workplaceImageRequired}
          initialValues={initialValues}
          onValuesChange={(v) => setWorkplaceImageDraft(v.workplaceImageLabel)}
        />
      )}

      {/* CORE-STABILITY-7 Part 2 — insufficient-balance modal. The
          Draft shift is already persisted (created on submit) and NOT
          published, so we offer a top-up path that preserves it. */}
      <Modal
        open={insufficientOpen}
        onClose={() => setInsufficientOpen(false)}
        title={t('deposit.insufficient.title')}
      >
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-gray-700">{t('deposit.insufficient.body')}</p>
          <dl className="flex flex-col gap-1 rounded-lg bg-gray-50 px-3 py-2 text-xs ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">{t('deposit.insufficient.required')}</dt>
              <dd className="font-semibold text-gray-900">{formatVND(depositAmount)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">{t('deposit.insufficient.balance')}</dt>
              <dd className="font-semibold text-gray-900">{formatVND(walletBalance)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">{t('deposit.insufficient.shortfall')}</dt>
              <dd className="font-bold text-rose-700">
                {formatVND(Math.max(0, depositAmount - walletBalance))}
              </dd>
            </div>
          </dl>
          <p className="text-xs italic text-gray-500">
            {t('deposit.insufficient.draftNote')}
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <Button variant="primary" size="md" onClick={openTopUpFromInsufficient}>
              {t('deposit.insufficient.topUpNow')}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={saveDraftFromModal}
              >
                {t('deposit.insufficient.saveDraft')}
              </Button>
              <Button
                variant="ghost"
                size="md"
                className="flex-1"
                onClick={backToEditFromModal}
              >
                {t('deposit.insufficient.backToEdit')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* CORE-STABILITY-7 Part 2 — inline top-up modal. After a
          successful top-up the deposit-confirm card stays mounted so
          the employer can confirm payment without retyping the form. */}
      <Modal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        title={t('wallet.topUp.modal.title')}
      >
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-700">
              {t('wallet.topUp.modal.label')}
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={topUpText}
              placeholder={t('wallet.topUp.modal.placeholder')}
              onChange={(e) => {
                const numericOnly = e.target.value.replace(/[^\d]/g, '');
                setTopUpText(formatNumberVNInput(numericOnly));
                if (topUpError) setTopUpError(null);
              }}
              aria-invalid={!!topUpError}
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm font-mono text-gray-900',
                'min-h-[44px] transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
                topUpError
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-300 bg-white hover:border-gray-400',
              ].join(' ')}
            />
          </label>
          {topUpError && (
            <p role="alert" className="text-xs text-red-600">
              {topUpError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={() => setTopUpOpen(false)}>
              {t('wallet.topUp.modal.cancel')}
            </Button>
            <Button size="sm" variant="primary" onClick={submitTopUp}>
              {t('wallet.topUp.modal.submit')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 10A-Fix-3 — verification + workplace readiness checklist
// ---------------------------------------------------------------------------

function ReadinessChecklist({
  resolvedType,
  ready,
  checks,
  blockers,
}: {
  resolvedType: EmployerType10A;
  ready: boolean;
  checks: {
    typeSelected: boolean;
    representativeIdApproved: boolean;
    businessLicenseOrTaxApproved: boolean;
    workplaceProofApproved: boolean;
    workplaceImageProvided: boolean;
    eventProofApproved: boolean;
  };
  blockers: string[];
}) {
  // Pick which checklist items apply to the current type.
  const items: Array<{ key: string; label: string; ok: boolean }> = [
    {
      key: 'type',
      label: t('posting.readiness.checklist.type'),
      ok: checks.typeSelected,
    },
    {
      key: 'id',
      label: t('posting.readiness.checklist.id'),
      ok: checks.representativeIdApproved,
    },
  ];

  if (resolvedType === 'Company') {
    items.push({
      key: 'business',
      label: t('posting.readiness.checklist.business'),
      ok: checks.businessLicenseOrTaxApproved,
    });
  }
  if (resolvedType === 'AgencyEvent') {
    items.push({
      key: 'event',
      label: t('posting.readiness.checklist.event'),
      ok: checks.eventProofApproved,
    });
  }
  if (
    resolvedType === 'HouseholdBusiness' ||
    resolvedType === 'Company'
  ) {
    items.push({
      key: 'workplaceProof',
      label: t('posting.readiness.checklist.workplaceProof'),
      ok: checks.workplaceProofApproved,
    });
  }
  // Per-shift workplace image: required for Individual + AgencyEvent;
  // optional fallback for HouseholdBusiness / Company when no profile
  // photo is approved.
  items.push({
    key: 'workplaceImage',
    label: t('posting.readiness.checklist.workplaceImage'),
    ok: checks.workplaceImageProvided,
  });

  const tone = ready ? 'success' : 'warning';
  const headerLabel = ready
    ? t('posting.readiness.allClear')
    : t('posting.readiness.intro');

  return (
    <div
      className={[
        'mb-5 rounded-2xl border p-4 shadow-sm',
        ready
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-amber-300 bg-amber-50',
      ].join(' ')}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">
          {t('posting.readiness.title')}
        </p>
        <Badge tone={tone}>{headerLabel}</Badge>
      </div>
      <ul className="flex flex-col gap-1.5 text-xs text-gray-800">
        {items.map((it) => (
          <li key={it.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={[
                'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
                it.ok ? 'bg-emerald-500' : 'bg-amber-500',
              ].join(' ')}
            >
              {it.ok ? '✓' : '!'}
            </span>
            <span className={it.ok ? 'text-gray-700' : 'text-amber-900'}>
              {it.label}
            </span>
          </li>
        ))}
      </ul>
      {!ready && blockers.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs font-medium text-amber-900">
            {blockers[0]}
          </p>
          <p className="text-[11px] text-amber-800/80">
            {t('posting.readiness.depositLocked')}
          </p>
          <Link href="/employer/profile">
            <Button size="sm" variant="secondary">
              {t('posting.readiness.cta.profile')}
            </Button>
          </Link>
        </div>
      )}
      {resolvedType === 'Individual' && (
        <p className="mt-3 text-[11px] italic leading-relaxed text-gray-600">
          {t('posting.readiness.individualNote')}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trust explainer
// ---------------------------------------------------------------------------

function TrustExplainerCard({
  trust,
  ratio,
}: {
  trust: 'low' | 'medium' | 'high';
  ratio: number;
}) {
  const toneRing: Record<typeof trust, string> = {
    low: 'before:bg-amber-500',
    medium: 'before:bg-orange-500',
    high: 'before:bg-emerald-500',
  };
  return (
    <div
      className={[
        'relative mb-5 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-sm',
        'before:absolute before:left-0 before:top-0 before:h-1 before:w-full',
        toneRing[trust],
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
          <svg className="h-5 w-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3 4 6v6c0 4.5 3.2 8.5 8 9 4.8-.5 8-4.5 8-9V6l-8-3z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-orange-900">
            {t('deposit.trust.title')}
          </p>
          <p className="mt-1 text-xs text-orange-800/90">
            {t(`deposit.trust.${trust}`)}
          </p>
          <p className="mt-2 text-xs text-gray-600">
            {t('deposit.trust.ratio').replace(
              '{percent}',
              String(Math.round(ratio * 100)),
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deposit confirm card
// ---------------------------------------------------------------------------

function DepositConfirmCard({
  depositAmount,
  trust,
  ratio,
  onConfirm,
}: {
  depositAmount: number;
  trust: 'low' | 'medium' | 'high';
  ratio: number;
  onConfirm: () => void;
}) {
  // Reverse-calculate the full-wage figure so the breakdown line shows
  // both the gross amount and the discounted deposit. Avoids re-passing
  // the original form values through props.
  const fullWage = ratio > 0 ? Math.round(depositAmount / ratio) : depositAmount;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7c0-1.1.9-2 2-2h12l4 4v8c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V7Z" />
            <path strokeLinecap="round" d="M16 11h4M16 14h4" />
          </svg>
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-orange-900">
            {t('shifts.deposit.title')}
          </h2>
          <p className="mt-0.5 text-sm text-orange-800/90">
            {t('shifts.deposit.description')}
          </p>
        </div>
      </div>

      <dl className="mt-4 flex flex-col gap-1.5 rounded-xl bg-white/80 px-4 py-3 text-xs text-gray-700 ring-1 ring-orange-100">
        <DepositRow
          label={t('deposit.breakdown.fullWage')}
          value={formatVND(fullWage)}
        />
        <DepositRow
          label={t('deposit.breakdown.trust')}
          value={t(`deposit.trust.label.${trust}`)}
        />
        <DepositRow
          label={t('deposit.breakdown.ratio')}
          value={`${Math.round(ratio * 100)}%`}
        />
        <hr className="my-1 border-orange-100" />
        <DepositRow
          label={t('shifts.deposit.amount')}
          value={formatVND(depositAmount)}
          highlight
        />
      </dl>

      <Button variant="primary" size="lg" onClick={onConfirm} className="mt-4 w-full">
        {t('deposit.confirmPaid')}
      </Button>
    </div>
  );
}

function DepositRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={highlight ? 'font-semibold text-orange-900' : 'text-gray-600'}>
        {label}
      </dt>
      <dd className={highlight ? 'font-bold text-orange-900' : 'font-medium text-gray-900'}>
        {value}
      </dd>
    </div>
  );
}
