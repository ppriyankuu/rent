interface FieldProps {
  label: string;
  value: string;
  capitalize?: boolean;
  className?: string;
}

/**
 * Reusable field component for displaying label-value pairs in receipts and detail views.
 * Automatically adjusts text size based on value length.
 */
export function Field({ label, value, capitalize = false, className = "" }: FieldProps) {
  const length = value?.length || 0;

  // Dynamic text sizing based on length to prevent overflow
  let sizeClass = "text-sm";
  if (length > 25) sizeClass = "text-xs";
  if (length > 40) sizeClass = "text-[11px]";

  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-base-content/60">{label}</p>
      <p
        className={`font-medium ${sizeClass} break-words ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
