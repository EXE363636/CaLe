'use client';

import { Badge, type BadgeTone } from '@/components/ui';
import { useT } from '@/i18n/LocaleProvider';
import type { ShiftStatus } from '@/types';

const tonemap: Record<ShiftStatus, BadgeTone> = {
  Draft: 'neutral',
  Published: 'info',
  FullyBooked: 'warning',
  InProgress: 'purple',
  AwaitingConfirmation: 'warning',
  Completed: 'success',
  Cancelled: 'danger',
  Expired: 'neutral',
};

export function ShiftStatusBadge({ status }: { status: ShiftStatus }) {
  const t = useT();
  return <Badge tone={tonemap[status]}>{t(`shift.status.${status}`)}</Badge>;
}
