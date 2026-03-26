"use client";

import { Modal } from "@/components/Modal";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "success" | "primary";
  isLoading?: boolean;
}

/**
 * Reusable confirmation modal for delete/action confirmations.
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  const variantClasses = {
    danger: "btn-error",
    warning: "btn-warning",
    success: "btn-success",
    primary: "btn-primary",
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-base-content/80">{message}</p>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn btn-ghost" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </button>
          <button
            className={`btn ${variantClasses[variant]} ${isLoading ? "btn-disabled" : ""}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <span className="loading loading-spinner loading-sm"></span>}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
