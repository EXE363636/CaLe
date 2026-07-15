import { Badge, type BadgeTone } from '@/components/ui';
import { shiftStatusLabel } from '@/i18n/vi';
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
  return <Badge tone={tonemap[status]}>{shiftStatusLabel(status)}</Badge>;
}
