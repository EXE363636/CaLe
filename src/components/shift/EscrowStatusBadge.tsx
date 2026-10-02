'use client';

import { Badge, type BadgeTone } from '@/components/ui';
import { useT } from '@/i18n/LocaleProvider';
import type { EscrowStatus } from '@/types';

const tonemap: Record<EscrowStatus, BadgeTone> = {
  PendingDeposit: 'neutral',
  Deposited: 'info',
  InProgress: 'purple',
  Completed: 'warning',
  Released: 'success',
  Disputed: 'danger',
  Refunded: 'neutral',
};

export function EscrowStatusBadge({ status }: { status: EscrowStatus }) {
  const t = useT();
  return <Badge tone={tonemap[status]}>{t(`escrow.${status}`)}</Badge>;
}
