"use client";

import { Bed, IndianRupee } from "lucide-react";
import { formatDate } from "@/lib/utils/date";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { Booking, BED as BedType } from "@/lib/types";

interface BookingInfoCardProps {
  booking: Booking;
  bed: BedType | null;
  onUpdateRent: () => void;
  onEndBooking: () => void;
  canEndBooking: boolean;
}

/**
 * Booking information card with actions.
 */
export function BookingInfoCard({
  booking,
  bed,
  onUpdateRent,
  onEndBooking,
  canEndBooking,
}: BookingInfoCardProps) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200 mb-6 hover:shadow-md transition-shadow">
      <div className="card-body p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Bed className="h-5 w-5" /> Booking
          </h2>
          <div className="flex gap-2">
            {booking.status !== "ended" && (
              <button
                className="btn btn-outline btn-sm"
                onClick={onUpdateRent}
              >
                <IndianRupee className="h-3 w-3" /> Update Rent
              </button>
            )}
            {canEndBooking && (
              <button
                className="btn btn-error btn-sm btn-outline"
                onClick={onEndBooking}
              >
                End Booking
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-base-content/60">Status</p>
            <StatusBadge status={booking.status} />
          </div>
          <div>
            <p className="text-base-content/60">Bed</p>
            <p className="font-medium">{bed?.name || "—"}</p>
          </div>
          <div>
            <p className="text-base-content/60">Monthly Rent</p>
            <p className="font-medium">₹{booking.monthlyRent.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-base-content/60">Move-in</p>
            <p className="font-medium">{formatDate(booking.moveInDate)}</p>
          </div>
          <div>
            <p className="text-base-content/60">Expected Move-Out</p>
            <p className="font-medium">
              {booking.expectedMoveOutDate
                ? formatDate(booking.expectedMoveOutDate)
                : "Not set"}
            </p>
          </div>
          <div>
            <p className="text-base-content/60">Next Rent Due</p>
            <p className="font-medium">{formatDate(booking.nextRentDueDate)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
