'use client';

// Feature: checkpoint-readiness-phase-1, Task 5.9 — LandingRoleExperience.
//
// Client island that coordinates the role-aware landing experience:
//   - reads `selectedRole` from `roleSelectionStore`,
//   - hydrates the persisted session role in a `useEffect` (NOT during
//     render), so the first server + client paint is the neutral state
//     and there is no hydration mismatch (design: "Tích hợp hydration"),
//   - renders the <RoleSwitcher/> chooser + exactly ONE role view (or the
//     neutral intro) via <RoleContent/> — never both roles at once (R1.8).
//
// Switching roles is immediate (no reload, no confirmation — R1.7/R1.9):
// the store update re-renders this island and swaps the visible content.
// Returning to the homepage in the same session restores the saved role
// after hydrate() runs (R1.5).

import { useEffect } from 'react';
import { useRoleSelectionStore } from '@/stores/roleSelectionStore';
import { RoleSwitcher } from './RoleSwitcher';
import { RoleContent } from './RoleContent';

export function LandingRoleExperience() {
  const selectedRole = useRoleSelectionStore((s) => s.selectedRole);
  const hydrate = useRoleSelectionStore((s) => s.hydrate);

  // Client-only: restore the persisted session role after mount. Running
  // this in an effect (not render) keeps the first paint neutral and
  // SSR-safe.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto min-w-0 max-w-5xl">
        <div className="mb-8">
          <RoleSwitcher />
        </div>
        <RoleContent role={selectedRole} />
      </div>
    </section>
  );
}
