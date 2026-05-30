/**
 * Hydration store — tracks whether `AppHydrator` has finished seeding
 * the Zustand stores from `localStorage`.
 *
 * Why this exists: detail pages (`/shifts/[id]`,
 * `/employer/shifts/[id]`) look the entity up in their store and call
 * `notFound()` when it's missing. On a cold load / refresh / deep-link
 * the stores are still empty during the first render (hydration runs
 * in `AppHydrator`'s `useEffect`), so the lookup would wrongly miss
 * and render a permanent 404. Pages gate `notFound()` on
 * `hydrated === true` so the "not found" verdict is only made AFTER
 * the persisted snapshot has been loaded.
 */

import { create } from 'zustand';

interface HydrationStore {
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
}

export const useHydrationStore = create<HydrationStore>((set) => ({
  hydrated: false,
  setHydrated: (value) => set({ hydrated: value }),
}));
