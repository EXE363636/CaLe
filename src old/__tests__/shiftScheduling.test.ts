/**
 * QA-Fix-2 Phase 1 — unit tests for past-shift scheduling validation.
 */

import { describe, it, expect } from 'vitest';
import {
  validateShiftFutureTiming,
  isShiftTimingInFuture,
} from '@/domain/shiftScheduling';

// Fixed wall-clock anchor: 2026-05-28 10:00 local.
const NOW = '2026-05-28T03:00:00.000Z'; // 10:00 ICT (UTC+7)

describe('validateShiftFutureTiming', () => {
  it('rejects a date before today', () => {
    const r = validateShiftFutureTiming('2026-05-24', '08:00', '12:00', NOW);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('PAST_DATE');
  });

  it('rejects today with an end time already passed', () => {
    // now is 10:00 ICT; a shift 06:00–09:00 today already ended.
    const r = validateShiftFutureTiming('2026-05-28', '06:00', '09:00', NOW);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('END_BEFORE_NOW');
  });

  it('accepts today with an end time still in the future', () => {
    const r = validateShiftFutureTiming('2026-05-28', '14:00', '18:00', NOW);
    expect(r.ok).toBe(true);
  });

  it('accepts a future date', () => {
    const r = validateShiftFutureTiming('2026-06-10', '08:00', '12:00', NOW);
    expect(r.ok).toBe(true);
  });

  it('rejects start >= end', () => {
    const r = validateShiftFutureTiming('2026-06-10', '12:00', '12:00', NOW);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('START_NOT_BEFORE_END');
  });

  it('rejects start after end', () => {
    const r = validateShiftFutureTiming('2026-06-10', '13:00', '12:00', NOW);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('START_NOT_BEFORE_END');
  });

  it('rejects missing date/time', () => {
    expect(validateShiftFutureTiming('', '08:00', '12:00', NOW).error).toBe(
      'MISSING_DATETIME',
    );
    expect(validateShiftFutureTiming('2026-06-10', '', '12:00', NOW).error).toBe(
      'MISSING_DATETIME',
    );
    expect(validateShiftFutureTiming('2026-06-10', '08:00', '', NOW).error).toBe(
      'MISSING_DATETIME',
    );
  });

  it('rejects malformed inputs', () => {
    expect(validateShiftFutureTiming('10-06-2026', '08:00', '12:00', NOW).error).toBe(
      'MISSING_DATETIME',
    );
    expect(validateShiftFutureTiming('2026-06-10', '8:00', '12:00', NOW).error).toBe(
      'MISSING_DATETIME',
    );
  });

  it('isShiftTimingInFuture mirrors the boolean result', () => {
    expect(isShiftTimingInFuture('2026-06-10', '08:00', '12:00', NOW)).toBe(true);
    expect(isShiftTimingInFuture('2026-05-24', '08:00', '12:00', NOW)).toBe(false);
  });
});
