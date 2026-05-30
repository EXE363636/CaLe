/**
 * QA-Automation-1 — custom Playwright fixtures.
 *
 * Strategy (localStorage-only app, no backend):
 *
 *   - `seedState(snapshot)` stages a deterministic snapshot.
 *   - `loginAs(userId)` sets the auth pointer. Before the first
 *     navigation it merges into the staged snapshot; after, it flips
 *     `cale.auth` in-place via `localStorage` so runtime writes (the
 *     application a worker just created, a dispute, wallet ledger)
 *     are preserved across a user switch.
 *   - `gotoApp(path)` registers the seed init-script exactly once (on
 *     the first navigation) so the final staged snapshot — including
 *     any merged auth — is injected BEFORE the app's `AppHydrator`
 *     runs. Subsequent navigations reuse the already-seeded
 *     localStorage.
 *
 * No clock dependence: callers needing time control use the built-in
 * `page.clock` API directly (Playwright >= 1.45).
 */

import { test as base, expect } from '@playwright/test';
import {
  buildSnapshot,
  toLocalStoragePayload,
  resetSeedCounters,
  type SeedSnapshot,
} from './seed';

interface SeedState {
  current: SeedSnapshot;
  seeded: boolean;
}

interface Fixtures {
  seedState: (snapshot: SeedSnapshot) => Promise<void>;
  loginAs: (userId: string, lastActivityAt?: string) => Promise<void>;
  gotoApp: (path: string) => Promise<void>;
  seed: SeedState;
}

export const test = base.extend<Fixtures>({
  seed: async ({}, use) => {
    await use({ current: buildSnapshot(), seeded: false });
  },

  seedState: async ({ seed }, use) => {
    async function stage(snapshot: SeedSnapshot): Promise<void> {
      seed.current = snapshot;
    }
    await use(stage);
  },

  loginAs: async ({ page, seed }, use) => {
    async function login(userId: string, lastActivityAt?: string): Promise<void> {
      const auth = {
        currentUserId: userId,
        // Default to a far-future activity stamp so the 24h idle
        // window never expires under the real machine clock. Clock-
        // controlled tests pass an explicit value near their fake
        // "now" so the session stays valid under the installed clock.
        lastActivityAt: lastActivityAt ?? '2099-01-01T00:00:00.000Z',
      };
      if (seed.seeded) {
        await page.evaluate((a) => {
          window.localStorage.setItem('cale.auth', JSON.stringify(a));
        }, auth);
        seed.current.auth = auth;
        return;
      }
      seed.current.auth = auth;
    }
    await use(login);
  },

  gotoApp: async ({ page, context, seed }, use) => {
    async function goto(path: string): Promise<void> {
      if (!seed.seeded) {
        // Register the seed exactly once, BEFORE any app script runs.
        const payload = toLocalStoragePayload(seed.current);
        await context.addInitScript((data) => {
          try {
            if (window.sessionStorage.getItem('e2e-seeded') === '1') return;
            const keys: string[] = [];
            for (let i = 0; i < window.localStorage.length; i += 1) {
              const k = window.localStorage.key(i);
              if (k && k.startsWith('cale.')) keys.push(k);
            }
            keys.forEach((k) => window.localStorage.removeItem(k));
            for (const [key, value] of data.entries) {
              window.localStorage.setItem(key, value);
            }
            window.sessionStorage.setItem('e2e-seeded', '1');
          } catch {
            // Ignore on about:blank; re-runs on the app origin.
          }
        }, payload);
        seed.seeded = true;
      }
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }
    await use(goto);
  },
});

test.beforeEach(() => {
  resetSeedCounters();
});

export { expect };
