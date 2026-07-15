'use client';

interface StarRatingProps {
  value: number;
  readOnly?: boolean;
  onChange?: (stars: 1 | 2 | 3 | 4 | 5) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

export function StarRating({
  value,
  readOnly = false,
  onChange,
  size = 'md',
  className = '',
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5] as const;

  return (
    <div
      className={['flex items-center gap-0.5', className].join(' ')}
      role={readOnly ? 'img' : 'group'}
      aria-label={`${value} trên 5 sao`}
    >
      {stars.map((star) => {
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange?.(star)}
            aria-label={`${star} sao`}
            className={[
              'transition-transform',
              // Interactive stars get a >=44x44 CSS px hit area (the SVG
              // icon keeps its sizeMap size, centered inside). ReadOnly
              // display stars stay icon-sized (no touch target needed).
              readOnly
                ? [sizeMap[size], 'cursor-default'].join(' ')
                : 'flex min-h-[44px] min-w-[44px] items-center justify-center cursor-pointer hover:scale-110 motion-reduce:hover:scale-100 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 rounded',
            ].join(' ')}
          >
            <svg
              viewBox="0 0 20 20"
              strokeWidth={1.5}
              aria-hidden="true"
              className={[
                // P3: fill/stroke driven by Tailwind tokens (no hardcoded
                // hex). Filled = amber token; empty = `fill-none` + a
                // gray-500 outline that clears >=3:1 non-text contrast on
                // white (the old `#d1d5db` did not). `stroke-current` ties
                // the outline color to the text-* token above.
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-none text-gray-500',
                'stroke-current',
                readOnly ? 'h-full w-full' : sizeMap[size],
              ].join(' ')}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
