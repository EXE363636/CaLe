import { Badge, type BadgeTone } from '@/components/ui';
import { escrowLabel } from '@/i18n/vi';
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
  return <Badge tone={tonemap[status]}>{escrowLabel(status)}</Badge>;
}
