'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Input, Button } from '@/components/ui';
import { t } from '@/i18n/vi';
import { isValidEmail, isRequired, isValidPassword, isValidVNPhone } from '@/lib/validate';

type Role = 'worker' | 'employer';

interface FormValues {
  role: Role;
  email: string;
  phone: string;
  password: string;
  fullName: string;
  companyName: string;
  businessType: string;
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

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') === 'employer' ? 'employer' : 'worker') as Role;

  const register = useAuthStore((s) => s.register);

  const [values, setValues] = useState<FormValues>({
    role: initialRole,
    email: '',
    phone: '',
    password: '',
    fullName: '',
    companyName: '',
    businessType: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

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
    });

    setLoading(false);

    if (!result.ok) {
      setErrors({ form: t(`auth.error.${result.error}`) });
      return;
    }

    router.push(DASHBOARD[values.role]);
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
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
