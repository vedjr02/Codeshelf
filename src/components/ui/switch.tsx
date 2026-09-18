'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

/**
 * Mac-scale switch: 38×22 track, 18px thumb, spring-weighted travel.
 * Green when on, the way every Apple toggle is.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      'peer relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full',
      'border-[0.5px] border-transparent p-[2px]',
      'transition-colors duration-250 ease-[var(--ease-standard)]',
      'data-[state=checked]:bg-good data-[state=unchecked]:bg-line-3',
      'disabled:cursor-not-allowed disabled:opacity-40',
      className
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-[18px] w-[18px] rounded-full bg-white',
        'shadow-[0_1px_3px_rgba(0,0,0,0.28)]',
        'transition-transform duration-250 ease-[var(--ease-standard)]',
        'data-[state=checked]:translate-x-[15px] data-[state=unchecked]:translate-x-0'
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
