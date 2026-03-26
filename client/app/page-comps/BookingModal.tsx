"use client";

import { Modal } from "@/components/Modal";
import type { BED } from "@/lib/types";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  selectedBed: BED | null;
  moveInDate: string;
  setMoveInDate: (date: string) => void;
  deposit: number | null;
  onSubmit: (e: React.SubmitEvent) => void;
}

/**
 * Modal for booking a bed.
 */
export function BookingModal({
  open,
  onClose,
  selectedBed,
  moveInDate,
  setMoveInDate,
  deposit,
  onSubmit,
}: BookingModalProps) {
  if (!selectedBed) return null;

  const displayDeposit = deposit !== null ? deposit : selectedBed.monthlyRent;
  const today = new Date().toISOString().split("T")[0];

  return (
    <Modal open={open} onClose={onClose} title="Select Move-In Date">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="p-4 sm:p-5 bg-base-200 rounded-xl text-sm sm:text-base text-base-content/80 leading-relaxed space-y-3 max-w-2xl mx-auto">
          <p className="text-base-content">
            You&apos;re booking <strong>{selectedBed.name}</strong>.
          </p>

          <p>
            To confirm your booking, you&apos;ll need to pay a security deposit of{" "}
            <strong className="text-base-content">
              ₹{displayDeposit.toLocaleString()}
            </strong>.
          </p>

          <p className="bg-base-100 p-3 rounded-lg">
            This amount will be returned when you move out — it&apos;s yours.
            <br />
            Deductions are only made in case of any damage or if there&apos;s any trouble during your stay.
          </p>

          <p>
            Your first month&apos;s rent will be adjusted based on your move-in date.
          </p>
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Move-In Date</span></label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={moveInDate}
            onChange={(e) => setMoveInDate(e.target.value)}
            min={today}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Proceed to Pay Deposit
        </button>
      </form>
    </Modal>
  );
}
