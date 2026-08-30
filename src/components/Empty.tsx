/**
 * 空状态占位组件
 */

import { PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyProps {
  title?: string;
  description?: string;
  className?: string;
}

export function Empty({
  title = '暂无数据',
  description = '当前列表为空，快去添加第一条记录吧',
  className,
}: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="rounded-full bg-stone-100 p-4">
        <PackageOpen className="h-8 w-8 text-stone-400" />
      </div>
      <h4 className="mt-4 text-base font-medium text-charcoal">{title}</h4>
      <p className="mt-1 max-w-xs text-sm text-stone-500">{description}</p>
    </div>
  );
}
