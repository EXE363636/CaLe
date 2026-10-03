/**
 * shiftStore chế độ supabase — listing công khai có cửa sổ ngày:
 *  - refetchPublic gửi mốc `publicShiftsFromDate(now)` xuống repo;
 *  - ca cũ đã có trong store (ngoài cửa sổ) được GIỮ, phần công khai được upsert;
 *  - refetchPublicByIds upsert ca theo id, bỏ qua khi danh sách rỗng.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Shift } from '@/types';

const repo = vi.hoisted(() => ({
  listPublicShifts: vi.fn(),
  listPublicShiftsByIds: vi.fn(),
}));

vi.mock('@/data/supabaseClient', () => ({
  isSupabaseEnv: () => true,
  isSupabaseMode: () => true,
  getDataMode: () => 'supabase',
  getSupabaseClient: () => {
    throw new Error('not used');
  },
}));

vi.mock('@/data/repos/shiftRepo', () => ({
  getShiftRepo: () => repo,
}));

import { useShiftStore } from '@/stores/shiftStore';

function shift(id: string, date: string, title = `Ca ${id}`): Shift {
  return {
    id,
    employerId: 'emp-1',
    title,
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'Quận 1',
    date,
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 30000,
    positionsTotal: 1,
    positionsFilled: 0,
    status: 'Published',
    escrowStatus: 'Deposited',
    depositAmount: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  } as Shift;
}

beforeEach(() => {
  vi.useFakeTimers();
  // 10:00 giờ VN ngày 03/10/2026.
  vi.setSystemTime(new Date('2026-10-03T03:00:00.000Z'));
  repo.listPublicShifts.mockReset();
  repo.listPublicShiftsByIds.mockReset();
  useShiftStore.setState({ shifts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('refetchPublic (supabase)', () => {
  it('chỉ xin ca từ hôm qua theo giờ VN', async () => {
    repo.listPublicShifts.mockResolvedValue([]);
    await useShiftStore.getState().refetchPublic();
    expect(repo.listPublicShifts).toHaveBeenCalledWith('2026-10-02');
  });

  it('giữ ca cũ đã có trong store, upsert ca trong cửa sổ', async () => {
    useShiftStore.setState({
      shifts: [shift('old', '2026-09-01'), shift('cur', '2026-10-05', 'Bản cũ')],
    });
    repo.listPublicShifts.mockResolvedValue([
      shift('cur', '2026-10-05', 'Bản mới'),
      shift('new', '2026-10-06'),
    ]);
    await useShiftStore.getState().refetchPublic();
    const byId = new Map(useShiftStore.getState().shifts.map((s) => [s.id, s]));
    expect([...byId.keys()].sort()).toEqual(['cur', 'new', 'old']);
    expect(byId.get('cur')?.title).toBe('Bản mới');
  });
});

describe('refetchPublicByIds (supabase)', () => {
  it('danh sách rỗng → không gọi server', async () => {
    await useShiftStore.getState().refetchPublicByIds([]);
    expect(repo.listPublicShiftsByIds).not.toHaveBeenCalled();
  });

  it('upsert ca theo id, không đụng ca khác', async () => {
    useShiftStore.setState({ shifts: [shift('a', '2026-10-05'), shift('b', '2026-08-01', 'Bản cũ')] });
    repo.listPublicShiftsByIds.mockResolvedValue([shift('b', '2026-08-01', 'Bản mới'), shift('c', '2026-07-01')]);
    await useShiftStore.getState().refetchPublicByIds(['b', 'c', 'gone']);
    expect(repo.listPublicShiftsByIds).toHaveBeenCalledWith(['b', 'c', 'gone']);
    const byId = new Map(useShiftStore.getState().shifts.map((s) => [s.id, s]));
    expect([...byId.keys()].sort()).toEqual(['a', 'b', 'c']);
    expect(byId.get('b')?.title).toBe('Bản mới');
  });
});
