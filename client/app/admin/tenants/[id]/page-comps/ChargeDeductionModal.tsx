"use client";

import { Modal } from "@/components/Modal";

interface ChargeDeductionModalProps {
  open: boolean;
  onClose: () => void;
  amount: string;
  setAmount: (amount: string) => void;
  reason: string;
  setReason: (reason: string) => void;
  onSubmit: (e: React.SubmitEvent) => void;
  isSubmitting: boolean;
}

/**
 * Modal for charging a deduction/fine to a tenant.
 */
export function ChargeDeductionModal({
  open,
  onClose,
  amount,
  setAmount,
  reason,
  setReason,
  onSubmit,
  isSubmitting,
}: ChargeDeductionModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Charge Fine/Deduction">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="form-control">
          <label className="label"><span className="label-text">Amount (₹)</span></label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="input input-bordered w-full"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter deduction amount"
            required
          />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Reason</span></label>
          <textarea
            className="textarea textarea-bordered w-full"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Damage to property"
            rows={3}
            required
          />
        </div>
        <button
          type="submit"
          className={`btn btn-error w-full ${isSubmitting ? "btn-disabled" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting && <span className="loading loading-spinner loading-sm"></span>}
          Charge Deduction
        </button>
      </form>
    </Modal>
  );
}
