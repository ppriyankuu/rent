"use client";

import { Modal } from "@/components/Modal";

interface UpdateRentModalProps {
  open: boolean;
  onClose: () => void;
  currentRent: string;
  setRent: (rent: string) => void;
  applyToAll: boolean;
  setApplyToAll: (apply: boolean) => void;
  onSubmit: (e: React.SubmitEvent) => void;
  isSubmitting: boolean;
}

/**
 * Modal for updating tenant rent.
 */
export function UpdateRentModal({
  open,
  onClose,
  currentRent,
  setRent,
  applyToAll,
  setApplyToAll,
  onSubmit,
  isSubmitting,
}: UpdateRentModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Update Monthly Rent">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="form-control">
          <label className="label"><span className="label-text">New Monthly Rent (₹)</span></label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="input input-bordered w-full"
            value={currentRent}
            onChange={(e) => setRent(e.target.value)}
            required
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={applyToAll}
            onChange={(e) => setApplyToAll(e.target.checked)}
          />
          <span className="label-text">Apply to all tenants</span>
        </label>
        <button
          type="submit"
          className={`btn btn-primary w-full ${isSubmitting ? "btn-disabled" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting && <span className="loading loading-spinner loading-sm"></span>}
          Update Rent
        </button>
      </form>
    </Modal>
  );
}
