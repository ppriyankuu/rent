"use client";

import { CheckCircle2, XCircle, Clock } from "lucide-react";
import type { BED } from "@/lib/types";

interface BedStatusBadgeProps {
  status: BED["status"];
}

/**
 * Bed status badge with icon.
 */
export function BedStatusBadge({ status }: BedStatusBadgeProps) {
  switch (status) {
    case "available":
      return (
        <span className="badge badge-success badge-xs gap-1">
          <CheckCircle2 className="h-3 w-3" /> Available
        </span>
      );
    case "occupied":
      return (
        <span className="badge badge-error badge-xs gap-1">
          <XCircle className="h-3 w-3" /> Occupied
        </span>
      );
    case "reserved":
      return (
        <span className="badge badge-warning badge-xs gap-1">
          <Clock className="h-3 w-3" /> Reserved
        </span>
      );
    default:
      return <span className="badge badge-ghost badge-xs">{status}</span>;
  }
}
