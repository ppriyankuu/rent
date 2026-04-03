"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Plus, Eye, UserMinus, Trash2, UserCheck } from "lucide-react";
import { useTenants } from "@/hooks/useTenants";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { TableSkeleton } from "@/components/Skeleton";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils/date";
import { fetchAvailableBeds } from "@/hooks/useRooms";
import type { BedOption } from "@/lib/types";

interface TenantForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  bedId: string;
}

export default function AdminTenantsPage() {
  const {
    tenants,
    tenantsLoading,
    createTenant,
    deactivateTenant,
    reactivateTenant,
    deleteTenant,
  } = useTenants();

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableBeds, setAvailableBeds] = useState<BedOption[]>([]);
  const [form, setForm] = useState<TenantForm>({
    name: "",
    email: "",
    password: "",
    phone: "",
    bedId: "",
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "reactivate" | "deactivate" | "delete" | null;
    tenantId: number | null;
  }>({ isOpen: false, type: null, tenantId: null });

  const openModal = async () => {
    const beds = await fetchAvailableBeds();
    setAvailableBeds(beds);
    setModalOpen(true);
  };

  const handleCreate = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone,
    };
    if (form.bedId) payload.bedId = Number(form.bedId);

    const success = await createTenant(payload as unknown as {
      name: string;
      email: string;
      password: string;
      phone: string;
      bedId?: number;
    });

    if (success) {
      setModalOpen(false);
      setForm({ name: "", email: "", password: "", phone: "", bedId: "" });
    }
    setSubmitting(false);
  };

  const confirmAction = async () => {
    if (!confirmModal.tenantId || !confirmModal.type) return;
    const tenantId = confirmModal.tenantId;
    const actionType = confirmModal.type;

    setConfirmModal({ isOpen: false, type: null, tenantId: null });

    let success = false;
    if (actionType === "reactivate") {
      success = await reactivateTenant(tenantId);
    } else if (actionType === "deactivate") {
      success = await deactivateTenant(tenantId);
    } else if (actionType === "delete") {
      success = await deleteTenant(tenantId);
    }

    if (success && actionType === "delete") {
      setForm({ name: "", email: "", password: "", phone: "", bedId: "" });
    }
  };

  if (tenantsLoading) {
    return (
      <div>
        <PageHeader title="Tenants" icon={Users} />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Tenants"
        icon={Users}
        actions={
          <button className="btn btn-primary btn-sm" onClick={openModal}>
            <Plus className="h-4 w-4" /> Add Tenant
          </button>
        }
      />

      {tenants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenants yet"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-base-200">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Room / Bed</th>
                <th>Rent</th>
                <th>Expected Move-Out</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.name}</td>
                  <td className="text-sm">{t.email}</td>
                  <td className="text-sm">{t.phone}</td>
                  <td className="text-sm">
                    {t.roomName && t.bedName
                      ? `${t.roomName} / ${t.bedName}`
                      : "—"}
                  </td>
                  <td className="text-sm">
                    {t.monthlyRent
                      ? `₹${t.monthlyRent.toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="text-sm">
                    {t.expectedMoveOutDate
                      ? formatDate(t.expectedMoveOutDate)
                      : "—"}
                  </td>
                  <td>
                    <StatusBadge
                      status={
                        !t.isActive
                          ? "inactive"
                          : t.bookingStatus === "active"
                            ? "active"
                            : t.bookingStatus
                              ? t.bookingStatus
                              : "no_booking"
                      }
                    />
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Link
                        href={`/admin/tenants/${t.id}`}
                        className="btn btn-ghost btn-xs"
                        title="View Details"
                        aria-label="View tenant details"
                      >
                        <Eye className="h-3 w-3" />
                      </Link>
                      {t.isActive && (
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => setConfirmModal({ isOpen: true, type: "deactivate", tenantId: t.id })}
                          title="Deactivate Tenant"
                          aria-label="Deactivate tenant"
                        >
                          <UserMinus className="h-3 w-3" />
                        </button>
                      )}
                      {!t.isActive && (
                        <>
                          <button
                            className="btn btn-ghost btn-xs text-success"
                            onClick={() => setConfirmModal({ isOpen: true, type: "reactivate", tenantId: t.id })}
                            title="Reactivate Tenant"
                          >
                            <UserCheck className="h-3 w-3" />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => setConfirmModal({ isOpen: true, type: "delete", tenantId: t.id })}
                            title="Delete Tenant"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Tenant Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Tenant">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Name</span></label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Email</span></label>
            <input
              type="email"
              className="input input-bordered w-full"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Password</span></label>
            <input
              type="password"
              className="input input-bordered w-full"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Phone</span></label>
            <input
              type="tel"
              className="input input-bordered w-full"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/[^0-9+]/g, "") }))}
              required
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Assign Bed (optional)</span></label>
            <select
              className="select select-bordered w-full"
              value={form.bedId}
              onChange={(e) => setForm((f) => ({ ...f, bedId: e.target.value }))}
            >
              <option value="">No bed assigned</option>
              {availableBeds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.roomName} — {b.name} (₹{b.monthlyRent}/mo)
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className={`btn btn-primary w-full ${submitting ? "btn-disabled" : ""}`}
            disabled={submitting}
          >
            {submitting && <span className="loading loading-spinner loading-sm"></span>}
            Create Tenant
          </button>
        </form>
      </Modal>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, tenantId: null })}
        onConfirm={confirmAction}
        title={
          confirmModal.type === "delete"
            ? "Delete Tenant"
            : confirmModal.type === "reactivate"
              ? "Reactivate Tenant"
              : "Deactivate Tenant"
        }
        message={
          confirmModal.type === "reactivate"
            ? "Are you sure you want to reactivate this tenant?"
            : confirmModal.type === "deactivate"
              ? "Are you sure you want to deactivate this tenant? Their booking will be ended and bed made available."
              : "Are you sure you want to permanently delete this tenant and all their records? This cannot be undone."
        }
        confirmText={
          confirmModal.type === "delete"
            ? "Yes, Delete"
            : confirmModal.type === "reactivate"
              ? "Yes, Reactivate"
              : "Yes, Deactivate"
        }
        variant={confirmModal.type === "delete" ? "danger" : confirmModal.type === "reactivate" ? "success" : "warning"}
      />
    </div>
  );
}

// Import Modal here to avoid circular dependency
import { Modal } from "@/components/Modal";
