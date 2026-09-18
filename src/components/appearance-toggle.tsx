'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { Segmented } from '@/components/ui/tabs';
import { useTheme, type ThemeChoice } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

const OPTIONS: Array<{ value: ThemeChoice; label: React.ReactNode; title: string }> = [
  { value: 'light', label: <Sun className="h-[15px] w-[15px]" />, title: 'Light' },
  { value: 'dark', label: <Moon className="h-[15px] w-[15px]" />, title: 'Dark' },
  { value: 'system', label: <Monitor className="h-[15px] w-[15px]" />, title: 'Match system' },
];

/** Three-way appearance control: Light / Dark / Auto, like System Settings. */
export function AppearanceToggle({ className, size = 'sm' }: { className?: string; size?: 'sm' | 'md' }) {
  const { choice, setChoice } = useTheme();

  return (
    <Segmented
      aria-label="Appearance"
      value={choice}
      onChange={setChoice}
      size={size}
      options={OPTIONS}
      className={cn('w-full', className)}
    />
  );
}
