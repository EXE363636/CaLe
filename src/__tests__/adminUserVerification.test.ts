/**
 * adminGetUserVerification — admin đọc trạng thái xác thực THẬT (0022) của một
 * user. Trạng thái CCCD phải suy ra đúng như RPC `get_my_verification`:
 * `identity_verified_at` có giá trị → Approved; ngược lại lấy hồ sơ mới nhất;
 * chưa nộp → None. Lý do từ chối chỉ trả về khi hồ sơ mới nhất bị từ chối.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Res = { data: unknown; error: { message: string } | null };
const fake: { users: Res; idv: Res } = {
  users: { data: null, error: null },
  idv: { data: null, error: null },
};

vi.mock('@/data/supabaseClient', () => {
  // Chuỗi builder tối giản: mọi bước trả lại chính nó, kết thúc ở maybeSingle.
  const chain = (table: string) => {
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'limit']) b[m] = () => b;
    b.maybeSingle = async () => (table === 'users' ? fake.users : fake.idv);
    return b;
  };
  return {
    getDataMode: () => 'supabase',
    getSupabaseClient: () => ({ from: (table: string) => chain(table) }),
  };
});

import { adminGetUserVerification } from '@/data/repos/verificationRepo';

beforeEach(() => {
  fake.users = {
    data: { phone: '0901234567', phone_verified_at: null, identity_verified_at: null },
    error: null,
  };
  fake.idv = { data: null, error: null };
});

describe('adminGetUserVerification', () => {
  it('chưa nộp hồ sơ → None, không có ngày nộp', async () => {
    const v = await adminGetUserVerification('u1');
    expect(v.identityStatus).toBe('None');
    expect(v.identitySubmittedAt).toBeNull();
    expect(v.phoneVerifiedAt).toBeNull();
  });

  it('có identity_verified_at → Approved, kể cả khi hồ sơ mới nhất đang chờ', async () => {
    fake.users.data = {
      phone: '0901234567',
      phone_verified_at: '2026-09-20T01:00:00Z',
      identity_verified_at: '2026-09-21T02:00:00Z',
    };
    fake.idv.data = { status: 'Pending', reject_reason: null, created_at: '2026-09-25T00:00:00Z' };
    const v = await adminGetUserVerification('u1');
    expect(v.identityStatus).toBe('Approved');
    expect(v.identityVerifiedAt).toBe('2026-09-21T02:00:00Z');
    expect(v.phoneVerifiedAt).toBe('2026-09-20T01:00:00Z');
  });

  it('hồ sơ mới nhất đang chờ → Pending kèm ngày nộp', async () => {
    fake.idv.data = { status: 'Pending', reject_reason: null, created_at: '2026-09-25T00:00:00Z' };
    const v = await adminGetUserVerification('u1');
    expect(v.identityStatus).toBe('Pending');
    expect(v.identitySubmittedAt).toBe('2026-09-25T00:00:00Z');
    expect(v.identityRejectReason).toBeNull();
  });

  it('hồ sơ mới nhất bị từ chối → Rejected kèm lý do', async () => {
    fake.idv.data = { status: 'Rejected', reject_reason: 'Ảnh mờ', created_at: '2026-09-25T00:00:00Z' };
    const v = await adminGetUserVerification('u1');
    expect(v.identityStatus).toBe('Rejected');
    expect(v.identityRejectReason).toBe('Ảnh mờ');
  });

  it('lỗi truy vấn (RLS/mạng) → ném lỗi để UI hiện nút thử lại', async () => {
    fake.idv = { data: null, error: { message: 'permission denied' } };
    await expect(adminGetUserVerification('u1')).rejects.toThrow('permission denied');
  });
});
