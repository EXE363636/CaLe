import { cn } from '../../utils/helpers';
import type { ReactNode } from 'react';

interface StatusBadgeProps {
  variant: 'blue' | 'orange' | 'green' | 'amber' | 'red' | 'gray' | 'purple';
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

const colorMap: Record<string, string> = {
  blue: 'bg-info-100 text-info-700 border-info-200',
  orange: 'bg-primary-100 text-primary-700 border-primary-200',
  green: 'bg-success-100 text-success-700 border-success-200',
  amber: 'bg-warning-100 text-warning-700 border-warning-200',
  red: 'bg-danger-100 text-danger-700 border-danger-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
};

const dotColorMap: Record<string, string> = {
  blue: 'bg-info-500',
  orange: 'bg-primary-500',
  green: 'bg-success-500',
  amber: 'bg-warning-500',
  red: 'bg-danger-500',
  gray: 'bg-gray-400',
  purple: 'bg-purple-500',
};

const sizeMap: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function StatusBadge({ variant, children, size = 'md', dot = false, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        colorMap[variant],
        sizeMap[size],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColorMap[variant])} />}
      {children}
    </span>
  );
}
