"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import api from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/Skeleton";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

interface PendingPayment {
    id: number;
    tenantId: number;
    tenantName: string;
    tenantEmail: string;
    roomName?: string;
    bedName?: string;
    amount: number;
    lateFee: number;
    rentMonth: string;
    utr: string;
    utrSubmittedAt: string;
    rejectionReason: string | null;
}

export default function AdminPendingVerificationsPage() {
    const [payments, setPayments] = useState<PendingPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        try {
            const res = await api.get("/api/payments/admin/pending");
            setPayments(res.data?.data || []);
        } catch {
            toast.error("Failed to load pending verifications");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (paymentId: number) => {
        setProcessing(true);
        try {
            await api.post("/api/payments/admin/verify", {
                paymentId,
                action: "verify",
            });
            toast.success("Payment verified!");

            // Remove the verified payment from local state (in-place update)
            setPayments((prev) => prev.filter((p) => p.id !== paymentId));
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

            const rejectedId = selectedPayment.id;
            setRejectModalOpen(false);
            setSelectedPayment(null);
            setRejectionReason("");

            // Remove the rejected payment from local state (in-place update)
            setPayments((prev) => prev.filter((p) => p.id !== rejectedId));
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Failed to reject payment"));
        } finally {
            setProcessing(false);
        }
    };

    const openRejectModal = (payment: PendingPayment) => {
        setSelectedPayment(payment);
        setRejectionReason("");
        setRejectModalOpen(true);
    };

    if (loading) {
        return (
            <div>
                <PageHeader title="Pending Verifications" icon={Clock} />
                <TableSkeleton rows={5} />
            </div>
        );
    }

    return (
        <div>
            <PageHeader title="Pending Verifications" icon={Clock} />

            {payments.length === 0 ? (
                <EmptyState
                    icon={CheckCircle}
                    title="No pending verifications"
                    description="All UPI payments have been processed."
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-zebra">
                        <thead>
                            <tr>
                                <th>Payment ID</th>
                                <th>Tenant</th>
                                <th>Room & Bed</th>
                                <th>Month</th>
                                <th>Amount</th>
                                <th>Late Fee</th>
                                <th>UTR</th>
                                <th>Submitted</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p) => (
                                <tr key={p.id}>
                                    <td>#{p.id}</td>
                                    <td>
                                        <div className="font-medium">{p.tenantName}</div>
                                        <div className="text-xs text-base-content/50">{p.tenantEmail}</div>
                                    </td>
                                    <td>
                                        {p.roomName && p.bedName ? (
                                            <div className="text-sm">{p.roomName} - {p.bedName}</div>
                                        ) : (
                                            <span className="text-base-content/50 text-sm">N/A</span>
                                        )}
                                    </td>
                                    <td className="font-medium">{p.rentMonth}</td>
                                    <td>₹{(p.amount + p.lateFee).toLocaleString()}</td>
                                    <td>{p.lateFee > 0 ? <span className="text-error">₹{p.lateFee}</span> : "—"}</td>
                                    <td><span className="font-mono text-xs">{p.utr}</span></td>
                                    <td className="text-sm">{p.utrSubmittedAt ? new Date(p.utrSubmittedAt).toLocaleDateString() : "—"}</td>
                                    <td>
                                        <div className="flex gap-2">
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
            )}

            {/* Reject Modal */}
            <Modal
                open={rejectModalOpen}
                onClose={() => { setRejectModalOpen(false); setSelectedPayment(null); }}
                title="Reject Payment"
            >
                <form onSubmit={handleReject} className="space-y-4">
                    <div className="bg-base-200 rounded-lg p-4">
                        <p className="font-medium">{selectedPayment?.tenantName}</p>
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
