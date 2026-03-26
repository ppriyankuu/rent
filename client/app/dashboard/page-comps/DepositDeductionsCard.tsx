"use client";

import { DollarSign } from "lucide-react";
import { formatDate } from "@/lib/utils/date";
import type { Deduction, DepositBalance } from "@/lib/types";

interface DepositDeductionsProps {
  deductions: Deduction[];
  depositBalance: DepositBalance;
}

/**
 * Deposit deductions card component.
 */
export function DepositDeductionsCard({ deductions, depositBalance }: DepositDeductionsProps) {
  return (
    <div className="card bg-base-100 shadow-md border border-base-200 mb-6 hover:shadow-lg transition-shadow">
      <div className="card-body">
        <h2 className="card-title text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5" /> Deposit Deductions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          <div>
            <p className="text-sm text-base-content/60">Original Deposit</p>
            <p className="font-medium">₹{depositBalance.originalAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/60">Total Deducted</p>
            <p className="font-medium text-error">₹{depositBalance.totalDeducted.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/60">Remaining Balance</p>
            <p className="font-medium text-success">₹{depositBalance.remainingBalance.toLocaleString()}</p>
          </div>
        </div>

        <div className="divider my-4"></div>

        <h3 className="text-sm font-semibold text-base-content/80 mb-2">Deduction History</h3>
        <div className="overflow-x-auto">
          <div className="max-h-55 overflow-y-auto pr-2">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {deductions.map((d) => (
                  <tr key={d.id}>
                    <td className="text-xs">{formatDate(d.createdAt)}</td>
                    <td className="font-medium text-error">₹{d.amount.toLocaleString()}</td>
                    <td className="text-sm">{d.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
