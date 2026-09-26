'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className = '', ...rest }, ref) => {
    const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-gray-700">
            {label}
            {rest.required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          rows={rest.rows ?? 4}
          className={[
            'w-full rounded-lg border px-3 py-2 text-sm text-gray-900',
            'min-h-[44px] resize-y transition-colors duration-150',
            'placeholder:text-gray-500',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1',
            error
              ? 'border-red-400 bg-red-50 focus-visible:ring-red-400'
              : 'border-gray-300 bg-white hover:border-gray-400',
            'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
            className,
          ].join(' ')}
          {...rest}
        />
        {rest.maxLength && (
          <p className="text-right text-xs text-gray-400">
            {(rest.value as string | undefined)?.length ?? 0}/{rest.maxLength}
          </p>
        )}
        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${textareaId}-hint`} className="text-xs text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
