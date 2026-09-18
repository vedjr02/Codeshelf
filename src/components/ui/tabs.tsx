'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

/**
 * Underline tabs, the way a Mac document window does it: no pill, no box,
 * just a moving hairline. Quieter than a segmented control and right for
 * a long row of section names.
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'no-scrollbar relative flex w-full items-center gap-1 overflow-x-auto',
      'border-b-[0.5px] border-line',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'group relative shrink-0 whitespace-nowrap px-3 pb-2.5 pt-1',
      'text-[15px] font-medium text-ink-3 outline-none',
      'transition-colors duration-200 hover:text-ink',
      'data-[state=active]:text-ink',
      className
    )}
    {...props}
  >
    {children}
    <span
      aria-hidden="true"
      className={cn(
        'absolute inset-x-2 -bottom-[0.5px] h-[2px] rounded-full bg-ink',
        'origin-center scale-x-0 transition-transform duration-250 ease-[var(--ease-standard)]',
        'group-data-[state=active]:scale-x-100'
      )}
    />
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('outline-none data-[state=active]:animate-fade', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

/**
 * Apple's segmented control: a tinted track with a sliding white knob.
 * Use it for mutually exclusive *views* of the same content (grid/list),
 * not for navigation.
 */
function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
  'aria-label': ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: React.ReactNode; title?: string }>;
  className?: string;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-[var(--radius-md)] bg-surface-3 p-[2px]',
        size === 'sm' ? 'h-8' : 'h-10',
        className
      )}
    >
      {/* Sliding knob sits behind the labels. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-[2px] top-[2px] bottom-[2px] rounded-[calc(var(--radius-md)-2px)]',
          'bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
          'transition-transform duration-300 ease-[var(--ease-standard)]'
        )}
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cn(
            'relative z-10 flex h-full flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius-md)-2px)]',
            'px-3 font-medium transition-colors duration-200',
            size === 'sm' ? 'text-[13.5px]' : 'text-[14.5px]',
            option.value === value ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, Segmented };
