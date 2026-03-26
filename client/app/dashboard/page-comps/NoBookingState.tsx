"use client";

import Link from "next/link";
import { Bed } from "lucide-react";

/**
 * Empty state shown when user has no active booking.
 */
export function NoBookingState() {
  return (
    <div className="text-center py-16">
      <Bed className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
      <h2 className="text-2xl font-bold mb-2">No Active Booking</h2>
      <p className="text-base-content/60 mb-6">
        You don&apos;t have an active booking yet. Browse available rooms to get
        started.
      </p>
      <Link href="/" className="btn btn-primary">
        Browse Rooms
      </Link>
    </div>
  );
}
