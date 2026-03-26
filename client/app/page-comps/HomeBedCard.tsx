"use client";

import { Info } from "lucide-react";
import { formatDateShort } from "@/lib/utils/date";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { BED } from "@/lib/types";

interface BedCardProps {
  bed: BED;

  isBooking: boolean;
  onBook: (bed: BED) => void;
}

/**
 * Bed card component for the home page.
 */
export function BedCard({ bed, isBooking, onBook }: BedCardProps) {
  return (
    <div key={bed.id} className="flex items-center justify-between p-3 rounded-lg bg-base-200/50 border border-base-200">
      <div>
        <span className="font-medium text-sm">{bed.name}</span>
        <div className="flex items-center gap-2 mt-1">
          <StatusBadge status={bed.status} />
          <span className="text-xs text-base-content/50">₹{bed.monthlyRent.toLocaleString()}/mo</span>
        </div>
        {bed.status === "occupied" && bed.expectedMoveOutDate && (
          <div className="text-xs text-base-content/70 mt-1 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Expected release: {formatDateShort(bed.expectedMoveOutDate)}
          </div>
        )}
        {bed.status === "occupied" && !bed.expectedMoveOutDate && (
          <div className="text-xs text-base-content/50 mt-1">
            No move-out date set
          </div>
        )}
      </div>
      {bed.status === "available" && (
        <button
          className={`btn btn-primary btn-sm ${isBooking ? "btn-disabled" : ""}`}
          onClick={() => onBook(bed)}
          disabled={isBooking}
        >
          {isBooking ? <span className="loading loading-spinner loading-xs"></span> : "Book"}
        </button>
      )}
    </div>
  );
}
