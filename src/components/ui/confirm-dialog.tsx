'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = React.useState(false);
  const isBusy = busy || loading;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] bg-[#1f1f23] border-white/[0.14] rounded-[18px] p-6 gap-0">
        <DialogHeader className="space-y-0">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${
                destructive ? 'bg-[#ff453a]/12' : 'bg-[#2997ff]/12'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 ${destructive ? 'text-[#ff453a]' : 'text-[#2997ff]'}`} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[16px] font-semibold tracking-tight leading-snug">{title}</DialogTitle>
              {description && (
                <DialogDescription className="text-[13px] text-white/45 mt-1.5 leading-relaxed">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex justify-end gap-2.5 mt-6">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)} disabled={isBusy} className="rounded-[10px]">
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'default'}
            size="sm"
            onClick={handleConfirm}
            disabled={isBusy}
            className="rounded-[10px] gap-1.5 min-w-[90px]"
          >
            {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
