/**
 * Phase 9P — auth correctness tests.
 *
 * Pins down the login rules so the previous "any password works for any
 * seed account" regression cannot come back. Covers:
 *
 *   - correct seed credentials succeed
 *   - wrong password fails with INVALID_CREDENTIALS
 *   - unknown email fails with INVALID_CREDENTIALS (no email enumeration)
 *   - empty password fails with INVALID_CREDENTIALS (no auto-login)
 *   - suspended account with correct password fails with SUSPENDED
 *   - suspended account with wrong password fails with INVALID_CREDENTIALS
 *     (suspension state is not leaked when credentials don't match)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import type { Worker } from '@/types';

function seedWorker(overrides: Partial<Worker> = {}): Worker {
  const base: Worker = {
    id: 'worker-test-001',
    role: 'worker',
    email: 'test.worker@example.vn',
    phone: '+84900000001',
    passwordHash: 'mock-hash:secret-pass',
    suspended: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    fullName: 'Test Worker',
    skills: [],
    preferredJobTypes: [],
    preferredLocations: [],
    verifications: ['phone'],
    reputationScore: 100,
    completedShiftCount: 0,
    ratingsReceived: [],
    cancellationHistory: [],
    noShowCount: 0,
  };
  return { ...base, ...overrides };
}

describe('authStore.login (Phase 9P)', () => {
  beforeEach(() => {
    // Reset both stores to a clean slate before each case so persisted
    // localStorage from previous tests doesn't leak in.
    useUserStore.setState({ users: [] });
    useAuthStore.setState({ currentUserId: null, lastActivityAt: null });
  });

  it('accepts the correct password for an active user', () => {
    useUserStore.setState({ users: [seedWorker()] });
    const result = useAuthStore.getState().login(
      'test.worker@example.vn',
      'secret-pass',
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe('worker-test-001');
  });

  it('accepts the email regardless of case + whitespace', () => {
    useUserStore.setState({ users: [seedWorker()] });
    const result = useAuthStore.getState().login(
      '  TEST.WORKER@EXAMPLE.VN  ',
      'secret-pass',
    );
    expect(result.ok).toBe(true);
  });

  it('rejects a wrong password with INVALID_CREDENTIALS', () => {
    useUserStore.setState({ users: [seedWorker()] });
    const result = useAuthStore.getState().login(
      'test.worker@example.vn',
      'wrong-password',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVALID_CREDENTIALS');
  });

  it('rejects a typo of "demo" for a non-demo account', () => {
    // Phase 9P regression guard — the previous bug accepted any `demo`
    // string as a universal password for every seed account.
    useUserStore.setState({ users: [seedWorker()] });
    const result = useAuthStore.getState().login(
      'test.worker@example.vn',
      'demo',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVALID_CREDENTIALS');
  });

  it('accepts "demo" only for accounts whose passwordHash is mock-hash:demo', () => {
    useUserStore.setState({
      users: [seedWorker({ passwordHash: 'mock-hash:demo' })],
    });
    const result = useAuthStore.getState().login(
      'test.worker@example.vn',
      'demo',
    );
    expect(result.ok).toBe(true);
  });

  it('rejects an unknown email with INVALID_CREDENTIALS (no enumeration)', () => {
    useUserStore.setState({ users: [seedWorker()] });
    const result = useAuthStore.getState().login(
      'nobody@example.vn',
      'secret-pass',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an empty password with INVALID_CREDENTIALS (no auto-login)', () => {
    useUserStore.setState({ users: [seedWorker()] });
    const result = useAuthStore.getState().login(
      'test.worker@example.vn',
      '',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVALID_CREDENTIALS');
  });

  it('returns SUSPENDED when credentials match but account is suspended', () => {
    useUserStore.setState({
      users: [seedWorker({ suspended: true })],
    });
    const result = useAuthStore.getState().login(
      'test.worker@example.vn',
      'secret-pass',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('SUSPENDED');
  });

  it('returns INVALID_CREDENTIALS (not SUSPENDED) when a suspended account uses the wrong password', () => {
    // Phase 9P — never leak suspension state to a caller who can't
    // authenticate. They get the same generic error a non-existent
    // account would.
    useUserStore.setState({
      users: [seedWorker({ suspended: true })],
    });
    const result = useAuthStore.getState().login(
      'test.worker@example.vn',
      'wrong-password',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVALID_CREDENTIALS');
  });
});

describe('authStore.register (Phase 9P)', () => {
  beforeEach(() => {
    useUserStore.setState({ users: [] });
    useAuthStore.setState({ currentUserId: null, lastActivityAt: null });
  });

  it('creates a worker that can subsequently log in with the chosen password', () => {
    const reg = useAuthStore.getState().register({
      role: 'worker',
      email: 'new.worker@example.vn',
      phone: '+84909000001',
      password: 'pickedByUser',
      fullName: 'New Worker',
    });
    expect(reg.ok).toBe(true);

    // Logout the auto-login session so we exercise the login path.
    useAuthStore.getState().logout();

    const ok = useAuthStore.getState().login(
      'new.worker@example.vn',
      'pickedByUser',
    );
    expect(ok.ok).toBe(true);

    const wrong = useAuthStore.getState().login(
      'new.worker@example.vn',
      'wrongPickedByUser',
    );
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error).toBe('INVALID_CREDENTIALS');
  });

  it('rejects passwords shorter than 8 characters with INVALID_INPUT', () => {
    const reg = useAuthStore.getState().register({
      role: 'worker',
      email: 'short.pass@example.vn',
      phone: '+84909000002',
      password: 'short',
      fullName: 'Short',
    });
    expect(reg.ok).toBe(false);
    if (!reg.ok) expect(reg.error).toBe('INVALID_INPUT');
  });

  it('rejects an already-taken email with EMAIL_TAKEN', () => {
    useUserStore.setState({ users: [seedWorker({ email: 'taken@example.vn' })] });
    const reg = useAuthStore.getState().register({
      role: 'worker',
      email: 'taken@example.vn',
      phone: '+84909000003',
      password: 'longEnoughPwd',
      fullName: 'Dup',
    });
    expect(reg.ok).toBe(false);
    if (!reg.ok) expect(reg.error).toBe('EMAIL_TAKEN');
  });
});
