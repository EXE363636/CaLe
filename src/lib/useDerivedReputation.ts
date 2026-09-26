'use client';

import { useMemo } from 'react';

import { deriveReputationFromHistory, type DerivedReputation } from '@/domain/reputation';
import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import type { Application, Shift } from '@/types';

/**
 * Điểm uy tín TẠM TÍNH cho mọi người lao động, từ đơn + ca đã nạp trong store
 * (supabase: admin nạp toàn bộ ca/đơn ở AppHydrator). Dùng khi server chưa lưu
 * điểm (capability `ratings` tắt). Chỉ để XEM — không có thao tác sửa điểm.
 */
export function useDerivedReputationMap(): ReadonlyMap<string, DerivedReputation> {
  const applications = useApplicationStore((s) => s.applications);
  const shifts = useShiftStore((s) => s.shifts);
  return useMemo(() => {
    const shiftsById = new Map<string, Shift>(shifts.map((sh) => [sh.id, sh]));
    const byWorker = new Map<string, Application[]>();
    for (const a of applications) {
      const list = byWorker.get(a.workerId);
      if (list) list.push(a);
      else byWorker.set(a.workerId, [a]);
    }
    const out = new Map<string, DerivedReputation>();
    for (const [workerId, apps] of byWorker) {
      out.set(workerId, deriveReputationFromHistory(apps, shiftsById));
    }
    return out;
  }, [applications, shifts]);
}

const EMPTY: DerivedReputation = {
  score: 100,
  completed: 0,
  noShows: 0,
  lateCancels: 0,
  workerCancellations: 0,
};

/** Như trên cho một người lao động; chưa có đơn nào → 100 điểm, 0 sự kiện. */
export function derivedReputationOf(
  map: ReadonlyMap<string, DerivedReputation>,
  workerId: string,
): DerivedReputation {
  return map.get(workerId) ?? EMPTY;
}
