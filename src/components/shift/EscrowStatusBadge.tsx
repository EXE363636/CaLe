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
  // Dữ liệu cũ có thể mang trạng thái ngoài danh sách (vd "Held" trong dữ liệu mẫu) →
  // không hiện mã thô "escrow.Held" (03/10, thấy khi thử lịch tuyển dụng).
  if (!(status in tonemap)) return null;
  return <Badge tone={tonemap[status]}>{t(`escrow.${status}`)}</Badge>;
}
