'use client';

/**
 * Tab "Xác thực" của admin (supabase mode, migration 0022):
 *   - Cài đặt: bắt buộc SĐT / CCCD, trần OTP / 24h + thống kê gửi OTP.
 *   - Hàng đợi CCCD: xem ảnh (URL ký tạm 10 phút), duyệt / từ chối kèm lý do.
 * Local/demo dùng VerificationsPanel mô phỏng cũ.
 */

import { useEffect, useState } from 'react';

import { Badge, Button, Card, EmptyState, Input, Textarea } from '@/components/ui';
import {
  adminGetVerificationSettings,
  adminListIdentity,
  adminReviewIdentity,
  adminSetVerificationSettings,
  signedIdentityUrls,
  type IdentityReviewItem,
  type VerificationSettings,
} from '@/data/repos/verificationRepo';
import { formatDateVN, formatLogDateTime } from '@/lib/format';
import { toastFromStoreError } from '@/lib/errorMap';
import { showError, showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';

type Filter = 'Pending' | 'Approved' | 'Rejected';
const FILTERS: Filter[] = ['Pending', 'Approved', 'Rejected'];

export function IdentityReviewPanel() {
  return (
    <div className="flex flex-col gap-6">
      <SettingsCard />
      <ReviewQueue />
    </div>
  );
}

function errMsg(e: unknown): string {
  return toastFromStoreError(e instanceof Error ? e.message : 'BACKEND_ERROR');
}

/** Lỗi tải dữ liệu + nút thử lại — khác hẳn trạng thái "không có dữ liệu". */
function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <span>{t('admin.identity.loadError')}</span>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        {t('btn.retry')}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cài đặt
// ---------------------------------------------------------------------------

function SettingsCard() {
  const [s, setS] = useState<VerificationSettings | null>(null);
  const [cap, setCap] = useState('');
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Lỗi của lần tải hiện tại (theo reloadKey) — tránh kẹt "Đang tải..." mãi.
  const [failedKey, setFailedKey] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    adminGetVerificationSettings()
      .then((v) => {
        if (!alive) return;
        setS(v);
        setCap(String(v.otpDailyCap));
      })
      .catch((e) => {
        showError(errMsg(e));
        if (alive) setFailedKey(reloadKey);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  async function save(patch: Parameters<typeof adminSetVerificationSettings>[0]) {
    setSaving(true);
    try {
      await adminSetVerificationSettings(patch);
      showSuccess(t('admin.identity.settings.saved'));
      setReloadKey((k) => k + 1);
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  if (!s) {
    return (
      <Card>
        {failedKey === reloadKey ? (
          <LoadError onRetry={() => setReloadKey((k) => k + 1)} />
        ) : (
          <p className="text-sm text-gray-500" role="status">
            {t('common.loading')}
          </p>
        )}
      </Card>
    );
  }

  const capNum = Number(cap);
  const capValid = Number.isInteger(capNum) && capNum >= 0 && capNum <= 100000;

  return (
    <Card>
      <h2 className="font-semibold text-gray-900">{t('admin.identity.settings.title')}</h2>
      <div className="mt-4 flex flex-col gap-4">
        <Toggle
          id="req-phone"
          label={t('admin.identity.settings.requirePhone')}
          hint={t('admin.identity.settings.requirePhone.hint')}
          checked={s.requirePhone}
          disabled={saving}
          onChange={(v) => void save({ requirePhone: v })}
        />
        <Toggle
          id="req-identity"
          label={t('admin.identity.settings.requireIdentity')}
          checked={s.requireEmployerIdentity}
          disabled={saving}
          onChange={(v) => void save({ requireEmployerIdentity: v })}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="sm:w-56">
            <Input
              id="otp-cap"
              label={t('admin.identity.settings.otpCap')}
              inputMode="numeric"
              value={cap}
              onChange={(e) => setCap(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <Button
            variant="secondary"
            disabled={!capValid || capNum === s.otpDailyCap}
            loading={saving}
            onClick={() => void save({ otpDailyCap: capNum })}
          >
            {t('btn.save')}
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          {t('admin.identity.settings.otpStats')
            .replace('{sent}', String(s.otpSent24h))
            .replace('{cap}', String(s.otpDailyCap))
            .replace('{failed}', String(s.otpFailed24h))}
          {s.lastOtpFailReason && (
            <span className="block text-xs text-red-700">
              {t('admin.identity.settings.lastFail')} {s.lastOtpFailReason}
            </span>
          )}
        </p>
      </div>
    </Card>
  );
}

function Toggle({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-5 w-5 accent-orange-600"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-gray-800">
        {label}
        {hint && <span className="mt-0.5 block text-xs text-gray-500">{hint}</span>}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Hàng đợi CCCD
// ---------------------------------------------------------------------------

function ReviewQueue() {
  const [filter, setFilter] = useState<Filter>('Pending');
  const [items, setItems] = useState<IdentityReviewItem[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Tải thất bại ≠ hàng đợi rỗng: trước đây lỗi mạng hiện "Không có hồ sơ
  // nào", khiến admin tưởng đã duyệt hết.
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    adminListIdentity(filter)
      .then((rows) => {
        if (alive) setItems(rows);
      })
      .catch((e) => {
        showError(errMsg(e));
        if (alive) setLoadFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [filter, reloadKey]);

  function changeFilter(f: Filter) {
    if (f === filter) return;
    setItems(null);
    setLoadFailed(false);
    setFilter(f);
  }

  function retry() {
    setItems(null);
    setLoadFailed(false);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => changeFilter(f)}
            className={[
              'min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
              filter === f
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400',
            ].join(' ')}
          >
            {t(`admin.identity.filter.${f}`)}
          </button>
        ))}
      </div>

      {loadFailed ? (
        <LoadError onRetry={retry} />
      ) : items === null ? (
        <p className="text-sm text-gray-500" role="status">
          {t('common.loading')}
        </p>
      ) : items.length === 0 ? (
        <EmptyState title={t('admin.identity.empty')} />
      ) : (
        items.map((it) => (
          <ReviewItem key={it.id} item={it} onDone={() => setReloadKey((k) => k + 1)} />
        ))
      )}
    </div>
  );
}

function ReviewItem({ item, onDone }: { item: IdentityReviewItem; onDone: () => void }) {
  const [urls, setUrls] = useState<Record<string, string> | null>(null);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);

  async function loadImages() {
    try {
      setUrls(await signedIdentityUrls([item.frontPath, item.backPath, item.selfiePath]));
    } catch (e) {
      showError(errMsg(e));
    }
  }

  async function review(approve: boolean) {
    setBusy(true);
    try {
      await adminReviewIdentity(item.id, approve, reason.trim());
      showSuccess(approve ? t('admin.identity.approved') : t('admin.identity.rejected'));
      onDone();
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const tone = item.status === 'Approved' ? 'success' : item.status === 'Rejected' ? 'danger' : 'warning';

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-semibold text-gray-900">{item.fullName}</p>
          <p className="break-all text-xs text-gray-500">
            {t(item.role === 'employer' ? 'role.employer' : 'role.worker')} ·{' '}
            {item.displayName || '—'} · {item.email} · {item.phone || '—'}
          </p>
        </div>
        <Badge tone={tone}>{t(`admin.identity.filter.${item.status}`)}</Badge>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-gray-500">{t('verify.id.number')}</dt>
          <dd className="font-mono text-gray-900">{item.idNumber}</dd>
        </div>
        <div>
          <dt className="text-gray-500">{t('verify.id.dob')}</dt>
          <dd className="text-gray-900">{item.dateOfBirth ? formatDateVN(item.dateOfBirth) : '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-500">{t('admin.identity.submittedAt')}</dt>
          <dd className="text-gray-900">{formatLogDateTime(item.createdAt)}</dd>
        </div>
      </dl>
      {item.status === 'Rejected' && item.rejectReason && (
        <p className="mt-2 break-words text-sm text-red-700">
          <span className="font-medium">{t('admin.identity.rejectReasonLabel')}</span>{' '}
          {item.rejectReason}
        </p>
      )}

      {urls ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { path: item.frontPath, label: t('verify.id.front') },
            { path: item.backPath, label: t('verify.id.back') },
            { path: item.selfiePath, label: t('verify.id.selfie') },
          ].map(({ path, label }) => (
            <a
              key={path}
              href={urls[path]}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL ký tạm từ Supabase Storage */}
              <img src={urls[path]} alt={label} className="h-40 w-full rounded-lg bg-gray-100 object-contain" />
              <span className="mt-1 block text-xs text-gray-500">{label}</span>
            </a>
          ))}
          {/* URL ký tạm hết hạn sau 10 phút → cho tải lại thay vì ảnh vỡ. */}
          <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
            <Button size="sm" variant="ghost" onClick={() => void loadImages()}>
              {t('admin.identity.reloadImages')}
            </Button>
            <span className="text-xs text-gray-500">{t('admin.identity.imagesExpireHint')}</span>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => void loadImages()}>
          {t('admin.identity.loadImages')}
        </Button>
      )}

      {item.status === 'Pending' && (
        <div className="mt-4 flex flex-col gap-3">
          {rejecting && (
            <Textarea
              id={`reject-${item.id}`}
              label={t('admin.identity.rejectReason')}
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
          <div className="flex flex-wrap gap-2">
            {!rejecting ? (
              <>
                <Button loading={busy} onClick={() => void review(true)}>
                  {t('admin.identity.approve')}
                </Button>
                <Button variant="danger" disabled={busy} onClick={() => setRejecting(true)}>
                  {t('admin.identity.reject')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="danger"
                  loading={busy}
                  disabled={reason.trim() === ''}
                  onClick={() => void review(false)}
                >
                  {t('admin.identity.reject')}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => setRejecting(false)}>
                  {t('btn.cancel')}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
