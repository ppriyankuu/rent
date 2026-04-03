"use client";

import { useState } from "react";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Modal } from "@/components/Modal";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import toast from "react-hot-toast";
import type { Payment } from "@/lib/types";

interface PendingUPIVerificationsCardProps {
  payments: Payment[];
  onVerified: () => void;
}

/**
 * Shows pending UPI verifications for a tenant with verify/reject actions.
 */
export function PendingUPIVerificationsCard({ payments, onVerified }: PendingUPIVerificationsCardProps) {
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleVerify = async (paymentId: number) => {
    setProcessing(true);
    try {
      await api.post("/api/payments/admin/verify", {
        paymentId,
        action: "verify",
      });
      toast.success("Payment verified!");
      onVerified();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to verify payment"));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    setProcessing(true);
    try {
      await api.post("/api/payments/admin/verify", {
        paymentId: selectedPayment.id,
        action: "reject",
        rejectionReason: rejectionReason || undefined,
      });
      toast.success("Payment rejected");
      setRejectModalOpen(false);
      setSelectedPayment(null);
      setRejectionReason("");
      onVerified();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to reject payment"));
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  if (payments.length === 0) return null;

  return (
    <div className="card bg-base-100 shadow-sm border border-warning/30 mb-6">
      <div className="card-body p-5">
        <h2 className="font-bold text-lg flex items-center gap-2 mb-3 text-warning-content">
          <Clock className="h-5 w-5" />
          Pending UPI Verifications ({payments.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Late Fee</th>
                <th>UTR</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td className="font-medium">{p.rentMonth}</td>
                  <td>₹{p.amount.toLocaleString()}</td>
                  <td>{p.lateFee > 0 ? <span className="text-error">₹{p.lateFee}</span> : "—"}</td>
                  <td><span className="font-mono text-xs">{p.utr}</span></td>
                  <td className="text-xs">{p.utrSubmittedAt ? new Date(p.utrSubmittedAt).toLocaleDateString() : "—"}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="btn btn-success btn-xs"
                        onClick={() => handleVerify(p.id)}
                        disabled={processing}
                      >
                        <CheckCircle className="h-3 w-3" /> Verify
                      </button>
                      <button
                        className="btn btn-error btn-xs"
                        onClick={() => openRejectModal(p)}
                        disabled={processing}
                      >
                        <XCircle className="h-3 w-3" /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        open={rejectModalOpen}
        onClose={() => { setRejectModalOpen(false); setSelectedPayment(null); }}
        title="Reject Payment"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <div className="bg-base-200 rounded-lg p-4">
            <p className="font-medium">{selectedPayment?.tenantName || `Payment #${selectedPayment?.id}`}</p>
            <p className="text-sm text-base-content/60">
              {selectedPayment?.rentMonth} — ₹{((selectedPayment?.amount || 0) + (selectedPayment?.lateFee || 0)).toLocaleString()}
            </p>
            <p className="text-sm font-mono mt-1">UTR: {selectedPayment?.utr}</p>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Rejection Reason</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="e.g., Payment not found in bank account"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>

          <button
            type="submit"
            className={`btn btn-error w-full ${processing ? "btn-disabled" : ""}`}
            disabled={processing}
          >
            {processing && <span className="loading loading-spinner loading-sm"></span>}
            Reject Payment
          </button>
        </form>
      </Modal>
    </div>
  );
}
