/**
 * Shift repository (BACKEND-MIGRATION-1 · Phase 2).
 *
 * Truy cập shifts qua Supabase (đọc + RPC mutation). Dùng ở chế độ supabase; chế
 * độ local giữ nguyên logic trong `shiftStore`. Xem docs/PHASE_2_PLAN.md (v3.1).
 *
 * Mapper row (snake_case DB) → domain `Shift` (camelCase). Giờ DB 'HH:MM:SS' → 'HH:mm'.
 */

import { getSupabaseClient } from '@/data/supabaseClient';
import type {
  EscrowStatus,
  EvidenceRequirement,
  Shift,
  ShiftStatus,
  ShiftTimelineEntry,
} from '@/types';
import type { NewShiftInput, ShiftEditablePatch } from '@/stores/shiftStore';

type Row = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const sOpt = (v: unknown): string | undefined =>
  typeof v === 'string' && v !== '' ? v : undefined;
const n = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
const hhmm = (v: unknown): string => (typeof v === 'string' ? v.slice(0, 5) : '');

/** Row bảng `shifts` (owner/get_shift_detail) → Shift đầy đủ. */
export function rowToShift(r: Row): Shift {
  return {
    id: s(r.id),
    employerId: s(r.employer_id),
    title: s(r.title),
    description: s(r.description),
    requirements: s(r.requirements),
    jobType: s(r.job_type),
    customJobTypeName: sOpt(r.custom_job_type_name),
    location: s(r.location),
    district: sOpt(r.district),
    date: s(r.date),
    startTime: hhmm(r.start_time),
    endTime: hhmm(r.end_time),
    hourlyWage: n(r.hourly_wage),
    positionsTotal: n(r.positions_total),
    positionsFilled: n(r.positions_filled),
    status: s(r.status) as ShiftStatus,
    escrowStatus: (sOpt(r.escrow_status) as EscrowStatus | undefined) ?? 'Deposited',
    depositAmount: n(r.deposit_amount),
    createdAt: s(r.created_at),
    updatedAt: s(r.updated_at) || s(r.created_at),
    workplaceImageLabel: sOpt(r.workplace_image_label),
    workplaceNotes: sOpt(r.workplace_notes),
    onSiteContactName: sOpt(r.on_site_contact_name),
    onSiteContactPhone: sOpt(r.on_site_contact_phone),
    requiresVerifiedDocumentOnArrival: r.requires_verified_document_on_arrival === true,
    evidenceRequirement: sOpt(r.evidence_requirement) as EvidenceRequirement | undefined,
    cancelledAt: sOpt(r.cancelled_at),
    cancelledBy: (sOpt(r.cancelled_by) as 'employer' | 'admin' | undefined),
    employerCancellationReason: sOpt(r.employer_cancellation_reason),
    repostedFromShiftId: sOpt(r.reposted_from_shift_id),
    // JSONB timeline → mảng ShiftTimelineEntry (parse an toàn; không mảng → undefined).
    timeline: Array.isArray(r.timeline) ? (r.timeline as ShiftTimelineEntry[]) : undefined,
  };
}

/** Map an toàn 1 row → Shift; row lỗi trả null (không làm crash cả danh sách). */
function safeRowToShift(r: Row): Shift | null {
  try {
    return rowToShift(r);
  } catch {
    return null;
  }
}
function safePublicRowToShift(r: Row): Shift | null {
  try {
    return publicRowToShift(r);
  } catch {
    return null;
  }
}

/** Row bảng `public_shifts` → Shift cho listing công khai (field riêng tư = mặc định). */
export function publicRowToShift(r: Row): Shift {
  return {
    id: s(r.id),
    employerId: s(r.employer_id),
    title: s(r.title),
    description: s(r.description),
    requirements: s(r.requirements),
    jobType: s(r.job_type),
    customJobTypeName: sOpt(r.custom_job_type_name),
    location: s(r.location),
    district: sOpt(r.district),
    date: s(r.date),
    startTime: hhmm(r.start_time),
    endTime: hhmm(r.end_time),
    hourlyWage: n(r.hourly_wage),
    positionsTotal: n(r.positions_total),
    positionsFilled: n(r.positions_filled),
    status: s(r.status) as ShiftStatus,
    escrowStatus: 'Deposited', // ca công khai = đã cọc (mô phỏng); không lộ escrow thật
    depositAmount: 0,
    createdAt: s(r.created_at),
    updatedAt: s(r.created_at),
    workplaceImageLabel: sOpt(r.workplace_image_label),
    workplaceNotes: sOpt(r.workplace_notes),
    requiresVerifiedDocumentOnArrival: r.requires_verified_document_on_arrival === true,
    evidenceRequirement: sOpt(r.evidence_requirement) as EvidenceRequirement | undefined,
  };
}

/** payload camelCase (NewShiftInput) → jsonb snake_case cho RPC publish_shift.
 *  Export để luồng "trả cọc trước khi đăng" dựng shift_payload cho
 *  create_deposit_session (server publish ca từ payload khi giữ tiền). */
export function toPublishPayload(input: NewShiftInput): Record<string, unknown> {
  return {
    title: input.title,
    description: input.description,
    requirements: input.requirements,
    job_type: input.jobType,
    custom_job_type_name: input.customJobTypeName,
    location: input.location,
    district: input.district,
    date: input.date,
    start_time: input.startTime,
    end_time: input.endTime,
    hourly_wage: input.hourlyWage,
    positions_total: input.positionsTotal,
    workplace_image_label: input.workplaceImageLabel,
    workplace_notes: input.workplaceNotes,
    on_site_contact_name: input.onSiteContactName,
    on_site_contact_phone: input.onSiteContactPhone,
    requires_verified_document_on_arrival: input.requiresVerifiedDocumentOnArrival ?? false,
    evidence_requirement: input.evidenceRequirement,
  };
}

/** patch camelCase (ShiftEditablePatch) → jsonb snake_case cho RPC edit_shift. */
function toEditPatch(patch: ShiftEditablePatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.description !== undefined) out.description = patch.description;
  if (patch.requirements !== undefined) out.requirements = patch.requirements;
  if (patch.jobType !== undefined) out.job_type = patch.jobType;
  if (patch.customJobTypeName !== undefined) out.custom_job_type_name = patch.customJobTypeName;
  if (patch.location !== undefined) out.location = patch.location;
  if (patch.district !== undefined) out.district = patch.district;
  if (patch.startTime !== undefined) out.start_time = patch.startTime;
  if (patch.endTime !== undefined) out.end_time = patch.endTime;
  if (patch.positionsTotal !== undefined) out.positions_total = patch.positionsTotal;
  return out;
}

export interface ShiftRepo {
  listPublicShifts(): Promise<Shift[]>;
  getEmployerShifts(employerId: string): Promise<Shift[]>;
  getShiftDetail(id: string): Promise<Shift | null>;
  publish(input: NewShiftInput, clientRequestId: string, repostedFromShiftId?: string): Promise<string>;
  edit(id: string, patch: ShiftEditablePatch): Promise<void>;
  cancel(id: string, reason: string): Promise<void>;
}

class SupabaseShiftRepo implements ShiftRepo {
  async listPublicShifts(): Promise<Shift[]> {
    const { data, error } = await getSupabaseClient()
      .from('public_shifts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`listPublicShifts: ${error.message}`);
    return (data ?? []).flatMap((r) => { const m = safePublicRowToShift(r as Row); return m ? [m] : []; });
  }

  async getEmployerShifts(employerId: string): Promise<Shift[]> {
    const { data, error } = await getSupabaseClient()
      .from('shifts')
      .select('*')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`getEmployerShifts: ${error.message}`);
    return (data ?? []).flatMap((r) => { const m = safeRowToShift(r as Row); return m ? [m] : []; });
  }

  async getShiftDetail(id: string): Promise<Shift | null> {
    const client = getSupabaseClient();
    // 1) Ca CÔNG KHAI: đọc public_shifts trước → anon/người chưa đăng nhập vẫn xem
    //    được, không gặp NOT_AUTHENTICATED.
    const pub = await client.from('public_shifts').select('*').eq('id', id).maybeSingle();
    if (!pub.error && pub.data) return publicRowToShift(pub.data as Row);
    // 2) Ca KHÔNG còn public: chỉ owner/worker-có-đơn/admin (RPC).
    const { data, error } = await client.rpc('get_shift_detail', { p_shift_id: id });
    if (error) {
      const m = error.message;
      if (m.includes('SHIFT_NOT_FOUND') || m.includes('NOT_AUTHORIZED') || m.includes('NOT_AUTHENTICATED')) {
        return null;
      }
      throw new Error(`getShiftDetail: ${m}`);
    }
    return data ? rowToShift(data as Row) : null;
  }

  async publish(input: NewShiftInput, clientRequestId: string, repostedFromShiftId?: string): Promise<string> {
    const { data, error } = await getSupabaseClient().rpc('publish_shift', {
      p_payload: toPublishPayload(input),
      p_client_request_id: clientRequestId,
      p_reposted_from_shift_id: repostedFromShiftId ?? null,
    });
    if (error) throw new Error(error.message);
    return data as string;
  }

  async edit(id: string, patch: ShiftEditablePatch): Promise<void> {
    const { error } = await getSupabaseClient().rpc('edit_shift', { p_shift_id: id, p_patch: toEditPatch(patch) });
    if (error) throw new Error(error.message);
  }

  async cancel(id: string, reason: string): Promise<void> {
    const { error } = await getSupabaseClient().rpc('cancel_shift', { p_shift_id: id, p_reason: reason });
    if (error) throw new Error(error.message);
  }
}

let repo: SupabaseShiftRepo | null = null;
export function getShiftRepo(): ShiftRepo {
  return (repo ??= new SupabaseShiftRepo());
}
