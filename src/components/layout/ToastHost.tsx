'use client';

/**
 * ToastHost (Phase 9O initial, Phase 9Q lifecycle hardening).
 *
 * Single global mount point for the toast stack. Subscribes to
 * `useToastStore`, portals into `document.body`, and renders a fixed
 * top-right (desktop) / bottom-center (mobile) column. Stable raw
 * selector pattern — pulls the `toasts` array directly so Zustand
 * snapshot equality stays correct.
 *
 * Phase 9Q:
 *   - Forwards `version` to each `<Toast>` so dedupe re-triggers
 *     restart their dismiss timers cleanly.
 *   - Calls `useToastStore.getState().clear()` on unmount as a
 *     defensive cleanup so navigating away (or hot-reloading in dev)
 *     never leaves stale toasts pointing at a unmounted dismiss
 *     handler.
 *
 * Mounted from `app/layout.tsx` once; pages do not instantiate it.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useToastStore } from '@/stores/toastStore';
import { Toast } from '@/components/ui/Toast';

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  // SSR-safe portal: only render after mount on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => {
      // Defensive: drop any in-flight toasts when the host unmounts so
      // their dismiss handlers don't fire against a torn-down tree.
      useToastStore.getState().clear();
    };
  }, []);

  // Phase 9R — route-change auth cleanup. When the path changes off
  // `/login` or `/register` (e.g. after a successful auth flow that
  // pushes the user to a dashboard), drop any stale `auth`-scope
  // toasts so they don't carry over. We track the previous path with
  // a ref so the cleanup fires on transition, not on initial mount.
  const pathname = usePathname() ?? '';
  const prevPath = useRef<string | null>(null);
  useEffect(() => {
    const prior = prevPath.current;
    prevPath.current = pathname;
    if (prior === null) return;
    const wasAuthPage = prior === '/login' || prior === '/register';
    const isAuthPage = pathname === '/login' || pathname === '/register';
    if (wasAuthPage && !isAuthPage) {
      useToastStore.getState().clearByScope('auth');
    }
  }, [pathname]);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-label="Thông báo hành động"
      className={[
        'pointer-events-none fixed inset-x-0 z-[110] flex flex-col items-center gap-2 px-4',
        // Mobile: bottom-center stack so it doesn't fight the navbar.
        'bottom-4',
        // Desktop: pin top-right but leave clearance for the sticky
        // navbar (Phase 9P fix — earlier `top-4` covered the logout
        // button on mobile-narrow desktop windows).
        'sm:bottom-auto sm:top-24 sm:right-4 sm:left-auto sm:items-end sm:px-0',
      ].join(' ')}
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full sm:w-auto">
          <Toast
            title={t.title}
            description={t.description}
            tone={t.tone}
            duration={t.duration}
            version={t.version}
            onClose={() => dismiss(t.id)}
          />
        </div>
      ))}
    </div>,
    document.body,
  );
}
