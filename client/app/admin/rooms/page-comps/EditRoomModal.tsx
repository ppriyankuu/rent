"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Trash2 } from "lucide-react";
import type { Room, NewBed } from "@/lib/types";

interface EditRoomModalProps {
  open: boolean;
  onClose: () => void;
  room: Room | null;
  onSave: (roomId: number, name: string, description: string) => Promise<boolean>;
  onUpdateBed: (roomId: number, bedId: number, data: Partial<NewBed>) => Promise<boolean>;
  onAddBed: (roomId: number, bed: NewBed) => Promise<boolean>;
  onDeleteBed: (roomId: number, bedId: number) => void;
  isSaving: boolean;
}

/**
 * Modal for editing room details and beds.
 */
export function EditRoomModal({
  open,
  onClose,
  room,
  onSave,
  onUpdateBed,
  onAddBed,
  onDeleteBed,
  isSaving,
}: EditRoomModalProps) {
  const [newBedForRoom, setNewBedForRoom] = useState<NewBed>({ name: "", monthlyRent: 0 });
  const [localRoom, setLocalRoom] = useState<Room | null>(room);

  useState(() => {
    setLocalRoom(room);
  });

  if (!localRoom) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(localRoom.id, localRoom.name, localRoom.description);
    if (success) {
      onClose();
    }
  };

  const handleAddBed = async () => {
    if (!newBedForRoom.name || newBedForRoom.monthlyRent <= 0) return;

    const success = await onAddBed(localRoom.id, newBedForRoom);
    if (success) {
      setNewBedForRoom({ name: "", monthlyRent: 0 });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Room & Beds">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Room Name</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={localRoom.name}
            onChange={(e) => setLocalRoom(prev => prev ? { ...prev, name: e.target.value } : null)}
            required
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Description</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={localRoom.description}
            onChange={(e) => setLocalRoom(prev => prev ? { ...prev, description: e.target.value } : null)}
          />
        </div>

        <div>
          <label className="label-text font-medium mb-2 block">Beds (Edit details)</label>
          <div className="space-y-2">
            {localRoom.beds.map((bed) => (
              <div key={bed.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1"
                  value={bed.name}
                  onChange={(e) => onUpdateBed(localRoom.id, bed.id, { name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="input input-bordered input-sm w-28"
                  value={bed.monthlyRent}
                  onChange={(e) => onUpdateBed(localRoom.id, bed.id, { monthlyRent: Number(e.target.value) || 0 })}
                  required
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square"
                  onClick={() => onDeleteBed(localRoom.id, bed.id)}
                  title="Delete Bed"
                >
                  <Trash2 className="h-4 w-4 text-error" />
                </button>
              </div>
            ))}
            <div className="mt-4 p-3 rounded-lg bg-base-200/50 space-y-2">
              <p className="text-sm font-medium">Add New Bed</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1"
                  placeholder="Bed name"
                  value={newBedForRoom.name}
                  onChange={(e) => setNewBedForRoom((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="input input-bordered input-sm w-28"
                  placeholder="Rent"
                  value={newBedForRoom.monthlyRent}
                  onChange={(e) =>
                    setNewBedForRoom((prev) => ({
                      ...prev,
                      monthlyRent: Number(e.target.value) || 0,
                    }))
                  }
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleAddBed}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className={`btn btn-primary w-full ${isSaving ? "btn-disabled" : ""}`}
          disabled={isSaving}
        >
          {isSaving && <span className="loading loading-spinner loading-sm"></span>}
          Save Changes
        </button>
      </form>
    </Modal>
  );
}
