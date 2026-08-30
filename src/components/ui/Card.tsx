/**
 * 通用卡片容器组件
 */

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn('card', className)} {...props} />;
});

Card.displayName = 'Card';
