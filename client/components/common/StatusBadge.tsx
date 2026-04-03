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
  // whitespace-normal + h-auto ensure the badge background expands when text wraps on narrow screens
  const baseClass = `badge ${sizeClass} whitespace-normal h-auto ${className}`;

  // Status-specific styling
  switch (status.toLowerCase()) {
    // Success states
    case "active":
    case "completed":
    case "resolved":
    case "available":
    case "paid":
      return <span className={`${baseClass} badge-success`}>{formatStatusLabel(status)}</span>;

    // Warning/Pending states
    case "pending":
    case "pending_deposit":
    case "in_progress":
    case "reserved":
      return <span className={`${baseClass} badge-warning`}>{formatStatusLabel(status)}</span>;

    // Info/Neutral states
    case "no_booking":
    case "deposit_paid":
      return <span className={`${baseClass} badge-info`}>{formatStatusLabel(status)}</span>;

    // Error states
    case "ended":
    case "failed":
    case "inactive":
    case "occupied":
      return <span className={`${baseClass} badge-error`}>{formatStatusLabel(status)}</span>;

    // Default/ghost
    default:
      return <span className={`${baseClass} badge-ghost`}>{formatStatusLabel(status)}</span>;
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

/**
 * Status badge with icon support for common statuses.
 */
interface StatusBadgeWithIconProps extends StatusBadgeProps {
  showIcon?: boolean;
}

export function StatusBadgeWithIcon({ status, showIcon = true, size = "sm", className = "" }: StatusBadgeWithIconProps) {
  const sizeClass = size === "sm" ? "badge-xs" : "badge-sm";
  // whitespace-normal + h-auto ensure the badge background expands when text wraps on narrow screens
  const baseClass = `badge ${sizeClass} gap-1 whitespace-normal h-auto ${className}`;

  switch (status.toLowerCase()) {
    case "active":
    case "completed":
    case "resolved":
    case "available":
      return (
        <span className={`${baseClass} badge-success`}>
          {showIcon && <CheckIcon />} {formatStatusLabel(status)}
        </span>
      );

    case "pending":
    case "pending_deposit":
    case "in_progress":
    case "reserved":
      return (
        <span className={`${baseClass} badge-warning`}>
          {showIcon && <ClockIcon />} {formatStatusLabel(status)}
        </span>
      );

    case "ended":
    case "failed":
    case "occupied":
      return (
        <span className={`${baseClass} badge-error`}>
          {showIcon && <XIcon />} {formatStatusLabel(status)}
        </span>
      );

    default:
      return <span className={`${baseClass} badge-ghost`}>{formatStatusLabel(status)}</span>;
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
