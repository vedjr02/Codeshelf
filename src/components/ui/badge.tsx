'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap [&>svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-3 text-ink-2',
        quiet: 'bg-transparent text-ink-3 border-[0.5px] border-line',
        accent: 'bg-accent-tint text-accent-ink',
        good: 'bg-good-tint text-good',
        warn: 'bg-warn-tint text-warn',
        bad: 'bg-bad-tint text-bad',
        violet: 'bg-violet-tint text-violet',
      },
      size: {
        sm: 'h-[19px] px-2 text-[12px] [&>svg]:h-3 [&>svg]:w-3',
        md: 'h-[23px] px-2.5 text-[13px] [&>svg]:h-[13px] [&>svg]:w-[13px]',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

/**
 * Language / tag chip that carries its own colour. The dot does the
 * colouring so the text stays at full contrast against any hue.
 */
function DotBadge({
  color,
  children,
  size = 'md',
  className,
}: {
  color: string;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      className={cn(
        badgeVariants({ tone: 'neutral', size }),
        'bg-surface-3 text-ink-2',
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn('rounded-full', size === 'sm' ? 'h-1.5 w-1.5' : 'h-[7px] w-[7px]')}
        style={{ backgroundColor: color }}
      />
      {children}
    </span>
  );
}

export { Badge, DotBadge, badgeVariants };
