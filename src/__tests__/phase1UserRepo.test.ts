/**
 * Phase 1 hardening — loadOwnUser phân biệt lỗi query, KHÔNG dựng user rỗng
 * (guardrail 2,6). Mock supabaseClient để mô phỏng lỗi query.
 */

import { describe, it, expect, vi } from 'vitest';

// Kết quả single() theo từng bảng — set trong mỗi test.
const fake: { result: Record<string, unknown> } = { result: {} };

vi.mock('@/data/supabaseClient', () => ({
  getDataMode: () => 'supabase',
  getSupabaseClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => fake.result[table],
        }),
      }),
    }),
  }),
}));

import { getUserRepo } from '@/data/repos/userRepo';

describe('SupabaseUserRepo.loadOwnUser (guardrail 2)', () => {
  it('throw khi query profile lỗi — KHÔNG tạo user rỗng', async () => {
    fake.result = {
      users: {
        data: { id: 'u1', role: 'worker', email: 'e@x.vn', phone: 'p', suspended: false, created_at: '' },
        error: null,
      },
      worker_profiles: { data: null, error: { message: 'boom', code: 'XX' } },
    };
    await expect(getUserRepo().loadOwnUser('u1')).rejects.toThrow(/worker_profiles/);
  });

  it('throw khi query users lỗi thật', async () => {
    fake.result = { users: { data: null, error: { message: 'db down', code: 'XX' } } };
    await expect(getUserRepo().loadOwnUser('u1')).rejects.toThrow(/users/);
  });

  it('trả null khi users không có dòng (PGRST116)', async () => {
    fake.result = { users: { data: null, error: { message: 'no rows', code: 'PGRST116' } } };
    await expect(getUserRepo().loadOwnUser('u1')).resolves.toBeNull();
  });

  it('throw khi thiếu dòng profile (invariant vỡ)', async () => {
    fake.result = {
      users: {
        data: { id: 'u1', role: 'employer', email: 'e@x.vn', phone: 'p', suspended: false, created_at: '' },
        error: null,
      },
      employer_profiles: { data: null, error: { message: 'no rows', code: 'PGRST116' } },
    };
    await expect(getUserRepo().loadOwnUser('u1')).rejects.toThrow(/employer_profiles/);
  });
});
