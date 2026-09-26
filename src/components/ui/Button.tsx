'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

/**
 * Variant styling for the four button intents. Colors are drawn from the
 * design token ramp (orange-*, gray-*, red-*) — no discrete hex literals.
 *
 *   - `primary` is a SOLID brand fill: `bg-orange-500` (#FF9A5F) with DARK
 *     ink text `text-gray-900` (#37373B). GUARDRAIL: never a gradient and
 *     never white text on the light orange. The dark-ink-on-#FF9A5F pairing
 *     is intentional and meets WCAG AA — a contrast tool flagging it is a
 *     known false-positive; do not "fix" it back to white or #f97316.
 *   - `secondary` is the outlined orange action (white bg, orange border/text).
 *   - `ghost` is a tertiary action with a muted neutral hover.
 *   - `danger` is a solid red action (`bg-red-600` + white text) that stays
 *     above the 4.5:1 contrast floor across its hover/active states.
 *
 * Every variant exposes distinguishable default / hover / active / disabled
 * states drawn from tokens, and shares one focus ring
 * (`focus-visible:ring-orange-400` + offset) so keyboard focus is uniform.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    // Solid brand fill: #FF9A5F (orange-500) with dark ink #37373B
    // (text-gray-900). No gradient, no white text (guardrail). Hover/active
    // lighten within the orange ramp; dark ink keeps >=4.5:1 throughout.
    'bg-orange-500 text-gray-900',
    'shadow-sm hover:bg-orange-400 hover:shadow-md active:bg-orange-300',
    'disabled:bg-orange-200 disabled:text-gray-500 disabled:shadow-none',
  ].join(' '),
  secondary: [
    'bg-white text-orange-700 border border-orange-500',
    'shadow-sm hover:bg-orange-50 hover:shadow-md active:bg-orange-100',
    'disabled:opacity-50 disabled:shadow-none',
  ].join(' '),
  ghost: [
    'bg-transparent text-gray-700',
    'hover:bg-gray-100 active:bg-gray-200',
    'disabled:opacity-50',
  ].join(' '),
  danger: [
    // Solid danger fill from the red token ramp. White text stays >=4.5:1
    // (red-600/700/800 all clear the AA floor; the prior red-500 gradient
    // end did not). No gradient — flat token fill like the other variants.
    'bg-red-600 text-white',
    'shadow-sm hover:bg-red-700 hover:shadow-md active:bg-red-800',
    'disabled:bg-red-300 disabled:shadow-none',
  ].join(' '),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2 text-sm min-h-[44px]',
  lg: 'px-6 py-3 text-base min-h-[52px]',
};

/**
 * Shared class list for anything that should LOOK like a Button — used by
 * `Button` itself and by `ButtonLink` (navigation styled as a button), so
 * the two never drift apart.
 */
export function buttonClassName(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className = '',
): string {
  return [
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
    // Smoother multi-property transition than colors-only — subtle
    // press affordance via `motion-press` (defined in globals.css,
    // motion-reduce safe).
    'motion-press transition focus:outline-none focus-visible:ring-2',
    'focus-visible:ring-orange-400 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed',
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].join(' ');
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      children,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={buttonClassName(variant, size, className)}
        {...rest}
      >
        {loading && (
          <svg
            // P3 reduced-motion: `btn-loading-spinner` marker lets
            // globals.css swap the aggressive spin for a gentle opacity
            // pulse under `prefers-reduced-motion: reduce`. The spinner
            // stays visible and the button stays disabled — loading logic,
            // the `loading` prop, and this markup are unchanged.
            className="h-4 w-4 animate-spin btn-loading-spinner"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
