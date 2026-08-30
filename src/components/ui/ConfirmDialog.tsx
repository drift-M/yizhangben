/**
 * 二次确认对话框组件
 */

import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'primary';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '确认操作',
  description = '该操作不可撤销，是否继续？',
  confirmText = '确认',
  cancelText = '取消',
  isLoading,
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            <AlertTriangle className="h-4 w-4" />
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-center justify-center py-4">
        <div className="rounded-full bg-terracotta/10 p-4">
          <AlertTriangle className="h-8 w-8 text-terracotta" />
        </div>
      </div>
    </Modal>
  );
}
