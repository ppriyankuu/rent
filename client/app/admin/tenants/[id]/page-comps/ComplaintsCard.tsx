"use client";

import { StatusBadge } from "@/components/common/StatusBadge";
import type { Complaint } from "@/lib/types";

interface ComplaintsCardProps {
  complaints: Complaint[];
}

/**
 * Complaints list card.
 */
export function ComplaintsCard({ complaints }: ComplaintsCardProps) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200 mb-6">
      <div className="card-body p-5">
        <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Complaints ({complaints.length})
        </h2>
        {complaints.length === 0 ? (
          <p className="text-sm text-base-content/60">No complaints.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {complaints.map((c) => (
                <div key={c.id} className="flex justify-between items-center p-2 bg-base-200/50 rounded">
                  <span className="text-sm">{c.subject}</span>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
