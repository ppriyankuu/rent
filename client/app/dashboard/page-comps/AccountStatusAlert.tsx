"use client";

import { Shield } from "lucide-react";

interface AccountStatusAlertProps {
  isActive: boolean;
}

/**
 * Alert shown when user account is deactivated.
 */
export function AccountStatusAlert({ isActive }: AccountStatusAlertProps) {
  if (isActive) return null;

  return (
    <div className="alert alert-error mb-6 shadow-sm rounded-lg">
      <Shield className="h-5 w-5" />
      <span>Your account has been deactivated. Please contact the administrator.</span>
    </div>
  );
}
