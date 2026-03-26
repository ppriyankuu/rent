"use client";

import { Modal } from "@/components/Modal";

interface MoveOutDateModalProps {
  open: boolean;
  onClose: () => void;
  moveOutDate: string;
  setMoveOutDate: (date: string) => void;
  onSubmit: (e: React.SubmitEvent) => void;
  isSubmitting: boolean;
}

/**
 * Modal for updating expected move-out date.
 */
export function MoveOutDateModal({
  open,
  onClose,
  moveOutDate,
  setMoveOutDate,
  onSubmit,
  isSubmitting,
}: MoveOutDateModalProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <Modal open={open} onClose={onClose} title="Update Expected Move-Out Date">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="p-3 bg-base-200 rounded text-sm text-base-content/70">
          This helps others know when your bed might become available. You can update this date anytime.
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Expected Move-Out Date</span></label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={moveOutDate}
            onChange={(e) => setMoveOutDate(e.target.value)}
            min={today}
            required
          />
        </div>
        <button
          type="submit"
          className={`btn btn-primary w-full ${isSubmitting ? "btn-disabled" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            "Update Date"
          )}
        </button>
      </form>
    </Modal>
  );
}
