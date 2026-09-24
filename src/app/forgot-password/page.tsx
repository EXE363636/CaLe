'use client';

/**
 * Quên mật khẩu (supabase mode, 0022). Một route, hai bước:
 *   - /forgot-password            → nhập email → Supabase gửi link (qua SMTP Resend).
 *   - /forgot-password?mode=reset → link trong email mở trang này; supabase-js tự
 *     nhận phiên khôi phục từ URL → nhập mật khẩu mới → updateUser.
 * Không tiết lộ email có tồn tại hay không. Local/demo: không có tính năng này.
 */

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { AuthSidePanel } from '@/components/layout/AuthSidePanel';
import { Button, Input } from '@/components/ui';
import { getSupabaseClient, isSupabaseEnv } from '@/data/supabaseClient';
import { toastFromStoreError } from '@/lib/errorMap';
import { showSuccess } from '@/lib/toast';
import { isRequired, isValidEmail, isValidPassword } from '@/lib/validate';
import { t } from '@/i18n/vi';
import { useAuthStore } from '@/stores/authStore';
import { useHydrationStore } from '@/stores/hydrationStore';

const DASHBOARD: Record<string, string> = {
  worker: '/worker/dashboard',
  employer: '/employer/dashboard',
  admin: '/admin/dashboard',
};

const LINK_CLASS =
  'rounded font-medium text-orange-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const resetMode = searchParams.get('mode') === 'reset';

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-center">
        <AuthSidePanel mode="login" />
        <div className="w-full">
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-card sm:p-8">
            {!isSupabaseEnv() ? (
              <p className="text-sm text-gray-600">
                Bản demo không hỗ trợ đặt lại mật khẩu. Dùng tài khoản demo ở trang đăng nhập.
              </p>
            ) : resetMode ? (
              <ResetForm />
            ) : (
              <RequestForm />
            )}
            <p className="mt-5 text-center text-sm text-gray-500">
              <Link href="/login" className={LINK_CLASS}>
                {t('auth.forgot.backToLogin')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestForm() {
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isRequired(email).ok) return setError(t('error.required'));
    if (!isValidEmail(email).ok) return setError(t('error.email.invalid'));
    setLoading(true);
    setError(null);
    const r = await requestPasswordReset(email);
    setLoading(false);
    if (!r.ok) return setError(toastFromStoreError(r.error));
    setSentTo(email.trim().toLowerCase());
  }

  if (sentTo) {
    return (
      <div className="text-center" role="status">
        <h1 className="text-2xl font-bold text-gray-900">{t('auth.forgot.sent.title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          {t('auth.forgot.sent.body').replace('{email}', sentTo)}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('auth.forgot.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('auth.forgot.subtitle')}</p>
      </div>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          id="forgot-email"
          label={t('form.email')}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          error={error ?? undefined}
          required
        />
        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
          {t('auth.forgot.submit')}
        </Button>
      </form>
    </>
  );
}

function ResetForm() {
  const router = useRouter();
  const hydrated = useHydrationStore((s) => s.hydrated);
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  // Chờ AppHydrator khởi tạo client (supabase-js đọc phiên khôi phục từ URL).
  useEffect(() => {
    if (!hydrated) return;
    let alive = true;
    void getSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        if (alive) setHasSession(!!data.session);
      })
      .catch(() => {
        if (alive) setHasSession(false);
      });
    return () => {
      alive = false;
    };
  }, [hydrated]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!isRequired(password).ok) errs.password = t('error.required');
    else if (!isValidPassword(password).ok) errs.password = t('error.password.tooShort');
    if (confirm !== password) errs.confirm = t('auth.reset.mismatch');
    if (Object.keys(errs).length > 0) return setErrors(errs);

    setLoading(true);
    setErrors({});
    const r = await updatePassword(password);
    setLoading(false);
    if (!r.ok) {
      if (r.error === 'SESSION_EXPIRED') return setHasSession(false);
      return setErrors({ form: toastFromStoreError(r.error) });
    }
    showSuccess(t('auth.reset.success'), undefined, { scope: 'auth' });
    const user = useAuthStore.getState().currentUser();
    router.replace(user ? (DASHBOARD[user.role] ?? '/') : '/login');
  }

  if (hasSession === null) {
    return <p className="text-center text-sm text-gray-500">{t('common.loading')}</p>;
  }

  if (!hasSession) {
    return (
      <div className="text-center" role="alert">
        <h1 className="text-2xl font-bold text-gray-900">{t('auth.reset.invalidLink.title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          {t('auth.reset.invalidLink.body')}
        </p>
        <Link
          href="/forgot-password"
          className={`mt-4 inline-flex min-h-[44px] items-center ${LINK_CLASS}`}
        >
          {t('auth.reset.requestAgain')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('auth.reset.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('auth.reset.subtitle')}</p>
      </div>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          id="reset-password"
          label={t('auth.reset.newPassword')}
          type="password"
          autoComplete="new-password"
          hint="Ít nhất 8 ký tự"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <Input
          id="reset-password-confirm"
          label={t('auth.reset.confirmPassword')}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          required
        />
        {errors.form && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {errors.form}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
          {t('auth.reset.submit')}
        </Button>
      </form>
    </>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordContent />
    </Suspense>
  );
}
