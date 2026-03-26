"use client";

import { BedCard } from "./HomeBedCard";
import type { Room, BED as BedType } from "@/lib/types";

interface RoomCardProps {
  room: Room;
  bookingBedId: number | null;
  onBookClick: (bed: BedType) => void;
}

/**
 * Room card component for the home page.
 */
export function RoomCard({ room, bookingBedId, onBookClick }: RoomCardProps) {
  return (
    <div key={room.id} className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition-shadow">
      <div className="card-body">
        <h3 className="card-title">{room.name}</h3>
        {room.description && <p className="text-sm text-base-content/60">{room.description}</p>}
        <div className="divider my-2"></div>
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Beds ({room.beds.length})
        </h4>
        <div className="space-y-2">
          {room.beds.map((bed) => (
            <BedCard
              key={bed.id}
              bed={bed}
              isBooking={bookingBedId === bed.id}
              onBook={onBookClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
