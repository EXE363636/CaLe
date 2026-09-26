'use client';

/**
 * Thẻ "Xác thực tài khoản" (supabase mode, migration 0022) — trang Hồ sơ worker
 * và employer. Hai phần:
 *   - SĐT: nhập số → Edge Function `phone-otp` gửi mã → nhập mã → RPC verify.
 *   - CCCD: 2 mặt + ảnh chân dung → bucket riêng tư → admin duyệt tay.
 * Ở chế độ local/demo KHÔNG dùng thẻ này (luồng xác minh mô phỏng cũ).
 */

import { useEffect, useRef, useState } from 'react';

import { Badge, Button, Card, Input } from '@/components/ui';
import {
  OtpError,
  sendPhoneOtp,
  submitIdentity,
  uploadIdentityImage,
  verifyPhoneOtp,
  type IdentityImageKind,
} from '@/data/repos/verificationRepo';
import { compressImage } from '@/lib/compressImage';
import { toastFromStoreError } from '@/lib/errorMap';
import { showSuccess } from '@/lib/toast';
import { isValidVNPhone, sanitizePhoneInput } from '@/lib/validate';
import { t } from '@/i18n/vi';
import { useAccountVerificationStore } from '@/stores/accountVerificationStore';

interface Props {
  userId: string;
  role: 'worker' | 'employer';
  className?: string;
}

export function AccountVerificationCard({ userId, role, className = '' }: Props) {
  const status = useAccountVerificationStore((s) => s.status);
  const refresh = useAccountVerificationStore((s) => s.refresh);

  useEffect(() => {
    void refresh();
  }, [userId, refresh]);

  return (
    <Card id="verify" className={`scroll-mt-24 ${className}`}>
      <h2 className="font-semibold text-gray-900">{t('verify.card.title')}</h2>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">{t(`verify.card.intro.${role}`)}</p>

      {!status ? (
        <p className="mt-4 text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-gray-100">
          <PhoneSection
            phone={status.phone}
            verified={status.phoneVerifiedAt !== null}
            required={status.requirePhone}
            onVerified={() => void refresh()}
          />
          <IdentitySection
            userId={userId}
            status={status.identityStatus}
            rejectReason={status.identityRejectReason}
            required={role === 'employer' && status.requireEmployerIdentity}
            onSubmitted={() => void refresh()}
          />
        </div>
      )}
    </Card>
  );
}

function StatusBadge({ kind }: { kind: 'verified' | 'none' | 'pending' | 'rejected' }) {
  if (kind === 'verified') return <Badge tone="success">{t('verify.status.verified')}</Badge>;
  if (kind === 'pending') return <Badge tone="warning">{t('verify.status.pending')}</Badge>;
  if (kind === 'rejected') return <Badge tone="danger">{t('verify.status.rejected')}</Badge>;
  return <Badge tone="neutral">{t('verify.status.notVerified')}</Badge>;
}

function otpMessage(e: unknown): string {
  if (e instanceof OtpError) {
    if (e.code === 'OTP_COOLDOWN') {
      return t('verify.otp.error.OTP_COOLDOWN').replace('{seconds}', String(e.retryAfter ?? 60));
    }
    if (e.code === 'OTP_INVALID' && typeof e.attemptsLeft === 'number') {
      return t('verify.otp.error.OTP_INVALID_LEFT').replace('{count}', String(e.attemptsLeft));
    }
    const key = `verify.otp.error.${e.code}`;
    const msg = t(key);
    if (msg !== key) return msg;
    return toastFromStoreError(e.code);
  }
  return t('feedback.error.generic');
}

// ---------------------------------------------------------------------------
// Số điện thoại
// ---------------------------------------------------------------------------

function PhoneSection({
  phone,
  verified,
  required,
  onVerified,
}: {
  phone: string;
  verified: boolean;
  required: boolean;
  onVerified: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(phone);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  function startCooldown(seconds: number) {
    if (timer.current) clearInterval(timer.current);
    setCooldown(seconds);
    // Đếm ngược nút "Gửi lại" (chỉ là UI, không phải đồng bộ lifecycle).
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1 && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
        }
        return Math.max(0, c - 1);
      });
    }, 1000);
  }

  async function handleSend() {
    setError(null);
    if (!isValidVNPhone(value).ok) {
      setError(t('verify.otp.error.INVALID_PHONE'));
      return;
    }
    setBusy(true);
    try {
      const r = await sendPhoneOtp(value.trim());
      setSentTo(r.phone);
      setMock(r.mock);
      setCode('');
      startCooldown(r.cooldown);
    } catch (e) {
      setError(otpMessage(e));
      if (e instanceof OtpError && e.code === 'OTP_COOLDOWN' && e.retryAfter) {
        startCooldown(e.retryAfter);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError(t('verify.otp.error.OTP_INVALID'));
      return;
    }
    setBusy(true);
    try {
      await verifyPhoneOtp(code);
      showSuccess(t('verify.phone.success'));
      setEditing(false);
      setSentTo(null);
      setCode('');
      onVerified();
    } catch (e) {
      setError(otpMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const showForm = !verified || editing;

  return (
    <section className="py-4 first:pt-0" aria-labelledby="verify-phone-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="verify-phone-title" className="text-sm font-semibold text-gray-900">
          {t('verify.phone.title')}
          {required && !verified && (
            <span className="ml-2 text-xs font-medium text-red-600">{t('verify.required')}</span>
          )}
        </h3>
        <StatusBadge kind={verified ? 'verified' : 'none'} />
      </div>

      {!showForm ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-700">{phone}</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(true);
              setValue(phone);
            }}
          >
            {t('verify.phone.change')}
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {sentTo === null ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  id="verify-phone-input"
                  label={t('verify.phone.label')}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="0901234567"
                  value={value}
                  onChange={(e) => {
                    setValue(sanitizePhoneInput(e.target.value));
                    setError(null);
                  }}
                />
              </div>
              <Button onClick={handleSend} loading={busy} disabled={cooldown > 0}>
                {cooldown > 0
                  ? t('verify.phone.resendIn').replace('{seconds}', String(cooldown))
                  : t('verify.phone.send')}
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700">
                {t('verify.phone.codeSent').replace('{phone}', sentTo)}
              </p>
              {mock && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {t('verify.phone.codeSentMock')}
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Input
                    id="verify-otp-input"
                    label={t('verify.phone.codeLabel')}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setError(null);
                    }}
                  />
                </div>
                <Button onClick={handleVerify} loading={busy}>
                  {t('verify.phone.confirm')}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={handleSend} disabled={busy || cooldown > 0}>
                  {cooldown > 0
                    ? t('verify.phone.resendIn').replace('{seconds}', String(cooldown))
                    : t('verify.phone.resend')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSentTo(null);
                    setCode('');
                    setError(null);
                  }}
                >
                  {t('verify.phone.change')}
                </Button>
              </div>
            </>
          )}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {verified && editing && (
            <p className="text-xs text-gray-500">{t('verify.phone.changeWarning')}</p>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// CCCD
// ---------------------------------------------------------------------------

const IMAGE_KINDS: { kind: IdentityImageKind; labelKey: string }[] = [
  { kind: 'front', labelKey: 'verify.id.front' },
  { kind: 'back', labelKey: 'verify.id.back' },
  { kind: 'selfie', labelKey: 'verify.id.selfie' },
];

function IdentitySection({
  userId,
  status,
  rejectReason,
  required,
  onSubmitted,
}: {
  userId: string;
  status: 'None' | 'Pending' | 'Approved' | 'Rejected';
  rejectReason: string | null;
  required: boolean;
  onSubmitted: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [dob, setDob] = useState('');
  const [files, setFiles] = useState<Partial<Record<IdentityImageKind, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<IdentityImageKind, string>>>({});
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const previewUrls = useRef<Partial<Record<IdentityImageKind, string>>>({});

  useEffect(
    () => () => {
      Object.values(previewUrls.current).forEach((u) => u && URL.revokeObjectURL(u));
    },
    [],
  );

  function pick(kind: IdentityImageKind, file: File | undefined) {
    if (!file) return;
    const old = previewUrls.current[kind];
    if (old) URL.revokeObjectURL(old);
    const url = URL.createObjectURL(file);
    previewUrls.current[kind] = url;
    setFiles((p) => ({ ...p, [kind]: file }));
    setPreviews((p) => ({ ...p, [kind]: url }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) return setError(t('verify.id.error.INVALID_FULL_NAME'));
    if (!/^\d{12}$/.test(idNumber)) return setError(t('verify.id.error.INVALID_ID_NUMBER'));
    if (!files.front || !files.back || !files.selfie) {
      return setError(t('verify.id.error.missingImages'));
    }
    if (!consent) return setError(t('verify.id.error.consent'));

    setBusy(true);
    try {
      const paths: Partial<Record<IdentityImageKind, string>> = {};
      for (const { kind } of IMAGE_KINDS) {
        const blob = await compressImage(files[kind] as File);
        paths[kind] = await uploadIdentityImage(userId, kind, blob);
      }
      await submitIdentity({
        fullName: fullName.trim(),
        idNumber,
        dateOfBirth: dob || null,
        frontPath: paths.front as string,
        backPath: paths.back as string,
        selfiePath: paths.selfie as string,
      });
      showSuccess(t('verify.id.submitted'));
      onSubmitted();
    } catch (err) {
      setError(toastFromStoreError(err instanceof Error ? err.message : 'UPLOAD_FAILED'));
    } finally {
      setBusy(false);
    }
  }

  const badge =
    status === 'Approved' ? 'verified'
    : status === 'Pending' ? 'pending'
    : status === 'Rejected' ? 'rejected'
    : 'none';

  return (
    <section className="py-4 last:pb-0" aria-labelledby="verify-id-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="verify-id-title" className="text-sm font-semibold text-gray-900">
          {t('verify.id.title')}
          {required && status !== 'Approved' && (
            <span className="ml-2 text-xs font-medium text-red-600">{t('verify.required')}</span>
          )}
        </h3>
        <StatusBadge kind={badge} />
      </div>

      {status === 'Approved' && (
        <p className="mt-2 text-sm text-gray-600">{t('verify.id.approvedBody')}</p>
      )}
      {status === 'Pending' && (
        <p className="mt-2 text-sm text-gray-600">{t('verify.id.pendingBody')}</p>
      )}

      {(status === 'None' || status === 'Rejected') && (
        <form onSubmit={handleSubmit} noValidate className="mt-3 flex flex-col gap-3">
          {status === 'Rejected' && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {t('verify.id.rejectedBody').replace('{reason}', rejectReason ?? '—')}
            </p>
          )}
          <p className="text-xs leading-relaxed text-gray-500">{t('verify.id.intro')}</p>
          <Input
            id="verify-id-name"
            label={t('verify.id.fullName')}
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="verify-id-number"
              label={t('verify.id.number')}
              inputMode="numeric"
              maxLength={12}
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
            />
            <Input
              id="verify-id-dob"
              label={t('verify.id.dob')}
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {IMAGE_KINDS.map(({ kind, labelKey }) => (
              <label
                key={kind}
                className="flex min-h-[44px] cursor-pointer flex-col gap-2 rounded-xl border-2 border-dashed border-gray-200 p-3 text-sm text-gray-700 hover:border-gray-400 focus-within:ring-2 focus-within:ring-orange-400"
              >
                <span className="font-medium">{t(labelKey)}</span>
                {previews[kind] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh cục bộ (object URL), không qua next/image
                  <img
                    src={previews[kind]}
                    alt={t(labelKey)}
                    className="h-24 w-full rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-500">{t('verify.id.choose')}</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => pick(kind, e.target.files?.[0])}
                />
              </label>
            ))}
          </div>

          <label className="flex min-h-[44px] items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-orange-600"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>{t('verify.id.consent')}</span>
          </label>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" loading={busy} className="self-start">
            {t('verify.id.submit')}
          </Button>
        </form>
      )}
    </section>
  );
}
