"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Menu, Home, LayoutDashboard, Shield } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function Navbar({ hideMobileMenu = false, drawerId }: { hideMobileMenu?: boolean, drawerId?: string }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    // <div className="navbar bg-base-100 shadow-sm border-b border-base-200 px-4">
    <div className="navbar relative z-50 bg-base-100 shadow-sm border-b border-base-200 px-4">
      {/* Mobile menu */}
      <div className="navbar-start">
        {!hideMobileMenu && (
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <Menu className="h-5 w-5" />
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-32 p-2 shadow">
              <li><Link href="/"><Home className="h-4 w-4" /> Rooms</Link></li>
              {isAuthenticated && !isAdmin && (
                <li><Link href="/dashboard"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link></li>
              )}
              {isAdmin && (
                <li><Link href="/admin"><Shield className="h-4 w-4" /> Admin</Link></li>
              )}
            </ul>
          </div>
        )}
        <Link
          href="/"
          className={`btn btn-ghost text-xl font-bold ${pathname === "/" ? "hidden sm:flex" : ""
            }`}
        >
          PG's PG
        </Link>
      </div>

      {/* Desktop menu */}
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1 gap-1">
          <li>
            <Link
              href="/"
              className={`hover:bg-base-200 ${pathname === "/" ? "bg-base-200" : ""}`}
            >
              Rooms
            </Link>
          </li>

          {isAuthenticated && !isAdmin && (
            <li>
              <Link
                href="/dashboard"
                className={`hover:bg-base-200 ${pathname.startsWith("/dashboard") ? "bg-base-200" : ""
                  }`}
              >
                Dashboard
              </Link>
            </li>
          )}

          {isAdmin && (
            <li>
              <Link
                href="/admin"
                className={`hover:bg-base-200 ${pathname.startsWith("/admin") ? "bg-base-200" : ""
                  }`}
              >
                Admin Panel
              </Link>
            </li>
          )}
        </ul>
      </div>

      {/* Auth buttons */}
      <div className="navbar-end gap-2">
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <span className="text-sm hidden sm:inline">
              Hi, <strong>{user?.name?.split(" ")[0]}</strong>
            </span>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm gap-1">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost btn-sm">Login</Link>
            <Link href="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
          </>
        )}

        {/* Drawer button for layouts */}
        {drawerId && (
          <label htmlFor={drawerId} className="btn btn-ghost btn-square btn-sm lg:hidden ml-1">
            <Menu className="h-5 w-5" />
          </label>
        )}
      </div>
    </div>
  );
}
