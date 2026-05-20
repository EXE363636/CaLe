'use client';

import { useState } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore, asWorker } from '@/stores/userStore';
import { Card, Button, Input, Textarea, StarRating } from '@/components/ui';
import { UserAvatar } from '@/components/user/UserAvatar';
import { ReputationBadge } from '@/components/user/ReputationBadge';
import { VerificationBadge } from '@/components/user/VerificationBadge';
import { averageRating } from '@/domain/rating';
import { formatDateVN } from '@/lib/format';
import { t } from '@/i18n/vi';
import type { VerificationFlag, Worker } from '@/types';

export default function WorkerProfilePage() {
  return (
    <RoleGuard role="worker">
      <WorkerProfileContent />
    </RoleGuard>
  );
}

function WorkerProfileContent() {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const users = useUserStore((s) => s.users);
  const updateUser = useUserStore((s) => s.updateUser);

  const worker = asWorker(users.find((u) => u.id === currentUserId));
  const [editing, setEditing] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  if (!worker) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-center gap-4">
        <UserAvatar name={worker.fullName} avatarUrl={worker.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-gray-900">{worker.fullName}</h1>
          <p className="text-sm text-gray-500">{worker.email}</p>
        </div>
        <ReputationBadge score={worker.reputationScore} />
      </header>

      {savedFlash && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
          {t('common.success')}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: profile info */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <BasicInfoCard
            worker={worker}
            editing={editing}
            onEdit={() => setEditing(true)}
            onCancel={() => setEditing(false)}
            onSave={(patch) => {
              updateUser(worker.id, patch);
              setEditing(false);
              setSavedFlash(true);
              setTimeout(() => setSavedFlash(false), 2500);
            }}
          />

          {/* Ratings history */}
          <Card>
            <h2 className="mb-3 font-semibold text-gray-900">Đánh giá đã nhận</h2>
            <RatingsHistory worker={worker} />
          </Card>
        </div>

        {/* Right: stats + verifications */}
        <aside className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-3 font-semibold text-gray-900">Xác minh</h2>
            <VerificationBadge verifications={worker.verifications} />
            <VerificationActions
              worker={worker}
              onToggle={(flag) => {
                const has = worker.verifications.includes(flag);
                const next = has
                  ? worker.verifications.filter((v) => v !== flag)
                  : [...worker.verifications, flag];
                updateUser(worker.id, { verifications: next });
              }}
            />
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-gray-900">Thống kê</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <StatRow label={t('worker.dashboard.stats.completedShifts')} value={String(worker.completedShiftCount)} />
              <StatRow label="Số lần vắng mặt" value={String(worker.noShowCount)} />
              <StatRow label="Số lần huỷ" value={String(worker.cancellationHistory.length)} />
              <StatRow label="Tham gia" value={formatDateVN(worker.createdAt)} />
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function BasicInfoCard({
  worker,
  editing,
  onEdit,
  onCancel,
  onSave,
}: {
  worker: Worker;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<Worker>) => void;
}) {
  const [bio, setBio] = useState(worker.bio ?? '');
  const [skillsText, setSkillsText] = useState(worker.skills.join(', '));
  const [jobTypesText, setJobTypesText] = useState(worker.preferredJobTypes.join(', '));
  const [locationsText, setLocationsText] = useState(worker.preferredLocations.join(', '));

  function handleSave() {
    onSave({
      bio: bio.trim() || undefined,
      skills: parseList(skillsText),
      preferredJobTypes: parseList(jobTypesText),
      preferredLocations: parseList(locationsText),
    });
  }

  if (!editing) {
    return (
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Thông tin cá nhân</h2>
          <Button size="sm" variant="secondary" onClick={onEdit}>
            {t('btn.edit')}
          </Button>
        </div>

        <ProfileField label={t('form.bio')}>
          {worker.bio ? (
            <p className="text-sm text-gray-700 whitespace-pre-line">{worker.bio}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">Chưa có giới thiệu</p>
          )}
        </ProfileField>

        <ProfileField label={t('form.skills')}>
          <ChipList items={worker.skills} />
        </ProfileField>

        <ProfileField label={t('form.preferredJobTypes')}>
          <ChipList items={worker.preferredJobTypes} />
        </ProfileField>

        <ProfileField label={t('form.preferredLocations')}>
          <ChipList items={worker.preferredLocations} />
        </ProfileField>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-4 font-semibold text-gray-900">Chỉnh sửa hồ sơ</h2>
      <div className="flex flex-col gap-4">
        <Textarea
          label={t('form.bio')}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={3}
        />
        <Input
          label={t('form.skills')}
          hint="Cách nhau bởi dấu phẩy"
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          placeholder="phục vụ, pha chế, thu ngân"
        />
        <Input
          label={t('form.preferredJobTypes')}
          hint="Cách nhau bởi dấu phẩy"
          value={jobTypesText}
          onChange={(e) => setJobTypesText(e.target.value)}
          placeholder="Phục vụ, Pha chế"
        />
        <Input
          label={t('form.preferredLocations')}
          hint="Cách nhau bởi dấu phẩy"
          value={locationsText}
          onChange={(e) => setLocationsText(e.target.value)}
          placeholder="Quận 1, Quận 3"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {t('btn.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {t('btn.save')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function RatingsHistory({ worker }: { worker: Worker }) {
  const avg = averageRating(worker.ratingsReceived);

  if (worker.ratingsReceived.length === 0) {
    return <p className="text-sm text-gray-400 italic">{t('reputation.noRatings')}</p>;
  }

  return (
    <div>
      {avg !== null && (
        <div className="mb-3 flex items-center gap-2">
          <StarRating value={avg} readOnly size="sm" />
          <span className="text-sm font-medium text-gray-900">
            {avg.toFixed(1)} / 5
          </span>
          <span className="text-xs text-gray-500">
            ({worker.ratingsReceived.length} đánh giá)
          </span>
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {worker.ratingsReceived.slice(0, 10).map((r) => (
          <li key={r.id} className="rounded-lg border border-gray-100 p-3">
            <div className="flex items-center justify-between">
              <StarRating value={r.stars} readOnly size="sm" />
              <span className="text-xs text-gray-400">{formatDateVN(r.createdAt)}</span>
            </div>
            {r.feedback && (
              <p className="mt-1.5 text-sm text-gray-700">&ldquo;{r.feedback}&rdquo;</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerificationActions({
  worker,
  onToggle,
}: {
  worker: Worker;
  onToggle: (flag: VerificationFlag) => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      <ToggleVerifyButton
        label={t('btn.verifyPhone')}
        active={worker.verifications.includes('phone')}
        onClick={() => onToggle('phone')}
      />
      <ToggleVerifyButton
        label={t('btn.uploadId')}
        active={worker.verifications.includes('id')}
        onClick={() => onToggle('id')}
      />
      <ToggleVerifyButton
        label={t('btn.uploadStudentCard')}
        active={worker.verifications.includes('student')}
        onClick={() => onToggle('student')}
      />
      <p className="mt-1 text-xs text-gray-400">Mô phỏng — không yêu cầu OTP hoặc tài liệu thật.</p>
    </div>
  );
}

function ToggleVerifyButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant={active ? 'ghost' : 'secondary'}
      onClick={onClick}
      className="justify-start"
    >
      {active ? '✓ ' : ''}{label}{active ? ' (đã xác minh)' : ''}
    </Button>
  );
}

function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-gray-400 italic">Chưa có</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it}
          className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
        >
          {it}
        </span>
      ))}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function parseList(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
