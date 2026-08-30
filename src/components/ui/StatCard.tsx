/**
 * 仪表盘统计卡片组件
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  variant?: 'default' | 'accent';
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  className,
  variant = 'default',
}: StatCardProps) {
  return (
    <div
      className={cn(
        'card flex items-start justify-between',
        variant === 'accent' && 'bg-charcoal text-white',
        className
      )}
    >
      <div>
        <p className={cn('text-sm font-medium', variant === 'accent' ? 'text-stone-300' : 'text-stone-500')}>
          {title}
        </p>
        <p className="mt-2 text-2xl font-serif font-semibold">{value}</p>
        {trend && (
          <p
            className={cn(
              'mt-1 text-xs font-medium',
              trendUp === undefined
                ? 'text-stone-400'
                : trendUp
                ? 'text-emerald-600'
                : 'text-terracotta'
            )}
          >
            {trend}
          </p>
        )}
      </div>
      {icon && (
        <div
          className={cn(
            'rounded-xl p-2.5',
            variant === 'accent' ? 'bg-white/10 text-white' : 'bg-terracotta/10 text-terracotta'
          )}
        >
          {icon}
        </div>
      )}
    </div>
  );
}
