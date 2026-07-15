'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import { isSessionExpired } from '@/lib/format';
import type { Role } from '@/types';

interface RoleGuardProps {
  /** The role this route requires. */
  role: Role;
  children: ReactNode;
}

const DASHBOARD_BY_ROLE: Record<Role, string> = {
  worker: '/worker/dashboard',
  employer: '/employer/dashboard',
  admin: '/admin/dashboard',
};

/**
 * Client-side access control for role-scoped pages.
 *
 * - Unauthenticated → redirect to /login
 * - Idle session expired → logout + redirect to /login
 * - Wrong role → redirect to that user's own dashboard
 * - Suspended account → redirect to /login
 *
 * This is presentational only (no real backend). It is sufficient for the
 * MVP demo but is NOT a security boundary.
 */
export function RoleGuard({ role, children }: RoleGuardProps) {
  const router = useRouter();
  const hydrated = useHydrationStore((s) => s.hydrated);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const lastActivityAt = useAuthStore((s) => s.lastActivityAt);
  const logout = useAuthStore((s) => s.logout);
  const user = useUserStore((s) => (currentUserId ? s.findById(currentUserId) : null));

  useEffect(() => {
    // Wait for the persisted snapshot to load before making any
    // redirect decision. On a cold load / refresh / deep-link the
    // stores are empty during the first render; acting on that empty
    // state would bounce an authenticated user to /login.
    if (!hydrated) return;

    // No session at all
    if (!currentUserId) {
      router.replace('/login');
      return;
    }

    // Session expired
    if (lastActivityAt && isSessionExpired(new Date().toISOString(), lastActivityAt)) {
      logout();
      router.replace('/login');
      return;
    }

    // User not found in store (edge case during hydration)
    if (!user) return;

    // Suspended
    if (user.suspended) {
      logout();
      router.replace('/login');
      return;
    }

    // Wrong role
    if (user.role !== role) {
      router.replace(DASHBOARD_BY_ROLE[user.role]);
    }
  }, [hydrated, currentUserId, lastActivityAt, user, role, router, logout]);

  // While hydrating or redirecting, render nothing to avoid flash.
  if (!hydrated || !currentUserId || !user || user.role !== role) {
    return null;
  }

  return <>{children}</>;
}
