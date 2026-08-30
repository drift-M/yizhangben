/**
 * 通用输入框组件
 *
 * 包含标签、输入框与错误提示，支持 React 原生的所有 input 属性。
 */

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="label">
            {label}
            {props.required && <span className="text-terracotta ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn('input', error && 'border-terracotta focus:border-terracotta', className)}
          {...props}
        />
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
