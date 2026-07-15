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
              sizeMap[size],
              'transition-transform',
              readOnly
                ? 'cursor-default'
                : 'cursor-pointer hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded',
            ].join(' ')}
          >
            <svg
              viewBox="0 0 20 20"
              fill={filled ? '#f59e0b' : 'none'}
              stroke={filled ? '#f59e0b' : '#d1d5db'}
              strokeWidth={1.5}
              aria-hidden="true"
              className="h-full w-full"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
