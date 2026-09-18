'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap select-none',
    'font-medium tracking-[-0.01em]',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-standard)]',
    'active:scale-[0.975]',
    'disabled:pointer-events-none disabled:opacity-40',
  ],
  {
    variants: {
      variant: {
        /** Filled accent — one per view, the single obvious action. */
        primary: 'bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-press',
        /** Standard control: opaque, hairline, the workhorse. */
        secondary:
          'bg-surface text-ink border-[0.5px] border-line-2 shadow-[var(--shadow-hairline)] hover:bg-surface-2 hover:border-line-3',
        /** Sits directly on the canvas with no chrome until hovered. */
        ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink',
        /** Reads as a link, behaves as a button. */
        link: 'text-accent-ink hover:underline underline-offset-[3px] decoration-[1.5px] active:scale-100',
        destructive: 'bg-bad text-on-status hover:brightness-110',
        'destructive-quiet': 'text-bad hover:bg-bad-tint',
        success: 'bg-good text-on-status hover:brightness-110',
      },
      size: {
        xs: 'h-[30px] rounded-[var(--radius-sm)] px-3 text-[13.5px]',
        sm: 'h-[34px] rounded-[var(--radius-md)] px-3.5 text-[14px]',
        md: 'h-10 rounded-[var(--radius-md)] px-4 text-[15px]',
        lg: 'h-11 rounded-[var(--radius-lg)] px-5 text-[16px]',
        pill: 'h-10 rounded-full px-5 text-[15px]',
        'pill-lg': 'h-11 rounded-full px-6 text-[16px]',
        icon: 'h-9 w-9 rounded-[var(--radius-md)]',
        'icon-sm': 'h-[30px] w-[30px] rounded-[var(--radius-sm)]',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        // A button inside a form defaults to submit, which surprises people.
        type={asChild ? undefined : type ?? 'button'}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
