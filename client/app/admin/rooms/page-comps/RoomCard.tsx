"use client";

import { Trash2 } from "lucide-react";
import { BedStatusBadge } from "./BedStatusBadge";
import type { Room } from "@/lib/types";

interface RoomCardProps {
  room: Room;
  onEdit: (room: Room) => void;
  onDelete: (roomId: number) => void;
}

/**
 * Room card component displaying room info and beds.
 */
export function RoomCard({ room, onEdit, onDelete }: RoomCardProps) {
  return (
    <div className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition-shadow">
      <div className="card-body p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="card-title text-lg m-0">{room.name}</h3>
          <div className="flex gap-1">
            <button
              className="btn btn-ghost btn-xs text-error px-2"
              onClick={() => onDelete(room.id)}
              title="Delete Room"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button className="btn btn-ghost btn-xs" onClick={() => onEdit(room)}>
              Edit
            </button>
          </div>
        </div>
        {room.description && (
          <p className="text-sm text-base-content/60">{room.description}</p>
        )}
        <div className="divider my-1"></div>
        <div className="space-y-2">
          {room.beds.map((bed) => (
            <div
              key={bed.id}
              className="flex items-center justify-between p-2 rounded-lg bg-base-200/50"
            >
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-sm font-medium">{bed.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-base-content/50">
                  ₹{bed.monthlyRent.toLocaleString()}/mo
                </span>
                <BedStatusBadge status={bed.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
