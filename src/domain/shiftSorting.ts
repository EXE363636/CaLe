/**
 * Phase 10C-Stab-1 Batch 4 G — worker shift discovery sort.
 *
 * Pure / deterministic. Given two shift-like records and the worker's
 * preferred locations, returns a comparator-style number:
 *
 *   1. preferred-location match wins (substring, case-insensitive),
 *   2. then soonest start time wins.
 */

interface ShiftLike {
  date: string;
  startTime: string;
  location: string;
}

export function compareShiftsForWorker(
  a: ShiftLike,
  b: ShiftLike,
  worker: { preferredLocations?: string[] } | null,
): number {
  const prefs = (worker?.preferredLocations ?? [])
    .map((p) => p.toLowerCase())
    .filter((p) => p.length > 0);
  const matchA = prefs.some((p) => a.location.toLowerCase().includes(p));
  const matchB = prefs.some((p) => b.location.toLowerCase().includes(p));
  if (matchA !== matchB) return matchA ? -1 : 1;

  const ta = new Date(`${a.date}T${a.startTime}:00`).getTime();
  const tb = new Date(`${b.date}T${b.startTime}:00`).getTime();
  return ta - tb;
}
