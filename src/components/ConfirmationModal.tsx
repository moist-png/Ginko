import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  isDestructive = false
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface-raised)] rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            {isDestructive && (
              <div className="w-10 h-10 bg-[var(--surface-overlay)] rounded-full flex items-center justify-center">
                <AlertTriangle className="text-[var(--danger)]" size={20} />
              </div>
            )}
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--surface-overlay)] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-[var(--text-primary)] mb-6 leading-relaxed">{message}</p>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--forest)] transition-colors font-medium"
            >
              {cancelButtonText}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDestructive
                  ? 'bg-[var(--danger)] text-[var(--cream)] hover:opacity-90'
                  : 'bg-[var(--ink)] text-[var(--cream)] hover:bg-[var(--accent)]'
              }`}
            >
              {confirmButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};