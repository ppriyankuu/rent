"use client";

import { formatDate } from "@/lib/utils/date";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { Tenant } from "@/lib/types";

interface TenantProfileCardProps {
  tenant: Tenant;
}

/**
 * Tenant profile information card.
 */
export function TenantProfileCard({ tenant }: TenantProfileCardProps) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200 mb-6 hover:shadow-md transition-shadow">
      <div className="card-body p-5">
        <h2 className="font-bold text-lg mb-3">Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-base-content/60">Email</p>
            <p className="font-medium">{tenant.email}</p>
          </div>
          <div>
            <p className="text-base-content/60">Phone</p>
            <p className="font-medium">{tenant.phone || "—"}</p>
          </div>
          <div>
            <p className="text-base-content/60">Status</p>
            <StatusBadge status={tenant.isActive ? "active" : "inactive"} />
          </div>
          <div>
            <p className="text-base-content/60">Joined</p>
            <p className="font-medium">{formatDate(tenant.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
