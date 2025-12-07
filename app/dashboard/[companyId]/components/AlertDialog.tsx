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

  const buttonColors = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="2">
        <Dialog.Title className="flex items-center gap-3">
          {icons[type]}
          {title}
        </Dialog.Title>
        <Dialog.Description className="mt-2">
          {message}
        </Dialog.Description>
        <div className="flex justify-end gap-2 mt-6">
          <Button
            color={buttonColors[type]}
            variant="classic"
            size="2"
            onClick={handleConfirm}
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
      <Dialog.Content size="2">
        <Dialog.Title className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          {title}
        </Dialog.Title>
        <Dialog.Description className="mt-2">
          {message}
        </Dialog.Description>
        <div className="flex justify-end gap-2 mt-6">
          <Button
            color="gray"
            variant="classic"
            size="2"
            onClick={handleCancel}
          >
            {cancelText}
          </Button>
          <Button
            color={variant === 'danger' ? 'red' : 'tomato'}
            variant="classic"
            size="2"
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

