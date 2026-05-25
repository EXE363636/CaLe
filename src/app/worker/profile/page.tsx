'use client';

import { useMemo, useState } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore, asWorker } from '@/stores/userStore';
import {
  useVerificationStore,
  workerDocLabel,
  verificationStatusLabel,
  verificationStatusTone,
} from '@/stores';
import { useNotificationStore } from '@/stores/notificationStore';
import { notifyAdmins } from '@/lib/adminNotifications';
import { Badge, Card, Button, Input, Textarea, StarRating } from '@/components/ui';
import { UserAvatar } from '@/components/user/UserAvatar';
import { ReputationBadge } from '@/components/user/ReputationBadge';
import { averageRating } from '@/domain/rating';
import { skillBadgeLabel } from '@/domain/skillScore';
import { formatDateVN } from '@/lib/format';
import { showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';
import type {
  VerificationFlag,
  Worker,
  WorkerIdentityDocumentType,
  WorkerVerificationDocument,
} from '@/types';

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

          {/* Phase 6: reputation rules — surfaced on the profile so the
              worker understands how to recover their score. */}
          <Card className="bg-orange-50/40">
            <p className="font-semibold text-orange-800">
              {t('worker.dashboard.reputationHint.title')}
            </p>
            <p className="mt-1 text-sm text-orange-700">
              {t('worker.dashboard.reputationHint.gain')}
            </p>
            <p className="mt-1 text-sm text-orange-700">
              {t('worker.dashboard.reputationHint.lose')}
            </p>
          </Card>
        </div>

        {/* Right: stats + verifications */}
        <aside className="flex flex-col gap-4">
          {/* Phase 10A canonical verification card. Phase 10A-Fix-6 —
              the older "Xác minh" card with `<VerificationBadge>` +
              upload toggles was removed; phone verification is now a
              row inside this canonical card so the worker sees ONE
              source of truth, not two competing upload paths. */}
          <WorkerIdentityVerificationCard
            worker={worker}
            onTogglePhone={(flag) => {
              const has = worker.verifications.includes(flag);
              const next = has
                ? worker.verifications.filter((v) => v !== flag)
                : [...worker.verifications, flag];
              updateUser(worker.id, { verifications: next });
            }}
          />

          <Card>
            <h2 className="mb-3 font-semibold text-gray-900">Thống kê</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <StatRow label={t('worker.dashboard.stats.completedShifts')} value={String(worker.completedShiftCount)} />
              <StatRow label="Số lần vắng mặt" value={String(worker.noShowCount)} />
              <StatRow label="Số lần huỷ" value={String(worker.cancellationHistory.length)} />
              <StatRow label="Tham gia" value={formatDateVN(worker.createdAt)} />
            </dl>
          </Card>

          {/* Phase 10A-Fix-9 — per-job-type skill scores. Worker can
              see how they're rated separately for each category they've
              worked in. Hidden when there are no scores yet. */}
          {(worker.skillScores ?? []).length > 0 && (
            <Card>
              <h2 className="mb-3 font-semibold text-gray-900">
                Kỹ năng theo loại việc
              </h2>
              <ul className="flex flex-col gap-2">
                {[...(worker.skillScores ?? [])]
                  .sort((a, b) =>
                    b.lastUpdatedAt.localeCompare(a.lastUpdatedAt),
                  )
                  .map((entry) => (
                    <li
                      key={entry.category}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-gray-900">
                          {entry.category}
                        </p>
                        <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                          {entry.score} điểm · {skillBadgeLabel(entry)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        Hoàn thành: {entry.completedCount} ca
                      </p>
                    </li>
                  ))}
              </ul>
              <p className="mt-3 text-[11px] italic leading-relaxed text-gray-500">
                Điểm kỹ năng tách riêng với điểm uy tín tổng. Nhà tuyển
                dụng xem điểm kỹ năng phù hợp với loại ca khi duyệt.
              </p>
            </Card>
          )}
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
}function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
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
      {items.map((it, idx) => (
        <span
          key={`${it}-${idx}`}
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
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(',')) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Phase 10A — worker identity verification card
// ---------------------------------------------------------------------------

function WorkerIdentityVerificationCard({
  worker,
  onTogglePhone,
}: {
  worker: Worker;
  onTogglePhone: (flag: VerificationFlag) => void;
}) {
  const docs = useVerificationStore((s) => s.workerDocuments);
  const submit = useVerificationStore((s) => s.submitWorkerDocument);
  const users = useUserStore((s) => s.users);
  const pushNotification = useNotificationStore((s) => s.push);

  const own = useMemo(
    () => docs.filter((d) => d.workerId === worker.id),
    [docs, worker.id],
  );
  // Most-recent record per type so the UI shows current status.
  const byType = useMemo(() => {
    const m = new Map<WorkerIdentityDocumentType, WorkerVerificationDocument>();
    for (const d of own) {
      const existing = m.get(d.documentType);
      if (!existing || d.submittedAt > existing.submittedAt) {
        m.set(d.documentType, d);
      }
    }
    return m;
  }, [own]);

  const types: { type: WorkerIdentityDocumentType; description: string }[] = [
    { type: 'NationalId', description: 'CCCD / CMND — phổ biến nhất, nhận trên mọi loại ca.' },
    { type: 'StudentCard', description: 'Thẻ sinh viên — phù hợp nếu bạn đang đi học.' },
    { type: 'DriverLicense', description: 'Bằng lái xe — dùng được khi không có CCCD/CMND.' },
  ];

  const [submitting, setSubmitting] = useState<WorkerIdentityDocumentType | null>(
    null,
  );

  function handleSubmitMock(type: WorkerIdentityDocumentType) {
    setSubmitting(type);
    submit(worker.id, {
      documentType: type,
      fullIdentifier: `MOCK-${worker.id}-${type}`,
      mockFrontImageUrl: `mock://${worker.id}/${type}-front.jpg`,
      mockBackImageUrl:
        type === 'StudentCard' ? undefined : `mock://${worker.id}/${type}-back.jpg`,
      mockSelfieImageUrl: `mock://${worker.id}/selfie.jpg`,
    });
    // Phase 10A-Fix-1: notify all admins so the queue gets a bell ping.
    notifyAdmins({
      users,
      push: pushNotification,
      kind: 'ReputationAdjusted',
      title: 'Có yêu cầu xác minh mới',
      body: `${worker.fullName} đã gửi xác minh bằng ${workerDocLabel(type)}.`,
    });
    showSuccess('Đã gửi tài liệu xác minh (mô phỏng). Quản trị viên sẽ duyệt.');
    setSubmitting(null);
  }

  const phoneVerified = worker.verifications.includes('phone');

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-gray-900">Xác minh</h2>
      <p className="mb-3 text-xs leading-relaxed text-gray-500">
        Bạn chỉ cần dùng một trong các giấy tờ hợp lệ để xác minh danh tính.
        Nếu giấy tờ đã được duyệt, bạn không cần tải lại trừ khi muốn bổ sung
        phương thức khác.
      </p>

      {/* Phone verification row — Phase 10A-Fix-6 merged from the
          legacy "Xác minh" card. Phone has no separate doc model in
          the MVP, so it stays a `worker.verifications` flag toggle. */}
      <div className="mb-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-gray-900">
            Xác minh số điện thoại
          </span>
          <Badge tone={phoneVerified ? 'success' : 'neutral'}>
            {phoneVerified ? 'Đã xác minh' : 'Chưa xác minh'}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Cần thiết trước khi ứng tuyển. Trong bản MVP đây chỉ là mô phỏng,
          không gửi OTP thật.
        </p>
        <ToggleVerifyButton
          label={phoneVerified ? t('btn.verifyPhone') : t('btn.verifyPhone')}
          active={phoneVerified}
          onClick={() => onTogglePhone('phone')}
        />
      </div>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Xác minh danh tính
      </p>
      <div className="flex flex-col gap-2">
        {types.map(({ type, description }) => {
          const doc = byType.get(type);
          const status = doc?.status ?? 'NotSubmitted';
          return (
            <div
              key={type}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900">
                  {workerDocLabel(type)}
                </span>
                <Badge tone={verificationStatusTone(status)}>
                  {verificationStatusLabel(status)}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-gray-500">{description}</p>
              {doc?.rejectionReason && (
                <p className="mt-1 text-xs text-red-600">
                  Lý do: {doc.rejectionReason}
                </p>
              )}
              {(status === 'NotSubmitted' || status === 'Rejected' || status === 'NeedsMoreInfo') && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  loading={submitting === type}
                  onClick={() => handleSubmitMock(type)}
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
      <p className="mt-3 text-[11px] italic leading-relaxed text-gray-500">
        Trong bản MVP, tài liệu là mô phỏng — không có upload thật.
        Quản trị viên là người duy nhất xem tài liệu đầy đủ; nhà tuyển dụng
        chỉ thấy huy hiệu và số đăng ký dạng rút gọn.
      </p>
    </Card>
  );
}
