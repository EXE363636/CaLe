'use client';

import { useState } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore, asEmployer } from '@/stores/userStore';
import { Card, Button, Input, Textarea } from '@/components/ui';
import { Badge } from '@/components/ui';
import { EmployerFeedbackList } from '@/components/user/EmployerFeedbackList';
import { formatDateVN } from '@/lib/format';
import { t } from '@/i18n/vi';

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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
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
    </div>
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
