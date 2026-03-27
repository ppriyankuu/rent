"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Plus, Trash2 } from "lucide-react";
import type { NewBed } from "@/lib/types";

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string, beds: NewBed[]) => Promise<boolean>;
  isSubmitting: boolean;
}

/**
 * Modal for creating a new room with beds.
 */
export function CreateRoomModal({ open, onClose, onSubmit, isSubmitting }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState("");
  const [roomDesc, setRoomDesc] = useState("");
  const [newBeds, setNewBeds] = useState<NewBed[]>([
    { name: "Bed A", monthlyRent: 5000 },
  ]);

  const addBedField = () => {
    setNewBeds((prev) => [
      ...prev,
      {
        name: `Bed ${String.fromCharCode(65 + prev.length)}`,
        monthlyRent: 5000,
      },
    ]);
  };

  const removeBedField = (index: number) => {
    setNewBeds((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBedField = (
    index: number,
    field: keyof NewBed,
    value: string | number
  ) => {
    setNewBeds((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newBeds.length === 0) return;

    const success = await onSubmit(roomName, roomDesc, newBeds);
    if (success) {
      setRoomName("");
      setRoomDesc("");
      setNewBeds([{ name: "Bed A", monthlyRent: 5000 }]);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Room">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Room Name</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="e.g., Room 101"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
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
            placeholder="e.g., AC Room on first floor"
            value={roomDesc}
            onChange={(e) => setRoomDesc(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-text font-medium">Beds</label>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={addBedField}
            >
              <Plus className="h-3 w-3" /> Add Bed
            </button>
          </div>
          <div className="space-y-2">
            {newBeds.map((bed, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1"
                  placeholder="Bed name"
                  value={bed.name}
                  onChange={(e) => updateBedField(i, "name", e.target.value)}
                  required
                />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="input input-bordered input-sm w-28"
                  placeholder="Rent"
                  value={bed.monthlyRent}
                  onChange={(e) =>
                    updateBedField(i, "monthlyRent", Number(e.target.value))
                  }
                  required
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square"
                  onClick={() => removeBedField(i)}
                  aria-label="Remove bed"
                >
                  <Trash2 className="h-4 w-4 text-error" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className={`btn btn-primary w-full ${isSubmitting ? "btn-disabled" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting && <span className="loading loading-spinner loading-sm"></span>}
          Create Room
        </button>
      </form>
    </Modal>
  );
}
