"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import toast from "react-hot-toast";
import type { Complaint } from "@/lib/types";

interface UseComplaintsReturn {
  complaints: Complaint[];
  loading: boolean;
  refreshComplaints: () => Promise<void>;
  submitComplaint: (subject: string, message: string) => Promise<boolean>;
  updateComplaint: (id: number, status: string, adminReply: string) => Promise<boolean>;
}

/**
 * Custom hook for managing complaints.
 */
export function useComplaints(): UseComplaintsReturn {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComplaints = useCallback(async () => {
    try {
      const res = await api.get("/api/complaints/my");
      setComplaints(res.data?.data || []);
    } catch {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdminComplaints = useCallback(async () => {
    try {
      const res = await api.get("/api/complaints");
      setComplaints(res.data?.data?.data || []);
    } catch {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshComplaints = useCallback(async () => {
    setLoading(true);
    await fetchComplaints();
  }, [fetchComplaints]);

  const submitComplaint = useCallback(async (subject: string, message: string): Promise<boolean> => {
    try {
      await api.post("/api/complaints", {
        subject: subject.trim(),
        message: message.trim(),
      });
      toast.success("Complaint submitted");
      await fetchComplaints();
      return true;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to submit complaint"));
      return false;
    }
  }, [fetchComplaints]);

  const updateComplaint = useCallback(async (id: number, status: string, adminReply: string): Promise<boolean> => {
    try {
      await api.put(`/api/complaints/${id}`, { status, adminReply });
      toast.success("Complaint updated!");
      await fetchAdminComplaints();
      return true;
    } catch {
      toast.error("Failed to update complaint");
      return false;
    }
  }, [fetchAdminComplaints]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  return {
    complaints,
    loading,
    refreshComplaints,
    submitComplaint,
    updateComplaint,
  };
}

/**
 * Custom hook for managing complaints (admin view).
 */
export function useAdminComplaints(): Omit<UseComplaintsReturn, "submitComplaint"> {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComplaints = useCallback(async () => {
    try {
      const res = await api.get("/api/complaints");
      setComplaints(res.data?.data?.data || []);
    } catch {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshComplaints = useCallback(async () => {
    setLoading(true);
    await fetchComplaints();
  }, [fetchComplaints]);

  const updateComplaint = useCallback(async (id: number, status: string, adminReply: string): Promise<boolean> => {
    try {
      await api.put(`/api/complaints/${id}`, { status, adminReply });
      toast.success("Complaint updated!");
      await fetchComplaints();
      return true;
    } catch {
      toast.error("Failed to update complaint");
      return false;
    }
  }, [fetchComplaints]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  return {
    complaints,
    loading,
    refreshComplaints,
    updateComplaint,
  };
}
