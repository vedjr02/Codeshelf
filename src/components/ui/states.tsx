'use client';

import { FolderOpen, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="rounded-full bg-white/[0.06] border border-white/[0.08] p-4 mb-4">
        {icon || <FolderOpen className="h-8 w-8 text-white/40" />}
      </div>
      <h3 className="text-[17px] font-semibold tracking-tight text-white mb-1.5">{title}</h3>
      {description && <p className="text-[14px] text-[#9a9aa3] mb-5 max-w-sm leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-[#2997ff] mb-4" />
      <p className="text-[14px] text-[#9a9aa3]">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'Something went wrong', message, retry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="rounded-full bg-red-500/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-red-400" />
      </div>
      <h3 className="text-lg font-medium text-white/80 mb-1">{title}</h3>
      <p className="text-sm text-white/50 mb-4 max-w-sm">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="text-sm text-white/60 hover:text-white underline underline-offset-4"
        >
          Try again
        </button>
      )}
    </div>
  );
}
