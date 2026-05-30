import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'orange' | 'green' | 'blue' | 'purple' | 'red';
}

const iconBgColors: Record<string, string> = {
  orange: 'bg-primary-100 text-primary-600',
  green: 'bg-success-100 text-success-600',
  blue: 'bg-info-100 text-info-600',
  purple: 'bg-purple-100 text-purple-600',
  red: 'bg-danger-100 text-danger-600',
};

export function StatCard({ title, value, suffix = '', prefix = '', icon, trend, color = 'orange' }: StatCardProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, latest => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, value, { duration: 1 });
    return () => controls.stop();
  }, [value, count]);

  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <div className="flex items-baseline gap-1 mt-2">
            {prefix && <span className="text-2xl font-bold text-gray-900">{prefix}</span>}
            <motion.span className="text-3xl font-bold text-gray-900">{rounded}</motion.span>
            {suffix && <span className="text-lg text-gray-600">{suffix}</span>}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'text-success-600' : 'text-danger-600'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-gray-500">tháng trước</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBgColors[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
