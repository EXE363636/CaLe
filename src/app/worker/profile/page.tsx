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
import {
  Badge,
  Card,
  Button,
  Input,
  Textarea,
  PageShell,
  SectionHeader,
} from '@/components/ui';
import { UserAvatar } from '@/components/user/UserAvatar';
import { hasCapability } from '@/data/capabilities';
import { SkillProgressBar } from '@/components/user/SkillProgressBar';
import { buildSkillDisplayList } from '@/domain/skillProgression';
import { formatDateVN } from '@/lib/format';
import { showSuccess, showError } from '@/lib/toast';
import { t } from '@/i18n/vi';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { AccountVerificationCard } from '@/components/verification/AccountVerificationCard';
import { derivedReputationOf, useDerivedReputationMap } from '@/lib/useDerivedReputation';
import { useWorkerReviews } from '@/lib/useReviews';
import { ReviewList } from '@/components/user/ReviewList';
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
  const updateProfile = useUserStore((s) => s.updateProfile);
  const [saving, setSaving] = useState(false);

  const worker = asWorker(users.find((u) => u.id === currentUserId));
  const [editing, setEditing] = useState(false);
  // Supabase: bộ đếm trên hồ sơ (completedShiftCount / noShowCount /
  // cancellationHistory) KHÔNG được server cập nhật → đếm từ lịch sử đơn thật,
  // cùng nguồn với dashboard (tránh "0 ca hoàn thành" khi đã làm xong ca).
  const derivedMap = useDerivedReputationMap();
  const reviews = useWorkerReviews(worker);

  if (!worker) return null;

  const derived = derivedReputationOf(derivedMap, worker.id);
  const stats = isSupabaseEnv()
    ? {
        completed: derived.completed,
        noShows: derived.noShows,
        cancellations: derived.workerCancellations,
      }
    : {
        completed: worker.completedShiftCount,
        noShows: worker.noShowCount,
        cancellations: worker.cancellationHistory.length,
      };

  return (
    <PageShell width="3xl">
      {/* Identity + track record in one calm band: who you are on the left,
          the three numbers an employer judges you by on the right. */}
      <header className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar name={worker.fullName} avatarUrl={worker.avatarUrl} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-gray-900">{worker.fullName}</h1>
              <p className="mt-0.5 truncate text-sm text-gray-600">{worker.email}</p>
              <p className="mt-0.5 text-sm text-gray-600">
                {t('worker.profile.joinedSince').replace('{date}', formatDateVN(worker.createdAt))}
              </p>
              {(hasCapability('ratings') ||
                (hasCapability('verifications') && worker.verifications.includes('phone'))) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {/* Điểm uy tín chưa có backend ở supabase → ẩn (không hiện 100 giả). */}
                  {hasCapability('ratings') && (
                    <Badge tone="neutral">
                      {t('worker.profile.chip.reputation').replace('{score}', String(worker.reputationScore))}
                    </Badge>
                  )}
                  {hasCapability('verifications') && worker.verifications.includes('phone') && (
                    <Badge tone="success">{t('worker.profile.chip.phoneVerified')}</Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-100 pt-4 md:min-w-[22rem] md:border-t-0 md:pt-0">
            <ProfileMetric label={t('worker.profile.metric.completed')} value={stats.completed} />
            <ProfileMetric
              label={t('worker.profile.metric.noShows')}
              value={stats.noShows}
              alert={stats.noShows > 0}
            />
            <ProfileMetric
              label={t('worker.profile.metric.cancellations')}
              value={stats.cancellations}
            />
          </dl>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6">
          <BasicInfoCard
            worker={worker}
            editing={editing}
            onEdit={() => setEditing(true)}
            onCancel={() => setEditing(false)}
            saving={saving}
            onSave={async (patch) => {
              setSaving(true);
              const res = await updateProfile(worker.id, patch);
              setSaving(false);
              if (!res.ok) {
                showError(t('worker.profile.saveFailed'));
                return;
              }
              setEditing(false);
              showSuccess(t('worker.profile.saved'));
            }}
          />

          {/* Đánh giá nhà tuyển dụng dành cho bạn (0024 ở production). */}
          {hasCapability('reviews') && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900">{t('worker.profile.reviews.title')}</h2>
              <p className="mb-4 mt-0.5 text-sm text-gray-600">{t('worker.profile.reviews.intro')}</p>
              <ReviewList
                items={reviews.map((r) => ({
                  id: r.id,
                  stars: r.stars,
                  comment: r.feedback,
                  createdAt: r.createdAt,
                }))}
                reportKind="rating"
                limit={10}
                emptyText={t('worker.profile.reviews.empty')}
              />
            </Card>
          )}

          {/* Phase 6: reputation rules — surfaced on the profile so the
              worker understands how to recover their score. VISUAL POLISH:
              use the Card `tone="warm"` API (bg-orange-50/60 + orange-100
              border) instead of a `bg-orange-50/40` className. The Card's
              default `bg-white` was defined later in the compiled sheet and
              won over the className, so the warm callout was rendering flat
              white; the tone prop restores the intended on-palette warm
              tint and matches the dashboard's reputation hint. */}
          {hasCapability('ratings') && (
            <Card tone="warm">
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
          )}
        </div>

        {/* Verification — same column, below the profile. */}
        <div className="flex flex-col gap-6">
          {/* Phase 10A canonical verification card. Phase 10A-Fix-6 —
              the older "Xác minh" card with `<VerificationBadge>` +
              upload toggles was removed; phone verification is now a
              row inside this canonical card so the worker sees ONE
              source of truth, not two competing upload paths. */}
          {/* Supabase: xác thực SĐT (OTP) + CCCD (admin duyệt) thật — 0022. */}
          {isSupabaseEnv() && <AccountVerificationCard userId={worker.id} role="worker" />}
          {/* Local/demo: luồng xác minh giấy tờ mô phỏng cũ. */}
          {hasCapability('verifications') && (
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
          )}
        </div>
      </div>

      {/* Phase 10A-Fix-9 / CORE-STABILITY-9 Part 4 /
          PRODUCT-UX-FIX-BACKEND-PREP-1 Part 2 — per-job-type skill
          progression with level + XP progress bars. ALWAYS shown:
          a worker with no completed shifts still sees the default
          casual-job skill cards at Cấp 1 / 0 XP (never a blank UI).

          UI-REFRESH Batch 2 — moved out of the narrow sidebar into a
          full-width responsive GRID below the two columns so the bars
          breathe on desktop instead of stacking in a tall single column. */}
      {/* Tiến trình kỹ năng (XP/cấp độ) chưa có backend ở supabase → ẩn. */}
      {hasCapability('ratings') && (
        <section className="mt-6">
          <Card>
            <SectionHeader
              as="h2"
              title={t('skill.section.title')}
              subtitle={t('skill.section.intro')}
            />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {buildSkillDisplayList(worker.skillScores).map((entry) => (
                <SkillProgressBar key={entry.category} entry={entry} />
              ))}
            </ul>
            <p className="mt-3 text-xs italic leading-relaxed text-gray-500">
              {t('skill.section.footnote')}
            </p>
          </Card>
        </section>
      )}
    </PageShell>
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
  saving = false,
}: {
  worker: Worker;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<Worker>) => void;
  saving?: boolean;
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
    const filledCount = [
      !!worker.bio,
      worker.skills.length > 0,
      worker.preferredJobTypes.length > 0,
      worker.preferredLocations.length > 0,
    ].filter(Boolean).length;

    // Chưa điền gì: thay 4 dòng "Chưa có" bằng một lời mời cụ thể — nói rõ
    // mục nào nhà tuyển dụng thấy (public_profiles: giới thiệu, kỹ năng, loại
    // việc) và mục nào chỉ mình bạn thấy (khu vực).
    if (filledCount === 0) {
      return (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">{t('worker.profile.info.title')}</h2>
          <p className="mt-1 text-sm text-gray-600">{t('worker.profile.empty.lead')}</p>
          <ul className="mt-4 flex flex-col divide-y divide-gray-100">
            {PROFILE_PROMPTS.map((key) => (
              <li key={key} className="flex items-start gap-3 py-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-700"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                    <path d="M10 4.5v11M4.5 10h11" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t(`worker.profile.prompt.${key}.title`)}</p>
                  <p className="mt-0.5 text-sm text-gray-600">{t(`worker.profile.prompt.${key}.hint`)}</p>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="primary" onClick={onEdit} className="mt-4">
            {t('worker.profile.empty.cta')}
          </Button>
        </Card>
      );
    }

    return (
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('worker.profile.info.title')}</h2>
            <p className="mt-0.5 text-sm text-gray-600">
              {t('worker.profile.info.progress').replace('{n}', String(filledCount))}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={onEdit}>
            {t('btn.edit')}
          </Button>
        </div>

        <div className="mt-5 flex flex-col gap-5">
          <ProfileField label={t('form.bio')}>
            {worker.bio ? (
              <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed text-gray-800">{worker.bio}</p>
            ) : (
              <MissingValue onAdd={onEdit} />
            )}
          </ProfileField>
          <div className="grid gap-5 sm:grid-cols-2">
            <ProfileField label={t('form.skills')}>
              <ChipList items={worker.skills} onAdd={onEdit} />
            </ProfileField>
            <ProfileField label={t('form.preferredJobTypes')}>
              <ChipList items={worker.preferredJobTypes} onAdd={onEdit} />
            </ProfileField>
          </div>
          <ProfileField label={t('form.preferredLocations')} note={t('worker.profile.privateNote')}>
            <ChipList items={worker.preferredLocations} onAdd={onEdit} />
          </ProfileField>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-4 font-semibold text-gray-900">{t('worker.profile.edit.title')}</h2>
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
          hint={t('worker.profile.edit.commaHint')}
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          placeholder="phục vụ, pha chế, thu ngân"
        />
        <Input
          label={t('form.preferredJobTypes')}
          hint={t('worker.profile.edit.commaHint')}
          value={jobTypesText}
          onChange={(e) => setJobTypesText(e.target.value)}
          placeholder="Phục vụ, Pha chế"
        />
        <Input
          label={t('form.preferredLocations')}
          hint={t('worker.profile.edit.commaHint')}
          value={locationsText}
          onChange={(e) => setLocationsText(e.target.value)}
          placeholder="Quận 1, Quận 3"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            {t('btn.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {t('btn.save')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

const PROFILE_PROMPTS = ['bio', 'skills', 'jobTypes', 'locations'] as const;

function ProfileField({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700">
        {label}
        {note && <span className="ml-2 text-xs font-normal text-gray-600">{note}</span>}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function MissingValue({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="inline-flex min-h-[44px] items-center gap-1 rounded text-sm font-medium text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      {t('worker.profile.addMissing')}
    </button>
  );
}

function ChipList({ items, onAdd }: { items: string[]; onAdd: () => void }) {
  if (items.length === 0) return <MissingValue onAdd={onAdd} />;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, idx) => (
        <span
          key={`${it}-${idx}`}
          className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-900 ring-1 ring-orange-100"
        >
          {it}
        </span>
      ))}
    </div>
  );
}

function ProfileMetric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse items-center px-3 text-center">
      <dt className="mt-0.5 whitespace-nowrap text-xs text-gray-600 sm:text-sm">{label}</dt>
      <dd
        className={[
          'text-2xl font-bold tabular-nums',
          alert ? 'text-red-700' : 'text-gray-900',
        ].join(' ')}
      >
        {value}
      </dd>
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
      {/* P3 card-in-card: inner rows made flush inside the white Card —
          dropped the `border border-gray-200 bg-white` box treatment for a
          soft `bg-gray-50` tint so the rows read as grouped panels, not
          nested cards. Grouping + content unchanged. */}
      <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
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
        {/* Honesty — this is a simulated verification toggle for the demo
            (no real OTP is sent). The label says so explicitly and the
            action can be undone; it never claims a real verification. */}
        <Button
          size="sm"
          variant={phoneVerified ? 'ghost' : 'secondary'}
          onClick={() => onTogglePhone('phone')}
          className="mt-2 justify-start"
        >
          {phoneVerified
            ? '✓ Đã xác minh (mô phỏng) — bấm để hoàn tác'
            : 'Mô phỏng xác minh SĐT (demo)'}
        </Button>
      </div>

      <p className="mb-2 text-xs font-semibold text-gray-700">
        Xác minh danh tính
      </p>
      <div className="flex flex-col gap-2">
        {types.map(({ type, description }) => {
          const doc = byType.get(type);
          const status = doc?.status ?? 'NotSubmitted';
          return (
            <div
              key={type}
              // P3 card-in-card: flush soft-tint row (was
              // `border border-gray-200 bg-white`) so identity-doc rows
              // group inside the white Card without nesting card borders.
              className="rounded-lg bg-gray-50 px-3 py-2 text-sm"
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
      <p className="mt-3 text-xs italic leading-relaxed text-gray-500">
        Trong bản MVP, tài liệu là mô phỏng — không có upload thật.
        Quản trị viên là người duy nhất xem tài liệu đầy đủ; nhà tuyển dụng
        chỉ thấy huy hiệu và số đăng ký dạng rút gọn.
      </p>
    </Card>
  );
}
