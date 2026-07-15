/**
 * Phase 10C-Stab-1 Batch 4 L — append-only shift timeline helper.
 *
 * Pure / deterministic. Stamps a second-resolution ISO timestamp +
 * generates a fresh id for every entry. Callers pass only the kind +
 * Vietnamese note.
 */

import { newPrefixedId } from '@/lib/ids';
import type { ShiftTimelineEntry } from '@/types';

const nowIso = (): string => new Date().toISOString();

export function appendShiftTimelineEntry(
  timeline: ShiftTimelineEntry[] | undefined,
  entry: Omit<ShiftTimelineEntry, 'id' | 'occurredAt'>,
): ShiftTimelineEntry[] {
  return [
    ...(timeline ?? []),
    {
      id: newPrefixedId('timeline'),
      occurredAt: nowIso(),
      ...entry,
    },
  ];
}
