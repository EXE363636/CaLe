import type { ElementType, ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  clickable?: boolean;
  children: ReactNode;
  className?: string;
}

export function Card({
  as: Tag = 'div',
  clickable = false,
  children,
  className = '',
  ...rest
}: CardProps) {
  return (
    <Tag
      className={[
        'rounded-xl border border-gray-200 bg-white p-4 shadow-sm',
        clickable
          ? 'cursor-pointer transition-shadow hover:shadow-md active:shadow-sm'
          : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
