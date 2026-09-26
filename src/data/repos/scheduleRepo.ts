/**
 * Schedule repo (supabase) — lịch cá nhân (bận / rảnh) của worker, migration 0023.
 * Đọc qua RLS (`schedule_blocks_select_own`: chỉ lịch của chính mình); ghi qua
 * RPC SECURITY DEFINER `upsert_schedule_block` / `delete_schedule_block`.
 */

import { getSupabaseClient } from '@/data/supabaseClient';
import type { ScheduleBlock } from '@/types';

type Row = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === 'string' ? v : '');
/** Postgres `time` trả về `HH:mm:ss` → UI dùng `HH:mm`. */
const hhmm = (v: unknown): string => s(v).slice(0, 5);

function rowToBlock(r: Row): ScheduleBlock {
  const kind = s(r.kind) === 'available' ? 'available' : 'busy';
  const note = s(r.note);
  return {
    id: s(r.id),
    userId: s(r.user_id),
    title: s(r.title),
    date: s(r.date),
    startTime: hhmm(r.start_time),
    endTime: hhmm(r.end_time),
    note: note === '' ? undefined : note,
    kind,
    createdAt: s(r.created_at),
    updatedAt: s(r.updated_at),
  };
}

/**
 * Lỗi "server chưa có bảng/RPC" (migration 0023 chưa apply). Khi đó store giữ
 * lịch trên thiết bị như trước thay vì báo lỗi cho người dùng.
 */
export class ScheduleBackendMissingError extends Error {}

const MISSING_CODES = new Set(['PGRST202', 'PGRST205', '42P01', '42883']);

function toError(op: string, error: { code?: string; message: string }): Error {
  if (error.code && MISSING_CODES.has(error.code)) {
    return new ScheduleBackendMissingError(`${op}: ${error.message}`);
  }
  return new Error(`${op}: ${error.message}`);
}

/** Toàn bộ lịch cá nhân của user đang đăng nhập. */
export async function listMyScheduleBlocks(): Promise<ScheduleBlock[]> {
  const { data, error } = await getSupabaseClient()
    .from('schedule_blocks')
    .select('id, user_id, title, date, start_time, end_time, note, kind, created_at, updated_at')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw toError('list schedule_blocks', error);
  return Array.isArray(data) ? (data as Row[]).map(rowToBlock) : [];
}

/** Tạo mới hoặc sửa một mục (id do client sinh — uuid). */
export async function upsertScheduleBlock(block: ScheduleBlock): Promise<ScheduleBlock> {
  const { data, error } = await getSupabaseClient().rpc('upsert_schedule_block', {
    p_id: block.id,
    p_title: block.title,
    p_date: block.date,
    p_start: block.startTime,
    p_end: block.endTime,
    p_note: block.note ?? null,
    p_kind: block.kind ?? 'busy',
  });
  if (error) throw toError('upsert_schedule_block', error);
  return rowToBlock((data ?? {}) as Row);
}

export async function deleteScheduleBlock(id: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('delete_schedule_block', { p_id: id });
  if (error) throw toError('delete_schedule_block', error);
}
