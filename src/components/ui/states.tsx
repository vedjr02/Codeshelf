'use client';

import * as React from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * The empty state carries the tone of the whole app, so it stays quiet:
 * a light glyph, one line of explanation, at most one action.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-3 text-ink-4 [&>svg]:h-[22px] [&>svg]:w-[22px]">
        {icon ?? <Inbox />}
      </div>
      <h3 className="text-[16px] font-semibold tracking-[-0.015em] text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-[340px] text-[14.5px] leading-relaxed text-ink-3">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ message = 'Loading…', className }: { message?: string; className?: string }) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-14', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="mb-3 h-5 w-5 animate-spin text-ink-4" aria-hidden="true" />
      <p className="text-[14.5px] text-ink-3">{message}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  retry,
  className,
}: {
  title?: string;
  message: string;
  retry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      className={className}
      icon={<AlertCircle className="text-bad" />}
      title={title}
      description={message}
      action={
        retry ? (
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        ) : undefined
      }
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton rounded-[var(--radius-sm)]', className)} />;
}

/** Row skeleton used while lists load, so layout does not jump. */
export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 rounded-[var(--radius-lg)] border-[0.5px] border-line bg-surface p-4">
          <Skeleton className="h-9 w-9 rounded-[var(--radius-md)]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-[38%]" />
            <Skeleton className="h-2.5 w-[62%]" />
          </div>
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}
