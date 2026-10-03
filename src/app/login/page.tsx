'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { Input, Button } from '@/components/ui';
import { AuthShell, AuthSidePanel } from '@/components/layout/AuthSidePanel';
import { showSuccess, showError, clearToastsByScope } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
import { useT, useTx } from '@/i18n/LocaleProvider';
import { isValidEmail, isRequired } from '@/lib/validate';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { AuthDivider, GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

/** Tài khoản seed của bản demo (mật khẩu `demo`) — không bao giờ hiện ở production. */
const DEMO_ACCOUNTS = [
  { label: 'Người lao động', email: 'an.nguyen@gmail.com' },
  { label: 'Nhà tuyển dụng', email: 'lien@quanphoha.vn' },
  { label: 'Quản trị viên', email: 'admin@cale.vn' },
] as const;

const DASHBOARD: Record<string, string> = {
  worker: '/worker/dashboard',
  employer: '/employer/dashboard',
  admin: '/admin/dashboard',
};

export default function LoginPage() {
  const t = useT();
  const tx = useTx();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const pendingOAuth = useAuthStore((s) => s.pendingOAuth);
  const currentUser = useCurrentUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to role dashboard
  useEffect(() => {
    if (currentUser) {
      router.replace(DASHBOARD[currentUser.role] ?? '/');
    } else if (pendingOAuth) {
      // Đăng nhập Google lần đầu → bước chọn vai trò.
      router.replace('/register?complete=google');
    }
  }, [currentUser, pendingOAuth, router]);

  // Don't render the form while we're about to redirect
  if (currentUser || pendingOAuth) return null;

  function validate() {
    const errs: typeof errors = {};
    if (!isRequired(email).ok) errs.email = t('error.required');
    else if (!isValidEmail(email).ok) errs.email = t('error.email.invalid');
    if (!isRequired(password).ok) errs.password = t('error.required');
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});

    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);

    if (!result.ok) {
      const msg = toastFromStoreError(result.error);
      setErrors({ form: msg });
      showError(msg, undefined, { scope: 'auth' });
      return;
    }

    // Phase 9R — drop any previous wrong-password / invalid-email
    // error toasts so the dashboard the user lands on doesn't carry
    // stale auth errors over from the login attempt.
    clearToastsByScope('auth');
    showSuccess(t('feedback.auth.login.success'), undefined, {
      scope: 'auth',
    });
    router.push(DASHBOARD[result.value.role] ?? '/');
  }

  return (
    <AuthShell panel={<AuthSidePanel mode="login" />}>
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{t('auth.login.title')}</h1>
              <p className="mt-2 text-base text-gray-600">{t('auth.login.subtitle')}</p>
            </div>

            {isSupabaseEnv() && (
              <>
                <GoogleSignInButton />
                <AuthDivider />
              </>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Input
                label={t('form.email')}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                error={errors.email}
                autoComplete="email"
                required
              />
              <Input
                label={t('form.password')}
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                error={errors.password}
                autoComplete="current-password"
                required
              />
              {isSupabaseEnv() && (
                <Link
                  href="/forgot-password"
                  className="-mt-2 inline-flex min-h-[44px] items-center self-end rounded text-sm font-medium text-orange-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  {t('auth.forgot.link')}
                </Link>
              )}

              {errors.form && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {errors.form}
                </p>
              )}

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                {t('btn.login')}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              {t('auth.login.noAccount')}{' '}
              <Link
                href="/register"
                className="rounded font-semibold text-orange-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
              >
                {t('btn.register')}
              </Link>
            </p>

            {/* Tài khoản demo — CHỈ hiện ở local/demo mode. Ở supabase/production tuyệt đối
                không lộ email seed / mật khẩu `demo` (B1). 03/10: bấm một tài khoản là điền
                sẵn email + mật khẩu (thay hộp xổ chữ đơn cách). */}
            {!isSupabaseEnv() && (
              <div className="mt-8 border-t border-gray-100 pt-6">
                <p className="text-sm font-semibold text-gray-900">{tx('Tài khoản demo')}</p>
                <p className="mt-0.5 text-xs text-gray-500">{tx('Bấm để điền sẵn, mật khẩu đều là "demo".')}</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <li key={acc.email}>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(acc.email);
                          setPassword('demo');
                          setErrors({});
                        }}
                        className="flex w-full flex-col items-start rounded-2xl bg-orange-50 px-3 py-2.5 text-left ring-1 ring-orange-100 transition-colors hover:bg-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                      >
                        <span className="text-sm font-semibold text-gray-900">{tx(acc.label)}</span>
                        <span className="mt-0.5 max-w-full truncate text-xs text-gray-600">{acc.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
    </AuthShell>
  );
}
