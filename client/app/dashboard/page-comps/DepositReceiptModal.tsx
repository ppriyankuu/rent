"use client";

import { Modal } from "@/components/Modal";
import { Field } from "@/components/common/Field";
import { Download } from "lucide-react";
import type { DepositReceipt } from "@/lib/types";

interface DepositReceiptModalProps {
  open: boolean;
  onClose: () => void;
  receipt: DepositReceipt | null;
}

/**
 * Modal for displaying deposit receipt.
 */
export function DepositReceiptModal({ open, onClose, receipt }: DepositReceiptModalProps) {
  if (!receipt) return null;

  return (
    <Modal open={open} onClose={onClose} title="Deposit Receipt">
      <div className="space-y-4 text-sm max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="text-center border-b border-base-200 pb-3">
          <p className="font-bold text-lg">{receipt.receiptNumber}</p>
          <p className="text-base-content/60">Security Deposit Receipt</p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Tenant" value={receipt.tenant.name} />
          <Field label="Email" value={receipt.tenant.email} />
          <Field label="Room" value={receipt.room} />
          <Field label="Bed" value={receipt.bed} />
          <Field label="Payment Type" value={receipt.paymentType} capitalize />
        </div>

        {/* Amount Section */}
        <div className="space-y-1">
          <div className="flex justify-between font-bold text-base border-t border-base-200 pt-1">
            <span>Deposit Amount</span>
            <span>₹{receipt.depositAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-base-content/50 mt-2 wrap-break-word">
          Paid on {new Date(receipt.paidAt).toLocaleString("en-IN")}
          {receipt.razorpayPaymentId && (
            <> • Razorpay ID: {receipt.razorpayPaymentId}</>
          )}
        </div>

        {/* Action */}
        <button
          className="btn btn-outline btn-sm w-full mt-2"
          onClick={() => window.print()}
        >
          <Download className="h-3 w-3" /> Print Receipt
        </button>
      </div>
    </Modal>
  );
}
