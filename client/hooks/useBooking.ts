"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import type {
  BookingData,
  Deduction,
  DepositBalance,
  DepositReceipt,
} from "@/lib/types";

interface UseBookingReturn {
  bookingData: BookingData | null;
  deductions: Deduction[];
  depositBalance: DepositBalance | null;
  loading: boolean;
  noBooking: boolean;
  refreshBooking: () => Promise<void>;
  refreshDeductions: () => Promise<void>;
  refreshDepositBalance: () => Promise<void>;
  viewDepositReceipt: () => Promise<DepositReceipt | null>;
  updateMoveInDate: (moveInDate: string) => Promise<boolean>;
  updateMoveOutDate: (expectedMoveOutDate: string) => Promise<boolean>;
  cancelBooking: () => Promise<boolean>;
}

/**
 * Custom hook for managing tenant booking data.
 * Handles fetching booking info, deductions, and deposit balance.
 */
export function useBooking(): UseBookingReturn {
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [depositBalance, setDepositBalance] = useState<DepositBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [noBooking, setNoBooking] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const res = await api.get("/api/bookings/my");
      setBookingData(res.data.data);
      setNoBooking(false);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 404) {
        setNoBooking(true);
      } else {
        toast.error("Failed to load booking data");
      }
    }
  }, []);

  const fetchDeductions = useCallback(async () => {
    try {
      const res = await api.get("/api/bookings/my/deductions");
      setDeductions(res.data.data || []);
    } catch {
      // Ignore errors - deductions are optional
    }
  }, []);

  const fetchDepositBalance = useCallback(async () => {
    try {
      const res = await api.get("/api/bookings/my/deposit-balance");
      setDepositBalance(res.data.data);
    } catch {
      // Ignore errors - balance is optional
    }
  }, []);

  const refreshBooking = useCallback(async () => {
    await fetchBooking();
  }, [fetchBooking]);

  const refreshDeductions = useCallback(async () => {
    await fetchDeductions();
  }, [fetchDeductions]);

  const refreshDepositBalance = useCallback(async () => {
    await fetchDepositBalance();
  }, [fetchDepositBalance]);

  const viewDepositReceipt = useCallback(async (): Promise<DepositReceipt | null> => {
    try {
      const res = await api.get("/api/bookings/my/deposit/receipt");
      return res.data.data;
    } catch {
      toast.error("Failed to load deposit receipt");
      return null;
    }
  }, []);

  const updateMoveInDate = useCallback(async (moveInDate: string): Promise<boolean> => {
    try {
      await api.put("/api/bookings/my/move-in-date", { moveInDate });
      toast.success("Move-in date updated successfully!");
      await fetchBooking();
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to update move-in date");
      return false;
    }
  }, [fetchBooking]);

  const updateMoveOutDate = useCallback(async (expectedMoveOutDate: string): Promise<boolean> => {
    try {
      await api.put("/api/bookings/my/expected-move-out-date", { expectedMoveOutDate });
      toast.success("Expected move-out date updated successfully!");
      await fetchBooking();
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to update move-out date");
      return false;
    }
  }, [fetchBooking]);

  const cancelBooking = useCallback(async (): Promise<boolean> => {
    try {
      await api.post("/api/bookings/my/cancel");
      toast.success("Booking cancelled. You can now book a different bed.");
      setNoBooking(true);
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to cancel booking");
      return false;
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchBooking(),
        fetchDeductions(),
        fetchDepositBalance(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchBooking, fetchDeductions, fetchDepositBalance]);

  return {
    bookingData,
    deductions,
    depositBalance,
    loading,
    noBooking,
    refreshBooking,
    refreshDeductions,
    refreshDepositBalance,
    viewDepositReceipt,
    updateMoveInDate,
    updateMoveOutDate,
    cancelBooking,
  };
}
