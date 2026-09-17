/**
 * P0 attendance — unit regression cho lớp repo/capability (chạy local).
 *   - rowToApplication map ĐỦ cột attendance (để trạng thái tồn tại sau refetch).
 *   - capability `attendance` bật ở cả supabase và local (backend đã hoàn chỉnh).
 * Integration (RPC thật, 2 session, gate/persist) ở scripts/attendance-integration.mjs.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { rowToApplication } from '@/data/repos/applicationRepo';
import { capabilities, hasCapability } from '@/data/capabilities';

afterEach(() => vi.unstubAllEnvs());

describe('rowToApplication — cột attendance', () => {
  it('map đủ check_in_at / marked_present_at / check_out_at / confirmed_at + metadata', () => {
    const app = rowToApplication({
      id: 'a1', shift_id: 's1', worker_id: 'w1', status: 'CheckedOut',
      applied_at: '2026-09-17T00:00:00Z',
      check_in_at: '2026-09-17T09:00:00Z',
      marked_present_at: '2026-09-17T09:05:00Z',
      marked_present_by_employer_id: 'e1',
      check_out_at: '2026-09-17T12:00:00Z',
      confirmed_at: '2026-09-17T12:30:00Z',
      worker_checkout_note: 'xong ca',
      worker_evidence_file_name: 'anh.jpg',
      checkout_checklist: [true, false],
    });
    expect(app.checkInAt).toBe('2026-09-17T09:00:00Z');
    expect(app.markedPresentAt).toBe('2026-09-17T09:05:00Z');
    expect(app.markedPresentByEmployerId).toBe('e1');
    expect(app.checkOutAt).toBe('2026-09-17T12:00:00Z');
    expect(app.confirmedAt).toBe('2026-09-17T12:30:00Z');
    expect(app.workerCheckoutNote).toBe('xong ca');
    expect(app.workerEvidenceFileName).toBe('anh.jpg');
    expect(app.checkoutChecklist).toEqual([true, false]);
  });

  it('cột attendance rỗng → undefined (không dựng dữ liệu giả)', () => {
    const app = rowToApplication({
      id: 'a2', shift_id: 's1', worker_id: 'w1', status: 'Approved',
      applied_at: '2026-09-17T00:00:00Z',
    });
    expect(app.checkInAt).toBeUndefined();
    expect(app.markedPresentAt).toBeUndefined();
    expect(app.checkOutAt).toBeUndefined();
    expect(app.confirmedAt).toBeUndefined();
    expect(app.checkoutChecklist).toBeUndefined();
  });
});

describe('capability attendance', () => {
  it('supabase: attendance bật (backend RPC hoàn chỉnh)', () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'supabase');
    expect(hasCapability('attendance')).toBe(true);
  });
  it('local: attendance bật', () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'local');
    expect(capabilities().attendance).toBe(true);
  });
});
