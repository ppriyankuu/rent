"use client";

import Link from "next/link";
import { CheckCircle2, CreditCard, Shield } from "lucide-react";
import type { BookingData } from "@/lib/types";

interface RentPaymentSectionProps {
  bookingData: BookingData;
  isActive: boolean;
  onPayRent: () => void;
  onRetryDeposit: () => void;
  onCancelBooking: () => void;
  payingRent: boolean;
  retryingDeposit: boolean;
}

/**
 * Rent payment section component.
 */
export function RentPaymentSection({
  bookingData,
  isActive,
  onPayRent,
  onRetryDeposit,
  onCancelBooking,
  payingRent,
  retryingDeposit,
}: RentPaymentSectionProps) {
  const { booking, deposit } = bookingData;
  const isRentPaid = bookingData.isRentPaid;

  return (
    <>
      {/* Rent Paid Confirmation */}
      {isRentPaid && (booking.status === "active" || booking.status === "deposit_paid") && (
        <div className="card bg-success/10 border border-success/20 mb-6">
          <div className="card-body flex flex-row items-center gap-4 py-4">
            <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
            <div>
              <h3 className="font-bold text-success">Rent Paid for this Month</h3>
              <p className="text-sm text-base-content/60">
                Your rent payment has been received. View your receipt in the{" "}
                <Link href="/dashboard/payments" className="link link-primary">payment history</Link>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pay Rent Button */}
      {isActive && (booking.status === "active" || booking.status === "deposit_paid") && !isRentPaid && (
        <div className="card bg-primary/5 border border-primary/20">
          <div className="card-body flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Pay Monthly Rent
              </h3>
              <p className="text-sm text-base-content/60">
                Pay your rent for the current month online via Razorpay
              </p>
            </div>
            <button
              onClick={onPayRent}
              className={`btn btn-primary w-full sm:w-auto ${payingRent ? "btn-disabled" : ""}`}
              disabled={payingRent}
            >
              {payingRent ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>Pay ₹{bookingData.amountDue.toLocaleString()}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Retry Deposit Button */}
      {isActive && booking.status === "pending_deposit" && deposit && !deposit.paidAt && (
        <div className="card bg-warning/10 border border-warning/30 mb-6">
          <div className="card-body flex flex-col items-start gap-4">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2 text-warning-content">
                <Shield className="h-5 w-5" /> Pending Deposit
              </h3>
              <p className="text-sm text-base-content/80">
                Complete your deposit payment to secure your booking. The bed will be reserved once payment is confirmed.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={onRetryDeposit}
                className={`btn btn-warning w-full ${retryingDeposit ? "btn-disabled" : ""}`}
                disabled={retryingDeposit}
              >
                {retryingDeposit ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>Pay Deposit ₹{deposit.amount.toLocaleString()}</>
                )}
              </button>
              <button
                onClick={onCancelBooking}
                className="btn btn-ghost btn-sm text-error w-full"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
