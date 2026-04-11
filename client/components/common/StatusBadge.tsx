"use client";



interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Reusable status badge component that handles various status types.
 * Automatically determines the appropriate color based on status value.
 */
export function StatusBadge({ status, size = "sm", className = "" }: StatusBadgeProps) {
  const sizeClass = size === "sm" ? "badge-sm" : "badge-md";
  // whitespace-nowrap + leading-snug + tighter padding keep the badge compact when text wraps on mobile
  const baseClass = `badge ${sizeClass} whitespace-nowrap leading-snug py-0.5 px-2 ${className}`;

  // Status-specific styling
  switch (status.toLowerCase()) {
    // Success states
    case "active":
    case "completed":
    case "resolved":
    case "available":
    case "paid":
      return <span className={`${baseClass} badge-success`}><ResponsiveLabel status={status} /></span>;

    // Warning/Pending states
    case "pending":
    case "pending_deposit":
    case "in_progress":
    case "reserved":
      return <span className={`${baseClass} badge-warning`}><ResponsiveLabel status={status} /></span>;

    // Info/Neutral states
    case "no_booking":
    case "deposit_paid":
    case "no_verification":
      return <span className={`${baseClass} badge-info`}><ResponsiveLabel status={status} /></span>;

    // Error states
    case "ended":
    case "failed":
    case "inactive":
    case "occupied":
      return <span className={`${baseClass} badge-error`}><ResponsiveLabel status={status} /></span>;

    // Default/ghost
    default:
      return <span className={`${baseClass} badge-ghost`}><ResponsiveLabel status={status} /></span>;
  }
}

/**
 * Format status label by replacing underscores with spaces and title casing.
 */
function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Short labels shown on small screens to prevent badge wrapping */
const SHORT_LABELS: Record<string, string> = {
  deposit_paid: "Dep Pd",
  no_booking: "No Bk",
  no_verification: "UTR N/S",
};

const CUSTOM_LABELS: Record<string, string> = {
  no_verification: "UTR Not Submitted",
};

function ResponsiveLabel({ status }: { status: string }) {
  const fullLabel = CUSTOM_LABELS[status.toLowerCase()] || formatStatusLabel(status);
  const shortLabel = SHORT_LABELS[status.toLowerCase()];

  if (!shortLabel) return <>{fullLabel}</>;

  return (
    <>
      <span className="hidden sm:inline">{fullLabel}</span>
      <span className="sm:hidden">{shortLabel}</span>
    </>
  );
}

/**
 * Status badge with icon support for common statuses.
 */
interface StatusBadgeWithIconProps extends StatusBadgeProps {
  showIcon?: boolean;
}

export function StatusBadgeWithIcon({ status, showIcon = true, size = "sm", className = "" }: StatusBadgeWithIconProps) {
  const sizeClass = size === "sm" ? "badge-xs" : "badge-sm";
  // whitespace-nowrap + leading-snug + tighter padding keep the badge compact when text wraps on mobile
  const baseClass = `badge ${sizeClass} gap-1 whitespace-nowrap leading-snug py-0.5 px-2 ${className}`;

  switch (status.toLowerCase()) {
    case "active":
    case "completed":
    case "resolved":
    case "available":
      return (
        <span className={`${baseClass} badge-success`}>
          {showIcon && <CheckIcon />} <ResponsiveLabel status={status} />
        </span>
      );

    case "pending":
    case "pending_deposit":
    case "in_progress":
    case "reserved":
      return (
        <span className={`${baseClass} badge-warning`}>
          {showIcon && <ClockIcon />} <ResponsiveLabel status={status} />
        </span>
      );

    case "ended":
    case "failed":
    case "occupied":
      return (
        <span className={`${baseClass} badge-error`}>
          {showIcon && <XIcon />} <ResponsiveLabel status={status} />
        </span>
      );

    default:
      return <span className={`${baseClass} badge-ghost`}><ResponsiveLabel status={status} /></span>;
  }
}

// Simple icon components to avoid extra imports
function CheckIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
