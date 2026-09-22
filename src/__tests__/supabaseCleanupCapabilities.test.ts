/**
 * Task tổng vệ sinh — test cho capability map, write-guard và cleanup an toàn
 * ở chế độ supabase/production. Chạy local (Vitest/jsdom); ép data mode qua
 * NEXT_PUBLIC_DATA_MODE (đọc runtime).
 *
 * Bao phủ (mục 9):
 *   - Deferred capabilities tắt ở supabase (payments/wallet/disputes/…); bật ở local.
 *   - write() KHÔNG ghi dữ liệu nghiệp vụ vào localStorage ở supabase.
 *   - cleanup xoá đúng key nghiệp vụ CaLẻ, GIỮ session Supabase (sb-*) + theme
 *     → reload vẫn giữ đăng nhập. Idempotent + version marker.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { capabilities, hasCapability } from '@/data/capabilities';
import {
  write,
  read,
  cleanupLegacyBusinessData,
  STORAGE_KEYS,
} from '@/data/persistence';

function setMode(mode: 'supabase' | 'local') {
  vi.stubEnv('NEXT_PUBLIC_DATA_MODE', mode);
}

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});

// ---------------------------------------------------------------------------
// Capability map
// ---------------------------------------------------------------------------

describe('capabilities() theo data mode', () => {
  it('supabase: chỉ bật auth/profile, shifts, applications, adminUsers', () => {
    setMode('supabase');
    const c = capabilities();
    expect(c.authProfiles).toBe(true);
    expect(c.shifts).toBe(true);
    expect(c.applications).toBe(true);
    expect(c.adminUsers).toBe(true);
    // Mọi tính năng chưa có backend đều tắt. (wallet: ĐÃ có backend ví/escrow
    // mô phỏng qua RPC → bật; nên không nằm trong danh sách tắt.)
    for (const key of [
      'payments',
      'disputes',
      'verifications',
      'ratings',
      'notifications',
      'boost',
      'schedule',
    ] as const) {
      expect(hasCapability(key), `${key} phải tắt ở supabase`).toBe(false);
    }
  });

  it('local: bật mọi tính năng (giữ baseline test cũ)', () => {
    setMode('local');
    const c = capabilities();
    for (const key of Object.keys(c) as (keyof typeof c)[]) {
      // livePayments: chưa cấu hình provider thật.
      // walletReadonly: chỉ dành cho supabase (local đã có ví ĐẦY ĐỦ qua `wallet`).
      if (key === 'livePayments' || key === 'walletReadonly') continue;
      expect(c[key], `${key} phải bật ở local`).toBe(true);
    }
    expect(c.livePayments, 'livePayments phải tắt nếu chưa cấu hình provider thật').toBe(false);
    expect(c.walletReadonly, 'walletReadonly chỉ bật ở supabase (local dùng ví đầy đủ)').toBe(false);
  });
});

// ---------------------------------------------------------------------------
// write() guard
// ---------------------------------------------------------------------------

describe('write() theo data mode', () => {
  it('supabase: KHÔNG ghi dữ liệu nghiệp vụ vào localStorage', () => {
    setMode('supabase');
    write(STORAGE_KEYS.users, [{ id: 'u1' }]);
    write(STORAGE_KEYS.shifts, [{ id: 's1' }]);
    expect(window.localStorage.getItem(STORAGE_KEYS.users)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.shifts)).toBeNull();
  });

  it('local: ghi bình thường + đọc lại được', () => {
    setMode('local');
    write(STORAGE_KEYS.users, [{ id: 'u1' }]);
    expect(read<{ id: string }[]>(STORAGE_KEYS.users, [])).toEqual([{ id: 'u1' }]);
  });
});

// ---------------------------------------------------------------------------
// cleanupLegacyBusinessData()
// ---------------------------------------------------------------------------

describe('cleanupLegacyBusinessData()', () => {
  const SB_TOKEN_KEY = 'sb-enurvffmliyrivehppaq-auth-token';

  function seedLegacy() {
    // Dữ liệu nghiệp vụ CaLẻ (legacy) + session Supabase + tùy chọn giao diện.
    window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify([{ id: 'seed' }]));
    window.localStorage.setItem(STORAGE_KEYS.shifts, JSON.stringify([{ id: 'seed' }]));
    window.localStorage.setItem(STORAGE_KEYS.wallets, JSON.stringify([{ id: 'w' }]));
    window.localStorage.setItem(STORAGE_KEYS.schemaVersion, '19');
    window.localStorage.setItem(SB_TOKEN_KEY, 'session-value');
    window.localStorage.setItem('theme', 'light');
  }

  it('xoá key nghiệp vụ CaLẻ nhưng GIỮ session Supabase + theme', () => {
    seedLegacy();
    cleanupLegacyBusinessData();
    // Nghiệp vụ đã bị xoá.
    expect(window.localStorage.getItem(STORAGE_KEYS.users)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.shifts)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.wallets)).toBeNull();
    // Session Supabase + theme còn nguyên → reload vẫn giữ đăng nhập.
    expect(window.localStorage.getItem(SB_TOKEN_KEY)).toBe('session-value');
    expect(window.localStorage.getItem('theme')).toBe('light');
  });

  it('idempotent: chạy lại không lỗi và không đụng session', () => {
    seedLegacy();
    cleanupLegacyBusinessData();
    // Lần 2 (đã có marker) — không throw, session vẫn còn.
    expect(() => cleanupLegacyBusinessData()).not.toThrow();
    expect(window.localStorage.getItem(SB_TOKEN_KEY)).toBe('session-value');
  });
});
