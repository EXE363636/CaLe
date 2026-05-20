/**
 * VerificationBadge
 *
 * Renders one Badge per VerificationFlag held by a worker.
 * Falls back to a single "Chưa xác minh" neutral badge when the list is empty.
 *
 * No hooks → no 'use client' needed.
 */

import { Badge } from '@/components/ui';
import { t } from '@/i18n/vi';
import type { VerificationFlag } from '@/types';

export interface VerificationBadgeProps {
  verifications: VerificationFlag[];
  className?: string;
}

const flagConfig: Record<VerificationFlag, { tone: 'success' | 'info' | 'purple'; key: string }> = {
  phone: { tone: 'success', key: 'verification.phone' },
  id: { tone: 'info', key: 'verification.id' },
  student: { tone: 'purple', key: 'verification.student' },
};

export function VerificationBadge({
  verifications,
  className = '',
}: VerificationBadgeProps) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {verifications.length === 0 ? (
        <Badge tone="neutral">{t('verification.none')}</Badge>
      ) : (
        verifications.map((flag) => {
          const { tone, key } = flagConfig[flag];
          return (
            <Badge key={flag} tone={tone}>
              {t(key)}
            </Badge>
          );
        })
      )}
    </div>
  );
}
