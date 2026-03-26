"use client";

import { useState, useEffect } from "react";
import { CreditCard, Receipt, Download } from "lucide-react";
import api from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Modal } from "@/components/Modal";
import { Field } from "@/components/common/Field";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils/date";
import toast from "react-hot-toast";
import type { Payment, PaymentReceipt } from "@/lib/types";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchPayments = async () => {
      try {
        const res = await api.get("/api/payments/my");
        if (!cancelled) {
          setPayments(res.data?.data || []);
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load payments");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPayments();

    return () => {
      cancelled = true;
    };
  }, []);

  const viewReceipt = async (paymentId: number) => {
    try {
      const res = await api.get(`/api/payments/my/${paymentId}/receipt`);
      setReceipt(res.data.data);
      setReceiptOpen(true);
    } catch {
      toast.error("Failed to load receipt");
    }
  };

  if (loading) return <LoadingSpinner text="Loading payments..." />;

  return (
    <div>
      <PageHeader title="Payment History" icon={CreditCard} />

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-base-200">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Rent Month</th>
                <th>Amount</th>
                <th>Late Fee</th>
                <th>Type</th>
                <th>Status</th>
                <th>Paid On</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.rentMonth}</td>
                  <td>₹{p.amount.toLocaleString()}</td>
                  <td>
                    {p.lateFee > 0 ? (
                      <span className="text-error">₹{p.lateFee}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span className="badge badge-outline badge-sm">{p.type}</span>
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="text-sm">
                    {p.paidAt ? formatDate(p.paidAt) : "—"}
                  </td>
                  <td>
                    {p.status === "completed" && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => viewReceipt(p.id)}
                        aria-label="View receipt"
                      >
                        <Receipt className="h-3 w-3" /> View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        title="Payment Receipt"
      >
        {receipt && (
          <div className="space-y-4 text-sm max-w-lg w-full overflow-hidden">
            <div className="text-center border-b border-base-200 pb-3">
              <p className="font-bold text-lg">{receipt.receiptNumber}</p>
              <p className="text-base-content/60">Rent Payment Receipt</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tenant" value={receipt.tenant.name} />
              <Field label="Email" value={receipt.tenant.email} />
              <Field label="Room" value={receipt.room} />
              <Field label="Bed" value={receipt.bed} />
              <Field label="Rent Month" value={receipt.rentMonth || ""} />
              <Field label="Payment Type" value={receipt.paymentType} capitalize />
            </div>

            <div className="divider my-1"></div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Rent Amount</span>
                <span>₹{(receipt.rentAmount || 0).toLocaleString()}</span>
              </div>

              {receipt.lateFee > 0 && (
                <div className="flex justify-between text-error">
                  <span>Late Fee</span>
                  <span>₹{receipt.lateFee.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-base border-t border-base-200 pt-1">
                <span>Total</span>
                <span>₹{receipt.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="text-center text-xs text-base-content/50 mt-2 wrap-break-word">
              Paid on {new Date(receipt.paidAt).toLocaleString("en-IN")}
              {receipt.razorpayPaymentId && (
                <> • Razorpay ID: {receipt.razorpayPaymentId}</>
              )}
            </div>

            <button
              className="btn btn-outline btn-sm w-full mt-2"
              onClick={() => window.print()}
            >
              <Download className="h-3 w-3" /> Print Receipt
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
