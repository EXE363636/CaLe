import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';

interface ProgressProps {
  value: number;
  max?: number;
  color?: 'orange' | 'green' | 'blue' | 'red' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const colorStyles = {
  orange: 'bg-gradient-to-r from-primary-400 to-primary-500',
  green: 'bg-gradient-to-r from-success-400 to-success-500',
  blue: 'bg-gradient-to-r from-info-400 to-info-500',
  red: 'bg-gradient-to-r from-danger-400 to-danger-500',
  gray: 'bg-gradient-to-r from-gray-400 to-gray-500',
};

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function Progress({ value, max = 100, color = 'orange', size = 'md', showLabel = false, label, className }: ProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">{label}</span>
          <span className="text-sm font-medium text-gray-900">{value}/{max}</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeStyles[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', colorStyles[color])}
        />
      </div>
    </div>
  );
}
