"use client";

import { Modal } from "@/components/Modal";

interface MoveInDateModalProps {
  open: boolean;
  onClose: () => void;
  moveInDate: string;
  setMoveInDate: (date: string) => void;
  onSubmit: (e: React.SubmitEvent) => void;
  isSubmitting: boolean;
}

/**
 * Modal for updating move-in date.
 */
export function MoveInDateModal({
  open,
  onClose,
  moveInDate,
  setMoveInDate,
  onSubmit,
  isSubmitting,
}: MoveInDateModalProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <Modal open={open} onClose={onClose} title="Update Move-In Date">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="p-3 bg-base-200 rounded text-sm text-base-content/70">
          You can change your move-in date before you pay the first month&apos;s rent.
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">New Move-In Date</span></label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={moveInDate}
            onChange={(e) => setMoveInDate(e.target.value)}
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
