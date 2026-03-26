"use client";

import { StatCard } from "@/components/StatCard";
import { Edit2, LogOut, CalendarDays, IndianRupee, Shield, Receipt } from "lucide-react";
import { formatStatus } from "@/lib/formatStatus";
import { formatDate, getRelativeDateDescription } from "@/lib/utils/date";
import type { BookingData } from "@/lib/types";

interface DashboardStatsProps {
  bookingData: BookingData;
  onEditMoveInDate: () => void;
  onEditMoveOutDate: () => void;
  onViewDepositReceipt: () => void;
}

/**
 * Dashboard statistics cards component.
 */
export function DashboardStats({
  bookingData,
  onEditMoveInDate,
  onEditMoveOutDate,
  onViewDepositReceipt,
}: DashboardStatsProps) {
  const { booking, bed, deposit } = bookingData;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
      <StatCard
        label="Monthly Rent"
        value={`₹${booking.monthlyRent.toLocaleString()}`}
        icon={IndianRupee}
      />
      <StatCard
        label="Move-in Date"
        value={
          <div className="flex items-center gap-2">
            <span>{formatDate(booking.moveInDate)}</span>
            {bed.status !== "occupied" && (
              <button
                className="btn btn-ghost btn-xs btn-square"
                onClick={onEditMoveInDate}
                title="Edit Move-In Date"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            )}
          </div>
        }
        icon={CalendarDays}
      />
      <StatCard
        label="Expected Move-Out Date"
        value={
          <div className="flex items-center gap-2">
            <span>
              {booking.expectedMoveOutDate
                ? formatDate(booking.expectedMoveOutDate)
                : "Not set"}
            </span>
            {bed.status === "occupied" && (
              <button
                className="btn btn-ghost btn-xs btn-square"
                onClick={onEditMoveOutDate}
                title="Edit Expected Move-Out Date"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            )}
          </div>
        }
        icon={LogOut}
        description={
          !booking.expectedMoveOutDate
            ? "Please set your move-out date"
            : getRelativeDateDescription(booking.expectedMoveOutDate)
        }
        className={
          !booking.expectedMoveOutDate
            ? "border-warning border-2"
            : getRelativeDateDescription(booking.expectedMoveOutDate) === "Past due!"
              ? "border-error border-2"
              : ""
        }
      />
      <StatCard
        label="Deposit"
        value={
          <div className="flex items-center gap-2">
            <span>{deposit ? `₹${deposit.amount.toLocaleString()}` : "N/A"}</span>
            {deposit && deposit.paidAt && (
              <button
                className="btn btn-ghost btn-xs btn-square"
                onClick={onViewDepositReceipt}
                title="View Receipt"
              >
                <Receipt className="h-3 w-3" />
              </button>
            )}
          </div>
        }
        icon={Shield}
        description={deposit?.status ? formatStatus(deposit.status) : ""}
      />
    </div>
  );
}
