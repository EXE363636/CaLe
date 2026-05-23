'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { Input, Button } from '@/components/ui';
import { AuthSidePanel } from '@/components/layout/AuthSidePanel';
import { showSuccess, showError, clearToastsByScope } from '@/lib/toast';
import { toastFromStoreError } from '@/lib/errorMap';
import { t } from '@/i18n/vi';
import { isValidEmail, isRequired, isValidPassword, isValidVNPhone } from '@/lib/validate';

type Role = 'worker' | 'employer';
type EmployerType = 'individual' | 'business';

interface FormValues {
  role: Role;
  email: string;
  phone: string;
  password: string;
  fullName: string;
  companyName: string;
  businessType: string;
  employerType: EmployerType;
}

interface FormErrors {
  role?: string;
  email?: string;
  phone?: string;
  password?: string;
  fullName?: string;
  companyName?: string;
  businessType?: string;
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
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to role dashboard
  useEffect(() => {
    if (currentUser) {
      router.replace(ALL_DASHBOARDS[currentUser.role] ?? '/');
    }
  }, [currentUser, router]);

  if (currentUser) return null;

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: undefined, form: undefined }));
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!isRequired(values.email).ok) errs.email = t('error.required');
    else if (!isValidEmail(values.email).ok) errs.email = t('error.email.invalid');
    if (!isRequired(values.phone).ok) errs.phone = t('error.required');
    else if (!isValidVNPhone(values.phone).ok) errs.phone = t('error.phone.invalid');
    if (!isRequired(values.password).ok) errs.password = t('error.required');
    else if (!isValidPassword(values.password).ok) errs.password = t('error.password.tooShort');
    if (values.role === 'worker' && !isRequired(values.fullName).ok) errs.fullName = t('error.required');
    if (values.role === 'employer') {
      if (!isRequired(values.companyName).ok) errs.companyName = t('error.required');
      if (!isRequired(values.businessType).ok) errs.businessType = t('error.required');
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});

    const result = register({
      role: values.role,
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      password: values.password,
      fullName: values.role === 'worker' ? values.fullName.trim() : undefined,
      companyName: values.role === 'employer' ? values.companyName.trim() : undefined,
      businessType: values.role === 'employer' ? values.businessType.trim() : undefined,
      employerType: values.role === 'employer' ? values.employerType : undefined,
    });

    setLoading(false);

    if (!result.ok) {
      const msg = toastFromStoreError(result.error);
      setErrors({ form: msg });
      showError(msg, undefined, { scope: 'auth' });
      return;
    }

    clearToastsByScope('auth');
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
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-md ring-1 ring-black/5 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">{t('auth.register.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">{t('auth.register.subtitle')}</p>
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
                    'rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors min-h-[44px]',
                    values.role === r
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                  ].join(' ')}
                >
                  {r === 'worker' ? t('auth.register.asWorker') : t('auth.register.asEmployer')}
                </button>
              ))}
            </div>
          </div>

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
                {/* Phase 6: employer-type selector — defaults to individual,
                    so freelance employers don't have to fill out business
                    fields they don't actually have. */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t('form.employerType')}
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {(['individual', 'business'] as EmployerType[]).map((et) => (
                      <button
                        key={et}
                        type="button"
                        onClick={() => set('employerType', et)}
                        className={[
                          'rounded-xl border-2 px-3 py-2 text-xs font-medium transition-colors min-h-[44px]',
                          values.employerType === et
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                        ].join(' ')}
                      >
                        {t(`employerType.${et}`)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {values.employerType === 'individual'
                      ? t('employerType.individual.hint')
                      : t('employerType.business.hint')}
                  </p>
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
            <Input
              label={t('form.email')}
              type="email"
              value={values.email}
              onChange={(e) => set('email', e.target.value)}
              error={errors.email}
              autoComplete="email"
              required
            />
            <Input
              label={t('form.phone')}
              type="tel"
              value={values.phone}
              onChange={(e) => set('phone', e.target.value)}
              error={errors.phone}
              placeholder="0901234567"
              autoComplete="tel"
              required
            />
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

            {errors.form && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {errors.form}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              {t('btn.register')}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            {t('auth.register.hasAccount')}{' '}
            <Link href="/login" className="font-medium text-orange-600 hover:underline">
              {t('btn.login')}
            </Link>
          </p>
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
