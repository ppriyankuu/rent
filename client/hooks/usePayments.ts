"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { Payment, PaymentReceipt } from "@/lib/types";

interface UsePaymentsReturn {
  payments: Payment[];
  loading: boolean;
  refreshPayments: () => Promise<void>;
  viewReceipt: (paymentId: number) => Promise<PaymentReceipt | null>;
  initiatePayment: (rentMonth: string) => Promise<{
    razorpayOrderId: string;
    razorpayKeyId: string;
    amount: number;
  } | null>;
  verifyPayment: (
    paymentData: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
    rentMonth: string
  ) => Promise<boolean>;
  recordManualPayment: (data: {
    tenantId: number;
    amount: number;
    rentMonth: string;
    notes?: string;
  }) => Promise<boolean>;
}

/**
 * Custom hook for managing payments.
 */
export function usePayments(): UsePaymentsReturn {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await api.get("/api/payments/my");
      setPayments(res.data?.data || []);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPayments = useCallback(async () => {
    setLoading(true);
    await fetchPayments();
  }, [fetchPayments]);

  const viewReceipt = useCallback(async (paymentId: number): Promise<PaymentReceipt | null> => {
    try {
      const res = await api.get(`/api/payments/my/${paymentId}/receipt`);
      return res.data.data;
    } catch {
      toast.error("Failed to load receipt");
      return null;
    }
  }, []);

  const initiatePayment = useCallback(async (rentMonth: string): Promise<{
    razorpayOrderId: string;
    razorpayKeyId: string;
    amount: number;
  } | null> => {
    try {
      const res = await api.post("/api/payments/initiate", { rentMonth });
      return res.data.data;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to initiate payment"));
      return null;
    }
  }, []);

  const verifyPayment = useCallback(async (
    paymentData: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
    rentMonth: string
  ): Promise<boolean> => {
    try {
      await api.post("/api/payments/verify", { ...paymentData, rentMonth });
      toast.success("Rent paid successfully!");
      return true;
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Payment failed");
      if (msg !== "Payment cancelled by user") {
        toast.error(msg);
      }
      return false;
    }
  }, []);

  const recordManualPayment = useCallback(async (data: {
    tenantId: number;
    amount: number;
    rentMonth: string;
    notes?: string;
  }): Promise<boolean> => {
    try {
      await api.post("/api/payments/manual", data);
      toast.success("Manual payment recorded!");
      return true;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to record payment"));
      return false;
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    payments,
    loading,
    refreshPayments,
    viewReceipt,
    initiatePayment,
    verifyPayment,
    recordManualPayment,
  };
}

// Import toast here to avoid circular dependency
import toast from "react-hot-toast";
