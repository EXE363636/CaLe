'use client';

/**
 * Báo trước khi tài khoản chưa đủ xác thực bắt buộc (0022) — tránh người dùng
 * điền cả form rồi mới bị server chặn. Chỉ hiện ở supabase mode, khi admin đã
 * bật cờ bắt buộc tương ứng. Server vẫn là nơi chặn thật.
 */

import { useEffect } from 'react';
import Link from 'next/link';

import { isSupabaseEnv } from '@/data/supabaseClient';
import { t } from '@/i18n/vi';
import { useAccountVerificationStore } from '@/stores/accountVerificationStore';
import { useCurrentUser } from '@/stores/authStore';

interface Props {
  /** apply = worker ứng tuyển (cần SĐT); post = employer đăng ca (SĐT + CCCD). */
  action: 'apply' | 'post';
  className?: string;
}

export function VerificationGateNotice({ action, className = '' }: Props) {
  const user = useCurrentUser();
  const status = useAccountVerificationStore((s) => s.status);
  const refresh = useAccountVerificationStore((s) => s.refresh);
  const enabled = isSupabaseEnv() && !!user && user.role !== 'admin';

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, user?.id, refresh]);

  if (!enabled || !status) return null;

  const messages: string[] = [];
  if (status.requirePhone && !status.phoneVerifiedAt) {
    messages.push(
      action === 'apply' ? t('verify.gate.phone.worker') : t('verify.gate.phone.employer'),
    );
  }
  if (action === 'post' && status.requireEmployerIdentity && !status.identityVerifiedAt) {
    messages.push(
      status.identityStatus === 'Pending'
        ? t('verify.gate.identityPending')
        : t('verify.gate.identity'),
    );
  }
  if (messages.length === 0) return null;

  const profileHref = user?.role === 'employer' ? '/employer/profile#verify' : '/worker/profile#verify';

  return (
    <div
      role="status"
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`}
    >
      <ul className="flex flex-col gap-1">
        {messages.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <Link
        href={profileHref}
        className="mt-2 inline-flex min-h-[44px] items-center font-semibold text-orange-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        {t('verify.gate.cta')}
      </Link>
    </div>
  );
}
