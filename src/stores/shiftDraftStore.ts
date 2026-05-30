/**
 * Shift-draft store (CORE-STABILITY-8 Part 1).
 *
 * Mock-only. Holds saved create-shift form snapshots ("Bản nháp đã
 * lưu"). A draft is NOT a real shift — it never appears on the public
 * listing, never enters lifecycle sync, never touches the wallet, and
 * never requires cancellation. Drafts become real shifts only when the
 * employer publishes + deposits.
 *
 * Mirrors existing store patterns: hydrate on boot, persist on every
 * mutation, no setTimeout / setInterval / polling.
 */

import { create } from 'zustand';

import { STORAGE_KEYS, write } from '@/data/persistence';
import { newPrefixedId } from '@/lib/ids';
import type { ShiftDraft } from '@/types';

const nowIso = (): string => new Date().toISOString();

/** Fields the caller supplies when saving a draft (everything except
 *  the store-managed id / savedAt / updatedAt). */
export type ShiftDraftInput = Omit<
  ShiftDraft,
  'id' | 'savedAt' | 'updatedAt'
>;

interface ShiftDraftStore {
  drafts: ShiftDraft[];

  /** Drafts for an employer, newest-updated first. */
  forEmployer(employerId: string): ShiftDraft[];
  getById(id: string): ShiftDraft | undefined;

  /** Save a new draft. Returns the created record. */
  save(input: ShiftDraftInput): ShiftDraft;
  /** Update an existing draft in place (re-stamps updatedAt). */
  update(id: string, patch: Partial<ShiftDraftInput>): ShiftDraft | undefined;
  /** Delete a draft. No cancellation history / refund / notification. */
  remove(id: string): void;

  hydrate(drafts: ShiftDraft[]): void;
}

function persist(drafts: ShiftDraft[]): void {
  write(STORAGE_KEYS.shiftDrafts, drafts);
}

export const useShiftDraftStore = create<ShiftDraftStore>((set, get) => ({
  drafts: [],

  forEmployer(employerId) {
    return get()
      .drafts.filter((d) => d.employerId === employerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  getById(id) {
    return get().drafts.find((d) => d.id === id);
  },

  save(input) {
    const ts = nowIso();
    const record: ShiftDraft = {
      ...input,
      id: newPrefixedId('draft'),
      savedAt: ts,
      updatedAt: ts,
    };
    const next = [record, ...get().drafts];
    set({ drafts: next });
    persist(next);
    return record;
  },

  update(id, patch) {
    const existing = get().drafts.find((d) => d.id === id);
    if (!existing) return undefined;
    const ts = nowIso();
    const updated: ShiftDraft = { ...existing, ...patch, updatedAt: ts };
    const next = get().drafts.map((d) => (d.id === id ? updated : d));
    set({ drafts: next });
    persist(next);
    return updated;
  },

  remove(id) {
    const next = get().drafts.filter((d) => d.id !== id);
    set({ drafts: next });
    persist(next);
  },

  hydrate(drafts) {
    set({ drafts });
  },
}));
