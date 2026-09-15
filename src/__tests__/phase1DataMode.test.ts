/**
 * Phase 1 hardening — data mode không fallback + purge private cache (guardrail 1,4,6).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { getDataMode } from '@/data/supabaseClient';
import { useUserStore } from '@/stores/userStore';
import type { Worker } from '@/types';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getDataMode — KHÔNG âm thầm fallback local (guardrail 1)', () => {
  it('mặc định local ở non-prod khi chưa đặt', () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', '');
    expect(getDataMode()).toBe('local');
  });

  it('throw khi mode=supabase nhưng thiếu URL/anon key', () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    expect(() => getDataMode()).toThrow();
  });

  it('throw ở production khi mode≠supabase (không fallback local)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'local');
    expect(() => getDataMode()).toThrow();
  });
});

function mkWorker(id: string, email: string): Worker {
  return {
    id,
    role: 'worker',
    email,
    phone: '+84900000000',
    passwordHash: '',
    suspended: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    fullName: 'Cached User',
    skills: [],
    preferredJobTypes: [],
    preferredLocations: [],
    verifications: [],
    reputationScore: 100,
    completedShiftCount: 0,
    ratingsReceived: [],
    cancellationHistory: [],
    noShowCount: 0,
  };
}

describe('userStore purge private cache (guardrail 4)', () => {
  it('logout A → login B: A (email/phone) không còn trong cache, seed khôi phục', () => {
    const s = useUserStore.getState();
    s.resetToSeedUsers();
    const seedCount = useUserStore.getState().users.length;
    expect(seedCount).toBeGreaterThan(0);

    // login A (overlay private user thật)
    s.overlayUser(mkWorker('sb-user-A', 'a.private@example.vn'));
    expect(useUserStore.getState().findById('sb-user-A')).toBeTruthy();

    // account switch → login B
    useUserStore.getState().resetToSeedUsers();
    useUserStore.getState().overlayUser(mkWorker('sb-user-B', 'b.private@example.vn'));

    const st = useUserStore.getState();
    expect(st.findById('sb-user-A')).toBeUndefined();
    expect(st.findByEmail('a.private@example.vn')).toBeUndefined();
    expect(st.findById('sb-user-B')).toBeTruthy();
    expect(st.users.length).toBe(seedCount + 1);
  });
});
