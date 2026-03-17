import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  description?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
}: StatCardProps) {
  return (
    <div className="stat bg-base-100 rounded-xl border border-base-200 shadow-sm p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="stat-title text-xs sm:text-sm">{label}</div>

          <div className="stat-value text-xl sm:text-2xl">
            {value}
          </div>

          {description && (
            <div className="stat-desc text-xs">{description}</div>
          )}
        </div>

        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
      </div>
    </div>
  );
}