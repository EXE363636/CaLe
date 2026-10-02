'use client';

/**
 * Trang vai trò — minh hoạ "Xác thực tài khoản" TỰ GÕ thông tin ví dụ (03/10): cùng
 * nhãn với thẻ thật `AccountVerificationCard`. Kịch bản: nhập số điện thoại → "Gửi
 * mã" → nhập mã 6 số → "Đã xác thực"; rồi CCCD: họ tên, số CCCD, ba ảnh → "Gửi xác
 * thực" → "Đang chờ duyệt" (quản trị viên duyệt tay — đúng luồng 0022).
 *
 * Chạy MỘT lần khi cuộn tới (`useTypingScript`), xong có "Xem lại". Không tương tác
 * (aria-hidden), chỉ đọc chú thích; tên, số điện thoại, số CCCD là ví dụ rõ ràng
 * (dãy số liên tiếp), không phải người thật. Ảnh chỉ là ô đã chọn, không có ảnh.
 */

import { useMemo, useRef } from 'react';

import { Badge } from '@/components/ui';
import { useT, useTx } from '@/i18n/LocaleProvider';

import type { ScriptItem } from './typingScript';
import { useTypingScript } from './useTypingScript';

const SAMPLE = {
  worker: { name: 'Nguyễn Minh Anh', phone: '0912 345 678' },
  employer: { name: 'Trần Thu Hà', phone: '0987 654 321' },
} as const;
const OTP = '482915';
const ID_NUMBER = '0123 4567 8901';

export function VerifyPreview({ audience }: { audience: 'worker' | 'employer' }) {
  const t = useT();
  const tx = useTx();
  const ref = useRef<HTMLDivElement>(null);
  const sample = SAMPLE[audience];
  const script = useMemo<ScriptItem[]>(
    () => [
      { kind: 'type', field: 'phone', text: sample.phone },
      { kind: 'mark', mark: 'sent', ms: 750 },
      { kind: 'type', field: 'otp', text: OTP },
      { kind: 'mark', mark: 'phoneOk', ms: 900 },
      { kind: 'type', field: 'name', text: sample.name },
      { kind: 'type', field: 'id', text: ID_NUMBER },
      { kind: 'mark', mark: 'front', ms: 350 },
      { kind: 'mark', mark: 'back', ms: 350 },
      { kind: 'mark', mark: 'selfie', ms: 500 },
      { kind: 'mark', mark: 'submit', ms: 550 },
      { kind: 'mark', mark: 'pending', ms: 300 },
    ],
    [sample],
  );
  const { state, finished, reduced, replay } = useTypingScript(ref, script);
  const has = (m: string) => state.marks.includes(m);
  const v = (f: string) => state.values[f] ?? '';

  return (
    <figure className="min-w-0">
      <div ref={ref} aria-hidden="true" className="rounded-3xl bg-white p-5 text-left shadow-modal ring-1 ring-black/5 sm:p-6">
        <p className="text-lg font-semibold text-gray-900">{t('verify.card.title')}</p>

        {/* Số điện thoại */}
        <div className="mt-4 border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900">{t('verify.phone.title')}</p>
            <Badge key={has('phoneOk') ? 'ok' : 'no'} tone={has('phoneOk') ? 'success' : 'neutral'}>
              <span className="motion-fade-up inline-block">
                {has('phoneOk') ? t('verify.status.verified') : t('verify.status.notVerified')}
              </span>
            </Badge>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <Box label={t('verify.phone.label')} value={v('phone')} active={state.active === 'phone'} />
            <FakeButton pressed={has('sent') && !has('phoneOk') && !v('otp')} done={has('sent')} label={t('verify.phone.send')} />
          </div>
          {/* Giữ chỗ cho dòng "đã gửi mã" để khối không nhảy khi nó hiện. */}
          <p className={['mt-2 min-h-[1.25rem] text-xs text-gray-600', has('sent') ? 'motion-fade-up' : 'invisible'].join(' ')}>
            {t('verify.phone.codeSent').replace('{phone}', sample.phone)}
          </p>
          <div className={['mt-1 flex items-end gap-2', has('sent') ? '' : 'opacity-40'].join(' ')}>
            <Box label={t('verify.phone.codeLabel')} value={v('otp')} active={state.active === 'otp'} spaced />
            <FakeButton pressed={has('phoneOk') && !has('front') && !v('name')} done={has('phoneOk')} label={t('verify.phone.confirm')} />
          </div>
        </div>

        {/* CCCD */}
        <div className="pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900">{t('verify.id.title')}</p>
            {has('pending') && (
              <Badge tone="warning">
                <span className="motion-fade-up inline-block">{t('verify.status.pending')}</span>
              </Badge>
            )}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Box label={t('verify.id.fullName')} value={v('name')} active={state.active === 'name'} />
            <Box label={t('verify.id.number')} value={v('id')} active={state.active === 'id'} />
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {(['front', 'back', 'selfie'] as const).map((k) => (
              <li
                key={k}
                className={[
                  'flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-center text-xs transition-colors duration-300 motion-reduce:transition-none',
                  has(k) ? 'border-green-300 bg-green-50 text-green-800' : 'border-dashed border-gray-300 text-gray-500',
                ].join(' ')}
              >
                {has(k) ? (
                  <svg className="motion-fade-up h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 10.5 3.2 3L15 6.5" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
                    <circle cx="9" cy="11" r="2" />
                    <path d="m20.5 16-5-4.5-6 5.5" />
                  </svg>
                )}
                <span className="leading-tight">{t(`verify.id.${k}`)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <FakeButton pressed={has('submit') && !has('pending')} done={has('pending')} label={t('verify.id.submit')} />
            <p className={['text-xs text-gray-600', has('pending') ? 'motion-fade-up' : 'invisible'].join(' ')}>{t('verify.id.pendingBody')}</p>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-center gap-x-4 text-xs text-gray-600">
        <span>{tx('Minh hoạ thẻ xác thực. Tên, số điện thoại, số CCCD là ví dụ.')}</span>
        <button
          type="button"
          onClick={replay}
          disabled={reduced || !finished}
          aria-hidden={reduced || !finished}
          tabIndex={reduced || !finished ? -1 : undefined}
          className={[
            'inline-flex min-h-[44px] items-center font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
            reduced || !finished ? 'invisible' : '',
          ].join(' ')}
        >
          {tx('Xem lại')}
        </button>
      </figcaption>
    </figure>
  );
}

function Box({ label, value, active, spaced }: { label: string; value: string; active: boolean; spaced?: boolean }) {
  return (
    <div className="min-w-0 flex-1">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <span
        className={[
          'mt-1 flex h-11 items-center rounded-xl border bg-white px-3 text-sm text-gray-900 tabular-nums',
          spaced ? 'tracking-[0.3em]' : '',
          active ? 'border-orange-400 ring-2 ring-orange-200' : 'border-gray-300',
        ].join(' ')}
      >
        <span className="truncate">{value}</span>
        {active && <span className="type-caret" />}
      </span>
    </div>
  );
}

function FakeButton({ label, pressed, done }: { label: string; pressed: boolean; done: boolean }) {
  return (
    <span
      className={[
        'inline-flex h-11 shrink-0 items-center rounded-xl px-4 text-sm font-semibold transition-transform duration-150 motion-reduce:transition-none',
        pressed ? 'scale-95 bg-orange-400 text-gray-900' : done ? 'bg-gray-100 text-gray-500' : 'bg-orange-500 text-gray-900',
      ].join(' ')}
    >
      {label}
    </span>
  );
}
