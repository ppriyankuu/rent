"use client";

import { formatDate } from "@/lib/utils/date";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { Payment } from "@/lib/types";

interface PaymentHistoryCardProps {
  payments: Payment[];
}

/**
 * Payment history table card.
 */
export function PaymentHistoryCard({ payments }: PaymentHistoryCardProps) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200 mb-6">
      <div className="card-body p-5">
        <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Payments ({payments.length})
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
                      <td><StatusBadge status={p.status} /></td>
                      <td className="text-xs">{p.paidAt ? formatDate(p.paidAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
