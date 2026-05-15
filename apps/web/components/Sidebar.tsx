"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mainNav = [
  { label: "Dashboard", icon: "🏠", href: "/dashboard" },
  { label: "Trades", icon: "📋", href: "/trades" },
  { label: "Cycles", icon: "🔄", href: "/cycles" },
  { label: "Reports", icon: "📊", href: "/reports" },
  { label: "Settings", icon: "⚙️", href: "/settings" },
];

interface SidebarProps {
  email?: string | null;
}

export default function Sidebar({ email }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <Link href="/dashboard" className="text-base font-semibold text-gray-900">
          CycleIQ
        </Link>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Main
          </p>
          <ul className="space-y-0.5">
            {mainNav.map((item) => {
              const isActive = item.href === pathname;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-700">
            {email ? email[0].toUpperCase() : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-gray-600">{email ?? "Signed in"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
