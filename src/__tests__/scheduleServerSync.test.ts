/**
 * Lịch cá nhân đồng bộ server (migration 0023) — scheduleStore ở chế độ supabase:
 *  - refetchMine nạp lịch server, bật serverSync 'on';
 *  - server chưa có bảng (0023 chưa apply) → 'off', giữ lịch trên thiết bị;
 *  - lịch lưu trên thiết bị trước đó được tải lên MỘT lần (id cũ → uuid mới);
 *  - thêm/sửa/xoá đẩy lên server; server lỗi → hoàn tác + SAVE_FAILED.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScheduleBlock } from '@/types';

const repo = vi.hoisted(() => ({
  list: vi.fn(),
  upsert: vi.fn(),
  del: vi.fn(),
}));

vi.mock('@/data/supabaseClient', () => ({
  isSupabaseEnv: () => true,
  isSupabaseMode: () => true,
  getSupabaseClient: () => {
    throw new Error('not used');
  },
}));

vi.mock('@/data/repos/scheduleRepo', () => {
  class ScheduleBackendMissingError extends Error {}
  return {
    ScheduleBackendMissingError,
    listMyScheduleBlocks: repo.list,
    upsertScheduleBlock: repo.upsert,
    deleteScheduleBlock: repo.del,
  };
});

import { ScheduleBackendMissingError } from '@/data/repos/scheduleRepo';
import { useScheduleStore } from '@/stores/scheduleStore';

const UID = '11111111-1111-4111-8111-111111111111';

function block(over: Partial<ScheduleBlock> = {}): ScheduleBlock {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    userId: UID,
    title: 'Học tối',
    date: '2026-09-28',
    startTime: '18:00',
    endTime: '20:00',
    kind: 'busy',
    createdAt: '2026-09-26T00:00:00.000Z',
    updatedAt: '2026-09-26T00:00:00.000Z',
    ...over,
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  repo.list.mockReset();
  repo.upsert.mockReset().mockImplementation(async (b: ScheduleBlock) => b);
  repo.del.mockReset().mockResolvedValue(undefined);
  window.localStorage.clear();
  useScheduleStore.setState({ blocks: [], serverSync: 'unknown', syncError: null });
});

describe('scheduleStore — đồng bộ server', () => {
  it('refetchMine nạp lịch server và bật sync', async () => {
    repo.list.mockResolvedValue([block()]);
    await useScheduleStore.getState().refetchMine(UID);
    const st = useScheduleStore.getState();
    expect(st.serverSync).toBe('on');
    expect(st.blocks.map((b) => b.title)).toEqual(['Học tối']);
  });

  it('server chưa có bảng → off, giữ lịch trên thiết bị', async () => {
    useScheduleStore.setState({ blocks: [block({ id: 'sched-local' })] });
    repo.list.mockRejectedValue(new ScheduleBackendMissingError('missing'));
    await useScheduleStore.getState().refetchMine(UID);
    const st = useScheduleStore.getState();
    expect(st.serverSync).toBe('off');
    expect(st.syncError).toBeNull();
    expect(st.blocks).toHaveLength(1);
  });

  it('tải lên một lần lịch cũ trên thiết bị (id cũ → uuid)', async () => {
    useScheduleStore.setState({ blocks: [block({ id: 'sched-old', title: 'Cũ' })] });
    repo.list.mockResolvedValue([]);
    await useScheduleStore.getState().refetchMine(UID);
    expect(repo.upsert).toHaveBeenCalledTimes(1);
    const sent = repo.upsert.mock.calls[0][0] as ScheduleBlock;
    expect(sent.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(useScheduleStore.getState().blocks.map((b) => b.title)).toEqual(['Cũ']);

    // Lần sau: không tải lên lại (server là nguồn sự thật).
    repo.upsert.mockClear();
    useScheduleStore.setState({ blocks: [block({ id: 'sched-stale' })] });
    repo.list.mockResolvedValue([]);
    await useScheduleStore.getState().refetchMine(UID);
    expect(repo.upsert).not.toHaveBeenCalled();
    expect(useScheduleStore.getState().blocks).toEqual([]);
  });

  it('thêm lịch khi sync bật → gửi server với id uuid', async () => {
    repo.list.mockResolvedValue([]);
    await useScheduleStore.getState().refetchMine(UID);
    const res = useScheduleStore.getState().add({
      userId: UID,
      title: 'Ca khác',
      date: '2026-09-29',
      startTime: '08:00',
      endTime: '10:00',
    });
    expect(res.ok).toBe(true);
    expect(repo.upsert).toHaveBeenCalledTimes(1);
    expect((repo.upsert.mock.calls[0][0] as ScheduleBlock).id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('server lỗi khi lưu → hoàn tác + SAVE_FAILED', async () => {
    repo.list.mockResolvedValue([block()]);
    await useScheduleStore.getState().refetchMine(UID);
    repo.del.mockRejectedValue(new Error('network'));
    const res = useScheduleStore.getState().remove(block().id, UID);
    expect(res.ok).toBe(true);
    expect(useScheduleStore.getState().blocks).toHaveLength(0);
    await flush();
    const st = useScheduleStore.getState();
    expect(st.syncError).toBe('SAVE_FAILED');
    expect(st.blocks.map((b) => b.id)).toEqual([block().id]);
  });
});
