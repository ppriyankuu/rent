"use client";

import { useState, useEffect } from "react";
import { CreditCard, Plus, Download } from "lucide-react";
import api from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/Skeleton";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils/date";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import type { Payment, TenantOption } from "@/lib/types";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [form, setForm] = useState({ tenantId: "", amount: "", rentMonth: "", notes: "" });

  useEffect(() => {
    fetchPayments();
    fetchTenants();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await api.get("/api/payments");
      setPayments(res.data?.data?.data || []);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await api.get("/api/admin/tenants");
      setTenants((res.data?.data?.data || []).map((t: TenantOption) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        roomName: t.roomName,
        bedName: t.bedName,
      })));
    } catch {
      // ignore
    }
  };

  const filteredPayments = selectedTenantId
    ? payments.filter((p) => p.tenantId === Number(selectedTenantId))
    : payments;

  const handleManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/payments/manual", {
        tenantId: Number(form.tenantId),
        amount: Number(form.amount),
        rentMonth: form.rentMonth,
        notes: form.notes || undefined,
      });
      toast.success("Manual payment recorded!");
      setModalOpen(false);
      setForm({ tenantId: "", amount: "", rentMonth: "", notes: "" });
      fetchPayments();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to record payment"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (type: "payments" | "tenants") => {
    try {
      const res = await api.get(`/api/admin/export/${type}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${type}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type} CSV downloaded!`);
    } catch {
      toast.error(`Failed to export ${type}`);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Payments" icon={CreditCard} />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        icon={CreditCard}
        actions={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => handleExport("payments")}>
              <Download className="h-4 w-4" /> Export Payments
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => handleExport("tenants")}>
              <Download className="h-4 w-4" /> Export Tenants
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Record Payment
            </button>
          </>
        }
      />

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments recorded yet"
        />
      ) : (
        <>
          <div className="mb-4 flex gap-2 flex-wrap">
            <label className="label px-0">
              <span className="label-text font-medium">Filter by Tenant</span>
            </label>
            <select
              className="select w-full max-w-xs"
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
            >
              <option value="">All Tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.roomName && t.bedName ? `(${t.roomName} - ${t.bedName})` : `(${t.email})`}
                </option>
              ))}
            </select>
          </div>
          {filteredPayments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payments found for the selected tenant"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Tenant Name</th>
                    <th>Room & Bed</th>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Late Fee</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Paid On</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => (
                    <tr key={p.id}>
                      <td>#{p.id}</td>
                      <td>
                        <div className="font-medium">{p.tenantName || `Tenant #${p.tenantId}`}</div>
                      </td>
                      <td>
                        {p.roomName && p.bedName ? (
                          <div className="text-sm">
                            {p.roomName} - {p.bedName}
                          </div>
                        ) : (
                          <span className="text-base-content/50 text-sm">N/A</span>
                        )}
                      </td>
                      <td className="font-medium">{p.rentMonth}</td>
                      <td>₹{p.amount.toLocaleString()}</td>
                      <td>{p.lateFee > 0 ? <span className="text-error">₹{p.lateFee}</span> : "—"}</td>
                      <td><span className="badge badge-outline badge-xs">{p.type}</span></td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className="text-sm">{p.paidAt ? formatDate(p.paidAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Manual Payment">
        <form onSubmit={handleManualPayment} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Tenant</span></label>
            <select
              className="select select-bordered w-full"
              value={form.tenantId}
              onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
              required
            >
              <option value="" disabled>Select tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Amount (₹)</span></label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="input input-bordered w-full"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Rent Month</span></label>
            <input
              type="month"
              className="input input-bordered w-full"
              value={form.rentMonth}
              onChange={(e) => setForm((f) => ({ ...f, rentMonth: e.target.value }))}
              required
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Notes</span></label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g., Paid by cash"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <button
            type="submit"
            className={`btn btn-primary w-full ${submitting ? "btn-disabled" : ""}`}
            disabled={submitting}
          >
            {submitting && <span className="loading loading-spinner loading-sm"></span>}
            Record Payment
          </button>
        </form>
      </Modal>
    </div>
  );
}
