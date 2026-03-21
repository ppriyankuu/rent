/**
 * Formats a status string for display by replacing underscores with spaces
 * and converting to title case.
 * 
 * Examples:
 * - "pending_deposit" → "Pending Deposit"
 * - "deposit_paid" → "Deposit Paid"
 * - "active" → "Active"
 */
export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
