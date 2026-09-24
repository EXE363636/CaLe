'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { OAUTH_ROLE_KEY, useAuthStore, useCurrentUser } from '@/stores/authStore';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { AuthDivider, GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Input, Button } from '@/components/ui';
import { AuthSidePanel } from '@/components/layout/AuthSidePanel';
import { showSuccess, showError, clearToastsByScope } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
import { t } from '@/i18n/vi';
import { isValidEmail, isRequired, isValidPassword, isValidVNPhone, sanitizePhoneInput } from '@/lib/validate';

type Role = 'worker' | 'employer';
type EmployerType = 'individual' | 'business';
type EmployerType10A =
  | 'Individual'
  | 'HouseholdBusiness'
  | 'Company'
  | 'AgencyEvent';

const EMPLOYER_TYPE_10A_OPTIONS: EmployerType10A[] = [
  'Individual',
  'HouseholdBusiness',
  'Company',
  'AgencyEvent',
];

interface FormValues {
  role: Role;
  email: string;
  phone: string;
  password: string;
  fullName: string;
  companyName: string;
  businessType: string;
  employerType: EmployerType;
  /** Phase 10A-Fix-3 — required for employer registrations. */
  employerType10A: EmployerType10A | '';
}

interface FormErrors {
  role?: string;
  email?: string;
  phone?: string;
  password?: string;
  fullName?: string;
  companyName?: string;
  businessType?: string;
  employerType10A?: string;
  form?: string;
}

const DASHBOARD: Record<Role, string> = {
  worker: '/worker/dashboard',
  employer: '/employer/dashboard',
};

const ALL_DASHBOARDS: Record<string, string> = {
  worker: '/worker/dashboard',
  employer: '/employer/dashboard',
  admin: '/admin/dashboard',
};

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') === 'employer' ? 'employer' : 'worker') as Role;

  const register = useAuthStore((s) => s.register);
  const completeOAuthSignup = useAuthStore((s) => s.completeOAuthSignup);
  const cancelOAuthSignup = useAuthStore((s) => s.cancelOAuthSignup);
  // Đăng nhập Google lần đầu: có phiên nhưng chưa có hồ sơ → form hoàn tất
  // (không email/mật khẩu), tạo hồ sơ qua RPC complete_oauth_signup.
  const pendingOAuth = useAuthStore((s) => s.pendingOAuth);
  const currentUser = useCurrentUser();

  const [values, setValues] = useState<FormValues>({
    role: initialRole,
    email: '',
    phone: '',
    password: '',
    fullName: '',
    companyName: '',
    businessType: '',
    employerType: 'individual',
    employerType10A: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to role dashboard
  useEffect(() => {
    if (currentUser) {
      router.replace(ALL_DASHBOARDS[currentUser.role] ?? '/');
    }
  }, [currentUser, router]);

  // Điền sẵn tên Google + vai trò đã chọn trước khi chuyển sang Google.
  useEffect(() => {
    if (!pendingOAuth) return;
    let storedRole: string | null = null;
    try {
      storedRole = sessionStorage.getItem(OAUTH_ROLE_KEY);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- điền sẵn một lần khi phiên OAuth sẵn sàng
    setValues((p) => ({
      ...p,
      role: storedRole === 'employer' || storedRole === 'worker' ? storedRole : p.role,
      fullName: p.fullName || pendingOAuth.fullName,
    }));
  }, [pendingOAuth]);

  if (currentUser) return null;
  const oauth = pendingOAuth;

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: undefined, form: undefined }));
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!oauth) {
      if (!isRequired(values.email).ok) errs.email = t('error.required');
      else if (!isValidEmail(values.email).ok) errs.email = t('error.email.invalid');
      if (!isRequired(values.password).ok) errs.password = t('error.required');
      else if (!isValidPassword(values.password).ok) errs.password = t('error.password.tooShort');
    }
    if (!isRequired(values.phone).ok) errs.phone = t('error.required');
    else if (!isValidVNPhone(values.phone).ok) errs.phone = t('error.phone.invalid');
    if (values.role === 'worker' && !isRequired(values.fullName).ok) errs.fullName = t('error.required');
    if (values.role === 'employer') {
      if (!isRequired(values.companyName).ok) errs.companyName = t('error.required');
      if (!isRequired(values.businessType).ok) errs.businessType = t('error.required');
      // Phase 10A-Fix-3: enforce the 4-shape selection.
      if (values.employerType10A === '') {
        errs.employerType10A = t('auth.register.employerType.required');
      }
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});

    if (oauth) {
      const done = await completeOAuthSignup({
        role: values.role,
        phone: values.phone.trim(),
        fullName: values.role === 'worker' ? values.fullName.trim() : undefined,
        companyName: values.role === 'employer' ? values.companyName.trim() : undefined,
        businessType: values.role === 'employer' ? values.businessType.trim() : undefined,
        employerType10A:
          values.role === 'employer' && values.employerType10A !== ''
            ? values.employerType10A
            : undefined,
      });
      setLoading(false);
      if (!done.ok) {
        const msg = toastFromStoreError(done.error);
        setErrors({ form: msg });
        showError(msg, undefined, { scope: 'auth' });
        return;
      }
      clearToastsByScope('auth');
      showSuccess(t('auth.oauth.complete.success'), undefined, { scope: 'auth' });
      router.push(DASHBOARD[values.role]);
      return;
    }

    const result = await register({
      role: values.role,
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      password: values.password,
      fullName: values.role === 'worker' ? values.fullName.trim() : undefined,
      companyName: values.role === 'employer' ? values.companyName.trim() : undefined,
      businessType: values.role === 'employer' ? values.businessType.trim() : undefined,
      employerType: values.role === 'employer' ? values.employerType : undefined,
      // Phase 10A-Fix-3: 4-shape canonical type. Validation above
      // guarantees a non-empty value when role === 'employer'.
      employerType10A:
        values.role === 'employer' && values.employerType10A !== ''
          ? values.employerType10A
          : undefined,
    });

    setLoading(false);

    if (!result.ok) {
      const msg = toastFromStoreError(result.error);
      setErrors({ form: msg });
      showError(msg, undefined, { scope: 'auth' });
      return;
    }

    clearToastsByScope('auth');

    // Supabase bật email confirmation → không auto-login: điều hướng sang đăng
    // nhập kèm hướng dẫn xác nhận email (không có session để vào dashboard).
    if (result.value.needsConfirmation) {
      showSuccess(
        'Đã tạo tài khoản. Vui lòng kiểm tra email để xác nhận, sau đó đăng nhập.',
        undefined,
        { scope: 'auth' },
      );
      router.push('/login');
      return;
    }

    showSuccess(
      t('feedback.auth.register.success'),
      t('feedback.auth.register.success.desc'),
      { scope: 'auth' },
    );
    router.push(DASHBOARD[values.role]);
  }

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-center">
        <AuthSidePanel mode="register" />

        <div className="w-full">
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-card sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {oauth ? t('auth.oauth.complete.title') : t('auth.register.title')}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {oauth ? t('auth.oauth.complete.subtitle') : t('auth.register.subtitle')}
            </p>
            {oauth && oauth.email && (
              <p className="mt-2 text-sm font-medium text-gray-800">{oauth.email}</p>
            )}
          </div>

          {/* Role selector */}
          <div className="mb-5">
            <p className="mb-2 text-sm font-medium text-gray-700">{t('auth.register.selectRole')}</p>
            <div className="grid grid-cols-2 gap-3">
              {(['worker', 'employer'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set('role', r)}
                  className={[
                    'min-h-[44px] rounded-xl border-2 px-4 py-3 text-sm font-medium',
                    'motion-press transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
                    values.role === r
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400',
                  ].join(' ')}
                >
                  {r === 'worker' ? t('auth.register.asWorker') : t('auth.register.asEmployer')}
                </button>
              ))}
            </div>
          </div>

          {isSupabaseEnv() && !oauth && (
            <>
              <GoogleSignInButton role={values.role} />
              <AuthDivider />
            </>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Worker-specific */}
            {values.role === 'worker' && (
              <Input
                label={t('form.fullName')}
                value={values.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                error={errors.fullName}
                autoComplete="name"
                required
              />
            )}

            {/* Employer-specific */}
            {values.role === 'employer' && (
              <>
                {/* Phase 10A-Fix-3 — canonical 4-shape selector replaces
                    the Phase-6 individual/business toggle. Required at
                    registration so the new posting guard never has to
                    fall back to the first-set picker. */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t('auth.register.employerType.label')}
                    <span className="ml-1 text-red-500">*</span>
                  </span>
                  <p className="text-xs text-gray-500">
                    {t('auth.register.employerType.intro')}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {EMPLOYER_TYPE_10A_OPTIONS.map((et) => {
                      const selected = values.employerType10A === et;
                      return (
                        <button
                          key={et}
                          type="button"
                          onClick={() => {
                            set('employerType10A', et);
                            // Mirror Phase 6 legacy field so older code
                            // paths keep working: Individual → individual,
                            // everything else → business.
                            set(
                              'employerType',
                              et === 'Individual' ? 'individual' : 'business',
                            );
                          }}
                          className={[
                            'min-h-[64px] rounded-xl border-2 px-3 py-2 text-left text-xs font-medium',
                            'motion-press transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
                            selected
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400',
                          ].join(' ')}
                        >
                          <span className="block text-sm font-semibold">
                            {t(`employerType10A.${et}`)}
                          </span>
                          <span className="mt-1 block text-[11px] font-normal leading-snug text-gray-600">
                            {t(`employerType10A.${et}.hint`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.employerType10A && (
                    <p className="text-xs text-red-600" role="alert">
                      {errors.employerType10A}
                    </p>
                  )}
                </div>

                <Input
                  label={t('form.companyName')}
                  value={values.companyName}
                  onChange={(e) => set('companyName', e.target.value)}
                  error={errors.companyName}
                  required
                />
                <Input
                  label={t('form.businessType')}
                  value={values.businessType}
                  onChange={(e) => set('businessType', e.target.value)}
                  error={errors.businessType}
                  placeholder="Nhà hàng, Cafe, Sự kiện..."
                  required
                />
              </>
            )}

            {/* Common fields */}
            {!oauth && (
              <Input
                label={t('form.email')}
                type="email"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
                error={errors.email}
                autoComplete="email"
                required
              />
            )}
            <Input
              label={t('form.phone')}
              type="tel"
              inputMode="numeric"
              value={values.phone}
              onChange={(e) => set('phone', sanitizePhoneInput(e.target.value))}
              error={errors.phone}
              placeholder="0901234567"
              autoComplete="tel"
              required
            />
            {!oauth && (
              <Input
                label={t('form.password')}
                type="password"
                value={values.password}
                onChange={(e) => set('password', e.target.value)}
                error={errors.password}
                hint="Ít nhất 8 ký tự"
                autoComplete="new-password"
                required
              />
            )}

            {errors.form && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {errors.form}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              {oauth ? t('auth.oauth.complete.submit') : t('btn.register')}
            </Button>
          </form>

          {oauth ? (
            <button
              type="button"
              onClick={() => void cancelOAuthSignup()}
              className="mx-auto mt-4 flex min-h-[44px] items-center rounded px-2 text-sm font-medium text-gray-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {t('auth.oauth.complete.cancel')}
            </button>
          ) : (
          <p className="mt-5 text-center text-sm text-gray-500">
            {t('auth.register.hasAccount')}{' '}
            <Link
              href="/login"
              className="rounded font-medium text-orange-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {t('btn.login')}
            </Link>
          </p>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// Wrap in Suspense because useSearchParams() requires it in Next.js App Router
export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
