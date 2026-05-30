import type { ElementType, ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** When true, the card hover-lifts and gets a stronger shadow on hover. */
  clickable?: boolean;
  /** When true, removes the default border so a card-on-card layout doesn't read busy. */
  flush?: boolean;
  /** When true, applies a soft warm tint instead of the default white. */
  tone?: 'default' | 'warm' | 'subtle';
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<NonNullable<CardProps['tone']>, string> = {
  default: 'bg-white border-gray-200',
  warm: 'bg-orange-50/60 border-orange-100',
  subtle: 'bg-slate-50 border-gray-200',
};

export function Card({
  as: Tag = 'div',
  clickable = false,
  flush = false,
  tone = 'default',
  children,
  className = '',
  ...rest
}: CardProps) {
  return (
    <Tag
      className={[
        // UI-REFRESH-FROM-BOLT-REFERENCE-1 — softer, layered card
        // elevation adopted from the Bolt reference (`shadow-card`)
        // instead of the flat `shadow-sm`. Hover lift unchanged.
        'rounded-2xl p-5 shadow-card',
        flush ? 'border-0' : `border ${toneClasses[tone]}`,
        flush ? toneClasses[tone].split(' ')[0] : '',
        // `motion-lift` adds a subtle translateY + shadow on hover when
        // the card is clickable. Defined in globals.css and reduced-motion
        // safe.
        clickable
          ? 'motion-lift cursor-pointer hover:shadow-card-hover focus-within:shadow-card-hover'
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
