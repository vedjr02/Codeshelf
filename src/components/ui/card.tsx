'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva('rounded-[var(--radius-xl)] border-[0.5px] border-line', {
  variants: {
    tone: {
      /** Default: opaque white/near-black panel on the canvas. */
      surface: 'bg-surface',
      /** Recedes — for nested blocks inside a surface card. */
      sunken: 'bg-surface-3 border-transparent',
      /** No fill at all; just the hairline. */
      outline: 'bg-transparent',
    },
    elevation: {
      none: '',
      flat: 'shadow-[var(--shadow-hairline)]',
      card: 'shadow-[var(--shadow-card)]',
      lift: 'shadow-[var(--shadow-lift)]',
    },
    interactive: {
      true: 'transition-[background-color,border-color,box-shadow,transform] duration-250 ease-[var(--ease-standard)] hover:border-line-2 hover:shadow-[var(--shadow-lift)]',
      false: '',
    },
  },
  defaultVariants: {
    tone: 'surface',
    elevation: 'card',
    interactive: false,
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tone, elevation, interactive, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ tone, elevation, interactive }), className)} {...props} />
  )
);
Card.displayName = 'Card';

/** Section heading row inside a card: title on the left, actions on the right. */
function CardHead({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-[18px] font-semibold tracking-[-0.018em] text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-[14px] text-ink-3">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export { Card, CardHead, cardVariants };
