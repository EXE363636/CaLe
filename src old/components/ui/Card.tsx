import type { ElementType, ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** When true, the card hover-lifts and gets a stronger shadow on hover. */
  clickable?: boolean;
  /** When true, removes the default border so a card-on-card layout doesn't read busy. */
  flush?: boolean;
  /**
   * Visual tone variant:
   *   - 'default': white surface, gray border
   *   - 'warm': soft amber/orange tint
   *   - 'subtle': slate-50 surface
   *   - 'glass': glassmorphism with backdrop-blur
   */
  tone?: 'default' | 'warm' | 'subtle' | 'glass';
  /** When true, adds an orange ambient glow shadow. */
  glow?: boolean;
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<NonNullable<CardProps['tone']>, string> = {
  default: 'bg-white border-gray-200/80',
  warm: 'bg-orange-50/60 border-orange-100/80',
  subtle: 'bg-slate-50 border-gray-200/80',
  glass: 'glass-card border-0',
};

export function Card({
  as: Tag = 'div',
  clickable = false,
  flush = false,
  tone = 'default',
  glow = false,
  children,
  className = '',
  ...rest
}: CardProps) {
  return (
    <Tag
      className={[
        'rounded-2xl p-5',
        // Glass tone handles its own shadow/border via the glass-card class
        tone === 'glass' ? '' : 'shadow-sm',
        flush ? 'border-0' : `border ${toneClasses[tone]}`,
        flush && tone !== 'glass' ? toneClasses[tone].split(' ')[0] : '',
        // card-lift adds a subtle translateY + brand shadow on hover
        clickable
          ? 'card-lift cursor-pointer'
          : '',
        // Orange glow shadow
        glow
          ? 'shadow-[var(--shadow-brand)]'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
