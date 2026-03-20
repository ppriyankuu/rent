"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  User,
  Bed,
  CreditCard,
  IndianRupee,
  CalendarDays,
  Shield,
  MessageSquare,
  DollarSign,
  Trash2,
  Plus,
} from "lucide-react";

interface TenantDetail {
  tenant: {
    id: number;
    name: string;
    email: string;
    phone: string;
    isActive: boolean;
    createdAt: string;
  };
  booking: {
    id: number;
    status: string;
    monthlyRent: number;
    moveInDate: string;
    moveOutDate: string | null;
    nextRentDueDate: string;
  } | null;
  bed: {
    id: number;
    name: string;
    status: string;
    monthlyRent: number;
    roomId: number;
  } | null;
  deposit: {
    id: number;
    amount: number;
    status: string;
    paidAt: string | null;
    refundAmount: number | null;
    deductionAmount: number | null;
  } | null;
  payments: Array<{
    id: number;
    amount: number;
    type: string;
    status: string;
    rentMonth: string;
    lateFee: number;
    paidAt: string | null;
  }>;
  complaints: Array<{
    id: number;
    subject: string;
    status: string;
    createdAt: string;
  }>;
}

interface Deduction {
  id: number;
  depositId: number;
  tenantId: number;
  bookingId: number;
  amount: number;
  reason: string;
  deductedBy: number;
  createdAt: string;
  adminName: string;
  adminEmail: string;
}

interface DepositBalance {
  originalAmount: number;
  totalDeducted: number;
  remainingBalance: number;
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [data, setData] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [depositBalance, setDepositBalance] = useState<DepositBalance | null>(null);

  // Update rent modal
  const [rentModalOpen, setRentModalOpen] = useState(false);
  const [newRent, setNewRent] = useState("");
  const [applyToAll, setApplyToAll] = useState(false);
  const [updatingRent, setUpdatingRent] = useState(false);

  // End booking modal
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [endForm, setEndForm] = useState({
    moveOutDate: new Date().toISOString().slice(0, 10),
    refundAmount: 0,
    deductionAmount: 0,
    deductionReason: "",
  });
  const [endingBooking, setEndingBooking] = useState(false);

  // Deduction modal
  const [deductionModalOpen, setDeductionModalOpen] = useState(false);
  const [deductionForm, setDeductionForm] = useState({
    amount: "",
    reason: "",
  });
  const [chargingDeduction, setChargingDeduction] = useState(false);

  // Delete deduction confirmation
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    deductionId: number | null;
  }>({
    isOpen: false,
    deductionId: null,
  });

  useEffect(() => {
    fetchTenant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const fetchTenant = async () => {
    try {
      const [tenantRes, deductionsRes, balanceRes] = await Promise.all([
        api.get(`/api/admin/tenants/${tenantId}`),
        api.get(`/api/admin/tenants/${tenantId}/deductions`).catch(() => null),
        api.get(`/api/admin/tenants/${tenantId}/deposit-balance`).catch(() => null),
      ]);
      setData(tenantRes.data.data);
      if (tenantRes.data.data.booking) {
        setNewRent(tenantRes.data.data.booking.monthlyRent.toString());
      }
      if (tenantRes.data.data.deposit) {
        setEndForm((f) => ({
          ...f,
          refundAmount: tenantRes.data.data.deposit.amount,
        }));
      }
      if (deductionsRes?.data?.data) {
        setDeductions(deductionsRes.data.data);
      }
      if (balanceRes?.data?.data) {
        setDepositBalance(balanceRes.data.data);
        // Update refund amount to reflect remaining balance
        setEndForm((f) => ({
          ...f,
          refundAmount: balanceRes.data.data.remainingBalance,
        }));
      }
    } catch {
      toast.error("Failed to load tenant");
    } finally {
      setLoading(false);
    }
  };

  const handleChargeDeduction = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!deductionForm.amount || !deductionForm.reason) return;

    setChargingDeduction(true);
    try {
      const res = await api.post(`/api/admin/tenants/${tenantId}/deductions`, {
        amount: Number(deductionForm.amount),
        reason: deductionForm.reason,
      });

      toast.success("Deduction charged successfully");
      setDeductionModalOpen(false);
      setDeductionForm({ amount: "", reason: "" });
      fetchTenant();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to charge deduction");
    } finally {
      setChargingDeduction(false);
    }
  };

  const handleDeleteDeduction = async () => {
    if (!deleteConfirmModal.deductionId) return;

    try {
      await api.delete(`/api/admin/deductions/${deleteConfirmModal.deductionId}`);
      toast.success("Deduction reversed successfully");
      setDeleteConfirmModal({ isOpen: false, deductionId: null });
      fetchTenant();
    } catch {
      toast.error("Failed to reverse deduction");
    }
  };

  const handleUpdateRent = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setUpdatingRent(true);
    try {
      await api.put(`/api/admin/tenants/${tenantId}/rent`, {
        monthlyRent: Number(newRent),
        applyToAll,
      });
      toast.success("Rent updated!");
      setRentModalOpen(false);
      fetchTenant();
    } catch {
      toast.error("Failed to update rent");
    } finally {
      setUpdatingRent(false);
    }
  };

  const handleEndBooking = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!data?.booking) return;
    setEndingBooking(true);
    try {
      const finalDeduction = Number(endForm.deductionAmount);
      let refundAmount = Number(endForm.refundAmount);

      // If admin wants to deduct at end, create deduction first
      if (finalDeduction > 0 && endForm.deductionReason?.trim()) {
        await api.post(`/api/admin/tenants/${tenantId}/deductions`, {
          amount: finalDeduction,
          reason: endForm.deductionReason.trim(),
        });
        // After deduction, refund is remaining balance
        refundAmount = (depositBalance?.remainingBalance || 0) - finalDeduction;
      }

      await api.post(`/api/bookings/${data.booking.id}/end`, {
        moveOutDate: endForm.moveOutDate,
        refundAmount,
        deductionAmount: 0, // Already handled via deduction endpoint
        deductionReason: undefined,
      });
      toast.success("Booking ended!");
      setEndModalOpen(false);
      fetchTenant();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to end booking");
    } finally {
      setEndingBooking(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading tenant..." />;
  if (!data) return <p>Tenant not found</p>;

  const { tenant, booking, bed, deposit, payments, complaints } = data;

  return (
    <div>
      <button
        className="btn btn-ghost btn-sm mb-4"
        onClick={() => router.push("/admin/tenants")}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Tenants
      </button>

      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <User className="h-6 w-6" /> {tenant.name}
      </h1>

      {/* Profile Info */}
      <div className="card bg-base-100 shadow-sm border border-base-200 mb-6 hover:shadow-md transition-shadow">
        <div className="card-body p-5">
          <h2 className="font-bold text-lg mb-3">Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-base-content/60">Email</p>
              <p className="font-medium">{tenant.email}</p>
            </div>
            <div>
              <p className="text-base-content/60">Phone</p>
              <p className="font-medium">{tenant.phone || "—"}</p>
            </div>
            <div>
              <p className="text-base-content/60">Status</p>
              <span
                className={`badge ${tenant.isActive ? "badge-success" : "badge-error"} badge-sm`}
              >
                {tenant.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div>
              <p className="text-base-content/60">Joined</p>
              <p className="font-medium">
                {new Date(tenant.createdAt).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Info */}
      {booking ? (
        <div className="card bg-base-100 shadow-sm border border-base-200 mb-6 hover:shadow-md transition-shadow">
          <div className="card-body p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Bed className="h-5 w-5" /> Booking
              </h2>
              <div className="flex gap-2">
                {booking.status !== "ended" && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setRentModalOpen(true)}
                  >
                    <IndianRupee className="h-3 w-3" /> Update Rent
                  </button>
                )}
                {booking.status === "active" && (
                  <button
                    className="btn btn-error btn-sm btn-outline"
                    onClick={() => setEndModalOpen(true)}
                  >
                    End Booking
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-base-content/60">Status</p>
                <span className={`badge badge-sm ${booking.status === "active" ? "badge-success" : booking.status === "ended" ? "badge-error" : "badge-warning"}`}>
                  {booking.status}
                </span>
              </div>
              <div>
                <p className="text-base-content/60">Bed</p>
                <p className="font-medium">{bed?.name || "—"}</p>
              </div>
              <div>
                <p className="text-base-content/60">Monthly Rent</p>
                <p className="font-medium">₹{booking.monthlyRent.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-base-content/60">Move-in</p>
                <p className="font-medium">
                  {new Date(booking.moveInDate).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-base-content/60">Next Rent Due</p>
                <p className="font-medium">
                  {new Date(booking.nextRentDueDate).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="alert mb-6">
          <span>No active booking for this tenant.</span>
        </div>
      )}

      {/* Deposit Info */}
      {deposit && (
        <div className="card bg-base-100 shadow-sm border border-base-200 mb-6">
          <div className="card-body p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" /> Deposit
              </h2>
              {booking && booking.status !== "ended" && depositBalance && depositBalance.remainingBalance > 0 && (
                <button
                  className="btn btn-error btn-sm btn-outline"
                  onClick={() => setDeductionModalOpen(true)}
                >
                  <DollarSign className="h-3 w-3" /> Charge Fine/Deduction
                </button>
              )}
            </div>
            {depositBalance ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
                <div>
                  <p className="text-base-content/60">Original Amount</p>
                  <p className="font-medium">₹{depositBalance.originalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-base-content/60">Total Deducted</p>
                  <p className="font-medium text-error">₹{depositBalance.totalDeducted.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-base-content/60">Remaining Balance</p>
                  <p className="font-medium text-success">₹{depositBalance.remainingBalance.toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
                <div>
                  <p className="text-base-content/60">Amount</p>
                  <p className="font-medium">₹{deposit.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-base-content/60">Status</p>
                  <span className="badge badge-sm badge-outline">{deposit.status}</span>
                </div>
                <div>
                  <p className="text-base-content/60">Paid</p>
                  <p className="font-medium">
                    {deposit.paidAt
                      ? new Date(deposit.paidAt).toLocaleDateString("en-IN")
                      : "Not yet"}
                  </p>
                </div>
              </div>
            )}

            {/* Deductions History */}
            {deductions.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Deduction History ({deductions.length})
                </h3>
                <div className="overflow-x-auto">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Reason</th>
                          <th>Charged By</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deductions.map((d) => (
                          <tr key={d.id}>
                            <td className="text-xs">
                              {new Date(d.createdAt).toLocaleDateString("en-IN")}
                            </td>
                            <td className="font-medium text-error">₹{d.amount.toLocaleString()}</td>
                            <td className="text-sm">{d.reason}</td>
                            <td className="text-xs">
                              {d.adminName || `Admin #${d.deductedBy}`}
                            </td>
                            <td>
                              <button
                                className="btn btn-ghost btn-xs text-error"
                                onClick={() => setDeleteConfirmModal({ isOpen: true, deductionId: d.id })}
                                title="Reverse Deduction"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="card bg-base-100 shadow-sm border border-base-200 mb-6">
        <div className="card-body p-5">
          <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
            <CreditCard className="h-5 w-5" /> Payments ({payments.length})
          </h2>
          {payments.length === 0 ? (
            <p className="text-sm text-base-content/60">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-64 overflow-y-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Amount</th>
                      <th>Late Fee</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.rentMonth}</td>
                        <td>₹{p.amount.toLocaleString()}</td>
                        <td>{p.lateFee > 0 ? `₹${p.lateFee}` : "—"}</td>
                        <td><span className="badge badge-outline badge-xs">{p.type}</span></td>
                        <td>
                          <span className={`badge badge-xs ${p.status === "completed" ? "badge-success" : p.status === "pending" ? "badge-warning" : "badge-error"}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="text-xs">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Complaints */}
      <div className="card bg-base-100 shadow-sm border border-base-200 mb-6">
        <div className="card-body p-5">
          <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
            <MessageSquare className="h-5 w-5" /> Complaints ({complaints.length})
          </h2>
          {complaints.length === 0 ? (
            <p className="text-sm text-base-content/60">No complaints.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {complaints.map((c) => (
                  <div key={c.id} className="flex justify-between items-center p-2 bg-base-200/50 rounded">
                    <span className="text-sm">{c.subject}</span>
                    <span className={`badge badge-xs ${c.status === "resolved" ? "badge-success" : c.status === "in_progress" ? "badge-info" : "badge-warning"}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Update Rent Modal */}
      <Modal open={rentModalOpen} onClose={() => setRentModalOpen(false)} title="Update Monthly Rent">
        <form onSubmit={handleUpdateRent} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">New Monthly Rent (₹)</span></label>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*"
              className="input input-bordered w-full"
              value={newRent}
              onChange={(e) => setNewRent(e.target.value)}
              required
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
            />
            <span className="label-text">Apply to all tenants</span>
          </label>
          <button
            type="submit"
            className={`btn btn-primary w-full ${updatingRent ? "btn-disabled" : ""}`}
            disabled={updatingRent}
          >
            {updatingRent && <span className="loading loading-spinner loading-sm"></span>}
            Update Rent
          </button>
        </form>
      </Modal>

      {/* End Booking Modal */}
      <Modal open={endModalOpen} onClose={() => setEndModalOpen(false)} title="End Booking">
        <form onSubmit={handleEndBooking} className="space-y-4">
          <div className="p-3 bg-base-200 rounded text-sm">
            <p className="font-medium mb-1">Current Deposit Status</p>
            <p className="text-xs text-base-content/70">
              Original: ₹{depositBalance?.originalAmount.toLocaleString() || (deposit?.amount || 0).toLocaleString()} |
              Already Deducted: ₹{depositBalance?.totalDeducted.toLocaleString() || "0"} |
              <span className="text-success font-medium"> Remaining: ₹{depositBalance?.remainingBalance.toLocaleString() || (deposit?.amount || 0).toLocaleString()}</span>
            </p>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Move-out Date</span></label>
            <input
              type="date"
              className="input input-bordered w-full"
              value={endForm.moveOutDate}
              onChange={(e) => setEndForm((f) => ({ ...f, moveOutDate: e.target.value }))}
              required
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Final Deduction Amount (₹) - Optional</span></label>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*"
              className="input input-bordered w-full"
              value={endForm.deductionAmount}
              onChange={(e) => {
                const deduction = Number(e.target.value) || 0;
                const remainingBalance = depositBalance?.remainingBalance || deposit?.amount || 0;
                setEndForm((f) => ({
                  ...f,
                  deductionAmount: deduction,
                  refundAmount: Math.max(0, remainingBalance - deduction)
                }));
              }}
              placeholder="Enter amount for any damages discovered at move-out"
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Refund Amount (₹) - Auto Calculated</span></label>
            <input
              type="text"
              readOnly
              className="input input-bordered w-full bg-base-200"
              value={endForm.refundAmount}
            />
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                Refund = Remaining Balance ({(depositBalance?.remainingBalance || deposit?.amount || 0).toLocaleString()}) - Final Deduction
              </span>
            </label>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Deduction Reason (if deducting)</span></label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g., Broken window discovered at move-out"
              value={endForm.deductionReason}
              onChange={(e) => setEndForm((f) => ({ ...f, deductionReason: e.target.value }))}
            />
          </div>
          <button
            type="submit"
            className={`btn btn-error w-full ${endingBooking ? "btn-disabled" : ""}`}
            disabled={endingBooking}
          >
            {endingBooking && <span className="loading loading-spinner loading-sm"></span>}
            End Booking
          </button>
        </form>
      </Modal>

      {/* Charge Deduction Modal */}
      <Modal open={deductionModalOpen} onClose={() => setDeductionModalOpen(false)} title="Charge Fine/Deduction">
        <form onSubmit={handleChargeDeduction} className="space-y-4">
          <div className="p-3 bg-base-200 rounded text-sm">
            <p className="font-medium mb-1">Deposit Balance</p>
            <p className="text-xs text-base-content/70">
              Original: ₹{depositBalance?.originalAmount.toLocaleString()} |
              Deducted: ₹{depositBalance?.totalDeducted.toLocaleString()} |
              <span className="text-success font-medium"> Remaining: ₹{depositBalance?.remainingBalance.toLocaleString()}</span>
            </p>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Deduction Amount (₹)</span></label>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*"
              className="input input-bordered w-full"
              value={deductionForm.amount}
              onChange={(e) => setDeductionForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="Enter amount"
              required
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Reason</span></label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g., Damaged wall paint in bedroom"
              value={deductionForm.reason}
              onChange={(e) => setDeductionForm((f) => ({ ...f, reason: e.target.value }))}
              required
            />
          </div>
          <button
            type="submit"
            className={`btn btn-error w-full ${chargingDeduction ? "btn-disabled" : ""}`}
            disabled={chargingDeduction}
          >
            {chargingDeduction && <span className="loading loading-spinner loading-sm"></span>}
            Charge Deduction
          </button>
        </form>
      </Modal>

      {/* Delete Deduction Confirmation */}
      <Modal open={deleteConfirmModal.isOpen} onClose={() => setDeleteConfirmModal({ isOpen: false, deductionId: null })} title="Reverse Deduction">
        <div className="space-y-4">
          <p className="text-base-content/80">
            Are you sure you want to reverse this deduction? The amount will be added back to the tenant&apos;s deposit balance.
          </p>
          <div className="flex gap-3 justify-end mt-6">
            <button
              className="btn btn-ghost"
              onClick={() => setDeleteConfirmModal({ isOpen: false, deductionId: null })}
            >
              Cancel
            </button>
            <button
              className="btn btn-success"
              onClick={handleDeleteDeduction}
            >
              Yes, Reverse Deduction
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
