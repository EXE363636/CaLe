'use client';

/**
 * Reveal — Phase 9D scroll-reveal primitive.
 *
 * Wraps any block element in an `IntersectionObserver` so it fades + slides
 * up the first time it enters the viewport. The CSS lives in
 * `src/app/globals.css` (`.reveal` + `.is-revealed`); this component just
 * toggles the `is-revealed` class once.
 *
 * Conventions:
 *   - One-shot only — once revealed, the observer disconnects so a user
 *     scrolling back up doesn't see the fade replay.
 *   - Empty / SSR / no-IntersectionObserver fallback: the component sets
 *     `is-revealed` immediately so users without the API still see content.
 *   - Reduced-motion users get the end-state immediately via the media
 *     query in `globals.css` — no transition, no transform.
 *
 * Usage:
 *   <Reveal>
 *     <Card>...</Card>
 *   </Reveal>
 *
 *   <Reveal delayMs={120} as="section" className="py-12">
 *     ...
 *   </Reveal>
 *
 * The component is intentionally minimal: no animation variants, no
 * direction props. Variants live as CSS classes if needed later.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';

interface RevealProps {
  /** Element tag — defaults to a `div`. Useful when the wrapper itself
   *  needs to be a `section` or `article`. */
  as?: ElementType;
  /** Stagger delay in milliseconds. Applied via the `--reveal-delay`
   *  custom property consumed by `globals.css`. */
  delayMs?: number;
  /** Extra classes applied alongside the `reveal` base class. */
  className?: string;
  /** Optional intersection threshold override (default 0.15). */
  threshold?: number;
  children: ReactNode;
}

export function Reveal({
  as: Tag = 'div',
  delayMs = 0,
  className = '',
  threshold = 0.15,
  children,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // No window / SSR? Reveal immediately so no content is hidden.
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    // If reduced-motion is requested, skip the observer and reveal now.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
            return;
          }
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );

    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);

  const style: CSSProperties = delayMs
    ? ({ ['--reveal-delay' as string]: `${delayMs}ms` } as CSSProperties)
    : {};

  return (
    <Tag
      ref={ref}
      className={['reveal', revealed ? 'is-revealed' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {children}
    </Tag>
  );
}
