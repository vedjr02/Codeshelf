'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[12px] text-[14px] font-medium transition-[background-color,border-color,color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2997ff]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d10] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#0a84ff] text-white shadow-[0_4px_16px_-8px_rgba(10,132,255,0.8)] hover:bg-[#2997ff] hover:shadow-[0_6px_20px_-8px_rgba(41,151,255,0.9)] active:scale-[0.98]',
        secondary: 'bg-white/[0.08] text-white hover:bg-white/[0.14] active:scale-[0.98] border border-white/[0.1]',
        ghost: 'text-white/70 hover:bg-white/[0.08] hover:text-white',
        danger: 'bg-[#ff453a]/15 text-[#ff453a] hover:bg-[#ff453a]/25',
        success: 'bg-[#30d158]/15 text-[#30d158] hover:bg-[#30d158]/25',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 px-4 text-[13px]',
        lg: 'h-14 px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
