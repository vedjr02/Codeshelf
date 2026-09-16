'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-white/[0.08] text-white',
        secondary: 'bg-white/[0.05] text-white/70',
        success: 'bg-[#30d158]/15 text-[#30d158]',
        warning: 'bg-[#ffd60a]/15 text-[#ffd60a]',
        danger: 'bg-[#ff453a]/15 text-[#ff453a]',
        info: 'bg-[#0a84ff]/15 text-[#0a84ff]',
        language: 'bg-white/10 text-white/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
