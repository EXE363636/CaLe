'use client';

/**
 * Phase 9N — shared notification click handler.
 *
 * Used by both:
 *   - `NotificationBell` (global nav dropdown)
 *   - `DashboardNotificationCard` (in-dashboard side rail)
 *
 * so a notification triggers the same behavior regardless of where the
 * user clicked it. Click flow:
 *
 *   1. Always mark the notification read.
 *   2. If `notification.link` is unset → done.
 *   3. Parse the link. If its pathname matches the current `pathname`
 *      AND the link carries a `?modal=<value>` (or `?tab=<value>` for
 *      admin), dispatch a window-level custom event so the page can
 *      open its modal / switch its tab in-place — no router round-trip,
 *      no URL flicker.
 *   4. Otherwise `router.push(link)` so the destination page handles
 *      the deep link via its own `useModalFromQuery` hook.
 *
 * The custom-event approach decouples the bell from each dashboard's
 * modal state. Dashboards subscribe via {@link useDashboardModalEvents}
 * to translate events into local `setStatDetail` / `setTab` calls.
 */

import { useEffect } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { Notification } from '@/types';

/** Detail payload of the custom event the bell fires for same-page links. */
export interface DashboardModalEventDetail {
  /** The page the link targets (`url.pathname`). */
  pathname: string;
  /** `?modal=` value, when present. */
  modal: string | null;
  /** `?tab=` value, when present (admin dashboard). */
  tab: string | null;
  /** `?filter=` value, when present (admin dashboard). */
  filter: string | null;
  /**
   * `?section=` value, when present. Used for same-route shortcuts that
   * scroll/focus a dashboard SECTION (rather than open a modal/tab),
   * e.g. the worker "Việc đã ứng tuyển" shortcut →
   * `?section=applications` (CORE-STABILITY-6 Part 1).
   */
  section: string | null;
}

/** Custom event name used for same-page modal/tab handoff. */
export const DASHBOARD_MODAL_EVENT = 'cale:open-dashboard-modal';

/**
 * Handle a notification click. Always marks the notification as read.
 * Returns immediately after marking when the notification has no link.
 *
 * @param notification     The clicked notification record.
 * @param ctx.markRead     Store action that flips `read = true`.
 * @param ctx.router       Next.js app-router instance for cross-route pushes.
 * @param ctx.pathname     Current pathname from `usePathname()`.
 */
export function handleNotificationClick(
  notification: Notification,
  ctx: {
    markRead: (id: string) => void;
    router: Pick<AppRouterInstance, 'push'>;
    pathname: string;
  },
): void {
  ctx.markRead(notification.id);
  if (!notification.link) return;

  const url = new URL(notification.link, 'http://placeholder.local');
  const linkPath = url.pathname;
  const modal = url.searchParams.get('modal');
  const tab = url.searchParams.get('tab');
  const filter = url.searchParams.get('filter');
  const section = url.searchParams.get('section');

  // Same-page deep link — fire a window event the dashboard listens
  // for. Avoids a router round-trip and the brief query-string flicker
  // that `router.push` of the current path would produce.
  if (linkPath === ctx.pathname && (modal || tab || section)) {
    const detail: DashboardModalEventDetail = {
      pathname: linkPath,
      modal,
      tab,
      filter,
      section,
    };
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<DashboardModalEventDetail>(DASHBOARD_MODAL_EVENT, {
          detail,
        }),
      );
    }
    return;
  }

  // Cross-route deep link — let the destination page's
  // `useModalFromQuery` hook handle the query.
  ctx.router.push(notification.link);
}

/**
 * Subscribe a dashboard component to the same-page custom event.
 *
 * @param expectedPath  Path this dashboard owns (e.g. `/worker/dashboard`).
 * @param onMatch       Called with the event detail when its pathname
 *                      matches `expectedPath`. The dashboard should flip
 *                      its modal / tab state based on `detail.modal` /
 *                      `detail.tab`.
 */
export function useDashboardModalEvents(
  expectedPath: string,
  onMatch: (detail: DashboardModalEventDetail) => void,
): void {
  useEffect(() => {
    function listener(event: Event) {
      const ce = event as CustomEvent<DashboardModalEventDetail>;
      if (!ce.detail) return;
      if (ce.detail.pathname !== expectedPath) return;
      onMatch(ce.detail);
    }
    window.addEventListener(DASHBOARD_MODAL_EVENT, listener);
    return () => window.removeEventListener(DASHBOARD_MODAL_EVENT, listener);
  }, [expectedPath, onMatch]);
}

/**
 * NAV-INTENT-DEEPLINK-FIX-1 — navigate to a link that may carry an
 * intent (`?modal=` / `?tab=` / `?filter=`), working even when the
 * user is ALREADY on the target route.
 *
 * Root cause this solves: pages read their intent via
 * `useModalFromQuery` (mount-only) / `?tab=` (mount-only). A plain
 * `<Link>` to the SAME pathname updates the URL but never remounts the
 * page, so the mount-only readers never re-fire and the tab/modal does
 * not open. This helper mirrors {@link handleNotificationClick}: for a
 * same-route intent it dispatches the existing
 * `DASHBOARD_MODAL_EVENT` (which every dashboard already subscribes to
 * via {@link useDashboardModalEvents}); for a cross-route link it
 * pushes normally so the destination page reads the intent on mount.
 *
 * Idempotent and side-effect-free: it only opens UI (tab/modal); it
 * never mutates store state, so re-clicking the same shortcut just
 * re-opens/re-focuses the section with no duplicate notifications,
 * timeline entries, or ledger rows.
 *
 * @returns `true` when handled as a same-route intent event, `false`
 *          when it fell back to a normal `router.push` (or had no
 *          intent params).
 */
export function navigateWithIntent(
  link: string,
  ctx: {
    router: Pick<AppRouterInstance, 'push'>;
    pathname: string;
  },
): boolean {
  const url = new URL(link, 'http://placeholder.local');
  const linkPath = url.pathname;
  const modal = url.searchParams.get('modal');
  const tab = url.searchParams.get('tab');
  const filter = url.searchParams.get('filter');
  const section = url.searchParams.get('section');

  // Same-route intent — dispatch the event the page already listens
  // for, so a mount-only reader is not required. No router round-trip,
  // no URL flicker, works on repeated clicks.
  if (linkPath === ctx.pathname && (modal || tab || section)) {
    if (typeof window !== 'undefined') {
      const detail: DashboardModalEventDetail = {
        pathname: linkPath,
        modal,
        tab,
        filter,
        section,
      };
      window.dispatchEvent(
        new CustomEvent<DashboardModalEventDetail>(DASHBOARD_MODAL_EVENT, {
          detail,
        }),
      );
    }
    return true;
  }

  // Cross-route (or no intent) — normal navigation; the destination
  // page reads the intent on mount.
  ctx.router.push(link);
  return false;
}
