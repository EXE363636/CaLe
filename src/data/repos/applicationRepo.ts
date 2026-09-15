/**
 * Application repository (BACKEND-MIGRATION-1 · Phase 2).
 *
 * Truy cập applications qua Supabase (đọc + RPC mutation). Dùng ở chế độ supabase;
 * local mode giữ nguyên logic `applicationStore`. Xem docs/PHASE_2_PLAN.md (v3.1).
 */

import { getSupabaseClient } from '@/data/supabaseClient';
import type { Application, ApplicationStatus } from '@/types';

type Row = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const sOpt = (v: unknown): string | undefined =>
  typeof v === 'string' && v !== '' ? v : undefined;
const nOpt = (v: unknown): number | undefined =>
  typeof v === 'number' ? v : undefined;

export function rowToApplication(r: Row): Application {
  return {
    id: s(r.id),
    shiftId: s(r.shift_id),
    workerId: s(r.worker_id),
    status: s(r.status) as ApplicationStatus,
    appliedAt: s(r.applied_at),
    approvedAt: sOpt(r.approved_at),
    rejectionReason: sOpt(r.rejection_reason),
    cancelledAt: sOpt(r.cancelled_at),
    cancellationRequestedAt: sOpt(r.cancellation_requested_at),
    cancellationReasonNote: sOpt(r.cancellation_reason_note),
    preCancellationStatus: (sOpt(r.pre_cancellation_status) as 'Approved' | undefined),
    expiredAt: sOpt(r.expired_at),
    expiredReason: sOpt(r.expired_reason),
    payoutAmount: nOpt(r.payout_amount),
  };
}

export interface ApplicationRepo {
  getForWorker(workerId: string): Promise<Application[]>;
  getForShift(shiftId: string): Promise<Application[]>;
  getForShiftIds(shiftIds: string[]): Promise<Application[]>;
  apply(shiftId: string): Promise<string>;
  withdraw(applicationId: string, reason: string): Promise<string>;
  approve(applicationId: string): Promise<void>;
  reject(applicationId: string, reason: string): Promise<void>;
  approveCancellationRequest(applicationId: string): Promise<void>;
  rejectCancellationRequest(applicationId: string): Promise<void>;
}

class SupabaseApplicationRepo implements ApplicationRepo {
  async getForWorker(workerId: string): Promise<Application[]> {
    const { data, error } = await getSupabaseClient()
      .from('applications')
      .select('*')
      .eq('worker_id', workerId)
      .order('applied_at', { ascending: false });
    if (error) throw new Error(`getForWorker: ${error.message}`);
    return (data ?? []).map((r) => rowToApplication(r as Row));
  }

  async getForShift(shiftId: string): Promise<Application[]> {
    const { data, error } = await getSupabaseClient()
      .from('applications')
      .select('*')
      .eq('shift_id', shiftId)
      .order('applied_at', { ascending: false });
    if (error) throw new Error(`getForShift: ${error.message}`);
    return (data ?? []).map((r) => rowToApplication(r as Row));
  }

  async getForShiftIds(shiftIds: string[]): Promise<Application[]> {
    if (shiftIds.length === 0) return [];
    const { data, error } = await getSupabaseClient()
      .from('applications')
      .select('*')
      .in('shift_id', shiftIds);
    if (error) throw new Error(`getForShiftIds: ${error.message}`);
    return (data ?? []).flatMap((r) => { try { return [rowToApplication(r as Row)]; } catch { return []; } });
  }

  async apply(shiftId: string): Promise<string> {
    const { data, error } = await getSupabaseClient().rpc('apply', { p_shift_id: shiftId });
    if (error) throw new Error(error.message);
    return data as string;
  }

  async withdraw(applicationId: string, reason: string): Promise<string> {
    const { data, error } = await getSupabaseClient().rpc('withdraw', { p_application_id: applicationId, p_reason: reason });
    if (error) throw new Error(error.message);
    return data as string;
  }

  async approve(applicationId: string): Promise<void> {
    const { error } = await getSupabaseClient().rpc('approve', { p_application_id: applicationId });
    if (error) throw new Error(error.message);
  }

  async reject(applicationId: string, reason: string): Promise<void> {
    const { error } = await getSupabaseClient().rpc('reject', { p_application_id: applicationId, p_reason: reason });
    if (error) throw new Error(error.message);
  }

  async approveCancellationRequest(applicationId: string): Promise<void> {
    const { error } = await getSupabaseClient().rpc('approve_cancellation_request', { p_application_id: applicationId });
    if (error) throw new Error(error.message);
  }

  async rejectCancellationRequest(applicationId: string): Promise<void> {
    const { error } = await getSupabaseClient().rpc('reject_cancellation_request', { p_application_id: applicationId });
    if (error) throw new Error(error.message);
  }
}

let repo: SupabaseApplicationRepo | null = null;
export function getApplicationRepo(): ApplicationRepo {
  return (repo ??= new SupabaseApplicationRepo());
}
