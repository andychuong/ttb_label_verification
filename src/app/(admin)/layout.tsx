"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RequireAuth, RequireAdmin } from "@/lib/auth/guards";
import { useAuth } from "@/lib/auth/context";

const navItems = [
  { href: "/admin/dashboard", label: "Admin Dashboard" },
];

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white md:block">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <Link
          href="/admin/dashboard"
          className="text-lg font-bold text-gray-900"
        >
          TTB Admin
        </Link>
      </div>
      <nav className="space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-3 md:hidden">
        <Link
          href="/admin/dashboard"
          className="text-lg font-bold text-gray-900"
        >
          TTB Admin
        </Link>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
          Admin
        </span>
        <span className="text-sm text-gray-600">{user?.email}</span>
        <button
          onClick={signOut}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RequireAdmin>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <div className="flex flex-1 flex-col">
            <Header />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </RequireAdmin>
    </RequireAuth>
  );
}
