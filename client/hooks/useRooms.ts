"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import toast from "react-hot-toast";
import type { Room, NewBed, BedOption, BED } from "@/lib/types";

interface UseRoomsReturn {
  rooms: Room[];
  loading: boolean;
  refreshRooms: () => Promise<void>;
  createRoom: (name: string, description: string, beds: NewBed[]) => Promise<boolean>;
  updateRoom: (roomId: number, name: string, description: string) => Promise<boolean>;
  updateBed: (roomId: number, bedId: number, data: Partial<NewBed>) => Promise<boolean>;
  addBedToRoom: (roomId: number, bed: NewBed) => Promise<{ success: boolean; newBed?: BED }>;
  deleteRoom: (roomId: number) => Promise<boolean>;
  deleteBed: (roomId: number, bedId: number) => Promise<boolean>;
}

/**
 * Custom hook for managing rooms and beds (admin).
 */
export function useRooms(): UseRoomsReturn {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get("/api/rooms");
      setRooms(res.data?.data || []);
    } catch {
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, []);



  const refreshRooms = useCallback(async () => {
    await fetchRooms();
  }, [fetchRooms]);

  const createRoom = useCallback(async (name: string, description: string, beds: NewBed[]): Promise<boolean> => {
    if (beds.length === 0) {
      toast.error("Add at least one bed");
      return false;
    }

    try {
      await api.post("/api/rooms", {
        name,
        description,
        beds: beds.map((b) => ({
          name: b.name,
          monthlyRent: Number(b.monthlyRent),
        })),
      });
      toast.success("Room created!");
      await fetchRooms();
      return true;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to create room"));
      return false;
    }
  }, [fetchRooms]);

  const updateRoom = useCallback(async (roomId: number, name: string, description: string): Promise<boolean> => {
    try {
      await api.put(`/api/rooms/${roomId}`, { name, description });
      toast.success("Room updated successfully!");
      await fetchRooms();
      return true;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update room"));
      return false;
    }
  }, [fetchRooms]);

  const updateBed = useCallback(async (roomId: number, bedId: number, data: Partial<NewBed>): Promise<boolean> => {
    try {
      await api.put(`/api/rooms/${roomId}/beds/${bedId}`, data);
      toast.success("Bed updated!");
      await fetchRooms();
      return true;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update bed"));
      return false;
    }
  }, [fetchRooms]);

  const addBedToRoom = useCallback(async (roomId: number, bed: NewBed): Promise<{ success: boolean; newBed?: BED }> => {
    if (!bed.name || bed.monthlyRent <= 0) {
      toast.error("Enter valid bed details");
      return { success: false };
    }

    try {
      const res = await api.post(`/api/rooms/${roomId}/beds`, bed);
      const newBed = res.data?.data as BED | undefined;
      toast.success("Bed added successfully");
      await fetchRooms();
      return { success: true, newBed };
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to add bed"));
      return { success: false };
    }
  }, [fetchRooms]);

  const deleteRoom = useCallback(async (roomId: number): Promise<boolean> => {
    try {
      await api.delete(`/api/rooms/${roomId}`);
      toast.success("Room deleted successfully!");
      await fetchRooms();
      return true;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to delete room"));
      return false;
    }
  }, [fetchRooms]);

  const deleteBed = useCallback(async (roomId: number, bedId: number): Promise<boolean> => {
    try {
      await api.delete(`/api/rooms/${roomId}/beds/${bedId}`);
      toast.success("Bed deleted successfully");
      await fetchRooms();
      return true;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to delete bed"));
      return false;
    }
  }, [fetchRooms]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return {
    rooms,
    loading,
    refreshRooms,
    createRoom,
    updateRoom,
    updateBed,
    addBedToRoom,
    deleteRoom,
    deleteBed,
  };
}

// Export helper for fetching available beds
export async function fetchAvailableBeds(): Promise<BedOption[]> {
  try {
    const res = await api.get("/api/rooms");
    const rooms = res.data?.data || [];
    const beds: BedOption[] = [];
    for (const room of rooms) {
      for (const bed of room.beds) {
        if (bed.status === "available") {
          beds.push({
            id: bed.id,
            name: bed.name,
            roomName: room.name,
            monthlyRent: bed.monthlyRent,
          });
        }
      }
    }
    return beds;
  } catch {
    return [];
  }
}
