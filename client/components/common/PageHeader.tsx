"use client";

import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

/**
 * Reusable page header component for consistent page titles with optional actions.
 */
export function PageHeader({
  title,
  icon: Icon,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 mb-6 ${className}`}>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        {Icon && <Icon className="h-6 w-6" />}
        {title}
      </h1>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
