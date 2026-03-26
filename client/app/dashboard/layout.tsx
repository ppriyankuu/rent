"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  CreditCard,
  MessageSquare,
  UserCircle,
} from "lucide-react";

const sidebarLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/complaints", label: "Complaints", icon: MessageSquare },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Check if profile has missing values (name or phone)
  const hasMissingProfile = !user?.name?.trim() || !user?.phone?.trim();

  return (
    <ProtectedRoute requiredRole="tenant">
      <div className="min-h-screen flex flex-col">
        <Navbar hideMobileMenu drawerId="dashboard-drawer" />
        <div className="flex-1 flex">
          {/* Mobile drawer */}
          <div className="drawer lg:drawer-open">
            <input
              id="dashboard-drawer"
              type="checkbox"
              className="drawer-toggle"
            />
            <div className="drawer-content flex flex-col">
              {/* Main content */}
              <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
                {children}
              </main>
            </div>
            <div className="drawer-side z-30">
              <label htmlFor="dashboard-drawer" className="drawer-overlay"></label>
              <aside className="bg-base-100 border-r border-base-200 w-64 min-h-full">
                <div className="p-4 border-b border-base-200 lg:hidden">
                  <h2 className="font-bold text-lg">Tenant Dashboard</h2>
                </div>

                <ul className="menu p-4 gap-1">
                  {sidebarLinks.map((link) => {
                    const isProfileLink = link.href === "/dashboard/profile";
                    const isProfileMissing = isProfileLink && hasMissingProfile;
                    const isCurrentPage = pathname === link.href;

                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={`flex items-center justify-between ${isCurrentPage ? "active font-medium bg-base-200" : ""
                            } ${isProfileMissing ? "text-error" : ""}`}
                          onClick={() => {
                            const drawer = document.getElementById("dashboard-drawer") as HTMLInputElement;
                            if (drawer) drawer.checked = false;
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <link.icon className="h-4 w-4" />
                            {link.label}
                          </div>
                          {isProfileMissing && (
                            <span className="indicator-item badge badge-error badge-xs">
                              Fix
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute >
  );
}
