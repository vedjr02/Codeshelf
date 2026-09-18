'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const fieldBase = [
  'w-full bg-surface text-ink',
  'border-[0.5px] border-line-2 rounded-[var(--radius-md)]',
  'placeholder:text-ink-4',
  'transition-[border-color,box-shadow,background-color] duration-200 ease-[var(--ease-standard)]',
  'focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-tint',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input ref={ref} type={type} className={cn(fieldBase, 'h-10 px-3 text-[15px]', className)} {...props} />
));
Input.displayName = 'Input';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, 'px-3.5 py-3 text-[15px] leading-relaxed resize-y', className)} {...props} />
));
Textarea.displayName = 'Textarea';

/** Label + field + hint, with the spacing already right. */
function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[14px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && <p className="text-[13px] leading-relaxed text-ink-4">{hint}</p>}
    </div>
  );
}

/** Field with a leading icon slot — search boxes, path pickers. */
const IconInput = React.forwardRef<
  HTMLInputElement,
  InputProps & { icon: React.ReactNode; trailing?: React.ReactNode }
>(({ icon, trailing, className, ...props }, ref) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 [&>svg]:h-[16px] [&>svg]:w-[16px]">
      {icon}
    </span>
    <Input ref={ref} className={cn('pl-9', trailing && 'pr-9', className)} {...props} />
    {trailing && <span className="absolute right-2.5 top-1/2 -translate-y-1/2">{trailing}</span>}
  </div>
));
IconInput.displayName = 'IconInput';

export { Input, Textarea, IconInput, Field, fieldBase };
