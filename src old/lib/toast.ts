/**
 * Toast helpers (Phase 9O initial, scope param added in 9R).
 *
 * Thin wrappers around `useToastStore.getState().show(...)` so call
 * sites don't have to import the store directly. Use these from any
 * action handler — store mutators, form submit handlers, query
 * effects — to surface short-lived feedback to the actor.
 *
 * Phase 9R: every helper now accepts an optional `scope` so categories
 * of toasts (e.g. all auth errors) can be cleared together via
 * `clearToastsByScope('auth')` after a successful action.
 *
 * Product principle: a toast must reflect a real action result. Do
 * not show success toasts for things that didn't actually succeed,
 * and do not show errors that don't carry an actionable reason.
 *
 * ```ts
 * // Worker submits an application.
 * const result = applicationStore.apply(shiftId, workerId);
 * if (result.ok) {
 *   showSuccess(t('feedback.apply.success'));
 * } else {
 *   showError(toastFromStoreError(result.error));
 * }
 * ```
 */

import { useToastStore, type ToastScope } from '@/stores/toastStore';

interface ToastOptions {
  /** Phase 9R — bucket for `clearToastsByScope`. */
  scope?: ToastScope;
}

interface ErrorToastOptions extends ToastOptions {
  /** When true, the toast won't auto-dismiss. */
  sticky?: boolean;
}

export function showSuccess(
  title: string,
  description?: string,
  options?: ToastOptions,
): string {
  return useToastStore.getState().show({
    tone: 'success',
    title,
    description,
    scope: options?.scope,
  });
}

export function showError(
  title: string,
  description?: string,
  options?: ErrorToastOptions,
): string {
  return useToastStore.getState().show({
    tone: 'error',
    title,
    description,
    duration: options?.sticky ? 0 : undefined,
    scope: options?.scope,
  });
}

export function showWarning(
  title: string,
  description?: string,
  options?: ToastOptions,
): string {
  return useToastStore.getState().show({
    tone: 'warning',
    title,
    description,
    scope: options?.scope,
  });
}

export function showInfo(
  title: string,
  description?: string,
  options?: ToastOptions,
): string {
  return useToastStore.getState().show({
    tone: 'info',
    title,
    description,
    scope: options?.scope,
  });
}

export function dismissToast(id: string): void {
  useToastStore.getState().dismiss(id);
}

/**
 * Phase 9R — drop every toast in a scope. Used after a successful
 * action that may have left stale errors on screen (e.g. clearing
 * `auth` errors after a successful login).
 */
export function clearToastsByScope(scope: ToastScope): void {
  useToastStore.getState().clearByScope(scope);
}
