"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import type { Tenant, TenantDetail, Deduction, DepositBalance } from "@/lib/types";

interface UseTenantsReturn {
  tenants: Tenant[];
  tenantsLoading: boolean;
  tenantDetail: TenantDetail | null;
  detailLoading: boolean;
  deductions: Deduction[];
  depositBalance: DepositBalance | null;
  refreshTenants: () => Promise<void>;
  refreshTenantDetail: (tenantId: string) => Promise<void>;
  createTenant: (data: CreateTenantData) => Promise<boolean>;
  updateRent: (tenantId: string, monthlyRent: number, applyToAll: boolean) => Promise<boolean>;
  deactivateTenant: (tenantId: number) => Promise<boolean>;
  reactivateTenant: (tenantId: number) => Promise<boolean>;
  deleteTenant: (tenantId: number) => Promise<boolean>;
  chargeDeduction: (tenantId: string, amount: number, reason: string) => Promise<boolean>;
  deleteDeduction: (deductionId: number) => Promise<boolean>;
  endBooking: (bookingId: number, data: EndBookingData) => Promise<boolean>;
}

interface CreateTenantData {
  name: string;
  email: string;
  password: string;
  phone: string;
  bedId?: number;
}

interface EndBookingData {
  moveOutDate: string;
  refundAmount: number;
  deductionAmount?: number;
  deductionReason?: string;
}

/**
 * Custom hook for managing tenants (admin).
 */
export function useTenants(): UseTenantsReturn {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [depositBalance, setDepositBalance] = useState<DepositBalance | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/tenants");
      setTenants(res.data?.data?.data || []);
    } catch {
      toast.error("Failed to load tenants");
    } finally {
      setTenantsLoading(false);
    }
  }, []);

  const fetchTenantDetail = useCallback(async (tenantId: string) => {
    setDetailLoading(true);
    try {
      const [tenantRes, deductionsRes, balanceRes] = await Promise.all([
        api.get(`/api/admin/tenants/${tenantId}`),
        api.get(`/api/admin/tenants/${tenantId}/deductions`).catch(() => null),
        api.get(`/api/admin/tenants/${tenantId}/deposit-balance`).catch(() => null),
      ]);
      setTenantDetail(tenantRes.data.data);
      if (deductionsRes?.data?.data) {
        setDeductions(deductionsRes.data.data);
      }
      if (balanceRes?.data?.data) {
        setDepositBalance(balanceRes.data.data);
      }
    } catch {
      toast.error("Failed to load tenant");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshTenants = useCallback(async () => {
    await fetchTenants();
  }, [fetchTenants]);

  const refreshTenantDetail = useCallback(async (tenantId: string) => {
    await fetchTenantDetail(tenantId);
  }, [fetchTenantDetail]);

  const createTenant = useCallback(async (data: CreateTenantData): Promise<boolean> => {
    try {
      await api.post("/api/admin/tenants", data);
      toast.success("Tenant created!");
      await fetchTenants();
      return true;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to create tenant"));
      return false;
    }
  }, [fetchTenants]);

  const updateRent = useCallback(async (tenantId: string, monthlyRent: number, applyToAll: boolean): Promise<boolean> => {
    try {
      await api.put(`/api/admin/tenants/${tenantId}/rent`, { monthlyRent, applyToAll });
      toast.success("Rent updated!");

      // Update the tenantDetail state directly instead of refetching
      setTenantDetail((prev) => {
        if (!prev || !prev.booking) return prev;
        return {
          ...prev,
          booking: {
            ...prev.booking,
            monthlyRent,
          },
        };
      });

      // Also update the tenants list if needed
      setTenants((prev) =>
        prev.map((t) => (t.id === Number(tenantId) ? { ...t, monthlyRent } : t))
      );

      return true;
    } catch {
      toast.error("Failed to update rent");
      return false;
    }
  }, []);

  const deactivateTenant = useCallback(async (tenantId: number): Promise<boolean> => {
    try {
      await api.put(`/api/admin/tenants/${tenantId}/deactivate`);
      toast.success("Tenant deactivated");
      await fetchTenants();
      return true;
    } catch {
      toast.error("Failed to deactivate tenant");
      return false;
    }
  }, [fetchTenants]);

  const reactivateTenant = useCallback(async (tenantId: number): Promise<boolean> => {
    try {
      await api.put(`/api/admin/tenants/${tenantId}/reactivate`);
      toast.success("Tenant reactivated");
      await fetchTenants();
      return true;
    } catch {
      toast.error("Failed to reactivate tenant");
      return false;
    }
  }, [fetchTenants]);

  const deleteTenant = useCallback(async (tenantId: number): Promise<boolean> => {
    try {
      await api.delete(`/api/admin/tenants/${tenantId}`);
      toast.success("Tenant deleted entirely");
      await fetchTenants();
      return true;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to delete tenant"));
      return false;
    }
  }, [fetchTenants]);

  const chargeDeduction = useCallback(async (tenantId: string, amount: number, reason: string): Promise<boolean> => {
    try {
      const res = await api.post(`/api/admin/tenants/${tenantId}/deductions`, { amount, reason });
      const newDeduction = res.data?.data?.deduction as Deduction | undefined;
      const newBalance = res.data?.data?.balance as DepositBalance | undefined;

      // Update deductions list by adding the new deduction
      if (newDeduction) {
        setDeductions((prev) => [newDeduction, ...prev]);
      }

      // Update deposit balance
      if (newBalance) {
        setDepositBalance(newBalance);
      }

      toast.success("Deduction charged successfully");
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to charge deduction");
      return false;
    }
  }, []);

  const deleteDeduction = useCallback(async (deductionId: number): Promise<boolean> => {
    try {
      const res = await api.delete(`/api/admin/deductions/${deductionId}`);
      const newBalance = res.data?.data?.balance as DepositBalance | undefined;

      // Remove the deduction from the list
      setDeductions((prev) => prev.filter((d) => d.id !== deductionId));

      // Update deposit balance
      if (newBalance) {
        setDepositBalance(newBalance);
      }

      toast.success("Deduction reversed successfully");
      return true;
    } catch {
      toast.error("Failed to reverse deduction");
      return false;
    }
  }, []);

  const endBooking = useCallback(async (bookingId: number, data: EndBookingData): Promise<boolean> => {
    try {
      await api.post(`/api/bookings/${bookingId}/end`, data);
      toast.success("Booking ended!");

      // Update the tenantDetail state directly instead of refetching
      setTenantDetail((prev) => {
        if (!prev || !prev.booking) return prev;
        return {
          ...prev,
          booking: {
            ...prev.booking,
            status: "ended",
            moveOutDate: data.moveOutDate,
          },
        };
      });

      // Update deposit balance to reflect the refund
      setDepositBalance((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          remainingBalance: 0,
        };
      });

      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to end booking");
      return false;
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  return {
    tenants,
    tenantsLoading,
    tenantDetail,
    detailLoading,
    deductions,
    depositBalance,
    refreshTenants,
    refreshTenantDetail,
    createTenant,
    updateRent,
    deactivateTenant,
    reactivateTenant,
    deleteTenant,
    chargeDeduction,
    deleteDeduction,
    endBooking,
  };
}

// Import getErrorMessage here to avoid circular dependency
import { getErrorMessage } from "@/lib/errors";
