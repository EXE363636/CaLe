// Feature: checkpoint-readiness-phase-1, Task 5.1 — client-side storage
// adapter for Phase 1 mock data (role selection, surveys).
//
// WHY a separate module: the app's central persistence (`src/data/
// persistence.ts`) owns the `Snapshot` / `STORAGE_KEYS` / `SCHEMA_VERSION`
// machinery and the export/import round-trip that tests depend on. Phase 1
// data must NOT be pulled into that snapshot (no version bump, no reseed,
// no export-import churn — R12 / design Data Models). So this adapter:
//   - uses its OWN key namespace (`CALE_PHASE1_KEYS`, all `cale.*`),
//   - never imports `persistence.ts`,
//   - never makes a network request (R12.7).
//
// Resilience (R12.8): a scope picks an ordered backend chain and every
// operation is attempted against each backend until one succeeds, so a
// disabled / quota-exceeded / private-mode storage degrades gracefully to
// the next backend and finally to an in-memory map — it never throws into
// the UI.
//
// SSR-safety: no `window` / `localStorage` / `sessionStorage` access at
// module top level. All access is inside functions, guarded by
// `typeof window !== 'undefined'`. On the server the chain is just the
// in-memory map, so reads return the fallback (neutral state).

export type StorageScope = 'session' | 'local';

/**
 * Phase 1 storage keys, kept in a namespace separate from the app's
 * `STORAGE_KEYS` so nothing here touches the central snapshot.
 */
export const CALE_PHASE1_KEYS = {
  /** scope: session — landing role selection (R1.4/R1.5). */
  selectedRole: 'cale.session.role',
  /** scope: local — worker survey responses (R8.2). */
  workerSurvey: 'cale.survey.worker',
  /** scope: local — employer survey responses (R9.2). */
  employerSurvey: 'cale.survey.employer',
} as const;

export interface ClientStorageOptions {
  /** Storage scope; defaults to `'local'`. */
  scope?: StorageScope;
}

export interface GetClientStorageOptions<T> extends ClientStorageOptions {
  /** Returned when the key is absent or cannot be parsed. */
  fallback?: T;
}

// ---------------------------------------------------------------------------
// Backend chain
// ---------------------------------------------------------------------------

interface Backend {
  readonly name: 'local' | 'session' | 'memory';
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * In-memory fallback (module-level, lives for the page/session). Always
 * available, so the chain can never fail completely.
 */
const memoryStore = new Map<string, string>();
const memoryBackend: Backend = {
  name: 'memory',
  getItem: (key) => (memoryStore.has(key) ? (memoryStore.get(key) as string) : null),
  setItem: (key, value) => {
    memoryStore.set(key, value);
  },
  removeItem: (key) => {
    memoryStore.delete(key);
  },
};

function webBackend(storage: Storage, name: 'local' | 'session'): Backend {
  return {
    name,
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
  };
}

/**
 * Returns the requested Web Storage as a backend, or `null` if it is
 * unavailable (SSR, disabled, or access throws). Merely *accessing*
 * `window.localStorage` can throw in some privacy modes, hence the
 * try/catch.
 */
function tryGetWebStorage(kind: 'local' | 'session'): Backend | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = kind === 'local' ? window.localStorage : window.sessionStorage;
    if (!storage) return null;
    return webBackend(storage, kind);
  } catch {
    return null;
  }
}

/**
 * Ordered backend chain for a scope (R12.8):
 *   - `local`:   localStorage → sessionStorage → in-memory
 *   - `session`: sessionStorage → in-memory
 * The in-memory backend is always last so the chain never ends empty.
 */
function backendChain(scope: StorageScope): Backend[] {
  const chain: Backend[] = [];
  if (scope === 'local') {
    const ls = tryGetWebStorage('local');
    if (ls) chain.push(ls);
    const ss = tryGetWebStorage('session');
    if (ss) chain.push(ss);
  } else {
    const ss = tryGetWebStorage('session');
    if (ss) chain.push(ss);
  }
  chain.push(memoryBackend);
  return chain;
}

// ---------------------------------------------------------------------------
// Raw string operations (try each backend, never throw)
// ---------------------------------------------------------------------------

function setRaw(key: string, raw: string, scope: StorageScope): boolean {
  for (const backend of backendChain(scope)) {
    try {
      backend.setItem(key, raw);
      return true;
    } catch {
      // backend rejected the write (quota / disabled) — try the next one.
    }
  }
  return false;
}

function getRaw(key: string, scope: StorageScope): string | null {
  for (const backend of backendChain(scope)) {
    try {
      const raw = backend.getItem(key);
      // `null` means "absent here" — keep walking the chain so a value
      // written to a later backend (after an earlier one failed writes)
      // is still found. A stored JSON null serialises to the string
      // "null", so it is never confused with absence.
      if (raw !== null) return raw;
    } catch {
      // backend rejected the read — try the next one.
    }
  }
  return null;
}

function removeRaw(key: string, scope: StorageScope): void {
  for (const backend of backendChain(scope)) {
    try {
      backend.removeItem(key);
    } catch {
      // ignore — best-effort removal across every backend.
    }
  }
}

// ---------------------------------------------------------------------------
// Public JSON API
// ---------------------------------------------------------------------------

/**
 * Serialise and store `value` under `key`. Returns `true` if any backend
 * accepted the write, `false` if the value could not be serialised or no
 * backend accepted it. Never throws.
 */
export function setClientStorageItem<T>(
  key: string,
  value: T,
  options?: ClientStorageOptions,
): boolean {
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch {
    return false;
  }
  return setRaw(key, raw, options?.scope ?? 'local');
}

/**
 * Read and parse the value at `key`. Returns the parsed value, or the
 * provided `fallback` (default `undefined`) when the key is absent or the
 * stored value cannot be parsed. Never throws.
 */
export function getClientStorageItem<T>(
  key: string,
  options?: GetClientStorageOptions<T>,
): T | undefined {
  const raw = getRaw(key, options?.scope ?? 'local');
  if (raw === null) return options?.fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return options?.fallback;
  }
}

/** Remove `key` from every backend in its scope's chain. Never throws. */
export function removeClientStorageItem(
  key: string,
  options?: ClientStorageOptions,
): void {
  removeRaw(key, options?.scope ?? 'local');
}

/**
 * Convenience object adapter matching the design's `ClientStorage`
 * interface sketch. `get` always returns a concrete value (the fallback
 * when missing); the item functions above are the lower-level primitives.
 */
export const clientStorage = {
  get<T>(key: string, fallback: T, scope: StorageScope = 'local'): T {
    const value = getClientStorageItem<T>(key, { scope, fallback });
    return value === undefined ? fallback : value;
  },
  set<T>(key: string, value: T, scope: StorageScope = 'local'): void {
    setClientStorageItem(key, value, { scope });
  },
  remove(key: string, scope: StorageScope = 'local'): void {
    removeClientStorageItem(key, { scope });
  },
};
