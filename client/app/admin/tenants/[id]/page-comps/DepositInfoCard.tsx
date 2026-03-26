"use client";

// import { Shield, DollarSign } from "@/lib/types";
import { formatDate } from "@/lib/utils/date";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { Deposit, DepositBalance, Deduction } from "@/lib/types";

interface DepositInfoCardProps {
  deposit: Deposit;
  depositBalance: DepositBalance | null;
  deductions: Deduction[];
  canChargeDeduction: boolean;
  onChargeDeduction: () => void;
  onDeleteDeduction: (id: number) => void;
}

/**
 * Deposit information card with deductions table.
 */
export function DepositInfoCard({
  deposit,
  depositBalance,
  deductions,
  canChargeDeduction,
  onChargeDeduction,
  onDeleteDeduction,
}: DepositInfoCardProps) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200 mb-6">
      <div className="card-body p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Deposit
          </h2>
          {canChargeDeduction && (
            <button
              className="btn btn-error btn-sm btn-outline"
              onClick={onChargeDeduction}
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Charge Fine/Deduction
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
              <StatusBadge status={deposit.status} />
            </div>
            <div>
              <p className="text-base-content/60">Paid</p>
              <p className="font-medium">
                {deposit.paidAt
                  ? formatDate(deposit.paidAt)
                  : "Not yet"}
              </p>
            </div>
          </div>
        )}

        {/* Deductions History */}
        {deductions.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Deduction History ({deductions.length})
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
                        <td className="text-xs">{formatDate(d.createdAt)}</td>
                        <td className="font-medium text-error">₹{d.amount.toLocaleString()}</td>
                        <td className="text-sm">{d.reason}</td>
                        <td className="text-xs">
                          {d.adminName || `Admin #${d.deductedBy}`}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => onDeleteDeduction(d.id)}
                            title="Reverse Deduction"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
  );
}
