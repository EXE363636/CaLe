/**
 * Feature: checkpoint-readiness-phase-1 — Property 8 (Task 5.2).
 *
 * Property 8: Round-trip lưu trữ phía trình duyệt bền với mọi backend
 * dự phòng.
 * Validates: Requirements 12.8.
 *
 * For any JSON-serialisable key/value, `set` then `get` returns the same
 * value across EVERY available backend in the fallback chain
 * (localStorage → sessionStorage → in-memory). Even when localStorage
 * (and sessionStorage) are simulated as throwing/disabled, the round-trip
 * still succeeds via the next backend — and no network call is made.
 *
 * Property tests use `fast-check` with `numRuns: 100` minimum and the
 * tag comment format `// Feature: checkpoint-readiness-phase-1,
 * Property N: <text>` per the design's testing strategy.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';

import {
  CALE_PHASE1_KEYS,
  clientStorage,
  getClientStorageItem,
  removeClientStorageItem,
  setClientStorageItem,
  type StorageScope,
} from '@/lib/clientStorage';

// A JSON-round-trippable value generator (no undefined / functions; those
// don't survive JSON and aren't used by Phase 1 payloads). We canonicalise
// each value through one JSON round-trip so quirks like `-0` (which
// serialises to "0") don't cause spurious strict-equality mismatches.
const arbJsonValue = fc
  .jsonValue()
  .map((v) => JSON.parse(JSON.stringify(v)) as unknown);
const arbKey = fc.string({ minLength: 1 }).map((s) => `cale.test.${s}`);
const arbScope: fc.Arbitrary<StorageScope> = fc.constantFrom('session', 'local');

const overriddenStorages = new Set<'localStorage' | 'sessionStorage'>();

/** Disable a Web Storage by making BOTH access and methods throw. */
function disableStorage(which: 'localStorage' | 'sessionStorage') {
  const throwing = {
    getItem() {
      throw new Error(`${which} disabled`);
    },
    setItem() {
      throw new Error(`${which} disabled`);
    },
    removeItem() {
      throw new Error(`${which} disabled`);
    },
  } as unknown as Storage;
  Object.defineProperty(window, which, {
    configurable: true,
    get() {
      return throwing;
    },
  });
  overriddenStorages.add(which);
}

/**
 * Remove any own-property override added by `disableStorage` so the
 * real jsdom prototype getter is restored for subsequent tests.
 */
function restoreStorages() {
  for (const which of overriddenStorages) {
    // Deleting the shadowing own property re-exposes jsdom's prototype
    // accessor for `window.localStorage` / `window.sessionStorage`.
    delete (window as unknown as Record<string, unknown>)[which];
  }
  overriddenStorages.clear();
}

describe('checkpoint-readiness-phase-1 — Property 8: clientStorage round-trip + fallback', () => {
  beforeEach(() => {
    window.localStorage?.clear?.();
    window.sessionStorage?.clear?.();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    restoreStorages();
  });

  // Feature: checkpoint-readiness-phase-1, Property 8: round-trip with storage available
  it('round-trips any JSON value when web storage is available', () => {
    fc.assert(
      fc.property(arbKey, arbJsonValue, arbScope, (key, value, scope) => {
        setClientStorageItem(key, value, { scope });
        const got = getClientStorageItem(key, { scope });
        expect(got).toStrictEqual(value);
        removeClientStorageItem(key, { scope });
      }),
      { numRuns: 100 },
    );
  });

  // Feature: checkpoint-readiness-phase-1, Property 8: round-trip survives localStorage failure
  it('round-trips via the next backend when localStorage is disabled', () => {
    disableStorage('localStorage');
    fc.assert(
      fc.property(arbKey, arbJsonValue, (key, value) => {
        // scope 'local' would normally prefer localStorage; it must fall
        // back to sessionStorage here.
        setClientStorageItem(key, value, { scope: 'local' });
        expect(getClientStorageItem(key, { scope: 'local' })).toStrictEqual(value);
        removeClientStorageItem(key, { scope: 'local' });
      }),
      { numRuns: 100 },
    );
  });

  // Feature: checkpoint-readiness-phase-1, Property 8: round-trip survives both web storages failing
  it('round-trips via in-memory when both localStorage and sessionStorage are disabled', () => {
    disableStorage('localStorage');
    disableStorage('sessionStorage');
    fc.assert(
      fc.property(arbKey, arbJsonValue, arbScope, (key, value, scope) => {
        setClientStorageItem(key, value, { scope });
        expect(getClientStorageItem(key, { scope })).toStrictEqual(value);
        removeClientStorageItem(key, { scope });
      }),
      { numRuns: 100 },
    );
  });

  // Feature: checkpoint-readiness-phase-1, Property 8: missing key returns the fallback
  it('returns the fallback for an absent key', () => {
    fc.assert(
      fc.property(arbKey, arbJsonValue, arbScope, (key, fallback, scope) => {
        removeClientStorageItem(key, { scope });
        expect(getClientStorageItem(key, { scope, fallback })).toStrictEqual(
          fallback,
        );
      }),
      { numRuns: 100 },
    );
  });
});

describe('checkpoint-readiness-phase-1 — clientStorage object adapter', () => {
  beforeEach(() => {
    window.localStorage?.clear?.();
    window.sessionStorage?.clear?.();
  });

  it('get/set/remove behave through the convenience adapter', () => {
    clientStorage.set('cale.test.adapter', { a: 1 }, 'local');
    expect(clientStorage.get('cale.test.adapter', { a: 0 }, 'local')).toStrictEqual({
      a: 1,
    });
    clientStorage.remove('cale.test.adapter', 'local');
    expect(clientStorage.get('cale.test.adapter', { a: 0 }, 'local')).toStrictEqual({
      a: 0,
    });
  });

  it('exposes the Phase 1 key namespace separate from app STORAGE_KEYS', () => {
    expect(CALE_PHASE1_KEYS.selectedRole.startsWith('cale.')).toBe(true);
    expect(CALE_PHASE1_KEYS.workerSurvey.startsWith('cale.')).toBe(true);
    expect(CALE_PHASE1_KEYS.employerSurvey.startsWith('cale.')).toBe(true);
  });
});

describe('checkpoint-readiness-phase-1 — clientStorage isolation guards', () => {
  it('does not import the central persistence module', async () => {
    // Read the source and assert it never imports persistence.ts (R12 —
    // Phase 1 data is isolated from the central Snapshot).
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const src = await fs.readFile(
      path.resolve(process.cwd(), 'src/lib/clientStorage.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/data\/persistence/);
    // No network primitives (R12.7).
    expect(src).not.toMatch(/\bfetch\b/);
    expect(src).not.toMatch(/XMLHttpRequest/);
    expect(src).not.toMatch(/navigator\.sendBeacon/);
  });

  it('makes no network call during set/get', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    setClientStorageItem('cale.test.net', { x: 1 }, { scope: 'local' });
    getClientStorageItem('cale.test.net', { scope: 'local' });
    removeClientStorageItem('cale.test.net', { scope: 'local' });
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
