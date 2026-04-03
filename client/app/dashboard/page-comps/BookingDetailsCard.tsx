"use client";

import { MapPin, CalendarDays } from "lucide-react";
import { formatDateLong } from "@/lib/utils/date";
import { formatOrdinal } from "@/lib/utils/ordinal";
import { formatStatus } from "@/lib/formatStatus";
import type { BookingData } from "@/lib/types";

interface BookingDetailsProps {
  bookingData: BookingData;
}

/**
 * Booking details card component.
 */
export function BookingDetailsCard({ bookingData }: BookingDetailsProps) {
  const { booking, bed, room, settings } = bookingData;

  return (
    <div className="card bg-base-100 shadow-md border border-base-200 mb-6 hover:shadow-lg transition-shadow">
      <div className="card-body">
        <h2 className="card-title text-lg">Booking Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <div>
            <p className="text-sm text-base-content/60">Status</p>
            <p className="font-medium">{formatStatus(booking.status)}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/60">Next Rent Due</p>
            <p className="font-medium">{formatDateLong(booking.nextRentDueDate)}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/60">Room & Bed</p>
            <p className="font-medium flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {room ? `${room.name} - ` : ""}{bed.name}
            </p>
          </div>
          <div>
            <p className="text-sm text-base-content/60">Monthly Rent</p>
            <p className="font-medium">₹{booking.monthlyRent.toLocaleString()}</p>
          </div>
        </div>

        <div className="divider my-4"></div>

        <div className="bg-base-200/50 p-4 rounded-lg space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-base-content/80">
            <CalendarDays className="h-4 w-4" /> Payment Window & Late Fee
          </h3>
          <p className="text-sm text-base-content/70">
            Rent can be paid between the{" "}
            <strong>{formatOrdinal(Number(settings.rent_due_start_day))}</strong> and{" "}
            <strong>{formatOrdinal(Number(settings.rent_due_end_day))}</strong> of every month.
          </p>
          <p className="text-sm text-error/80">
            A late fee of <strong>₹{settings.late_fee_amount}</strong> will be applied if payment is made after the{" "}
            {formatOrdinal(Number(settings.rent_due_end_day))}.
          </p>
        </div>
      </div>
    </div>
  );
}
