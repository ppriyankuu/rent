"use client";

import { Modal } from "@/components/Modal";
import { formatCurrency } from "@/lib/utils/currency";
import type { Deposit, DepositBalance } from "@/lib/types";

interface EndBookingModalProps {
  open: boolean;
  onClose: () => void;
  deposit: Deposit | null;
  depositBalance: DepositBalance | null;
  moveOutDate: string;
  setMoveOutDate: (date: string) => void;
  deductionAmount: string;
  setDeductionAmount: (amount: string) => void;
  refundAmount: string;
  deductionReason: string;
  setDeductionReason: (reason: string) => void;
  onSubmit: (e: React.SubmitEvent) => void;
  isSubmitting: boolean;
}

/**
 * Modal for ending a tenant booking.
 */
export function EndBookingModal({
  open,
  onClose,
  deposit,
  depositBalance,
  moveOutDate,
  setMoveOutDate,
  deductionAmount,
  setDeductionAmount,
  refundAmount,
  deductionReason,
  setDeductionReason,
  onSubmit,
  isSubmitting,
}: EndBookingModalProps) {
  const remainingBalance = depositBalance?.remainingBalance || deposit?.amount || 0;

  const handleDeductionChange = (value: string) => {
    setDeductionAmount(value);
  };

  return (
    <Modal open={open} onClose={onClose} title="End Booking">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="p-3 bg-base-200 rounded text-sm">
          <p className="font-medium mb-1">Current Deposit Status</p>
          <p className="text-xs text-base-content/70">
            Original: {formatCurrency(depositBalance?.originalAmount || deposit?.amount || 0)} |
            Already Deducted: {formatCurrency(depositBalance?.totalDeducted || 0)} |
            <span className="text-success font-medium"> Remaining: {formatCurrency(remainingBalance)}</span>
          </p>
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Move-out Date</span></label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={moveOutDate}
            onChange={(e) => setMoveOutDate(e.target.value)}
            required
          />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Final Deduction Amount (₹) - Optional</span></label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="input input-bordered w-full"
            value={deductionAmount}
            onChange={(e) => handleDeductionChange(e.target.value)}
            placeholder="Enter amount for any damages discovered at move-out"
          />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Refund Amount (₹) - Auto Calculated</span></label>
          <input
            type="text"
            readOnly
            className="input input-bordered w-full bg-base-200"
            value={refundAmount}
          />
          <label className="label">
            <span className="label-text-alt text-base-content/60 whitespace-normal wrap-break-word">
              Refund = Remaining Balance ({remainingBalance.toLocaleString()}) - Final Deduction
            </span>
          </label>
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Deduction Reason (if deducting)</span></label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="e.g., Broken window discovered at move-out"
            value={deductionReason}
            onChange={(e) => setDeductionReason(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className={`btn btn-error w-full ${isSubmitting ? "btn-disabled" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting && <span className="loading loading-spinner loading-sm"></span>}
          End Booking
        </button>
      </form>
    </Modal>
  );
}
