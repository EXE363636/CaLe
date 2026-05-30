'use client';

import { useMemo, useState } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore, asEmployer } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import {
  useVerificationStore,
  employerDocLabel,
  employerTypeLabel,
  verificationStatusLabel,
  verificationStatusTone,
  resolveEmployerType,
  getPendingTypeChangeRequest,
} from '@/stores';
import { useNotificationStore } from '@/stores/notificationStore';
import { Card, Button, Input, Textarea, Modal, PageShell } from '@/components/ui';
import { Badge } from '@/components/ui';
import { EmployerFeedbackList } from '@/components/user/EmployerFeedbackList';
import { formatDateVN } from '@/lib/format';
import { showSuccess, showError } from '@/lib/toast';
import { notifyAdmins } from '@/lib/adminNotifications';
import { t } from '@/i18n/vi';
import type {
  EmployerType10A,
  EmployerVerificationDocumentType,
} from '@/types';

export default function EmployerProfilePage() {
  return (
    <RoleGuard role="employer">
      <EmployerProfileContent />
    </RoleGuard>
  );
}

function EmployerProfileContent() {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useUserStore((s) => s.users);
  const updateUser = useUserStore((s) => s.updateUser);

  const employer = asEmployer(users.find((u) => u.id === currentUserId));
  const [editing, setEditing] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  if (!employer) return null;

  function handleSave(patch: Record<string, unknown>) {
    updateUser(employer!.id, patch);
    setEditing(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  }

  return (
    <PageShell width="4xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('nav.profile')}</h1>

      {savedFlash && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
          {t('common.success')}
        </div>
      )}

      {!editing ? (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Thông tin doanh nghiệp</h2>
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              {t('btn.edit')}
            </Button>
          </div>

          <dl className="flex flex-col gap-3 text-sm">
            <Field label={t('form.companyName')} value={employer.companyName} />
            <Field label={t('form.businessType')} value={employer.businessType} />
            <Field label="Mô tả" value={employer.description || 'Chưa có'} />
            <Field label="Email" value={employer.email} />
            <Field label={t('form.phone')} value={employer.phone} />
            <Field label="Tham gia" value={formatDateVN(employer.createdAt)} />
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Xác minh doanh nghiệp</dt>
              <dd>
                {employer.verifiedBusiness ? (
                  <Badge tone="success">Đã xác minh</Badge>
                ) : (
                  <Badge tone="neutral">Chưa xác minh</Badge>
                )}
              </dd>
            </div>
          </dl>
        </Card>
      ) : (
        <EditForm employer={employer} onCancel={() => setEditing(false)} onSave={handleSave} />
      )}

      {/* Phase 10A — employer verification card. Lists submitted
          documents per type with status + lets the employer submit
          mock documents matching their account shape. */}
      <EmployerVerificationCard employer={employer} />

      {/* CORE-STABILITY-8 Part 5 — understaffed policy setting. */}
      <UnderstaffedPolicyCard employer={employer} onSave={handleSave} />

      {/* Phase 9I — worker feedback panel: show what people who've worked
          for this business have said. Same component used inside the
          public `EmployerProfileModal` so trust signals stay consistent. */}
      <Card className="mt-6">
        <h2 className="mb-3 font-semibold text-gray-900">
          {t('employer.profile.workerFeedback.title')}
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          {t('employer.profile.workerFeedback.intro')}
        </p>
        <EmployerFeedbackList employerId={employer.id} limit={5} />
      </Card>
    </PageShell>
  );
}

function EditForm({
  employer,
  onCancel,
  onSave,
}: {
  employer: NonNullable<ReturnType<typeof asEmployer>>;
  onCancel: () => void;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [companyName, setCompanyName] = useState(employer.companyName);
  const [businessType, setBusinessType] = useState(employer.businessType);
  const [description, setDescription] = useState(employer.description ?? '');

  return (
    <Card>
      <h2 className="mb-4 font-semibold text-gray-900">Chỉnh sửa thông tin</h2>
      <div className="flex flex-col gap-4">
        <Input
          label={t('form.companyName')}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
        <Input
          label={t('form.businessType')}
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          required
        />
        <Textarea
          label="Mô tả"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>{t('btn.cancel')}</Button>
          <Button
            variant="primary"
            onClick={() =>
              onSave({
                companyName: companyName.trim(),
                businessType: businessType.trim(),
                description: description.trim() || undefined,
              })
            }
          >
            {t('btn.save')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CORE-STABILITY-8 Part 5 — understaffed policy setting
// ---------------------------------------------------------------------------

function UnderstaffedPolicyCard({
  employer,
  onSave,
}: {
  employer: NonNullable<ReturnType<typeof asEmployer>>;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const current = employer.understaffedPolicy ?? 'RunWithApproved';
  const [choice, setChoice] = useState(current);

  const options: Array<{
    value: NonNullable<typeof current>;
    label: string;
    hint: string;
  }> = [
    {
      value: 'RunWithApproved',
      label: t('employer.understaffed.runWithApproved'),
      hint: t('employer.understaffed.runWithApproved.hint'),
    },
    {
      value: 'RequireFull',
      label: t('employer.understaffed.requireFull'),
      hint: t('employer.understaffed.requireFull.hint'),
    },
  ];

  return (
    <Card className="mt-6">
      <h2 className="mb-1 font-semibold text-gray-900">
        {t('employer.understaffed.title')}
      </h2>
      <p className="mb-3 text-xs leading-relaxed text-gray-500">
        {t('employer.understaffed.intro')}
      </p>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={[
              'flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors cursor-pointer',
              choice === opt.value
                ? 'border-orange-400 bg-orange-50'
                : 'border-gray-200 bg-white hover:border-orange-300',
            ].join(' ')}
          >
            <input
              type="radio"
              name="understaffedPolicy"
              className="mt-1 h-4 w-4 accent-orange-500"
              checked={choice === opt.value}
              onChange={() => setChoice(opt.value)}
            />
            <span>
              <span className="font-medium text-gray-900">{opt.label}</span>
              <span className="mt-0.5 block text-xs text-gray-600">
                {opt.hint}
              </span>
            </span>
          </label>
        ))}
      </div>
      {choice !== current && (
        <Button
          size="sm"
          variant="primary"
          className="mt-3"
          onClick={() => onSave({ understaffedPolicy: choice })}
        >
          {t('btn.save')}
        </Button>
      )}
    </Card>
  );
}


// ---------------------------------------------------------------------------
// Phase 10A — employer verification card
// ---------------------------------------------------------------------------

const EMPLOYER_TYPES: EmployerType10A[] = [
  'Individual',
  'HouseholdBusiness',
  'Company',
  'AgencyEvent',
];

const TYPE_HINT: Record<EmployerType10A, string> = {
  Individual:
    'Không cần giấy phép kinh doanh. Bạn có thể xác minh bằng danh tính người thuê, địa điểm làm việc và đặt cọc 100% tiền công.',
  HouseholdBusiness:
    'Hộ kinh doanh: nộp CCCD đại diện + giấy phép hộ kinh doanh + ảnh mặt tiền.',
  Company:
    'Doanh nghiệp: nộp giấy phép kinh doanh + mã số thuế + ảnh chi nhánh hoặc địa chỉ.',
  AgencyEvent:
    'Agency / sự kiện: nộp giấy phép kinh doanh + hợp đồng / xác nhận sự kiện + ảnh địa điểm hoặc Google Maps / fanpage.',
};

const TYPE_DOC_OPTIONS: Record<
  EmployerType10A,
  EmployerVerificationDocumentType[]
> = {
  Individual: ['RepresentativeId', 'WorkplacePhoto', 'AddressProof'],
  HouseholdBusiness: ['RepresentativeId', 'BusinessLicense', 'StorefrontPhoto'],
  Company: ['BusinessLicense', 'TaxCode', 'StorefrontPhoto', 'AddressProof'],
  AgencyEvent: [
    'BusinessLicense',
    'EventProof',
    'WorkplacePhoto',
    'GoogleMapsOrFanpage',
  ],
};

function EmployerVerificationCard({
  employer,
}: {
  employer: NonNullable<ReturnType<typeof asEmployer>>;
}) {
  const docs = useVerificationStore((s) => s.employerDocuments);
  const submit = useVerificationStore((s) => s.submitEmployerDocument);
  const submitTypeChange = useVerificationStore(
    (s) => s.submitEmployerTypeChangeRequest,
  );
  const typeChangeRequests = useVerificationStore((s) => s.typeChangeRequests);
  const users = useUserStore((s) => s.users);
  const updateUser = useUserStore((s) => s.updateUser);
  const pushNotification = useNotificationStore((s) => s.push);
  // Phase 10A-Fix-2: if the employer has already posted shifts, treat
  // them as an established account — never show the first-set picker.
  const shifts = useShiftStore((s) => s.shifts);
  const hasPostedShifts = useMemo(
    () => shifts.some((s) => s.employerId === employer.id),
    [shifts, employer.id],
  );

  // Resolve current type with legacy fallback. If undefined, employer
  // hasn't picked yet — we render a one-time first-set picker instead
  // of the locked display. Established accounts (already posted shifts)
  // never see the picker thanks to the `hasPostedShifts` fallback.
  const resolvedType = useMemo(
    () => resolveEmployerType(employer, { hasPostedShifts }),
    [employer, hasPostedShifts],
  );

  const pendingChange = useMemo(
    () => getPendingTypeChangeRequest(employer.id, typeChangeRequests),
    [employer.id, typeChangeRequests],
  );

  const own = useMemo(
    () => docs.filter((d) => d.employerId === employer.id),
    [docs, employer.id],
  );

  // First-set state for employers without a resolved type.
  const [firstSetChoice, setFirstSetChoice] = useState<EmployerType10A>(
    'HouseholdBusiness',
  );

  // Change-request modal state.
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeRequested, setChangeRequested] = useState<EmployerType10A>(
    resolvedType ?? 'HouseholdBusiness',
  );
  const [changeReason, setChangeReason] = useState('');

  function handleFirstSet() {
    updateUser(employer.id, { employerType10A: firstSetChoice });
    showSuccess(
      `Đã chọn loại tài khoản: ${employerTypeLabel(firstSetChoice)}. Loại tài khoản sẽ được khoá; nếu cần đổi sau này hãy gửi yêu cầu để quản trị viên xem xét.`,
    );
  }

  function handleSubmitMock(documentType: EmployerVerificationDocumentType) {
    if (!resolvedType) {
      // Phase 10A-Fix-4 — validation error must use error tone, not
      // green success.
      showError('Vui lòng chọn loại tài khoản trước khi nộp tài liệu.');
      return;
    }
    submit(employer.id, {
      employerType: resolvedType,
      documentType,
      mockFileName: `mock-${employer.id}-${documentType}.pdf`,
    });
    notifyAdmins({
      users,
      push: pushNotification,
      kind: 'ReputationAdjusted',
      title: 'Nhà tuyển dụng gửi xác minh mới',
      body: `${employer.companyName} đã gửi tài liệu ${employerDocLabel(documentType)}.`,
    });
    showSuccess('Đã gửi tài liệu xác minh (mô phỏng).');
  }

  function handleSubmitChange() {
    if (!resolvedType) return;
    const r = submitTypeChange(
      employer.id,
      resolvedType,
      changeRequested,
      changeReason,
    );
    if (!r.ok) {
      const msg =
        r.error === 'SAME_TYPE'
          ? 'Loại tài khoản mới phải khác loại hiện tại.'
          : r.error === 'REASON_REQUIRED'
            ? 'Vui lòng nhập lý do.'
            : r.error === 'ALREADY_PENDING'
              ? 'Bạn đã có một yêu cầu đang chờ duyệt.'
              : `Không thể gửi yêu cầu: ${r.error}`;
      // Phase 10A-Fix-4 — validation error must use error tone.
      showError(msg);
      return;
    }
    notifyAdmins({
      users,
      push: pushNotification,
      kind: 'ReputationAdjusted',
      title: 'Có yêu cầu đổi loại tài khoản',
      body: `${employer.companyName} muốn đổi từ ${employerTypeLabel(r.value.currentType)} sang ${employerTypeLabel(r.value.requestedType)}.`,
    });
    showSuccess('Đã gửi yêu cầu đổi loại tài khoản. Quản trị viên sẽ xem xét.');
    setChangeOpen(false);
    setChangeReason('');
  }

  // ── First-set onboarding (no type yet) ─────────────────────────────────
  if (!resolvedType) {
    return (
      <Card className="mt-6">
        <h2 className="mb-1 font-semibold text-gray-900">
          Xác minh nhà tuyển dụng
        </h2>
        <p className="mb-3 text-xs leading-relaxed text-gray-500">
          Chọn loại tài khoản phù hợp nhất. Loại tài khoản dùng để xác định
          giấy tờ cần xác minh và sẽ được khoá sau khi bạn xác nhận; nếu cần
          đổi sau này hãy gửi yêu cầu để quản trị viên xem xét.
        </p>
        {/* Phase 10A-Fix-3 — note that this picker is only a legacy
            fallback. New accounts pick their type at registration. */}
        <p className="mb-3 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
          {t('employer.profile.firstSet.legacy')}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          {EMPLOYER_TYPES.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={firstSetChoice === t ? 'primary' : 'secondary'}
              onClick={() => setFirstSetChoice(t)}
            >
              {employerTypeLabel(t)}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-600">
          {TYPE_HINT[firstSetChoice]}
        </p>
        <Button
          size="sm"
          variant="primary"
          className="mt-3"
          onClick={handleFirstSet}
        >
          Xác nhận và khoá loại tài khoản
        </Button>
      </Card>
    );
  }

  // ── Locked display (type already set) ──────────────────────────────────
  return (
    <Card className="mt-6">
      <h2 className="mb-1 font-semibold text-gray-900">
        Xác minh nhà tuyển dụng
      </h2>
      <p className="mb-3 text-xs leading-relaxed text-gray-500">
        Loại tài khoản dùng để xác định giấy tờ cần xác minh. Bạn không thể
        tự đổi loại tài khoản sau khi đã chọn. Nếu chọn nhầm hoặc mô hình
        hoạt động thay đổi, hãy gửi yêu cầu để quản trị viên xem xét.
      </p>

      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
          Loại tài khoản hiện tại
        </p>
        <p className="mt-1 text-sm font-bold text-gray-900">
          {employerTypeLabel(resolvedType)}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">
          {TYPE_HINT[resolvedType]}
        </p>
        <div className="mt-3">
          {pendingChange ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <span className="font-semibold">Đang chờ duyệt:</span>{' '}
              Yêu cầu đổi sang {employerTypeLabel(pendingChange.requestedType)}.
              Lý do: {pendingChange.reason}
            </div>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setChangeRequested(
                  resolvedType === 'HouseholdBusiness'
                    ? 'Company'
                    : 'HouseholdBusiness',
                );
                setChangeReason('');
                setChangeOpen(true);
              }}
            >
              Yêu cầu đổi loại tài khoản
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Tài liệu cần nộp
        </p>
        {TYPE_DOC_OPTIONS[resolvedType].map((docType) => {
          const latest = own
            .filter((d) => d.documentType === docType)
            .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
          const status = latest?.status ?? 'NotSubmitted';
          return (
            <div
              key={docType}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900">
                  {employerDocLabel(docType)}
                </span>
                <Badge tone={verificationStatusTone(status)}>
                  {verificationStatusLabel(status)}
                </Badge>
              </div>
              {latest?.rejectionReason && (
                <p className="mt-1 text-xs text-red-600">
                  Lý do: {latest.rejectionReason}
                </p>
              )}
              {(status === 'NotSubmitted' ||
                status === 'Rejected' ||
                status === 'NeedsMoreInfo') && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={() => handleSubmitMock(docType)}
                >
                  {status === 'NotSubmitted'
                    ? 'Gửi tài liệu (mô phỏng)'
                    : 'Gửi lại'}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {own.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Tất cả tài liệu đã gửi
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-xs">
            {own.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2 py-1"
              >
                <span>
                  {d.displayLabel} · {employerTypeLabel(d.employerType)} ·{' '}
                  {formatDateVN(d.submittedAt)}
                </span>
                <Badge tone={verificationStatusTone(d.status)}>
                  {verificationStatusLabel(d.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[11px] italic leading-relaxed text-gray-500">
        Trong bản MVP, tài liệu là mô phỏng — không có upload thật.
      </p>

      {/* Type-change request modal */}
      <Modal
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        title="Yêu cầu đổi loại tài khoản"
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <p>
            Loại hiện tại:{' '}
            <span className="font-semibold">{employerTypeLabel(resolvedType)}</span>
          </p>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-700">
              Loại mới
            </p>
            <div className="flex flex-wrap gap-2">
              {EMPLOYER_TYPES.filter((t) => t !== resolvedType).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={changeRequested === t ? 'primary' : 'secondary'}
                  onClick={() => setChangeRequested(t)}
                >
                  {employerTypeLabel(t)}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-600">
              {TYPE_HINT[changeRequested]}
            </p>
          </div>
          <Textarea
            label="Lý do (bắt buộc)"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="Ví dụ: Doanh nghiệp đã được đăng ký chính thức nên cần chuyển sang loại Doanh nghiệp."
            rows={3}
          />
          <div className="mt-1 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setChangeOpen(false)}>
              Huỷ
            </Button>
            <Button size="sm" variant="primary" onClick={handleSubmitChange}>
              Gửi yêu cầu
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
