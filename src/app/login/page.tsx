'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { Input, Button } from '@/components/ui';
import { AuthSidePanel } from '@/components/layout/AuthSidePanel';
import { showSuccess, showError, clearToastsByScope } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
import { t } from '@/i18n/vi';
import { isValidEmail, isRequired } from '@/lib/validate';
import { isSupabaseEnv } from '@/data/supabaseClient';

const DASHBOARD: Record<string, string> = {
  worker: '/worker/dashboard',
  employer: '/employer/dashboard',
  admin: '/admin/dashboard',
};

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const currentUser = useCurrentUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to role dashboard
  useEffect(() => {
    if (currentUser) {
      router.replace(DASHBOARD[currentUser.role] ?? '/');
    }
  }, [currentUser, router]);

  // Don't render the form while we're about to redirect
  if (currentUser) return null;

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
    <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-center">
        {/* Side trust panel — desktop only */}
        <AuthSidePanel mode="login" />

        {/* Form card */}
        <div className="w-full">
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-card sm:p-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-gray-900">{t('auth.login.title')}</h1>
              <p className="mt-1 text-sm text-gray-600">{t('auth.login.subtitle')}</p>
            </div>

            {/* Demo hint — CHỈ hiện ở local/demo mode. Ở supabase/production tuyệt đối
                không lộ email seed / mật khẩu `demo` (B1). */}
            {!isSupabaseEnv() && (
            <details className="group mb-5 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between font-semibold text-gray-700 marker:hidden">
                <span>Tài khoản demo</span>
                <span className="transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true">▾</span>
              </summary>
              <div className="mt-2 flex flex-col gap-1">
                <p>Người lao động: <span className="font-mono">an.nguyen@gmail.com</span> / <span className="font-mono">demo</span></p>
                <p>Nhà tuyển dụng: <span className="font-mono">lien@quanphoha.vn</span> / <span className="font-mono">demo</span></p>
                <p>Admin: <span className="font-mono">admin@cale.vn</span> / <span className="font-mono">demo</span></p>
              </div>
            </details>
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

              {errors.form && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {errors.form}
                </p>
              )}

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                {t('btn.login')}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-500">
              {t('auth.login.noAccount')}{' '}
              <Link
                href="/register"
                className="rounded font-medium text-orange-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
              >
                {t('btn.register')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
