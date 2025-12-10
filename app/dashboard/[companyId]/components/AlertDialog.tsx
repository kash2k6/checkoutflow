'use client';

import { Dialog, Button } from '@whop/react/components';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  onConfirm?: () => void;
}

export default function AlertDialog({
  open,
  onOpenChange,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  onConfirm,
}: AlertDialogProps) {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onOpenChange(false);
  };

  const icons = {
    success: <CheckCircle2 className="w-6 h-6 text-green-500" />,
    error: <XCircle className="w-6 h-6 text-red-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
  };

  const buttonColors: Record<typeof type, 'green' | 'red' | 'yellow' | 'blue'> = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="2" className="max-w-[calc(100vw-2rem)] mx-4 md:mx-auto">
        <Dialog.Title className="flex items-center gap-2 md:gap-3 text-base md:text-lg">
          {icons[type]}
          {title}
        </Dialog.Title>
        <Dialog.Description className="mt-2 text-sm md:text-base">
          {message}
        </Dialog.Description>
        <div className="flex justify-end gap-2 md:gap-3 mt-4 md:mt-6">
          <Button
            color={buttonColors[type] as 'green' | 'red' | 'yellow' | 'blue'}
            variant="classic"
            size="2"
            onClick={handleConfirm}
            className="min-h-[44px] touch-manipulation"
          >
            {confirmText}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="2" className="max-w-[calc(100vw-2rem)] mx-4 md:mx-auto">
        <Dialog.Title className="flex items-center gap-2 md:gap-3 text-base md:text-lg">
          <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
          {title}
        </Dialog.Title>
        <Dialog.Description className="mt-2 text-sm md:text-base">
          {message}
        </Dialog.Description>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 md:gap-3 mt-4 md:mt-6">
          <Button
            color="gray"
            variant="classic"
            size="2"
            onClick={handleCancel}
            className="w-full sm:w-auto min-h-[44px] touch-manipulation"
          >
            {cancelText}
          </Button>
          <Button
            color={variant === 'danger' ? 'red' : 'tomato'}
            variant="classic"
            size="2"
            onClick={handleConfirm}
            className="w-full sm:w-auto min-h-[44px] touch-manipulation"
          >
            {confirmText}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

