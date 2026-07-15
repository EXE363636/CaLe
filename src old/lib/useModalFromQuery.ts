'use client';

/**
 * Phase 9L helper — open a dashboard modal from a `?modal=` URL query.
 *
 * Notification deep links use a stable `?modal=<name>` convention so
 * clicking a notification lands the user on the right dashboard with
 * the matching detail modal already open. Example:
 *
 *   /worker/dashboard?modal=reputation
 *   /employer/dashboard?modal=pending
 *
 * The hook reads the `modal` search param exactly once on mount,
 * passes the value to the page-supplied `onMatch` callback (so the
 * page can `setStatDetail('reputation')` etc.), then strips the param
 * from the URL via `router.replace`. Subsequent closes therefore
 * don't accidentally re-open the modal on every render.
 *
 * Pure client hook — safe to import from any client component.
 */

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * @param allowed   List of `modal` values the page actually handles.
 * @param onMatch   Called with the matched value once on mount.
 */
export function useModalFromQuery(
  allowed: readonly string[],
  onMatch: (modal: string) => void,
): void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Ref guards against the effect re-firing after `router.replace`
  // changes the URL (Next.js may re-run the effect because the
  // `searchParams` object reference changed).
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const modal = searchParams.get('modal');
    if (!modal) return;
    if (!allowed.includes(modal)) {
      // Unknown value — strip it without firing `onMatch` so the page
      // ends up in a clean state.
      handled.current = true;
      router.replace(pathname);
      return;
    }
    handled.current = true;
    onMatch(modal);
    // Strip the `modal` param so refreshing or closing the modal
    // doesn't re-trigger this hook.
    router.replace(pathname);
    // We deliberately omit `searchParams` from the dep list — the ref
    // guard makes a stale closure here safe and avoids a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * CORE-STABILITY-6 — sibling of {@link useModalFromQuery} for a
 * `?section=` intent. Reads the `section` search param exactly once on
 * mount, passes a matched value to `onMatch` (so the page can scroll /
 * focus / highlight the section), then strips the param so a refresh
 * doesn't re-fire. Used for shortcuts that focus a dashboard SECTION
 * rather than open a modal (e.g. worker "Việc đã ứng tuyển").
 */
export function useSectionFromQuery(
  allowed: readonly string[],
  onMatch: (section: string) => void,
): void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const section = searchParams.get('section');
    if (!section) return;
    handled.current = true;
    if (allowed.includes(section)) {
      onMatch(section);
    }
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
