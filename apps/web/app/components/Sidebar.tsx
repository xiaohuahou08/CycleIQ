"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Trades", href: "/trades", icon: "💹" },
  { label: "Cycles", href: "/cycles", icon: "🔄" },
  { label: "Reports", href: "/reports", icon: "📊" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

interface SidebarProps {
  email?: string | null;
  onLogout?: () => void;
}

export default function Sidebar({ email, onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-gray-200 bg-gray-50/80 backdrop-blur">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <Link href="/dashboard" className="text-base font-semibold text-gray-900">
          CycleIQ
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-700">
            {email ? email[0].toUpperCase() : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-gray-600">{email ?? "Signed in"}</p>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-gray-500 hover:text-gray-900"
              title="Logout"
            >
              ↩
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
