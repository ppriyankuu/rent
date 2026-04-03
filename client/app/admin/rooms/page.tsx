"use client";

import { useState } from "react";
import { Home, Plus } from "lucide-react";
import { useRooms } from "@/hooks/useRooms";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { RoomCard } from "./page-comps/RoomCard";
import { CreateRoomModal } from "./page-comps/CreateRoomModal";
import { EditRoomModal } from "./page-comps/EditRoomModal";
import type { Room, NewBed, BED } from "@/lib/types";

export default function AdminRoomsPage() {
  const {
    rooms,
    loading,
    createRoom,
    updateRoom,
    updateBed,
    addBedToRoom,
    deleteRoom,
    deleteBed,
  } = useRooms();

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Confirmation states
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState<{
    isOpen: boolean;
    roomId: number | null;
  }>({ isOpen: false, roomId: null });

  const [confirmDeleteBed, setConfirmDeleteBed] = useState<{
    isOpen: boolean;
    roomId: number | null;
    bedId: number | null;
  }>({ isOpen: false, roomId: null, bedId: null });

  const [deleting, setDeleting] = useState(false);

  const handleCreateRoom = async (name: string, description: string, beds: NewBed[]) => {
    setSubmitting(true);
    const success = await createRoom(name, description, beds);
    if (success) {
      setCreateModalOpen(false);
    }
    setSubmitting(false);
    return success;
  };

  const handleEditClick = (room: Room) => {
    setEditingRoom(room);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (roomId: number, name: string, description: string) => {
    setSavingEdit(true);
    const success = await updateRoom(roomId, name, description);
    if (success) {
      setEditModalOpen(false);
      setEditingRoom(null);
    }
    setSavingEdit(false);
    return success;
  };

  const handleUpdateBed = async (roomId: number, bedId: number, data: Partial<NewBed>, silent?: boolean) => {
    return await updateBed(roomId, bedId, data, silent);
  };

  const handleAddBedToRoom = async (roomId: number, bed: NewBed) => {
    const result = await addBedToRoom(roomId, bed);
    if (result.success && result.newBed && editingRoom && roomId === editingRoom.id) {
      // Add the new bed to editingRoom instantly (modal stays open and updates)
      setEditingRoom(prev => {
        if (!prev || prev.id !== roomId) return prev;
        return {
          ...prev,
          beds: [...prev.beds, result.newBed as BED]
        };
      });
    }
    return result.success;
  };

  const confirmDeleteRoomAction = async () => {
    if (!confirmDeleteRoom.roomId) return;
    setDeleting(true);
    const success = await deleteRoom(confirmDeleteRoom.roomId);
    if (success) {
      setConfirmDeleteRoom({ isOpen: false, roomId: null });
    }
    setDeleting(false);
  };

  const confirmDeleteBedAction = async () => {
    if (!confirmDeleteBed.roomId || !confirmDeleteBed.bedId) return;
    const success = await deleteBed(confirmDeleteBed.roomId, confirmDeleteBed.bedId);
    if (success) {
      // Update editingRoom to remove the deleted bed instantly (modal stays open)
      setEditingRoom(prev => {
        if (!prev || prev.id !== confirmDeleteBed.roomId) return prev;
        return {
          ...prev,
          beds: prev.beds.filter(b => b.id !== confirmDeleteBed.bedId)
        };
      });
      setConfirmDeleteBed({ isOpen: false, roomId: null, bedId: null });
    }
  };

  if (loading) return <LoadingSpinner text="Loading rooms..." />;

  return (
    <div>
      <PageHeader
        title="Rooms & Beds"
        icon={Home}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4" /> Create Room
          </button>
        }
      />

      {rooms.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No rooms yet"
          description="Create your first room to get started"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onEdit={handleEditClick}
              onDelete={(roomId) => setConfirmDeleteRoom({ isOpen: true, roomId })}
            />
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      <CreateRoomModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateRoom}
        isSubmitting={submitting}
      />

      {/* Edit Room Modal */}
      <EditRoomModal
        key={editingRoom?.id}
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingRoom(null);
        }}
        room={editingRoom}
        onSave={handleSaveEdit}
        onUpdateBed={handleUpdateBed}
        onAddBed={handleAddBedToRoom}
        onDeleteBed={(roomId, bedId) => setConfirmDeleteBed({ isOpen: true, roomId, bedId })}
        isSaving={savingEdit}
      />

      {/* Delete Room Confirmation */}
      <ConfirmModal
        isOpen={confirmDeleteRoom.isOpen}
        onClose={() => setConfirmDeleteRoom({ isOpen: false, roomId: null })}
        onConfirm={confirmDeleteRoomAction}
        title="Delete Room"
        message="Are you sure you want to completely delete this room and all its beds? This cannot be undone."
        confirmText="Yes, Delete"
        variant="danger"
        isLoading={deleting}
      />

      {/* Delete Bed Confirmation */}
      <ConfirmModal
        isOpen={confirmDeleteBed.isOpen}
        onClose={() => setConfirmDeleteBed({ isOpen: false, roomId: null, bedId: null })}
        onConfirm={confirmDeleteBedAction}
        title="Delete Bed"
        message="Are you sure you want to delete this bed? This cannot be undone."
        confirmText="Yes, Delete"
        variant="danger"
      />
    </div>
  );
}
