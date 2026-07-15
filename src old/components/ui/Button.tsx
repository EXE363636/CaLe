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
 * Variant styling for the four button intents. Phase 9 polish:
 *   - `primary` gets a subtle gradient + orange shadow ring on hover for
 *     extra "tap me" affordance.
 *   - `secondary` keeps the outlined orange look but tightens hover bg.
 *   - `ghost` reads as a tertiary action with muted hover.
 *   - `danger` keeps red but with consistent hover shadow.
 *
 * All variants share the same focus ring (`focus-visible:ring-orange-400`)
 * so keyboard users get a uniform accent. Disabled state explicitly
 * removes shadows so the button reads as inactive.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-gradient-to-b from-orange-500 to-orange-600 text-white',
    'shadow-sm hover:shadow-md hover:from-orange-500 hover:to-orange-700',
    'active:from-orange-600 active:to-orange-700',
    'disabled:from-orange-300 disabled:to-orange-300 disabled:shadow-none',
  ].join(' '),
  secondary: [
    'bg-white text-orange-600 border border-orange-500',
    'shadow-sm hover:bg-orange-50 hover:shadow-md active:bg-orange-100',
    'disabled:opacity-50 disabled:shadow-none',
  ].join(' '),
  ghost: [
    'bg-transparent text-gray-700',
    'hover:bg-gray-100 active:bg-gray-200',
    'disabled:opacity-50',
  ].join(' '),
  danger: [
    'bg-gradient-to-b from-red-500 to-red-600 text-white',
    'shadow-sm hover:shadow-md hover:from-red-500 hover:to-red-700',
    'active:from-red-600 active:to-red-700',
    'disabled:from-red-300 disabled:to-red-300 disabled:shadow-none',
  ].join(' '),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2 text-sm min-h-[44px]',
  lg: 'px-6 py-3 text-base min-h-[52px]',
};

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
        className={[
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
        ].join(' ')}
        {...rest}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
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
